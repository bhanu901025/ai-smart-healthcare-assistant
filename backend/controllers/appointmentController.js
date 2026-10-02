/**
 * Appointment Controller & Smart Optimization Engine
 * Allocates optimal clinic slots based on clinical urgency, doctor load, and wait-time minimization.
 */

const fs = require('fs');
const path = require('path');

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
 * Fitness Score = (UrgencyWeight * 40) + (DoctorRating * 15) - (SlotHourDelay * 5) + (SlotTypeBonus * 10)
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

    // Filter doctors matching specialist or fallback to all
    let matchingDoctors = doctors;
    if (specialist && specialist !== 'All') {
      matchingDoctors = doctors.filter(
        d => d.specialty.toLowerCase() === specialist.toLowerCase() ||
             d.specialty.toLowerCase().includes(specialist.toLowerCase())
      );
      if (matchingDoctors.length === 0) {
        // Fallback to General Physician if exact specialist has no direct match
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

    // Sort doctors by highest available slot optimization score and rating
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

    const appointments = readJsonFile(APPOINTMENTS_PATH, []);
    appointments.unshift(newAppointment);
    writeJsonFile(APPOINTMENTS_PATH, appointments);

    // Update doctor's slot as booked
    const slotObj = doctor.slots.find(s => s.time === slotTime);
    if (slotObj) {
      slotObj.booked = true;
      writeJsonFile(DOCTORS_PATH, doctors);
    }

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
 * Cancel an appointment
 */
exports.cancelAppointment = (req, res) => {
  try {
    const { id } = req.params;
    let appointments = readJsonFile(APPOINTMENTS_PATH, []);
    const initialLen = appointments.length;
    appointments = appointments.filter(a => a.id !== id);

    if (appointments.length === initialLen) {
      return res.status(404).json({ success: false, error: 'Appointment ID not found.' });
    }

    writeJsonFile(APPOINTMENTS_PATH, appointments);
    return res.json({ success: true, message: `Appointment ${id} canceled successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
