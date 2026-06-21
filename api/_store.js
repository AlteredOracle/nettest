// Shared ticket store backed by Upstash Redis (REST API, called via fetch).
// No npm dependency required. Works with either the Upstash-native env vars or
// the Vercel KV integration env vars — whichever the project has.

function creds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

function isConfigured() {
  return !!creds();
}

// Names (never values) of any Redis/KV/Upstash env vars Vercel injected.
// Safe to surface — helps diagnose a name mismatch without leaking secrets.
function detectedCredentialKeys() {
  return Object.keys(process.env).filter(k => /(REDIS|KV|UPSTASH)/i.test(k)).sort();
}

// Run a single Redis command, e.g. ['LPUSH', key, value].
async function redis(command) {
  const c = creds();
  if (!c) throw new Error('NO_STORE');
  const res = await fetch(c.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`Redis error: ${data.error || 'HTTP ' + res.status}`);
  }
  return data.result;
}

const KEY = 'netpilot:tickets';
const MAX = 200;

async function addTicket(ticket) {
  await redis(['LPUSH', KEY, JSON.stringify(ticket)]);
  await redis(['LTRIM', KEY, '0', String(MAX - 1)]); // keep the list bounded
}

async function listTickets() {
  const arr = await redis(['LRANGE', KEY, '0', String(MAX - 1)]);
  return (arr || [])
    .map(s => { try { return JSON.parse(s); } catch (e) { return null; } })
    .filter(Boolean);
}

module.exports = { isConfigured, detectedCredentialKeys, addTicket, listTickets };
