/**
 * Doctor Controller
 * Serves doctor directory, specialty filters, and availability status.
 */

const fs = require('fs');
const path = require('path');

const DOCTORS_PATH = path.join(__dirname, '..', 'data', 'doctors.json');

function getDoctors() {
  try {
    if (fs.existsSync(DOCTORS_PATH)) {
      return JSON.parse(fs.readFileSync(DOCTORS_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading doctors file:', err);
  }
  return [];
}

exports.getAllDoctors = (req, res) => {
  try {
    let doctors = getDoctors();
    const { specialty, search, minRating } = req.query;

    if (specialty && specialty !== 'All') {
      doctors = doctors.filter(d => 
        d.specialty.toLowerCase() === specialty.toLowerCase() ||
        d.specialty.toLowerCase().includes(specialty.toLowerCase())
      );
    }

    if (search) {
      const q = search.toLowerCase();
      doctors = doctors.filter(d => 
        d.name.toLowerCase().includes(q) ||
        d.hospital.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q)
      );
    }

    if (minRating) {
      const rating = parseFloat(minRating);
      if (!isNaN(rating)) {
        doctors = doctors.filter(d => d.rating >= rating);
      }
    }

    return res.json({
      success: true,
      count: doctors.length,
      doctors
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDoctorById = (req, res) => {
  try {
    const { id } = req.params;
    const doctors = getDoctors();
    const doctor = doctors.find(d => d.id === id);

    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor not found.' });
    }

    return res.json({ success: true, doctor });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSpecialties = (req, res) => {
  try {
    const doctors = getDoctors();
    const map = {};

    doctors.forEach(d => {
      map[d.specialty] = (map[d.specialty] || 0) + 1;
    });

    const specialties = Object.keys(map).map(s => ({
      name: s,
      doctorCount: map[s]
    }));

    return res.json({
      success: true,
      count: specialties.length,
      specialties
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
