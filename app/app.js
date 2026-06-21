let activeTicketId = null;
let liveTickets = [];

function init() {
  renderTicketList();
  selectTicket(tickets[0].id);
  loadLiveTickets();
}

// Pull the shared ticket queue from the server (Vercel + Redis). Silently
// no-ops on a plain static server or before storage is configured.
async function loadLiveTickets() {
  try {
    const res = await fetch('/api/tickets');
    if (!res.ok) return;
    const data = await res.json();
    liveTickets = Array.isArray(data.tickets) ? data.tickets : [];
    renderTicketList();
  } catch (e) { /* no /api backend — demo-only mode */ }
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function ticketTime(iso) {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch (e) { return ''; }
}

function renderTicketList() {
  const list = document.getElementById('ticket-list');
  const itemHtml = (t, isLive) => `
    <div class="ticket-item ${activeTicketId === t.id ? 'active' : ''}"
         onclick="selectTicket('${t.id}')" data-id="${t.id}">
      <div class="ticket-meta">
        <span class="priority-dot ${t.priority}"></span>
        <span class="ticket-id">${escapeHtml(t.id)}</span>
        ${isLive ? '<span class="live-tag">LIVE</span>' : ''}
        <span class="ticket-time">${isLive ? ticketTime(t.createdAt) : t.time}</span>
      </div>
      <div class="ticket-title">${escapeHtml(t.title)}</div>
      <div class="ticket-user">${escapeHtml(t.user)} · ${escapeHtml(t.location)}</div>
    </div>`;

  list.innerHTML =
    liveTickets.map(t => itemHtml(t, true)).join('') +
    tickets.map(t => itemHtml(t, false)).join('');

  const badge = document.querySelector('.badge-live');
  if (badge) badge.textContent = (liveTickets.length + tickets.length) + ' active';
}

function selectTicket(id) {
  activeTicketId = id;
  renderTicketList();
  const live = liveTickets.find(t => t.id === id);
  if (live) { renderLiveTicketCenter(live); return; }
  const t = tickets.find(t => t.id === id);
  renderCenter(t);
  renderRightRail(t);
}

// ── New-ticket intake form ──
function showNewTicketForm() {
  activeTicketId = null;
  renderTicketList();

  document.getElementById('center').innerHTML = `
    <div class="ticket-header-card">
      <div class="ticket-header-info">
        <div class="ticket-header-id">NEW · submit a network ticket</div>
        <div class="ticket-header-title">Report a problem</div>
        <div class="ticket-header-meta">
          <span>It's auto-diagnosed against the target the moment you submit.</span>
        </div>
      </div>
    </div>

    <div class="diagnostics-card">
      <div class="section-title">New ticket</div>
      <div class="form-grid">
        <label class="form-field full">
          <span class="form-label">What's the problem?</span>
          <input id="nt-title" class="live-input" placeholder="e.g. Can't reach the booking site" autocomplete="off" />
        </label>
        <label class="form-field full">
          <span class="form-label">Target to test — host, IP, or URL</span>
          <input id="nt-target" class="live-input" placeholder="e.g. booking.example.com"
                 onkeydown="if(event.key==='Enter')submitNewTicket()" autocomplete="off" />
        </label>
        <label class="form-field">
          <span class="form-label">Your name</span>
          <input id="nt-user" class="live-input" placeholder="e.g. Marcus Chen" autocomplete="off" />
        </label>
        <label class="form-field">
          <span class="form-label">Location</span>
          <input id="nt-location" class="live-input" placeholder="e.g. Floor 3, West Wing" autocomplete="off" />
        </label>
      </div>
      <div class="live-input-row" style="margin-top:14px">
        <button class="btn btn-primary" id="nt-submit" onclick="submitNewTicket()">Submit &amp; diagnose</button>
      </div>
      <div id="nt-error" class="live-hint"></div>
    </div>`;

  document.getElementById('right-rail').innerHTML = `
    <div class="right-section">
      <div class="right-section-title">How it works</div>
      <div class="affected-user-detail" style="line-height:1.7">
        On submit, NetPilot runs real DNS, TCP, HTTPS &amp; TLS checks against your
        target, attaches a plain-English verdict, and drops the ticket into the
        shared queue for the whole team.
      </div>
    </div>`;

  const el = document.getElementById('nt-title');
  if (el) el.focus();
}

async function submitNewTicket() {
  const title = document.getElementById('nt-title').value.trim();
  const target = document.getElementById('nt-target').value.trim();
  const user = document.getElementById('nt-user').value.trim();
  const location = document.getElementById('nt-location').value.trim();
  const errEl = document.getElementById('nt-error');
  const btn = document.getElementById('nt-submit');

  if (!title) { errEl.textContent = 'Please describe the problem.'; return; }
  if (!target) { errEl.textContent = 'Please enter a target to test.'; return; }

  btn.disabled = true;
  btn.textContent = 'Diagnosing…';
  errEl.textContent = '';

  try {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, target, user, location })
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      errEl.textContent = data.error || ('HTTP ' + res.status);
      btn.disabled = false;
      btn.textContent = 'Submit & diagnose';
      return;
    }

    liveTickets.unshift(data.ticket);
    selectTicket(data.ticket.id);
  } catch (e) {
    errEl.textContent = 'Could not submit — the /api backend only runs on Vercel (or via "vercel dev").';
    btn.disabled = false;
    btn.textContent = 'Submit & diagnose';
  }
}

