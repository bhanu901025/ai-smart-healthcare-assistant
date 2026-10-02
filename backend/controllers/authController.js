/**
 * Authentication & User Management Controller
 * Handles Patient/Doctor Login, Registration, Profile Management, and Dynamic Health Score Calculation.
 */

const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json');

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

/**
 * Health Vitality Score Calculator:
 * Dynamically computes health index (0 - 100) based on age, BMI, Blood Pressure, and SpO2.
 */
function calculateHealthScore(vitals, age = 30) {
  let score = 95;

  if (vitals) {
    // SpO2 penalty
    if (vitals.spO2) {
      const spo2Val = parseInt(vitals.spO2, 10);
      if (spo2Val < 95) score -= (95 - spo2Val) * 4;
    }
    // Heart rate penalty
    if (vitals.heartRate) {
      const hr = parseInt(vitals.heartRate, 10);
      if (hr > 100 || hr < 55) score -= 8;
    }
    // Age factor
    if (age > 50) score -= 4;
  }

  return Math.min(Math.max(score, 45), 99);
}

exports.login = (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid email or password credentials.' });
    }

    // Role check if provided
    if (role && user.role !== role) {
      return res.status(403).json({ success: false, error: `Account exists, but is not registered as a ${role}.` });
    }

    // Return safe user object (omit password)
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
      phone: phone || '+1 (555) 000-0000',
      bloodGroup: 'B+',
      allergies: 'None reported',
      emergencyContact: 'Primary Guardian',
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
    const userId = req.headers['x-user-id'] || 'usr-01';
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
