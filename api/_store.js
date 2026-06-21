// Shared ticket store backed by Upstash Redis (REST API, called via fetch).
// No npm dependency required. Works with either the Upstash-native env vars or
// the Vercel KV integration env vars — whichever the project has.
//
// Tickets are stored in a Redis HASH keyed by ticket id, so update / delete /
// resolve by id are single operations.

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

// Run a single Redis command, e.g. ['HSET', key, field, value].
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

const KEY = 'netpilot:tickets:h';

// HGETALL may come back as a flat [field, value, …] array or an object.
function parseHash(reply) {
  if (!reply) return [];
  let values = [];
  if (Array.isArray(reply)) {
    for (let i = 1; i < reply.length; i += 2) values.push(reply[i]);
  } else if (typeof reply === 'object') {
    values = Object.values(reply);
  }
  return values
    .map(s => { try { return JSON.parse(s); } catch (e) { return null; } })
    .filter(Boolean);
}

async function addTicket(ticket) {
  await redis(['HSET', KEY, ticket.id, JSON.stringify(ticket)]);
}

async function listTickets() {
  const list = parseHash(await redis(['HGETALL', KEY]));
  list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return list;
}

async function getTicket(id) {
  const s = await redis(['HGET', KEY, id]);
  if (!s) return null;
  try { return JSON.parse(s); } catch (e) { return null; }
}

async function updateTicket(ticket) {
  await redis(['HSET', KEY, ticket.id, JSON.stringify(ticket)]);
}

async function deleteTicket(id) {
  return (await redis(['HDEL', KEY, id])) > 0;
}

module.exports = {
  isConfigured, detectedCredentialKeys,
  addTicket, listTickets, getTicket, updateTicket, deleteTicket
};
