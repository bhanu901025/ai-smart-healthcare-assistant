/**
 * Appointment Module
 * Manages smart slot optimization, booking modal, digital passes, and doctor directory.
 */

let activeBookingDoctor = null;
let activeBookingSlot = null;

// Load optimized appointment slots
async function loadOptimizedSlots() {
  const container = document.getElementById('doctors-slots-grid');
  const specialty = document.getElementById('opt-specialty-filter')?.value || 'All';
  const urgency = document.getElementById('opt-urgency-filter')?.value || '2';

  // Update expected queue reduction badge
  const reductionBadge = document.getElementById('opt-queue-reduction');
  if (reductionBadge) {
    if (urgency === '4') reductionBadge.textContent = '50 - 60 Mins Saved (Emergency Fast-Track)';
    else if (urgency === '3') reductionBadge.textContent = '40 - 50 Mins Saved (Urgent Care Priority)';
    else if (urgency === '2') reductionBadge.textContent = '30 - 40 Mins Saved (Optimized Express)';
    else reductionBadge.textContent = '20 - 30 Mins Saved (Standard Window)';
  }

  container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Calculating optimal schedule allocations...</div>`;

  try {
    const res = await fetch(`/api/appointments/optimize?specialist=${encodeURIComponent(specialty)}&urgency=${urgency}`);
    const data = await res.json();

    if (data.success && data.doctors) {
      renderDoctorSlots(data.doctors);
    } else {
      container.innerHTML = `<div class="error-msg">No available doctor slots found for this specialty.</div>`;
    }
  } catch (err) {
    console.error('Error fetching optimized slots:', err);
    container.innerHTML = `<div class="error-msg">Failed to connect to appointment optimization engine.</div>`;
  }
}

// Render doctors with their optimized slots
function renderDoctorSlots(doctors) {
  const container = document.getElementById('doctors-slots-grid');
  if (!doctors || doctors.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon"><i class="fa-solid fa-user-slash"></i></div>
        <h3>No Matching Specialists Available</h3>
        <p>Try switching the specialty filter back to "All Medical Specialties" to view all certified physicians.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = doctors.map(doc => {
    return `
      <div class="doctor-card">
        <div class="doctor-profile-header">
          <img src="${doc.avatar}" alt="${escapeHtml(doc.name)}" class="doctor-avatar" onerror="this.src='https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300'">
          <div>
            <h3 class="doc-name">${escapeHtml(doc.name)}</h3>
            <div class="doc-specialty">${escapeHtml(doc.specialty)}</div>
            <div class="doc-qual">${escapeHtml(doc.qualifications)}</div>
          </div>
        </div>

        <div class="doctor-metrics-row">
          <div class="metric-item">⭐ <strong>${doc.rating}</strong> (${doc.total_reviews} reviews)</div>
          <div class="metric-item">🩺 <strong>${doc.experience} yrs</strong> exp</div>
          <div class="metric-item">💳 <strong>$${doc.fee}</strong> fee</div>
        </div>

        <div class="doc-hospital">
          <i class="fa-solid fa-location-dot"></i>
          <span>${escapeHtml(doc.hospital)} • ${escapeHtml(doc.location)}</span>
        </div>

        <div class="slots-section-title">
          <span>AI-Optimized Schedule</span>
          <span style="color: var(--success); font-weight: 700;">Zero Wait Queue</span>
        </div>

        <div class="slots-grid">
          ${doc.optimizedSlots.map(slot => {
            const isBooked = slot.booked;
            const isRec = slot.isRecommended;
            return `
              <button type="button" 
                class="slot-btn ${isRec ? 'recommended' : ''}" 
                ${isBooked ? 'disabled' : ''}
                onclick="openBookingModal('${doc.id}', '${slot.time}', ${doc.fee})">
                <div class="slot-time">${slot.time}</div>
                <div class="slot-tag">${slot.type}</div>
                <div class="slot-savings"><i class="fa-solid fa-clock"></i> ~${slot.savedMinutesVsWalkin}m saved</div>
              </button>
            `;
          }).join('')}
        </div>

        <button class="btn btn-secondary btn-sm" onclick="openBookingModal('${doc.id}', '${doc.optimizedSlots[0]?.time || '10:00 AM'}', ${doc.fee})" style="width: 100%;">
          <i class="fa-solid fa-calendar-check"></i> Book Quick Consultation
        </button>
      </div>
    `;
  }).join('');
}

// Open Booking Modal
async function openBookingModal(doctorId, slotTime, fee) {
  try {
    const res = await fetch(`/api/doctors/${doctorId}`);
    const data = await res.json();
    if (!data.success || !data.doctor) {
      showToast('Doctor details unavailable.', 'error');
      return;
    }

    activeBookingDoctor = data.doctor;
    activeBookingSlot = slotTime;

    const summaryBox = document.getElementById('modal-doctor-summary');
    summaryBox.innerHTML = `
      <img src="${activeBookingDoctor.avatar}" class="doctor-avatar" style="width: 48px; height: 48px;">
      <div>
        <h4 style="font-size: 1rem; margin-bottom: 2px;">${escapeHtml(activeBookingDoctor.name)}</h4>
        <div style="font-size: 0.82rem; color: var(--primary); font-weight: 600;">
          ${escapeHtml(activeBookingDoctor.specialty)} • ${slotTime} (Today)
        </div>
        <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(activeBookingDoctor.hospital)}</div>
      </div>
      <div style="margin-left: auto; text-align: right;">
        <span style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary);">$${activeBookingDoctor.fee}</span>
        <div style="font-size: 0.7rem; color: var(--text-muted);">Consultation</div>
      </div>
    `;

    document.getElementById('booking-modal').classList.add('open');
  } catch (err) {
    console.error('Error opening booking modal:', err);
  }
}

// Close Booking Modal
function closeBookingModal() {
  document.getElementById('booking-modal').classList.remove('open');
}

// Submit Booking Form
async function handleBookingSubmit(e) {
  e.preventDefault();
  if (!activeBookingDoctor || !activeBookingSlot) {
    showToast('Missing booking selection.', 'error');
    return;
  }

  const btn = document.getElementById('btn-confirm-booking');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Confirming & Encrypting Pass...`;

  const patientName = document.getElementById('book-patient-name').value;
  const phone = document.getElementById('book-phone').value;
  const age = document.getElementById('book-age').value;
  const gender = document.getElementById('book-gender').value;
  const reason = document.getElementById('book-reason').value;

  const payload = {
    patientName,
    phone,
    age,
    gender,
    doctorId: activeBookingDoctor.id,
    slotTime: activeBookingSlot,
    slotDate: 'Today',
    predictedDisease: reason || (latestPrediction ? latestPrediction.predicted_disease : 'Clinical Consultation'),
    severity: latestPrediction ? latestPrediction.severity : 'Moderate',
    urgencyScore: latestPrediction ? latestPrediction.urgency_score : 2
  };

  try {
    const res = await fetch('/api/appointments/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success && data.appointment) {
      closeBookingModal();
      showToast('Appointment successfully confirmed!', 'success');
      openPassModal(data.appointment);
      loadOptimizedSlots();
      loadMyAppointments();
    } else {
      showToast(data.error || 'Failed to book appointment slot.', 'error');
    }
  } catch (err) {
    console.error('Error during booking API call:', err);
    showToast('Server communication failure.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-check"></i> Confirm & Issue Digital Pass`;
  }
}

