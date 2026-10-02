/**
 * Authentication & User Session Module
 * Manages Patient/Doctor Sessions, Profile Modal, Vitals Modal, and 1-Click Demo Logins.
 */

// Default active session: Demo Patient
let currentUser = {
  id: "usr-01",
  name: "Alexander Wright",
  email: "alex.patient@healthpulse.ai",
  role: "patient",
  age: 34,
  gender: "Male",
  phone: "+1 (555) 234-8901",
  bloodGroup: "O+",
  allergies: "Penicillin, Peanuts",
  emergencyContact: "Sarah Wright (+1 555-902-1144)",
  healthScore: 88,
  vitals: {
    bloodPressure: "120/80 mmHg",
    heartRate: "72 bpm",
    spO2: "98%",
    bloodGlucose: "95 mg/dL",
    bmi: "23.4 (Normal)"
  }
};

// Update UI with current user
function updateAuthUI() {
  const nameEl = document.getElementById('user-nav-name');
  const roleEl = document.getElementById('user-nav-role');
  const avatarEl = document.getElementById('user-nav-avatar');
  const dashNameEl = document.getElementById('dash-user-name');
  const dashScoreEl = document.getElementById('dash-health-score');

  if (nameEl) nameEl.textContent = currentUser.name;
  if (dashNameEl) dashNameEl.textContent = currentUser.name.split(' ')[0];

  if (roleEl) {
    if (currentUser.role === 'doctor') {
      roleEl.textContent = `Doctor • ${currentUser.specialty || 'Faculty'}`;
      roleEl.className = 'user-nav-role doctor';
      if (avatarEl) avatarEl.src = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120';
    } else {
      roleEl.textContent = `Patient • Score: ${currentUser.healthScore || 88}`;
      roleEl.className = 'user-nav-role patient';
      if (avatarEl) avatarEl.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120';
    }
  }

  if (dashScoreEl && currentUser.healthScore) {
    dashScoreEl.textContent = currentUser.healthScore;
  }

  // Update biometric values in dashboard
  if (currentUser.vitals) {
    const hrEl = document.getElementById('dash-hr');
    const bpEl = document.getElementById('dash-bp');
    const spo2El = document.getElementById('dash-spo2');
    const glucEl = document.getElementById('dash-glucose');

    if (hrEl) hrEl.innerHTML = `${parseInt(currentUser.vitals.heartRate, 10) || 72} <span class="vital-unit">bpm</span>`;
    if (bpEl) bpEl.innerHTML = `${currentUser.vitals.bloodPressure || '120/80'} <span class="vital-unit">mmHg</span>`;
    if (spo2El) spo2El.innerHTML = `${parseInt(currentUser.vitals.spO2, 10) || 98} <span class="vital-unit">%</span>`;
    if (glucEl) glucEl.innerHTML = `${parseInt(currentUser.vitals.bloodGlucose, 10) || 95} <span class="vital-unit">mg/dL</span>`;
  }
}

// 1-Click Demo Login
function loginDemo(role) {
  if (role === 'doctor') {
    currentUser = {
      id: "usr-02",
      name: "Dr. Sarah Jenkins",
      email: "dr.jenkins@healthpulse.ai",
      role: "doctor",
      specialty: "Pulmonologist",
      hospital: "Metro Heart & Lung Institute",
      licenseNo: "MED-NY-89412",
      experience: 14,
      rating: 4.9,
      healthScore: 96
    };
    showToast('Logged in as Doctor (Dr. Sarah Jenkins)', 'success');
    closeLoginModal();
    updateAuthUI();
    switchTab('doctor-portal');
  } else {
    currentUser = {
      id: "usr-01",
      name: "Alexander Wright",
      email: "alex.patient@healthpulse.ai",
      role: "patient",
      age: 34,
      gender: "Male",
      phone: "+1 (555) 234-8901",
      bloodGroup: "O+",
      allergies: "Penicillin, Peanuts",
      emergencyContact: "Sarah Wright (+1 555-902-1144)",
      healthScore: 88,
      vitals: {
        bloodPressure: "120/80 mmHg",
        heartRate: "72 bpm",
        spO2: "98%",
        bloodGlucose: "95 mg/dL",
        bmi: "23.4 (Normal)"
      }
    };
    showToast('Logged in as Patient (Alexander Wright)', 'success');
    closeLoginModal();
    updateAuthUI();
    switchTab('dashboard');
  }
}

// Open/Close Modals
function openLoginModal() {
  document.getElementById('login-modal')?.classList.add('open');
}
function closeLoginModal() {
  document.getElementById('login-modal')?.classList.remove('open');
}

