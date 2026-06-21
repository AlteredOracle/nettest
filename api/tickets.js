// NetPilot — ticket intake + shared queue.
//   GET    /api/tickets            → list tickets (newest first)
//   POST   /api/tickets            → { title, target, user, location }
//                                     runs real diagnostics, stores the ticket, returns it
//   PATCH  /api/tickets            → { id, status: 'open' | 'resolved' }  → update status
//   DELETE /api/tickets?id=TKT-…   → delete a ticket
const { runDiagnostics } = require('./_diagnostics.js');
const store = require('./_store.js');

function readBody(req) {
  return new Promise(resolve => {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'string') {
        try { return resolve(JSON.parse(req.body)); } catch (e) { return resolve({}); }
      }
      return resolve(req.body);
    }
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

function shortId() {
  return 'TKT-' + (Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 4)).toUpperCase();
}

function priorityFromDiagnosis(d) {
  if (!d) return 'medium';
  if (d.rootCause === 'Healthy') return 'low';
  if (d.rootCause === 'Reachable — Warnings') return 'medium';
  return 'high';
}

const clip = (v, n) => String(v || '').trim().slice(0, n);

module.exports = async (req, res) => {
  if (!store.isConfigured()) {
    res.status(503).json({
      error: 'Ticket storage is not configured. Create an Upstash Redis store in your Vercel project (Storage → Upstash → Redis) and redeploy.',
      detectedCredentialEnvVars: store.detectedCredentialKeys(),
      expected: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'or KV_REST_API_URL', 'KV_REST_API_TOKEN']
    });
    return;
  }

  try {
    if (req.method === 'GET') {
      const tickets = await store.listTickets();
      res.status(200).json({ tickets });
      return;
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const title = clip(body.title, 140);
      const target = clip(body.target, 253);
      const user = clip(body.user, 80) || 'Anonymous';
      const location = clip(body.location, 80) || '—';

      if (!title) { res.status(400).json({ error: 'A short description of the problem is required.' }); return; }
      if (!target) { res.status(400).json({ error: 'A target (host, IP, or URL) is required.' }); return; }

      const diagnostic = await runDiagnostics(target);
      if (diagnostic.error) { res.status(400).json({ error: diagnostic.error }); return; }

      const ticket = {
        id: shortId(),
        title, user, location,
        target: diagnostic.target,
        createdAt: new Date().toISOString(),
        status: 'open',
        resolvedAt: null,
        priority: priorityFromDiagnosis(diagnostic.diagnosis),
        diagnostic
      };
      await store.addTicket(ticket);
      res.status(201).json({ ticket });
      return;
    }

    const idParam = (req.query && req.query.id) ||
      (req.url && new URL(req.url, 'http://x').searchParams.get('id'));

    if (req.method === 'PATCH') {
      const body = await readBody(req);
      const id = clip(body.id || idParam, 40);
      const status = body.status === 'resolved' ? 'resolved' : 'open';
      if (!id) { res.status(400).json({ error: 'A ticket id is required.' }); return; }

      const ticket = await store.getTicket(id);
      if (!ticket) { res.status(404).json({ error: 'Ticket not found.' }); return; }

      ticket.status = status;
      ticket.resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
      await store.updateTicket(ticket);
      res.status(200).json({ ticket });
      return;
    }

    if (req.method === 'DELETE') {
      const id = clip(idParam, 40);
      if (!id) { res.status(400).json({ error: 'A ticket id is required.' }); return; }
      const ok = await store.deleteTicket(id);
      res.status(ok ? 200 : 404).json(ok ? { deleted: id } : { error: 'Ticket not found.' });
      return;
    }

    res.status(405).json({ error: 'Method not allowed.' });
  } catch (e) {
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
};