// Open Digital Pass Modal
function openPassModal(apt) {
  const content = document.getElementById('pass-content');
  content.innerHTML = `
    <div class="pass-row">
      <span class="pass-label">Appointment Pass ID:</span>
      <span class="pass-val" style="color: var(--primary); font-family: monospace;">${apt.id}</span>
    </div>
    <div class="pass-row">
      <span class="pass-label">Patient Name:</span>
      <span class="pass-val">${escapeHtml(apt.patientName)} (${apt.age} yrs, ${apt.gender})</span>
    </div>
    <div class="pass-row">
      <span class="pass-label">Attending Specialist:</span>
      <span class="pass-val">${escapeHtml(apt.doctorName)} (${escapeHtml(apt.specialty)})</span>
    </div>
    <div class="pass-row">
      <span class="pass-label">Hospital / Center:</span>
      <span class="pass-val">${escapeHtml(apt.hospital)}</span>
    </div>
    <div class="pass-row">
      <span class="pass-label">Scheduled Time Slot:</span>
      <span class="pass-val" style="color: var(--success); font-weight: 700;">${apt.slotDate} at ${apt.slotTime}</span>
    </div>
    <div class="pass-row">
      <span class="pass-label">Triage Allocation:</span>
      <span class="pass-val">${escapeHtml(apt.optimizationType)}</span>
    </div>
    <div class="pass-row">
      <span class="pass-label">Diagnostic Notes:</span>
      <span class="pass-val">${escapeHtml(apt.predictedDisease)}</span>
    </div>

    <!-- QR Code Graphic Simulation -->
    <div class="qr-code-simulation">
      <div class="qr-icon"><i class="fa-solid fa-qrcode"></i></div>
      <div class="qr-token-text">${apt.qrToken || 'MEDPASS-OPT-CONFIRMED'}</div>
      <small style="color: var(--text-muted); display: block; margin-top: 4px;">Present at hospital kiosk for expedited express entry</small>
    </div>
  `;

  document.getElementById('pass-modal').classList.add('open');
}

function closePassModal() {
  document.getElementById('pass-modal').classList.remove('open');
}

