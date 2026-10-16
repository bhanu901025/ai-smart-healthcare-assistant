/**
 * Patient Health Records (EHR) Controller
 * Serves diagnostic history, medical prescriptions, laboratory notes, and export summaries.
 * Enforces role-based patient record isolation & audit tracking.
 */

const fs = require('fs');
const path = require('path');
const { logAuditEvent } = require('./auditController');

const RECORDS_PATH = path.join(__dirname, '..', 'data', 'records.json');

function getRecords() {
  try {
    if (fs.existsSync(RECORDS_PATH)) {
      return JSON.parse(fs.readFileSync(RECORDS_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading records file:', err);
  }
  return [];
}

function saveRecords(records) {
  try {
    fs.writeFileSync(RECORDS_PATH, JSON.stringify(records, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving records file:', err);
    return false;
  }
}

exports.getPatientRecords = (req, res) => {
  try {
    const callerId = req.headers['x-user-id'] || 'usr-01';
    const callerRole = req.headers['x-user-role'] || 'patient';
    const { patientId, search } = req.query;

    let records = getRecords();

    // Patient record isolation: Patients can strictly view only their own records
    if (callerRole === 'patient') {
      records = records.filter(r => r.patientId === callerId);
    } else if (patientId) {
      records = records.filter(r => r.patientId === patientId);
    }

    if (search) {
      const q = search.toLowerCase();
      records = records.filter(r =>
        r.diagnosis.toLowerCase().includes(q) ||
        r.doctorName.toLowerCase().includes(q) ||
        r.specialty.toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      count: records.length,
      records
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getRecordById = (req, res) => {
  try {
    const { id } = req.params;
    const callerId = req.headers['x-user-id'] || 'usr-01';
    const callerRole = req.headers['x-user-role'] || 'patient';
    const callerName = req.headers['x-user-name'] || 'User';

    const records = getRecords();
    const record = records.find(r => r.id === id);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Medical record not found.' });
    }

    // Patient record isolation check
    if (callerRole === 'patient' && record.patientId !== callerId) {
      logAuditEvent({
        action: 'UNAUTHORIZED_RECORD_ACCESS_ATTEMPT',
        actorId: callerId,
        actorName: callerName,
        actorRole: callerRole,
        resource: `/api/records/${id}`,
        status: 'FORBIDDEN',
        details: `Patient attempted to access unauthorized record ${id} belonging to patient ${record.patientId}`
      });
      return res.status(403).json({ success: false, error: 'Access denied: You are not authorized to view another patient\'s medical record.' });
    }

    logAuditEvent({
      action: 'EHR_RECORD_ACCESSED',
      actorId: callerId,
      actorName: callerName,
      actorRole: callerRole,
      resource: `/api/records/${id}`,
      status: 'SUCCESS',
      details: `EHR record ${id} viewed by ${callerRole} ${callerName}`
    });

    return res.json({ success: true, record });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.createRecord = (req, res) => {
  try {
    const {
      patientId = 'usr-01',
      patientName = 'Alexander Wright',
      diagnosis,
      doctorName = 'Dr. Sarah Jenkins',
      specialty = 'General Physician',
      hospital = 'Metro Health Institute',
      severity = 'Moderate',
      urgencyScore = 2,
      symptomsReported = [],
      prescriptions = [],
      clinicalNotes = 'Patient self-reported symptoms via AI Assistant'
    } = req.body;

    if (!diagnosis) {
      return res.status(400).json({ success: false, error: 'Diagnosis is required.' });
    }

    const records = getRecords();
    const newRecord = {
      id: `REC-2026-${String(records.length + 1).padStart(3, '0')}`,
      patientId,
      patientName,
      date: new Date().toISOString().split('T')[0],
      doctorName,
      specialty,
      hospital,
      diagnosis,
      severity,
      urgencyScore,
      symptomsReported,
      prescriptions: prescriptions.length > 0 ? prescriptions : [
        { medicine: "Rest & Hydration Protocol", dosage: "Ad libitum", duration: "5 days" }
      ],
      vitalSigns: {
        bloodPressure: "120/80 mmHg",
        heartRate: "72 bpm",
        spO2: "98%",
        temperature: "98.6 °F"
      },
      clinicalNotes,
      status: "Logged in EHR"
    };

    records.unshift(newRecord);
    saveRecords(records);

    logAuditEvent({
      action: 'EHR_RECORD_CREATED',
      actorId: patientId,
      actorName: patientName,
      actorRole: 'system',
      resource: `/api/records`,
      status: 'SUCCESS',
      details: `New diagnostic record ${newRecord.id} generated for ${diagnosis} (${severity})`
    });

    return res.status(201).json({
      success: true,
      message: 'Clinical diagnostic record archived to Patient EHR.',
      record: newRecord
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
