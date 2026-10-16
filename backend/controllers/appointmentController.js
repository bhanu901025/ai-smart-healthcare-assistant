/**
 * Appointment Controller & Smart Optimization Engine
 * Allocates optimal clinic slots based on clinical urgency, doctor load, and wait-time minimization.
 * Implements strict Double-Booking Prevention (HTTP 409) and Rescheduling.
 */

const fs = require('fs');
const path = require('path');
const { logAuditEvent } = require('./auditController');

const APPOINTMENTS_PATH = path.join(__dirname, '..', 'data', 'appointments.json');
const DOCTORS_PATH = path.join(__dirname, '..', 'data', 'doctors.json');

function readJsonFile(filePath, fallback = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
    return false;
  }
}

/**
 * Smart Appointment Optimization Algorithm:
 * Evaluates candidate slots and ranks them using a multi-factor fitness scoring formula:
 * Fitness Score = (UrgencyWeight * 15) + (DoctorRating * 10) + SlotTypeBonus - (SlotHourDelay * 4)
 */
function optimizeSlotsForDoctor(doctor, urgencyScore = 2) {
  const urgencyMultiplier = Math.max(1, Math.min(urgencyScore, 4));
  
  return doctor.slots.map((slot, index) => {
    let slotTypeBonus = 0;
    if (slot.type.includes('Emergency') || slot.type.includes('Priority')) {
      slotTypeBonus = urgencyMultiplier >= 3 ? 25 : 5;
    } else if (slot.type.includes('Optimized Express')) {
      slotTypeBonus = 18;
    } else {
      slotTypeBonus = 8;
    }

    // Estimate wait time reduction based on slot characteristics
    let estimatedWaitMinutes = 15;
    let savedMinutesVsWalkin = 35;

    if (slot.type.includes('Emergency') || slot.type.includes('Priority')) {
      estimatedWaitMinutes = 5;
      savedMinutesVsWalkin = 55;
    } else if (slot.type.includes('Optimized Express')) {
      estimatedWaitMinutes = 10;
      savedMinutesVsWalkin = 45;
    } else {
      estimatedWaitMinutes = 20;
      savedMinutesVsWalkin = 30;
    }

    // Optimization Fitness Score (0 - 100)
    const baseScore = (urgencyMultiplier * 15) + (doctor.rating * 10) + slotTypeBonus - (index * 4);
    const normalizedScore = Math.min(Math.max(Math.round(baseScore), 40), 99);

    return {
      time: slot.time,
      type: slot.type,
      booked: slot.booked,
      optimizationScore: normalizedScore,
      estimatedWaitMinutes,
      savedMinutesVsWalkin,
      isRecommended: normalizedScore >= 80 && !slot.booked
    };
  });
}

/**
 * GET /api/appointments/optimize
 * Query params: specialist, urgency
 */
