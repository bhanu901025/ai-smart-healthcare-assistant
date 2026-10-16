/**
 * Administrator & Security Audit Dashboard
 * Real-time tamper-evident audit log stream, role management, and DPDP compliance monitor.
 */

async function loadAdminAuditPortal() {
  await Promise.all([loadAuditLogs(), loadAdminUsersList()]);
}

async function loadAuditLogs() {
  const tbody = document.getElementById('audit-logs-tbody');
  if (!tbody) return;

  const actionFilter = document.getElementById('audit-filter-action')?.value || 'ALL';
  const searchFilter = (document.getElementById('audit-search')?.value || '').toLowerCase().trim();

  tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 24px;"><i class="fa-solid fa-spinner fa-spin"></i> Retrieving cryptographically sealed audit events...</td></tr>`;

  try {
    let url = `/api/audit/logs?action=${encodeURIComponent(actionFilter)}`;
    if (searchFilter) url += `&search=${encodeURIComponent(searchFilter)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.success && data.logs) {
      const countEl = document.getElementById('audit-total-count');
      if (countEl) countEl.textContent = data.logs.length;

      if (data.logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 24px; color: var(--text-muted);">No audit events match current criteria.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.logs.map(log => {
        let badgeClass = 'badge-blue';
        if (log.status === 'WARNING' || log.status === 'CONFLICT') badgeClass = 'badge-amber';
        if (log.status === 'FORBIDDEN') badgeClass = 'badge-red';
        if (log.status === 'SUCCESS') badgeClass = 'badge-green';

        const timeFormatted = new Date(log.timestamp).toLocaleString();

        return `
          <tr>
            <td><span class="audit-id-tag">${escapeHtml(log.id)}</span></td>
            <td><small class="text-muted"><i class="fa-solid fa-clock"></i> ${timeFormatted}</small></td>
            <td><strong class="action-code">${escapeHtml(log.action)}</strong></td>
            <td>
              <div>${escapeHtml(log.actorName)}</div>
              <span class="user-role-badge role-${log.actorRole}">${log.actorRole}</span>
            </td>
            <td><span class="metric-pill ${badgeClass}">${log.status}</span></td>
            <td class="audit-details-cell" title="${escapeHtml(log.details)}">
              <span>${escapeHtml(log.details)}</span>
              <div class="audit-ip"><i class="fa-solid fa-network-wired"></i> ${escapeHtml(log.ipAddress)} • ${escapeHtml(log.resource)}</div>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading audit logs:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load audit logs stream.</td></tr>`;
  }
}

async function loadAdminUsersList() {
  const container = document.getElementById('admin-users-list');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/users');
    const data = await res.json();

    if (data.success && data.users) {
      container.innerHTML = data.users.map(u => {
        const isSelf = u.id === currentUser.id;
        return `
          <div class="admin-user-row glass-card">
            <div class="user-cell-meta">
              <div class="user-avatar-sm"><i class="fa-solid fa-user-shield"></i></div>
              <div>
                <strong>${escapeHtml(u.name)}</strong> ${isSelf ? '<span class="badge-self">Active Session</span>' : ''}
                <div class="text-muted text-xs">${escapeHtml(u.email)} • ID: ${u.id}</div>
              </div>
            </div>
            <div class="user-cell-role">
              <span class="user-role-badge role-${u.role}">${u.role.toUpperCase()}</span>
            </div>
            <div class="user-cell-dpdp">
              <span class="dpdp-status-pill ${u.consentGiven ? 'consented' : 'revoked'}">
                <i class="fa-solid fa-shield-halved"></i> DPDP: ${u.consentGiven ? 'Consented' : 'Revoked'}
              </span>
            </div>
            <div class="user-cell-actions">
              <button class="btn btn-outline btn-xs" onclick="inspectUserDetails('${u.id}')">
                <i class="fa-solid fa-magnifying-glass"></i> Inspect
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading admin users:', err);
  }
}

function inspectUserDetails(userId) {
  showToast(`Accessing cryptographic identity and data subject profile for ${userId}`, 'info');
}
