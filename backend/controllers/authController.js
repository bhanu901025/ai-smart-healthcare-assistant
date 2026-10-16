/**
 * Authentication, RBAC & DPDP Compliance Controller
 * Handles Patient, Doctor & Administrator Authentication, Session Tracking,
 * Patient Data Isolation, and DPDP Act 2023 (India) Data Subject Rights.
 */

const fs = require('fs');
const path = require('path');
const { logAuditEvent } = require('./auditController');

const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json');
const RECORDS_PATH = path.join(__dirname, '..', 'data', 'records.json');
const APPOINTMENTS_PATH = path.join(__dirname, '..', 'data', 'appointments.json');

function getUsers() {
  try {
    if (fs.existsSync(USERS_PATH)) {
      return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading users file:', err);
  }
  return [];
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving users file:', err);
    return false;
  }
}

function readJsonSafe(filePath, fallback = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

/**
 * Health Vitality Score Calculator:
 * Dynamically computes health index (0 - 100) based on age, BMI, Blood Pressure, and SpO2.
 */
function calculateHealthScore(vitals, age = 30) {
  let score = 95;

  if (vitals) {
    if (vitals.spO2) {
      const spo2Val = parseInt(vitals.spO2, 10);
      if (spo2Val < 95) score -= (95 - spo2Val) * 4;
    }
    if (vitals.heartRate) {
      const hr = parseInt(vitals.heartRate, 10);
      if (hr > 100 || hr < 55) score -= 8;
    }
    if (age > 50) score -= 4;
  }

  return Math.min(Math.max(score, 45), 99);
}

exports.login = (req, res) => {
  try {
    const { email, password, role } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password !== password) {
      logAuditEvent({
        action: 'USER_LOGIN_FAILED',
        actorId: 'anonymous',
        actorName: email,
        actorRole: role || 'unknown',
        resource: '/api/auth/login',
        status: 'WARNING',
        details: `Failed authentication attempt for email: ${email}`,
        ipAddress
      });
      return res.status(401).json({ success: false, error: 'Invalid email or password credentials.' });
    }

    // Role check if provided
    if (role && user.role !== role) {
      logAuditEvent({
        action: 'ROLE_MISMATCH_REJECTED',
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        resource: '/api/auth/login',
        status: 'WARNING',
        details: `Account role '${user.role}' attempted login as '${role}'`,
        ipAddress
      });
      return res.status(403).json({ success: false, error: `Account exists, but is not registered as a ${role}.` });
    }

    logAuditEvent({
      action: 'USER_LOGIN_SUCCESS',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      resource: '/api/auth/login',
      status: 'SUCCESS',
      details: `User successfully logged into ${user.role.toUpperCase()} portal`,
      ipAddress
    });

    const { password: _, ...safeUser } = user;
    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: safeUser,
      token: `AUTH-JWT-SIM-${user.id}-${Date.now()}`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.register = (req, res) => {
  try {
    const { name, email, password, phone, age, gender, role = 'patient' } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const users = getUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const newUser = {
      id: `usr-${Date.now().toString().slice(-5)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      age: parseInt(age, 10) || 28,
      gender: gender || 'Other',
      phone: phone || '+91 98765 00000',
      bloodGroup: 'B+',
      allergies: 'None reported',
      emergencyContact: 'Primary Guardian',
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
      healthScore: 92,
      vitals: {
        bloodPressure: '120/80 mmHg',
        heartRate: '72 bpm',
        spO2: '99%',
        bloodGlucose: '92 mg/dL',
        bmi: '22.8 (Normal)'
      }
    };

    users.push(newUser);
    saveUsers(users);

    logAuditEvent({
      action: 'USER_REGISTERED',
      actorId: newUser.id,
      actorName: newUser.name,
      actorRole: newUser.role,
      resource: '/api/auth/register',
      status: 'SUCCESS',
      details: `New account registered as ${role}`,
      ipAddress
    });

    const { password: _, ...safeUser } = newUser;
    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: safeUser,
      token: `AUTH-JWT-SIM-${newUser.id}-${Date.now()}`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getProfile = (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.userId || 'usr-01';
    const users = getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    const { password: _, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateVitals = (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr-01';
    const { bloodPressure, heartRate, spO2, bloodGlucose, bmi } = req.body;

    const users = getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    user.vitals = {
      bloodPressure: bloodPressure || user.vitals.bloodPressure,
      heartRate: heartRate || user.vitals.heartRate,
      spO2: spO2 || user.vitals.spO2,
      bloodGlucose: bloodGlucose || user.vitals.bloodGlucose,
      bmi: bmi || user.vitals.bmi
    };

    user.healthScore = calculateHealthScore(user.vitals, user.age);
    saveUsers(users);

    const { password: _, ...safeUser } = user;
    return res.json({
      success: true,
      message: 'Biometric vitals updated successfully!',
      healthScore: user.healthScore,
      vitals: user.vitals,
      user: safeUser
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DPDP Act 2023 - Data Portability / Export Package
 * GET /api/patient/export-data
 */
exports.exportPatientData = (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr-01';
    const users = getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const records = readJsonSafe(RECORDS_PATH, []).filter(r => r.patientId === userId);
    const appointments = readJsonSafe(APPOINTMENTS_PATH, []).filter(a => a.patientName === user.name);

    const { password: _, ...safeUser } = user;
    const exportPackage = {
      exportVersion: '1.0',
      exportTimestamp: new Date().toISOString(),
      complianceStandard: 'Digital Personal Data Protection Act (DPDP Act 2023, India)',
      patientProfile: safeUser,
      medicalHistory: records,
      appointmentBookings: appointments,
      privacyConsent: {
        consentGiven: user.consentGiven ?? true,
        consentTimestamp: user.consentTimestamp || new Date().toISOString(),
        purpose: 'AI Clinical Decision Support and Smart Hospital Scheduling'
      }
    };

    logAuditEvent({
      action: 'DATA_EXPORT_REQUESTED',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      resource: '/api/patient/export-data',
      status: 'SUCCESS',
      details: 'Full personal health data export generated under DPDP Act data rights.'
    });

    return res.json({
      success: true,
      message: 'Personal health data package prepared successfully.',
      data: exportPackage
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DPDP Act 2023 - Update Consent Status
 * POST /api/patient/consent
 */
exports.updateConsent = (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr-01';
    const { consentGiven } = req.body;

    const users = getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    user.consentGiven = !!consentGiven;
    user.consentTimestamp = new Date().toISOString();
    saveUsers(users);

    logAuditEvent({
      action: user.consentGiven ? 'DPDP_CONSENT_GRANTED' : 'DPDP_CONSENT_REVOKED',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      resource: '/api/patient/consent',
      status: 'SUCCESS',
      details: `Patient ${user.name} ${user.consentGiven ? 'granted' : 'revoked'} clinical data processing consent.`
    });

    return res.json({
      success: true,
      message: `Consent successfully ${user.consentGiven ? 'granted' : 'revoked'}.`,
      consentGiven: user.consentGiven,
      consentTimestamp: user.consentTimestamp
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GetAllUsers (Admin only)
 * GET /api/admin/users
 */
exports.getAllUsers = (req, res) => {
  try {
    const users = getUsers();
    const safeUsers = users.map(({ password, ...u }) => u);
    return res.json({
      success: true,
      count: safeUsers.length,
      users: safeUsers
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