exports.getOptimizedSlots = (req, res) => {
  try {
    const { specialist, urgency = '2' } = req.query;
    const urgencyNum = parseInt(urgency, 10) || 2;
    const doctors = readJsonFile(DOCTORS_PATH, []);

    let matchingDoctors = doctors;
    if (specialist && specialist !== 'All') {
      matchingDoctors = doctors.filter(
        d => d.specialty.toLowerCase() === specialist.toLowerCase() ||
             d.specialty.toLowerCase().includes(specialist.toLowerCase())
      );
      if (matchingDoctors.length === 0) {
        matchingDoctors = doctors.filter(d => d.specialty === 'General Physician');
      }
    }

    const optimizedResults = matchingDoctors.map(doc => {
      const optimizedSlots = optimizeSlotsForDoctor(doc, urgencyNum);
      const recommendedSlot = optimizedSlots.find(s => s.isRecommended) || optimizedSlots.find(s => !s.booked);

      return {
        ...doc,
        optimizedSlots,
        bestRecommendedSlot: recommendedSlot || null,
        urgencyHandled: urgencyNum >= 3 ? 'High Priority Triage' : 'Standard Care Protocol'
      };
    });

    optimizedResults.sort((a, b) => {
      const scoreA = a.bestRecommendedSlot ? a.bestRecommendedSlot.optimizationScore : 0;
      const scoreB = b.bestRecommendedSlot ? b.bestRecommendedSlot.optimizationScore : 0;
      return scoreB - scoreA;
    });

    return res.json({
      success: true,
      urgencyScore: urgencyNum,
      targetSpecialist: specialist || 'All',
      totalAvailableDoctors: optimizedResults.length,
      averageWaitReductionMin: urgencyNum >= 3 ? '45-55 mins' : '30-40 mins',
      doctors: optimizedResults
    });
  } catch (err) {
    console.error('Error optimizing appointment slots:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/appointments/book
 * Body: { patientName, age, gender, phone, doctorId, slotTime, slotDate, predictedDisease, urgencyScore }
 * Enforces Double-Booking Prevention (HTTP 409)
 */
exports.bookAppointment = (req, res) => {
  try {
    const {
      patientName,
      age,
      gender,
      phone,
      doctorId,
      slotTime,
      slotDate = 'Today',
      predictedDisease = 'General Consultation',
      severity = 'Moderate',
      urgencyScore = 2
    } = req.body;

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!patientName || !phone || !doctorId || !slotTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required booking details (patientName, phone, doctorId, slotTime).'
      });
    }

    const doctors = readJsonFile(DOCTORS_PATH, []);
    const doctor = doctors.find(d => d.id === doctorId);

    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Selected doctor not found.' });
    }

    // STRICT DOUBLE-BOOKING CHECK 1: Check Doctor's Slot booked status
    const slotObj = doctor.slots.find(s => s.time === slotTime);
    if (!slotObj) {
      return res.status(400).json({ success: false, error: `Invalid slot time ${slotTime} for Dr. ${doctor.name}.` });
    }

    if (slotObj.booked) {
      logAuditEvent({
        action: 'DOUBLE_BOOKING_PREVENTED',
        actorId: 'usr-guest',
        actorName: patientName,
        actorRole: 'patient',
        resource: `/api/appointments/book`,
        status: 'CONFLICT',
        details: `Rejected double-booking attempt for Dr. ${doctor.name} at ${slotTime} (${slotDate}). Slot already reserved.`,
        ipAddress
      });

      return res.status(409).json({
        success: false,
        error: `Schedule Conflict: The slot at ${slotTime} for Dr. ${doctor.name} has already been reserved. Please select another time slot.`,
        conflictSlot: slotTime,
        doctor: doctor.name
      });
    }

    // STRICT DOUBLE-BOOKING CHECK 2: Check Active Appointments table
    const appointments = readJsonFile(APPOINTMENTS_PATH, []);
    const existingBooking = appointments.find(
      a => a.doctorId === doctorId && a.slotTime === slotTime && a.slotDate === slotDate && a.status === 'Confirmed'
    );

    if (existingBooking) {
      slotObj.booked = true; // Repair consistency if out of sync
      writeJsonFile(DOCTORS_PATH, doctors);

      return res.status(409).json({
        success: false,
        error: `Schedule Conflict: Dr. ${doctor.name} already has a confirmed patient at ${slotTime}. Please pick an alternate window.`,
        conflictSlot: slotTime
      });
    }

    // Generate distinctive appointment ID
    const randomHex = Math.floor(10000 + Math.random() * 90000);
    const appointmentId = `APT-${randomHex}`;

    const newAppointment = {
      id: appointmentId,
      patientName: patientName.trim(),
      age: parseInt(age, 10) || 30,
      gender: gender || 'Other',
      phone: phone.trim(),
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      hospital: doctor.hospital,
      location: doctor.location,
      slotTime,
      slotDate,
      predictedDisease,
      severity,
      urgencyScore: parseInt(urgencyScore, 10) || 2,
      optimizationType: urgencyScore >= 3 ? 'Priority Fast-Track Triage' : 'Smart Scheduled Slot',
      status: 'Confirmed',
      bookedAt: new Date().toISOString(),
      consultationFee: doctor.fee,
      qrToken: `MEDPASS-${appointmentId}-${Date.now().toString(36).toUpperCase()}`
    };

    appointments.unshift(newAppointment);
    writeJsonFile(APPOINTMENTS_PATH, appointments);

    // Update doctor's slot as booked
    slotObj.booked = true;
    writeJsonFile(DOCTORS_PATH, doctors);

    logAuditEvent({
      action: 'APPOINTMENT_SCHEDULED',
      actorId: 'usr-patient',
      actorName: patientName,
      actorRole: 'patient',
      resource: `/api/appointments/book`,
      status: 'SUCCESS',
      details: `Confirmed appointment ${appointmentId} with Dr. ${doctor.name} for ${slotTime} (${slotDate}). Urgency: ${urgencyScore}`,
      ipAddress
    });

    return res.status(201).json({
      success: true,
      message: 'Appointment successfully confirmed and optimized!',
      appointment: newAppointment
    });
  } catch (err) {
    console.error('Error booking appointment:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/appointments/:id/reschedule
 * Reschedule an existing appointment to a new slot
 */
exports.rescheduleAppointment = (req, res) => {
  try {
    const { id } = req.params;
    const { newSlotTime, newSlotDate = 'Today', newDoctorId } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!newSlotTime) {
      return res.status(400).json({ success: false, error: 'newSlotTime is required.' });
    }

    const appointments = readJsonFile(APPOINTMENTS_PATH, []);
    const appointmentIndex = appointments.findIndex(a => a.id === id);

    if (appointmentIndex === -1) {
      return res.status(404).json({ success: false, error: `Appointment ${id} not found.` });
    }

    const appt = appointments[appointmentIndex];
    const doctors = readJsonFile(DOCTORS_PATH, []);

    // Target doctor
    const targetDocId = newDoctorId || appt.doctorId;
    const targetDoctor = doctors.find(d => d.id === targetDocId);
    if (!targetDoctor) {
      return res.status(404).json({ success: false, error: 'Target doctor not found.' });
    }

    // Check if new slot is available
    const newSlotObj = targetDoctor.slots.find(s => s.time === newSlotTime);
    if (!newSlotObj) {
      return res.status(400).json({ success: false, error: `Slot ${newSlotTime} not offered by Dr. ${targetDoctor.name}.` });
    }

    if (newSlotObj.booked) {
      return res.status(409).json({
        success: false,
        error: `Slot ${newSlotTime} is already booked for Dr. ${targetDoctor.name}. Please select an alternate time.`
      });
    }

    // Free previous slot
    const prevDoctor = doctors.find(d => d.id === appt.doctorId);
    if (prevDoctor) {
      const prevSlotObj = prevDoctor.slots.find(s => s.time === appt.slotTime);
      if (prevSlotObj) {
        prevSlotObj.booked = false;
      }
    }

    // Book new slot
    newSlotObj.booked = true;
    writeJsonFile(DOCTORS_PATH, doctors);

    // Update appointment
    const previousTime = `${appt.slotDate} ${appt.slotTime}`;
    appt.doctorId = targetDoctor.id;
    appt.doctorName = targetDoctor.name;
    appt.specialty = targetDoctor.specialty;
    appt.hospital = targetDoctor.hospital;
    appt.slotTime = newSlotTime;
    appt.slotDate = newSlotDate;
    appt.status = 'Confirmed (Rescheduled)';
    appt.rescheduledAt = new Date().toISOString();

    appointments[appointmentIndex] = appt;
    writeJsonFile(APPOINTMENTS_PATH, appointments);

    logAuditEvent({
      action: 'APPOINTMENT_RESCHEDULED',
      actorId: 'usr-patient',
      actorName: appt.patientName,
      actorRole: 'patient',
      resource: `/api/appointments/${id}/reschedule`,
      status: 'SUCCESS',
      details: `Appointment ${id} moved from [${previousTime}] to [${newSlotDate} ${newSlotTime}] with Dr. ${targetDoctor.name}`,
      ipAddress
    });

    return res.json({
      success: true,
      message: `Appointment successfully rescheduled to ${newSlotTime}!`,
      appointment: appt
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/appointments
 * Retrieve all confirmed appointments
 */
exports.getAllAppointments = (req, res) => {
  try {
    const appointments = readJsonFile(APPOINTMENTS_PATH, []);
    return res.json({
      success: true,
      count: appointments.length,
      appointments
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /api/appointments/:id
 * Cancel an appointment and free the slot in doctors schedule
 */
exports.cancelAppointment = (req, res) => {
  try {
    const { id } = req.params;
    let appointments = readJsonFile(APPOINTMENTS_PATH, []);
    const appt = appointments.find(a => a.id === id);

    if (!appt) {
      return res.status(404).json({ success: false, error: 'Appointment ID not found.' });
    }

    // Free the doctor slot
    const doctors = readJsonFile(DOCTORS_PATH, []);
    const doctor = doctors.find(d => d.id === appt.doctorId);
    if (doctor) {
      const slotObj = doctor.slots.find(s => s.time === appt.slotTime);
      if (slotObj) {
        slotObj.booked = false;
        writeJsonFile(DOCTORS_PATH, doctors);
      }
    }

    // Remove or mark appointment as canceled
    appointments = appointments.filter(a => a.id !== id);
    writeJsonFile(APPOINTMENTS_PATH, appointments);

    logAuditEvent({
      action: 'APPOINTMENT_CANCELED',
      actorId: 'usr-patient',
      actorName: appt.patientName,
      actorRole: 'patient',
      resource: `/api/appointments/${id}`,
      status: 'SUCCESS',
      details: `Appointment ${id} canceled. Slot ${appt.slotTime} released for Dr. ${appt.doctorName}.`
    });

    return res.json({ success: true, message: `Appointment ${id} canceled successfully and slot released.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
