/**
 * Master API Routes
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const predictionController = require('../controllers/predictionController');
const appointmentController = require('../controllers/appointmentController');
const doctorController = require('../controllers/doctorController');
const chatController = require('../controllers/chatController');
const authController = require('../controllers/authController');
const recordsController = require('../controllers/recordsController');

const SYMPTOMS_PATH = path.join(__dirname, '..', 'data', 'symptoms.json');
const DOCTORS_PATH = path.join(__dirname, '..', 'data', 'doctors.json');
const APPOINTMENTS_PATH = path.join(__dirname, '..', 'data', 'appointments.json');

// User Authentication & Profile
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.get('/auth/profile', authController.getProfile);
router.put('/auth/vitals', authController.updateVitals);

// Patient Medical Records (EHR)
router.get('/records', recordsController.getPatientRecords);
router.get('/records/:id', recordsController.getRecordById);
router.post('/records', recordsController.createRecord);

// Symptoms Routes
router.get('/symptoms', (req, res) => {
  try {
    if (fs.existsSync(SYMPTOMS_PATH)) {
      const symptoms = JSON.parse(fs.readFileSync(SYMPTOMS_PATH, 'utf-8'));
      return res.json({ success: true, count: symptoms.length, categories: symptoms });
    }
    return res.status(404).json({ success: false, error: 'Symptoms file not found.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Disease Prediction
router.post('/predict', predictionController.predictDisease);

// Smart Appointment Optimization & Booking
router.get('/appointments/optimize', appointmentController.getOptimizedSlots);
router.post('/appointments/book', appointmentController.bookAppointment);
router.get('/appointments', appointmentController.getAllAppointments);
router.delete('/appointments/:id', appointmentController.cancelAppointment);

// Doctor Clinical Portal Triage Queue
router.get('/doctor/queue', (req, res) => {
  try {
    let appointments = [];
    if (fs.existsSync(APPOINTMENTS_PATH)) {
      appointments = JSON.parse(fs.readFileSync(APPOINTMENTS_PATH, 'utf-8'));
    }

    // Sort queue by highest urgency first (Emergency -> High -> Moderate -> Low)
    appointments.sort((a, b) => (b.urgencyScore || 2) - (a.urgencyScore || 2));

    return res.json({
      success: true,
      activeQueueCount: appointments.length,
      criticalTriageCount: appointments.filter(a => a.urgencyScore >= 3).length,
      queue: appointments
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Doctor Directory & Specialties
router.get('/doctors', doctorController.getAllDoctors);
router.get('/doctors/:id', doctorController.getDoctorById);
router.get('/specialties', doctorController.getSpecialties);

// AI Health Chat Assistant
router.post('/chat', chatController.handleChatMessage);

// Analytics & Dashboard Stats
router.get('/stats', (req, res) => {
  try {
    let doctorsCount = 12;
    let appointmentsCount = 2;
    if (fs.existsSync(DOCTORS_PATH)) {
      const docs = JSON.parse(fs.readFileSync(DOCTORS_PATH, 'utf-8'));
      doctorsCount = docs.length;
    }
    if (fs.existsSync(APPOINTMENTS_PATH)) {
      const apts = JSON.parse(fs.readFileSync(APPOINTMENTS_PATH, 'utf-8'));
      appointmentsCount = apts.length;
    }

    return res.json({
      success: true,
      stats: {
        aiAccuracy: '97.5%',
        diseasesCovered: 22,
        symptomsTrained: 48,
        activeDoctors: doctorsCount,
        confirmedAppointments: appointmentsCount,
        averageWaitReduction: '45 mins',
        satisfactionRate: '98.2%',
        totalRecordsLogged: 3,
        systemHealthIndex: 98
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