// ── Render a stored live ticket (real diagnostic result) ──
function renderLiveTicketCenter(t) {
  const d = t.diagnostic;
  document.getElementById('center').innerHTML = `
    <div class="ticket-header-card">
      <div class="ticket-header-info">
        <div class="ticket-header-id">${escapeHtml(t.id)} · opened ${ticketTime(t.createdAt)} · live ticket</div>
        <div class="ticket-header-title">${escapeHtml(t.title)}</div>
        <div class="ticket-header-meta">
          <span>👤 ${escapeHtml(t.user)}</span>
          <span>📍 ${escapeHtml(t.location)}</span>
          <span>🎯 <span style="font-family:var(--mono)">${escapeHtml(t.target)}</span></span>
        </div>
      </div>
    </div>
    ${diagnosticHtml(d)}
    <div class="actions-row">
      <button class="btn btn-secondary" onclick="showNewTicketForm()">+ New ticket</button>
    </div>`;

  document.getElementById('right-rail').innerHTML = `
    <div class="right-section">
      <div class="right-section-title">Ticket detail</div>
      <div class="affected-user-detail" style="line-height:1.9">
        <strong>ID</strong> ${escapeHtml(t.id)}<br>
        <strong>Opened</strong> ${escapeHtml(new Date(t.createdAt).toLocaleString())}<br>
        <strong>Target</strong> <span style="font-family:var(--mono)">${escapeHtml(t.target)}</span><br>
        <strong>Verdict</strong> ${escapeHtml(d.diagnosis.rootCause)}
      </div>
    </div>`;
}

// ── Live network check (real diagnostics via /api/diagnose) ──
function showLiveCheck() {
  activeTicketId = null;
  renderTicketList();

  document.getElementById('center').innerHTML = `
    <div class="ticket-header-card">
      <div class="ticket-header-info">
        <div class="ticket-header-id">LIVE · real-time network diagnostic</div>
        <div class="ticket-header-title">Run a live check</div>
        <div class="ticket-header-meta">
          <span>Real DNS, TCP, HTTPS &amp; TLS checks run from the server — not mock data.</span>
        </div>
      </div>
    </div>

    <div class="diagnostics-card">
      <div class="section-title">Target</div>
      <div class="live-input-row">
        <input id="live-target" class="live-input" placeholder="e.g. example.com, 1.1.1.1, or host:8443"
               onkeydown="if(event.key==='Enter')runLiveDiagnostic()" autocomplete="off" />
        <button class="btn btn-primary" id="live-run" onclick="runLiveDiagnostic()">Run diagnostic</button>
      </div>
      <div class="live-hint">Tip: ICMP ping &amp; traceroute aren't available on Vercel — a TCP connect is used as the reachability test instead.</div>
    </div>

    <div id="live-results"></div>
  `;

  document.getElementById('right-rail').innerHTML = `
    <div class="right-section">
      <div class="right-section-title">What this checks</div>
      <div class="affected-user-detail" style="line-height:1.7">
        <strong>DNS</strong> — does the name resolve?<br>
        <strong>TCP :443 / :80</strong> — is the host reachable?<br>
        <strong>HTTPS</strong> — does the service respond?<br>
        <strong>TLS</strong> — is the certificate valid?
      </div>
    </div>`;

  const input = document.getElementById('live-target');
  if (input) input.focus();
}

