// NetPilot — live network diagnostic API (Vercel Serverless Function)
//
// Runs REAL checks from the server: DNS resolution, TCP reachability,
// HTTPS response, and TLS certificate validity. ICMP ping / traceroute are
// intentionally NOT here — Vercel's runtime can't open raw sockets, so we use
// a TCP connect as the practical reachability test instead.

const dns = require('dns').promises;
const net = require('net');
const tls = require('tls');
const https = require('https');
const http = require('http');

// ── Parse "example.com", "1.1.1.1", "host:8443", or "https://example.com/path" ──
function parseTarget(raw) {
  let s = String(raw || '').trim();
  if (!s || s.length > 253) return null;
  s = s.replace(/^[a-z]+:\/\//i, ''); // strip protocol
  s = s.split('/')[0];                // strip path
  s = s.split('?')[0];
  let host = s;
  let port = null;
  const m = s.match(/^([^:]+):(\d+)$/);
  if (m) { host = m[1]; port = parseInt(m[2], 10); }
  if (!/^[a-z0-9.\-]+$/i.test(host)) return null; // hostname / IPv4 only
  if (port !== null && (port < 1 || port > 65535)) return null;
  return { host, port };
}

function dnsCheck(host) {
  const start = Date.now();
  return dns.lookup(host, { all: true })
    .then(addrs => ({ ok: true, ms: Date.now() - start, addresses: addrs.map(a => a.address) }))
    .catch(e => ({ ok: false, ms: Date.now() - start, err: e.code || e.message }));
}

function tcpCheck(host, port, timeout = 5000) {
  return new Promise(resolve => {
    const start = Date.now();
    const socket = new net.Socket();
    let done = false;
    const finish = (ok, err) => {
      if (done) return; done = true;
      socket.destroy();
      resolve({ ok, ms: Date.now() - start, err });
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false, 'timeout'));
    socket.once('error', e => finish(false, e.code || e.message));
    socket.connect(port, host);
  });
}

const isIp = h => net.isIP(h) !== 0;

function httpCheck(host, port, useTls, timeout = 7000) {
  return new Promise(resolve => {
    const mod = useTls ? https : http;
    const start = Date.now();
    const opts = { host, port, method: 'GET', path: '/', timeout, rejectUnauthorized: false };
    if (!isIp(host)) opts.servername = host;
    const req = mod.request(opts,
      res => {
        const ms = Date.now() - start;
        res.destroy();
        resolve({ ok: res.statusCode < 500, status: res.statusCode, ms });
      }
    );
    req.once('timeout', () => { req.destroy(); resolve({ ok: false, err: 'timeout' }); });
    req.once('error', e => resolve({ ok: false, err: e.code || e.message }));
    req.end();
  });
}

function tlsCheck(host, port = 443, timeout = 7000) {
  return new Promise(resolve => {
    const start = Date.now();
    const tlsOpts = { host, port, timeout, rejectUnauthorized: false };
    if (!isIp(host)) tlsOpts.servername = host;
    const socket = tls.connect(tlsOpts, () => {
      const cert = socket.getPeerCertificate();
      const authorized = socket.authorized;
      const authError = socket.authorizationError ? String(socket.authorizationError) : null;
      socket.end();
      if (!cert || !cert.valid_to) return resolve({ ok: false, err: 'no certificate' });
      const expires = new Date(cert.valid_to);
      const daysLeft = Math.round((expires.getTime() - Date.now()) / 86400000);
      const issuer = (cert.issuer && (cert.issuer.O || cert.issuer.CN)) || 'unknown';
      resolve({ ok: authorized, ms: Date.now() - start, daysLeft, issuer, authorized, authError });
    });
    socket.setTimeout(timeout);
    socket.once('timeout', () => { socket.destroy(); resolve({ ok: false, err: 'timeout' }); });
    socket.once('error', e => resolve({ ok: false, err: e.code || e.message }));
  });
}

