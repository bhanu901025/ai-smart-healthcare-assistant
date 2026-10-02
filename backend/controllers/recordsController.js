/**
 * Patient Health Records (EHR) Controller
 * Serves diagnostic history, medical prescriptions, laboratory notes, and export summaries.
 */

const fs = require('fs');
const path = require('path');

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
    const { patientId = 'usr-01', search } = req.query;
    let records = getRecords().filter(r => r.patientId === patientId);

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
    const records = getRecords();
    const record = records.find(r => r.id === id);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Medical record not found.' });
    }

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

    return res.status(201).json({
      success: true,
      message: 'Clinical diagnostic record archived to Patient EHR.',
      record: newRecord
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
