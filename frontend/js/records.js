/**
 * Patient Health Records (EHR) & Doctor Clinical Triage Module
 * Manages diagnostic history, clinical notes, and the clinician hospital intake queue.
 */

// Load all patient EHR records
async function loadPatientRecords() {
  const container = document.getElementById('records-list-container');
  if (!container) return;

  const searchQuery = (document.getElementById('record-search')?.value || '').toLowerCase().trim();

  container.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Retrieving electronic medical records...</div>`;

  try {
    const res = await fetch(`/api/records?patientId=${currentUser.id}&search=${encodeURIComponent(searchQuery)}`);
    const data = await res.json();

    if (data.success && data.records) {
      if (data.records.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fa-solid fa-folder-open"></i></div>
            <h3>No Records Match Your Search</h3>
            <p>No archived clinical consultations match your query. Use the <strong>Disease Predictor</strong> to create a new diagnosis.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = data.records.map(rec => {
        const sevClass = (rec.severity || 'Moderate').toLowerCase();
        return `
          <div class="ehr-record-card glass-card">
            <div class="ehr-record-header">
              <div>
                <span class="record-id-badge">${rec.id}</span>
                <span class="record-date"><i class="fa-solid fa-calendar-day"></i> ${rec.date}</span>
                <span class="severity-badge ${sevClass}">${rec.severity} Severity</span>
              </div>
              <span class="record-status-pill"><i class="fa-solid fa-circle-check"></i> ${rec.status || 'Verified EHR'}</span>
            </div>

            <h3 class="ehr-diagnosis-title">${escapeHtml(rec.diagnosis)}</h3>
            <div class="ehr-clinician-sub">
              <i class="fa-solid fa-user-doctor"></i> Attending: <strong>${escapeHtml(rec.doctorName)}</strong> (${escapeHtml(rec.specialty)}) • ${escapeHtml(rec.hospital)}
            </div>

            <!-- Vitals Recorded at Visit -->
            <div class="ehr-vitals-box">
              <div class="v-item"><span>BP:</span> <strong>${rec.vitalSigns?.bloodPressure || '120/80'}</strong></div>
              <div class="v-item"><span>HR:</span> <strong>${rec.vitalSigns?.heartRate || '72 bpm'}</strong></div>
              <div class="v-item"><span>SpO2:</span> <strong>${rec.vitalSigns?.spO2 || '98%'}</strong></div>
              <div class="v-item"><span>Temp:</span> <strong>${rec.vitalSigns?.temperature || '98.6°F'}</strong></div>
            </div>

            <!-- Clinical Notes -->
            <div class="ehr-notes-block">
              <strong>Clinical Assessment & Doctor Notes:</strong>
              <p>${escapeHtml(rec.clinicalNotes)}</p>
            </div>

            <!-- Prescriptions -->
            <div class="ehr-rx-block">
              <strong>Prescribed Regimen:</strong>
              <div class="rx-pill-list">
                ${(rec.prescriptions || []).map(rx => `
                  <span class="rx-pill">
                    <i class="fa-solid fa-pills"></i> ${escapeHtml(rx.medicine)} (${escapeHtml(rx.dosage)} - ${escapeHtml(rx.duration)})
                  </span>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading patient records:', err);
    container.innerHTML = `<div class="error-msg">Failed to retrieve patient medical records.</div>`;
  }
}

function filterRecords() {
  loadPatientRecords();
}

// Save Current AI Prediction Directly to EHR
async function savePredictionToEHR() {
  if (!latestPrediction) {
    showToast('Run an AI prediction first before saving.', 'error');
    return;
  }

  const btn = document.getElementById('btn-save-ehr');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Archiving to EHR...`;

  const payload = {
    patientId: currentUser.id,
    patientName: currentUser.name,
    diagnosis: latestPrediction.predicted_disease,
    doctorName: `Recommended: Dr. ${latestPrediction.recommended_specialist}`,
    specialty: latestPrediction.recommended_specialist,
    severity: latestPrediction.severity,
    urgencyScore: latestPrediction.urgency_score,
    symptomsReported: latestPrediction.matched_symptoms || [],
    clinicalNotes: `Patient evaluated via AI Random Forest Classifier (${latestPrediction.confidence}% confidence). Recommended immediate consultation with ${latestPrediction.recommended_specialist}. Precautions advised: ${latestPrediction.precautions?.slice(0, 2).join('; ')}.`,
    prescriptions: [
      { medicine: "Clinical Evaluation Protocol", dosage: "Specialist consultation", duration: "Within 48h" }
    ]
  };

  try {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast('Diagnosis successfully archived to your Electronic Health Record!', 'success');
      loadRecentRecordsPreview();
      loadPatientRecords();
    } else {
      showToast(data.error || 'Failed to archive record.', 'error');
    }
  } catch (err) {
    console.error('Error archiving diagnosis to EHR:', err);
    showToast('Connection error archiving to EHR.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Saved to EHR!`;
  }
}

// Open/Close New Record Modal
function openNewRecordModal() {
  document.getElementById('new-record-modal')?.classList.add('open');
}
function closeNewRecordModal() {
  document.getElementById('new-record-modal')?.classList.remove('open');
}

// Handle Manual Record Submission
async function handleNewRecordSubmit(e) {
  e.preventDefault();
  const diagnosis = document.getElementById('rec-diagnosis').value;
  const specialist = document.getElementById('rec-specialist').value;
  const notes = document.getElementById('rec-notes').value;
  const rx = document.getElementById('rec-rx').value;

  try {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: currentUser.id,
        patientName: currentUser.name,
        diagnosis,
        doctorName: specialist,
        clinicalNotes: notes || 'Routine clinical entry',
        prescriptions: rx ? [{ medicine: rx, dosage: 'As directed', duration: '7 days' }] : []
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('New clinical record added to EHR!', 'success');
      closeNewRecordModal();
      loadPatientRecords();
      loadRecentRecordsPreview();
    }
  } catch (err) {
    showToast('Failed to save record.', 'error');
  }
}

// --------------------------------------------------------------------------
// DOCTOR CLINICAL TRIAGE QUEUE PORTAL
// --------------------------------------------------------------------------
async function loadDoctorTriageQueue() {
  const tbody = document.getElementById('doctor-queue-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px;"><i class="fa-solid fa-spinner fa-spin"></i> Refreshing live hospital triage queue...</td></tr>`;

  try {
    const res = await fetch('/api/doctor/queue');
    const data = await res.json();

    if (data.success && data.queue) {
      // Update counters
      const critEl = document.getElementById('triage-critical-count');
      const modEl = document.getElementById('triage-moderate-count');
      if (critEl) critEl.textContent = data.criticalTriageCount;
      if (modEl) modEl.textContent = Math.max(data.activeQueueCount - data.criticalTriageCount, 0);

      if (data.queue.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px;">No patients currently in triage queue.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.queue.map((item, idx) => {
        const isCritical = (item.urgencyScore || 2) >= 3;
        const priorityBadge = isCritical ? 
          `<span class="badge-priority high"><i class="fa-solid fa-triangle-exclamation"></i> PRIORITY 1</span>` : 
          `<span class="badge-priority normal">PRIORITY 2</span>`;

        return `
          <tr class="${isCritical ? 'highlight-row' : ''}">
            <td>${priorityBadge}</td>
            <td>
              <strong>${escapeHtml(item.patientName)}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${item.age} yrs • ${item.gender} • ${item.phone}</div>
            </td>
            <td>
              <span class="disease-tag">${escapeHtml(item.predictedDisease)}</span>
            </td>
            <td>
              ${escapeHtml(item.doctorName)}
              <div style="font-size: 0.75rem; color: var(--primary);">${escapeHtml(item.specialty)}</div>
            </td>
            <td>
              <strong>${item.slotDate}</strong> at ${item.slotTime}
            </td>
            <td>
              <span class="status-pill ${isCritical ? 'critical' : 'green'}">${item.optimizationType || 'Smart Scheduled'}</span>
            </td>
            <td>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-outline btn-sm" onclick="showToast('Patient ${item.id} triaged and cleared for doctor exam.', 'success')">
                  <i class="fa-solid fa-check"></i> Intake
                </button>
                <button class="btn btn-outline btn-sm" onclick="showToast('Electronic vitals transmission initiated.', 'info')">
                  <i class="fa-solid fa-chart-line"></i> Vitals
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading triage queue:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to connect to triage queue.</td></tr>`;
  }
}