module.exports = async (req, res) => {
  const raw = (req.query && req.query.target) ||
    (req.url && new URL(req.url, 'http://x').searchParams.get('target'));
  const parsed = parseTarget(raw);

  if (!parsed) {
    res.status(400).json({ error: 'Enter a valid hostname, IP, or URL (e.g. example.com or 1.1.1.1).' });
    return;
  }

  const { host } = parsed;
  const started = Date.now();

  // DNS first — everything else needs the host to resolve.
  const dnsRes = await dnsCheck(host);
  const checks = [];

  checks.push({
    name: 'DNS resolution',
    status: dnsRes.ok ? 'ok' : 'fault',
    detail: dnsRes.ok
      ? `${dnsRes.addresses.join(', ')} · ${dnsRes.ms} ms`
      : `failed · ${dnsRes.err}`
  });

  let diagnosis;

  if (!dnsRes.ok) {
    diagnosis = {
      rootCause: 'DNS Failure',
      summary: `The hostname "${host}" could not be resolved. Check the spelling, or the DNS server may be unreachable. No further connectivity tests could run.`,
      confidence: 'High'
    };
    res.status(200).json({ target: host, checks, diagnosis, durationMs: Date.now() - started });
    return;
  }

  const resolvedIp = dnsRes.addresses[0];
  const httpsPort = parsed.port && parsed.port !== 80 ? parsed.port : 443;

  // Real reachability + protocol checks, in parallel.
  const [tcp443, tcp80, httpsRes, tlsRes, customRes] = await Promise.all([
    tcpCheck(host, 443),
    tcpCheck(host, 80),
    httpCheck(host, httpsPort, true),
    tlsCheck(host, httpsPort),
    parsed.port && parsed.port !== 443 && parsed.port !== 80 ? tcpCheck(host, parsed.port) : Promise.resolve(null)
  ]);

  checks.push({
    name: 'TCP connect :443',
    status: tcp443.ok ? 'ok' : 'fault',
    detail: tcp443.ok ? `reachable · ${tcp443.ms} ms` : `unreachable · ${tcp443.err}`
  });
  checks.push({
    name: 'TCP connect :80',
    status: tcp80.ok ? 'ok' : 'amber',
    detail: tcp80.ok ? `reachable · ${tcp80.ms} ms` : `no response · ${tcp80.err}`
  });

  if (customRes) {
    checks.push({
      name: `TCP connect :${parsed.port}`,
      status: customRes.ok ? 'ok' : 'fault',
      detail: customRes.ok ? `reachable · ${customRes.ms} ms` : `unreachable · ${customRes.err}`
    });
  }

  const httpsStatus = httpsRes.ok ? (httpsRes.status < 400 ? 'ok' : 'amber') : 'fault';
  checks.push({
    name: 'HTTPS response',
    status: httpsStatus,
    detail: httpsRes.status
      ? `HTTP ${httpsRes.status} · ${httpsRes.ms} ms`
      : `no response · ${httpsRes.err}`
  });

  let tlsStatus, tlsDetail;
  if (!tlsRes.ok && tlsRes.err) {
    tlsStatus = 'fault';
    tlsDetail = `failed · ${tlsRes.err}`;
  } else if (tlsRes.daysLeft <= 0) {
    tlsStatus = 'fault';
    tlsDetail = `EXPIRED ${Math.abs(tlsRes.daysLeft)}d ago · ${tlsRes.issuer}`;
  } else if (tlsRes.daysLeft <= 14) {
    tlsStatus = 'amber';
    tlsDetail = `expires in ${tlsRes.daysLeft}d · ${tlsRes.issuer}`;
  } else if (!tlsRes.authorized) {
    tlsStatus = 'amber';
    tlsDetail = `untrusted · ${tlsRes.authError || 'cert not trusted'}`;
  } else {
    tlsStatus = 'ok';
    tlsDetail = `valid · expires in ${tlsRes.daysLeft}d · ${tlsRes.issuer}`;
  }
  checks.push({ name: 'TLS certificate', status: tlsStatus, detail: tlsDetail });

  // ── Plain-English diagnosis ──
  if (!tcp443.ok && !tcp80.ok) {
    diagnosis = {
      rootCause: 'Host Unreachable',
      summary: `${host} resolves to ${resolvedIp}, but is not accepting connections on port 80 or 443. The host is likely down, firewalled, or only listening on a different port.`,
      confidence: 'High'
    };
  } else if (httpsStatus === 'fault') {
    diagnosis = {
      rootCause: 'Service Not Responding',
      summary: `${host} (${resolvedIp}) is reachable at the network level, but the web service did not return a valid HTTPS response. The port is open but the application may be down or misconfigured.`,
      confidence: 'Medium'
    };
  } else if (tlsStatus === 'fault') {
    diagnosis = {
      rootCause: 'TLS Certificate Problem',
      summary: `${host} responds, but its TLS certificate has a problem (${tlsDetail}). Users may see browser security warnings.`,
      confidence: 'High'
    };
  } else if (httpsStatus === 'amber' || tlsStatus === 'amber') {
    diagnosis = {
      rootCause: 'Reachable — Warnings',
      summary: `${host} (${resolvedIp}) is reachable and responding, but with warnings (see HTTP status / certificate). Worth a closer look but not down.`,
      confidence: 'Medium'
    };
  } else {
    diagnosis = {
      rootCause: 'Healthy',
      summary: `${host} (${resolvedIp}) resolves, is reachable on 443, returned HTTP ${httpsRes.status} in ${httpsRes.ms} ms, and has a valid TLS certificate. No problems detected from here.`,
      confidence: 'High'
    };
  }

  res.status(200).json({ target: host, resolvedIp, checks, diagnosis, durationMs: Date.now() - started });
};