// Load My Appointments
async function loadMyAppointments() {
  const container = document.getElementById('my-appointments-container');
  const countBadge = document.getElementById('nav-booking-count');

  try {
    const res = await fetch('/api/appointments');
    const data = await res.json();

    if (data.success && data.appointments) {
      if (countBadge) countBadge.textContent = data.appointments.length;

      if (data.appointments.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fa-solid fa-calendar-xmark"></i></div>
            <h3>No Scheduled Appointments</h3>
            <p>You currently do not have any active appointments. Use the <strong>Disease Predictor</strong> or <strong>Smart Appointments</strong> to schedule a slot.</p>
            <button class="btn btn-primary" onclick="switchTab('appointments')">Schedule an Appointment</button>
          </div>
        `;
        return;
      }

      container.innerHTML = data.appointments.map(apt => `
        <div class="appointment-item-card">
          <div class="apt-main-info">
            <div class="apt-badge-icon"><i class="fa-solid fa-stethoscope"></i></div>
            <div>
              <div class="apt-id">${apt.id} • ${apt.optimizationType || 'Smart Scheduled'}</div>
              <h3 class="apt-title">${escapeHtml(apt.doctorName)} — <span style="font-weight: 500; font-size: 1rem; color: var(--primary);">${escapeHtml(apt.specialty)}</span></h3>
              <div class="apt-meta">
                <span><i class="fa-solid fa-user"></i> ${escapeHtml(apt.patientName)}</span>
                <span><i class="fa-solid fa-clock"></i> ${apt.slotDate} at ${apt.slotTime}</span>
                <span><i class="fa-solid fa-hospital"></i> ${escapeHtml(apt.hospital)}</span>
              </div>
            </div>
          </div>
          <div class="apt-actions">
            <button class="btn btn-outline btn-sm" onclick='viewStoredPass(${JSON.stringify(apt).replace(/'/g, "&#39;")})'>
              <i class="fa-solid fa-qrcode"></i> View Pass
            </button>
            <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: #fecaca;" onclick="cancelAppointment('${apt.id}')">
              <i class="fa-solid fa-trash-can"></i> Cancel
            </button>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading appointments:', err);
    container.innerHTML = `<div class="error-msg">Failed to retrieve scheduled appointments.</div>`;
  }
}

function viewStoredPass(apt) {
  openPassModal(apt);
}

// Cancel appointment
async function cancelAppointment(aptId) {
  if (!confirm(`Are you sure you want to cancel appointment ${aptId}?`)) return;

  try {
    const res = await fetch(`/api/appointments/${aptId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(`Appointment ${aptId} canceled.`, 'info');
      loadMyAppointments();
      loadOptimizedSlots();
    } else {
      showToast(data.error || 'Failed to cancel appointment.', 'error');
    }
  } catch (err) {
    console.error('Error canceling appointment:', err);
  }
}

// Load and Filter Doctor Directory
async function loadDoctorDirectory() {
  const container = document.getElementById('directory-grid');
  const specSelect = document.getElementById('dir-specialty');
  const search = document.getElementById('dir-search')?.value || '';
  const specialty = specSelect?.value || 'All';
  const minRating = document.getElementById('dir-rating')?.value || '0';

  try {
    const res = await fetch(`/api/doctors?specialty=${encodeURIComponent(specialty)}&search=${encodeURIComponent(search)}&minRating=${minRating}`);
    const data = await res.json();

    if (data.success && data.doctors) {
      // Populate specialty dropdown once
      if (specSelect && specSelect.options.length <= 1) {
        const specRes = await fetch('/api/specialties');
        const specData = await specRes.json();
        if (specData.success && specData.specialties) {
          specData.specialties.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.textContent = `${s.name} (${s.doctorCount})`;
            specSelect.appendChild(opt);
          });
        }
      }

      container.innerHTML = data.doctors.map(doc => `
        <div class="doctor-card">
          <div class="doctor-profile-header">
            <img src="${doc.avatar}" alt="${escapeHtml(doc.name)}" class="doctor-avatar" onerror="this.src='https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300'">
            <div>
              <h3 class="doc-name">${escapeHtml(doc.name)}</h3>
              <div class="doc-specialty">${escapeHtml(doc.specialty)}</div>
              <div class="doc-qual">${escapeHtml(doc.qualifications)}</div>
            </div>
          </div>

          <div class="doctor-metrics-row">
            <div class="metric-item">⭐ <strong>${doc.rating}</strong> (${doc.total_reviews})</div>
            <div class="metric-item">🩺 <strong>${doc.experience} yrs</strong> exp</div>
            <div class="metric-item">💳 <strong>$${doc.fee}</strong> fee</div>
          </div>

          <div class="doc-hospital">
            <i class="fa-solid fa-location-dot"></i>
            <span>${escapeHtml(doc.hospital)} • ${escapeHtml(doc.location)}</span>
          </div>

          <button class="btn btn-primary" onclick="routeToDoctorSlot('${escapeHtml(doc.specialty)}')">
            <i class="fa-solid fa-calendar-plus"></i> View Optimized Slots
          </button>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error fetching doctor directory:', err);
    container.innerHTML = `<div class="error-msg">Failed to load doctor directory.</div>`;
  }
}

function filterDoctorDirectory() {
  loadDoctorDirectory();
}

function routeToDoctorSlot(specialty) {
  const specFilter = document.getElementById('opt-specialty-filter');
  if (specFilter) specFilter.value = specialty;
  switchTab('appointments');
  loadOptimizedSlots();
}
