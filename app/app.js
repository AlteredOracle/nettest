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