async function runLiveDiagnostic() {
  const input = document.getElementById('live-target');
  const btn = document.getElementById('live-run');
  const results = document.getElementById('live-results');
  const target = input.value.trim();

  if (!target) {
    results.innerHTML = '<div class="no-data">Enter a hostname, IP, or URL first.</div>';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Running…';
  results.innerHTML = '<div class="live-loading">Running real diagnostics…</div>';

  try {
    const res = await fetch('/api/diagnose?target=' + encodeURIComponent(target));
    const data = await res.json();

    if (!res.ok || data.error) {
      results.innerHTML = `<div class="diag-item fault"><div class="diag-dot fault"></div>
        <div class="diag-content"><div class="diag-name">Could not run check</div>
        <div class="diag-detail">${(data && data.error) || ('HTTP ' + res.status)}</div></div></div>`;
      return;
    }

    renderLiveResults(data);
  } catch (e) {
    results.innerHTML = `<div class="diag-item fault"><div class="diag-dot fault"></div>
      <div class="diag-content"><div class="diag-name">API not reachable</div>
      <div class="diag-detail">The /api/diagnose function only runs on Vercel or via "vercel dev" — not a plain static server.</div></div></div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run diagnostic';
  }
}

// Shared renderer for a diagnostic result (used by live check + live tickets).
function diagnosticHtml(data) {
  const diagType = data.diagnosis.rootCause === 'Healthy' ? 'ok'
    : data.diagnosis.rootCause === 'Reachable — Warnings' ? 'amber'
    : data.diagnosis.confidence === 'High' ? 'fault' : 'amber';
  const icon = diagType === 'ok' ? '✅' : diagType === 'amber' ? '⚠️' : '⛔';

  return `
    <div class="diagnosis-card ${diagType}">
      <div class="diagnosis-top">
        <div class="diagnosis-icon">${icon}</div>
        <div class="diagnosis-labels">
          <div class="diagnosis-root">${escapeHtml(data.diagnosis.rootCause)}</div>
          <div class="diagnosis-title">${escapeHtml(data.target)}${data.resolvedIp ? ' → ' + escapeHtml(data.resolvedIp) : ''}</div>
        </div>
        <div class="diagnosis-confidence">${escapeHtml(data.diagnosis.confidence)} confidence</div>
      </div>
      <div class="diagnosis-summary">${escapeHtml(data.diagnosis.summary)}</div>
    </div>

    <div class="diagnostics-card">
      <div class="section-title">Live results · ${data.durationMs} ms</div>
      <div class="diag-grid">
        ${data.checks.map(c => `
          <div class="diag-item ${c.status}">
            <div class="diag-dot ${c.status}"></div>
            <div class="diag-content">
              <div class="diag-name">${escapeHtml(c.name)}</div>
              <div class="diag-detail">${escapeHtml(c.detail)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderLiveResults(data) {
  document.getElementById('live-results').innerHTML = diagnosticHtml(data);
}

function renderCenter(t) {
  const center = document.getElementById('center');

  const diagType = t.diagnosis.rootCause === 'Not a Network Issue' ? 'ok'
    : t.diagnosis.confidence === 'High' ? 'fault' : 'amber';

  center.innerHTML = `
    <!-- Ticket header -->
    <div class="ticket-header-card">
      <div class="ticket-header-info">
        <div class="ticket-header-id">${t.id} · opened ${t.time} · ${t.type}</div>
        <div class="ticket-header-title">${t.title}</div>
        <div class="ticket-header-meta">
          <span>👤 ${t.user}</span>
          <span>📍 ${t.location}</span>
          <span>🖥 <span style="font-family:var(--mono)">${t.ip}</span></span>
        </div>
      </div>
    </div>

    <!-- Diagnosis -->
    <div class="diagnosis-card ${diagType}">
      <div class="diagnosis-top">
        <div class="diagnosis-icon">${t.diagnosis.icon}</div>
        <div class="diagnosis-labels">
          <div class="diagnosis-root">${t.diagnosis.rootCause}</div>
          <div class="diagnosis-title">${t.diagnosis.summary.split('.')[0]}.</div>
        </div>
        <div class="diagnosis-confidence">${t.diagnosis.confidence} confidence</div>
      </div>
      <div class="diagnosis-summary">${t.diagnosis.summary}</div>
    </div>

    <!-- Topology -->
    <div class="topology-card">
      <div class="section-title">Network path · hop chain</div>
      <div class="hop-chain">
        ${t.topology.map((hop, i) => `
          <div class="hop-node">
            <div class="hop-icon ${hop.status}">${hopIcon(hop.type)}</div>
            <div class="hop-label">${hop.label}</div>
            <div class="hop-sublabel">${hop.sublabel}</div>
          </div>
          ${i < t.topology.length - 1 ? `<div class="hop-connector ${connectorStatus(t.topology[i], t.topology[i+1])}"></div>` : ''}
        `).join('')}
      </div>
    </div>

    <!-- Diagnostics grid -->
    <div class="diagnostics-card">
      <div class="section-title">Diagnostic sweep</div>
      <div class="diag-grid">
        ${t.diagnostics.map(d => `
          <div class="diag-item ${d.status}">
            <div class="diag-dot ${d.status}"></div>
            <div class="diag-content">
              <div class="diag-name">${d.name}</div>
              <div class="diag-detail">${d.detail}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Actions -->
    <div class="actions-row">
      <button class="btn btn-primary" onclick="alert('Escalation packet generated and attached to ${t.id}.')">
        ↑ Escalate to Tier 3
      </button>
      <button class="btn btn-secondary" onclick="alert('Opening related tickets view...')">
        View related tickets
      </button>
    </div>
  `;
}

function hopIcon(type) {
  return { user: '👤', ap: '📡', switch: '🔀', wan: '🌐' }[type] || '●';
}

function connectorStatus(a, b) {
  if (a.status === 'fault' || b.status === 'fault') return 'fault';
  return '';
}

function renderRightRail(t) {
  const rail = document.getElementById('right-rail');

  const similarHtml = t.similarTickets.map(s => `
    <div class="similar-ticket">
      <div class="similar-ticket-header">
        <span class="similar-ticket-id">${s.id}</span>
        <span class="match-badge">${s.match}% match</span>
      </div>
      <div class="similar-ticket-title">${s.title}</div>
      <div class="similar-ticket-resolution">"${s.resolution}"</div>
      <div class="similar-ticket-ago">${s.daysAgo} days ago</div>
    </div>
  `).join('');

  const affectedHtml = t.affectedUsers.length ? t.affectedUsers.map(u => `
    <div class="affected-user">
      <div class="user-avatar">${u.name.split(' ').map(n => n[0]).join('')}</div>
      <div>
        <div class="affected-user-name">${u.name}</div>
        <div class="affected-user-detail">${u.detail}</div>
      </div>
    </div>
  `).join('') : '<div class="no-data">No other users affected</div>';

  rail.innerHTML = `
    <div class="right-section">
      <div class="right-section-title">Similar past tickets</div>
      ${similarHtml}
    </div>
    <div class="right-section">
      <div class="right-section-title">Other affected users</div>
      ${affectedHtml}
    </div>
    <div class="right-section">
      <div class="right-section-title">Port / link history</div>
      <span class="port-history-link" onclick="openPortHistory('${t.id}')">
        View ${t.portHistory.switch} ${t.portHistory.port} event log →
      </span>
    </div>
  `;
}

function openPortHistory(ticketId) {
  const t = tickets.find(t => t.id === ticketId);
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  modalTitle.textContent = `${t.portHistory.switch} · ${t.portHistory.port} — Event History`;
  modalBody.innerHTML = t.portHistory.events.map(e => `
    <div class="port-event">
      <div class="port-event-time">${e.time}</div>
      <div class="port-event-dot ${e.type}"></div>
      <div class="port-event-text">${e.event}</div>
    </div>
  `).join('');

  modal.classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', init);
