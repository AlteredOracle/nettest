let activeTicketId = null;

function init() {
  renderTicketList();
  selectTicket(tickets[0].id);
}

function renderTicketList() {
  const list = document.getElementById('ticket-list');
  list.innerHTML = tickets.map(t => `
    <div class="ticket-item ${activeTicketId === t.id ? 'active' : ''}"
         onclick="selectTicket('${t.id}')" data-id="${t.id}">
      <div class="ticket-meta">
        <span class="priority-dot ${t.priority}"></span>
        <span class="ticket-id">${t.id}</span>
        <span class="ticket-time">${t.time}</span>
      </div>
      <div class="ticket-title">${t.title}</div>
      <div class="ticket-user">${t.user} · ${t.location}</div>
    </div>
  `).join('');
}

function selectTicket(id) {
  activeTicketId = id;
  renderTicketList();
  const t = tickets.find(t => t.id === id);
  renderCenter(t);
  renderRightRail(t);
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

function renderLiveResults(data) {
  const diagType = data.diagnosis.rootCause === 'Healthy' ? 'ok'
    : data.diagnosis.confidence === 'High' && data.diagnosis.rootCause !== 'Reachable — Warnings' ? 'fault'
    : 'amber';
  const icon = diagType === 'ok' ? '✅' : diagType === 'amber' ? '⚠️' : '⛔';

  document.getElementById('live-results').innerHTML = `
    <div class="diagnosis-card ${diagType}">
      <div class="diagnosis-top">
        <div class="diagnosis-icon">${icon}</div>
        <div class="diagnosis-labels">
          <div class="diagnosis-root">${data.diagnosis.rootCause}</div>
          <div class="diagnosis-title">${data.target}${data.resolvedIp ? ' → ' + data.resolvedIp : ''}</div>
        </div>
        <div class="diagnosis-confidence">${data.diagnosis.confidence} confidence</div>
      </div>
      <div class="diagnosis-summary">${data.diagnosis.summary}</div>
    </div>

    <div class="diagnostics-card">
      <div class="section-title">Live results · ${data.durationMs} ms</div>
      <div class="diag-grid">
        ${data.checks.map(c => `
          <div class="diag-item ${c.status}">
            <div class="diag-dot ${c.status}"></div>
            <div class="diag-content">
              <div class="diag-name">${c.name}</div>
              <div class="diag-detail">${c.detail}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
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