function openProfileModal() {
  const content = document.getElementById('profile-details-content');
  if (!content) return;

  if (currentUser.role === 'doctor') {
    content.innerHTML = `
      <div class="profile-header-summary">
        <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120" class="doctor-avatar" style="width: 56px; height: 56px;">
        <div>
          <h4>${escapeHtml(currentUser.name)}</h4>
          <div style="color: var(--primary); font-weight: 600; font-size: 0.85rem;">${escapeHtml(currentUser.specialty)} • ${escapeHtml(currentUser.hospital)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">License: ${currentUser.licenseNo || 'MED-NY-89412'}</div>
        </div>
      </div>
      <div class="profile-grid-info">
        <div class="profile-field"><span>Clinical Experience:</span> <strong>${currentUser.experience || 14} years</strong></div>
        <div class="profile-field"><span>Rating:</span> <strong>⭐ ${currentUser.rating || 4.9} / 5.0</strong></div>
        <div class="profile-field"><span>Email:</span> <strong>${currentUser.email}</strong></div>
        <div class="profile-field"><span>Status:</span> <strong style="color: var(--success);">Attending Faculty</strong></div>
      </div>
    `;
  } else {
    content.innerHTML = `
      <div class="profile-header-summary">
        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120" class="doctor-avatar" style="width: 56px; height: 56px;">
        <div>
          <h4>${escapeHtml(currentUser.name)}</h4>
          <div style="color: var(--text-secondary); font-size: 0.85rem;">${currentUser.age} yrs • ${currentUser.gender} • Blood Group: <strong>${currentUser.bloodGroup || 'O+'}</strong></div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${currentUser.email} • ${currentUser.phone}</div>
        </div>
      </div>
      <div class="profile-grid-info">
        <div class="profile-field"><span>Allergies:</span> <strong style="color: var(--danger);">${currentUser.allergies || 'None'}</strong></div>
        <div class="profile-field"><span>Emergency Contact:</span> <strong>${currentUser.emergencyContact || 'Sarah Wright'}</strong></div>
        <div class="profile-field"><span>Vitality Score:</span> <strong>${currentUser.healthScore || 88} / 100</strong></div>
        <div class="profile-field"><span>Resting Vitals:</span> <strong>${currentUser.vitals?.bloodPressure || '120/80'} | ${currentUser.vitals?.spO2 || '98%'}</strong></div>
      </div>
    `;
  }

  document.getElementById('profile-modal')?.classList.add('open');
}
function closeProfileModal() {
  document.getElementById('profile-modal')?.classList.remove('open');
}

function openVitalsModal() {
  document.getElementById('vitals-modal')?.classList.add('open');
}
function closeVitalsModal() {
  document.getElementById('vitals-modal')?.classList.remove('open');
}

// Handle Vitals Update Form
async function handleVitalsUpdate(e) {
  e.preventDefault();
  const bp = document.getElementById('vit-bp').value;
  const hr = document.getElementById('vit-hr').value;
  const spo2 = document.getElementById('vit-spo2').value;
  const glucose = document.getElementById('vit-glucose').value;

  try {
    const res = await fetch('/api/auth/vitals', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({
        bloodPressure: `${bp} mmHg`,
        heartRate: `${hr} bpm`,
        spO2: `${spo2}%`,
        bloodGlucose: `${glucose} mg/dL`
      })
    });

    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      updateAuthUI();
      closeVitalsModal();
      showToast(`Biometrics updated! New Health Score: ${currentUser.healthScore}/100`, 'success');
      if (window.renderDashboardCharts) window.renderDashboardCharts();
    } else {
      showToast(data.error || 'Failed to update vitals.', 'error');
    }
  } catch (err) {
    console.error('Error updating vitals:', err);
    // Offline simulation update
    currentUser.vitals = { bloodPressure: `${bp} mmHg`, heartRate: `${hr} bpm`, spO2: `${spo2}%`, bloodGlucose: `${glucose} mg/dL` };
    currentUser.healthScore = parseInt(spo2) >= 98 ? 92 : 82;
    updateAuthUI();
    closeVitalsModal();
    showToast(`Biometrics saved! Health Score: ${currentUser.healthScore}/100`, 'success');
  }
}

// Handle standard email/pass login
async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      updateAuthUI();
      closeLoginModal();
      showToast(data.message, 'success');
      if (currentUser.role === 'doctor') switchTab('doctor-portal');
      else switchTab('dashboard');
    } else {
      showToast(data.error || 'Invalid credentials.', 'error');
    }
  } catch (err) {
    showToast('Connection error during authentication.', 'error');
  }
}
