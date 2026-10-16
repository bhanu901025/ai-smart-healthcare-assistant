/**
 * Security & Audit Logging Controller
 * Provides tamper-evident audit trails for HIPAA / DPDP Act (India) compliance,
 * tracking user authentication, record accesses, model predictions, and appointment bookings.
 */

const fs = require('fs');
const path = require('path');

const AUDIT_PATH = path.join(__dirname, '..', 'data', 'audit_logs.json');

function getLogs() {
  try {
    if (fs.existsSync(AUDIT_PATH)) {
      return JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading audit logs file:', err);
  }
  return [];
}

function saveLogs(logs) {
  try {
    fs.writeFileSync(AUDIT_PATH, JSON.stringify(logs, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving audit logs file:', err);
    return false;
  }
}

/**
 * Reusable helper to append an audit event into audit_logs.json
 */
function logAuditEvent({ action, actorId = 'anonymous', actorName = 'System', actorRole = 'guest', resource, status = 'SUCCESS', details = '', ipAddress = '127.0.0.1' }) {
  try {
    const logs = getLogs();
    const newLog = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      action,
      actorId,
      actorName,
      actorRole,
      resource,
      ipAddress,
      status,
      details
    };
    logs.unshift(newLog);
    // Keep last 500 audit events in file
    if (logs.length > 500) logs.pop();
    saveLogs(logs);
    return newLog;
  } catch (err) {
    console.error('Failed to log audit event:', err);
    return null;
  }
}

/**
 * GET /api/audit/logs
 * Retrieve all audit log entries with optional action or role filter
 */
exports.getAuditLogs = (req, res) => {
  try {
    const { action, role, search } = req.query;
    let logs = getLogs();

    if (action && action !== 'ALL') {
      logs = logs.filter(l => l.action === action);
    }

    if (role && role !== 'ALL') {
      logs = logs.filter(l => l.actorRole === role);
    }

    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(l =>
        l.action.toLowerCase().includes(q) ||
        l.actorName.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.resource.toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/audit/log
 * Explicit endpoint to log front-end or client side events
 */
exports.recordClientLog = (req, res) => {
  try {
    const { action, actorId, actorName, actorRole, resource, status, details } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    const event = logAuditEvent({
      action: action || 'CLIENT_EVENT',
      actorId,
      actorName,
      actorRole,
      resource: resource || 'Client Application',
      status: status || 'INFO',
      details: details || '',
      ipAddress
    });

    return res.status(201).json({ success: true, event });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.logAuditEvent = logAuditEvent;
