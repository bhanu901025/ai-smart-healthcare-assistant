/**
 * Prediction Module
 * Handles symptom selection, category filtering, ML API call, and results rendering.
 */

let allSymptomsData = [];
let selectedSymptoms = new Set();
let currentCategory = 'All';

// Initialize Symptom Selector
async function initSymptomSelector() {
  const container = document.getElementById('symptoms-container');
  try {
    const res = await fetch('/api/symptoms');
    const data = await res.json();

    if (data.success && data.categories) {
      allSymptomsData = data.categories;
      renderSymptomsGrid();
    } else {
      container.innerHTML = `<div class="error-msg">Failed to load symptoms catalog.</div>`;
    }
  } catch (err) {
    console.error('Error fetching symptoms:', err);
    container.innerHTML = `<div class="error-msg">Connection error loading symptoms.</div>`;
  }
}

// Render symptoms filtered by category and search
function renderSymptomsGrid() {
  const container = document.getElementById('symptoms-container');
  const searchQuery = (document.getElementById('symptom-search')?.value || '').toLowerCase().trim();

  let html = '';
  let matchCount = 0;

  allSymptomsData.forEach(cat => {
    if (currentCategory !== 'All' && cat.category !== currentCategory) {
      return;
    }

    const matchingSymptoms = cat.symptoms.filter(s => 
      s.label.toLowerCase().includes(searchQuery) ||
      s.id.toLowerCase().includes(searchQuery) ||
      s.description.toLowerCase().includes(searchQuery)
    );

    if (matchingSymptoms.length > 0) {
      matchCount += matchingSymptoms.length;
      html += `
        <div class="category-group">
          <div class="category-group-title">
            <i class="fa-solid fa-${cat.icon || 'circle-dot'}"></i> ${cat.category}
          </div>
          <div class="symptoms-tag-grid">
            ${matchingSymptoms.map(s => {
              const isSelected = selectedSymptoms.has(s.id);
              return `
                <button type="button" 
                  class="symptom-btn ${isSelected ? 'selected' : ''}" 
                  data-symptom-id="${s.id}"
                  onclick="toggleSymptom('${s.id}', '${escapeHtml(s.label)}')">
                  <i class="fa-solid ${isSelected ? 'fa-check' : 'fa-plus'}"></i>
                  ${s.label}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
  });

  if (matchCount === 0) {
    html = `<div class="empty-state" style="padding: 20px;"><p>No symptoms matched "${searchQuery}".</p></div>`;
  }

  container.innerHTML = html;
  updateSelectedChips();
}

// Toggle symptom selection
function toggleSymptom(symptomId, label) {
  if (selectedSymptoms.has(symptomId)) {
    selectedSymptoms.delete(symptomId);
  } else {
    selectedSymptoms.add(symptomId);
  }
  renderSymptomsGrid();
}

// Remove symptom from active chip
function removeSymptom(symptomId) {
  selectedSymptoms.delete(symptomId);
  renderSymptomsGrid();
}

// Update active symptom chips container
function updateSelectedChips() {
  const chipsContainer = document.getElementById('selected-chips-container');
  const counterEl = document.getElementById('selected-count');

  if (counterEl) {
    counterEl.textContent = selectedSymptoms.size;
  }

  if (selectedSymptoms.size === 0) {
    chipsContainer.innerHTML = `<span class="empty-chips-msg">No symptoms selected yet. Click any symptom tag below to add.</span>`;
    return;
  }

  // Lookup labels
  const chipsHtml = Array.from(selectedSymptoms).map(id => {
    let label = id.replace(/_/g, ' ');
    for (const cat of allSymptomsData) {
      const found = cat.symptoms.find(s => s.id === id);
      if (found) {
        label = found.label;
        break;
      }
    }
    return `
      <span class="symptom-chip">
        ${escapeHtml(label)}
        <button class="chip-remove" onclick="removeSymptom('${id}')" title="Remove symptom">&times;</button>
      </span>
    `;
  }).join('');

  chipsContainer.innerHTML = chipsHtml;
}

// Category filter
function filterCategory(catName) {
  currentCategory = catName;
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase().includes(catName.toLowerCase()) || (catName === 'All' && btn.textContent.includes('All')));
  });
  renderSymptomsGrid();
}

// Search input filter
function filterSymptoms() {
  renderSymptomsGrid();
}

// Reset all selected symptoms
function resetSymptoms() {
  selectedSymptoms.clear();
  renderSymptomsGrid();
  showToast('Symptoms selection reset.', 'info');
}

// Load pre-configured sample presets
function loadSampleSymptoms(preset) {
  selectedSymptoms.clear();
  if (preset === 'cold') {
    selectedSymptoms.add('continuous_sneezing');
    selectedSymptoms.add('cough');
    selectedSymptoms.add('headache');
    selectedSymptoms.add('chills');
    selectedSymptoms.add('fatigue');
  } else if (preset === 'asthma') {
    selectedSymptoms.add('breathlessness');
    selectedSymptoms.add('cough');
    selectedSymptoms.add('chest_pain');
    selectedSymptoms.add('fast_heart_rate');
  } else if (preset === 'gerd') {
    selectedSymptoms.add('acidity');
    selectedSymptoms.add('stomach_pain');
    selectedSymptoms.add('indigestion');
    selectedSymptoms.add('chest_pain');
  }
  renderSymptomsGrid();
  showToast(`Loaded ${preset.toUpperCase()} demonstration symptoms!`, 'success');
  runDiseasePrediction();
}

// Execute ML Disease Prediction
async function runDiseasePrediction() {
  if (selectedSymptoms.size === 0) {
    showToast('Please select at least 1 or 2 symptoms to evaluate.', 'error');
    return;
  }

  const btn = document.getElementById('btn-predict');
  const originalBtnHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Running Random Forest AI...`;

  try {
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symptoms: Array.from(selectedSymptoms),
        durationDays: document.getElementById('symptom-duration')?.value || 3,
        ageGroup: document.getElementById('patient-age-group')?.value || 'adult'
      })
    });

    const result = await response.json();

    if (result.status === 'success' && result.data) {
      renderPredictionResults(result.data);
      showToast('AI Clinical Analysis Complete!', 'success');
    } else {
      showToast(result.message || 'Unable to classify symptoms. Try adding more symptoms.', 'error');
    }
  } catch (err) {
    console.error('Error in prediction API:', err);
    showToast('Failed to connect to AI Prediction Service.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalBtnHtml;
  }
}

// Global holder for current prediction to pass to appointment optimizer
let latestPrediction = null;

// Render prediction output
function renderPredictionResults(data) {
  latestPrediction = data;

  const emptyState = document.getElementById('results-empty-state');
  const resultsContent = document.getElementById('results-content');

  emptyState.style.display = 'none';
  resultsContent.style.display = 'block';

  // Disease Title & Severity
  document.getElementById('res-disease-name').textContent = data.predicted_disease;
  document.getElementById('res-engine').textContent = data.engine || 'Random Forest Classifier';

  const severityBadge = document.getElementById('res-severity-badge');
  const sev = (data.severity || 'Moderate').toLowerCase();
  severityBadge.textContent = `${data.severity || 'Moderate'} Severity (Urgency ${data.urgency_score || 2}/4)`;
  severityBadge.className = `severity-badge ${sev}`;

  // Confidence Bar Animation
  const confidence = data.confidence || 85.0;
  document.getElementById('res-confidence-val').textContent = `${confidence}%`;
  const confBar = document.getElementById('res-confidence-bar');
  confBar.style.width = '0%';
  setTimeout(() => {
    confBar.style.width = `${confidence}%`;
  }, 50);

  // Recommended Specialist
  document.getElementById('res-specialist').textContent = data.recommended_specialist || 'General Physician';
  document.getElementById('res-specialist-desc').textContent = 
    `Consult a certified ${data.recommended_specialist} for targeted diagnostic evaluation.`;

  // Differential Diagnoses
  const diffContainer = document.getElementById('res-differentials-container');
  if (data.differential_diagnoses && data.differential_diagnoses.length > 0) {
    diffContainer.innerHTML = data.differential_diagnoses.map(d => `
      <div class="diff-item">
        <span><strong>${escapeHtml(d.disease)}</strong></span>
        <div class="diff-bar-bg">
          <div class="diff-bar-fill" style="width: ${d.probability}%"></div>
        </div>
        <span>${d.probability}%</span>
      </div>
    `).join('');
  } else {
    diffContainer.innerHTML = `<p class="text-muted">Primary single-disease match identified.</p>`;
  }

  // Precautions List
  const precList = document.getElementById('res-precautions-list');
  if (data.precautions && data.precautions.length > 0) {
    precList.innerHTML = data.precautions.map(p => `<li>${escapeHtml(p)}</li>`).join('');
  } else {
    precList.innerHTML = `<li>Consult with a licensed medical professional for clinical guidance.</li>`;
  }

  // Diet Advice
  const dietRec = document.getElementById('res-diet-recommended');
  const dietAvoid = document.getElementById('res-diet-avoid');

  if (data.diet?.recommended) {
    dietRec.innerHTML = data.diet.recommended.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  } else {
    dietRec.innerHTML = `<li>Fresh balanced home-cooked meals</li>`;
  }

  if (data.diet?.avoid) {
    dietAvoid.innerHTML = data.diet.avoid.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  } else {
    dietAvoid.innerHTML = `<li>Processed junk foods and high sugars</li>`;
  }
}

// Route to Appointment Optimizer with preselected specialist & urgency
function routeToAppointmentWithSpecialist() {
  if (!latestPrediction) return;

  const specFilter = document.getElementById('opt-specialty-filter');
  const urgencyFilter = document.getElementById('opt-urgency-filter');

  if (specFilter && latestPrediction.recommended_specialist) {
    specFilter.value = latestPrediction.recommended_specialist;
    // If not in dropdown options, keep All
    if (specFilter.value !== latestPrediction.recommended_specialist) {
      specFilter.value = 'All';
    }
  }

  if (urgencyFilter && latestPrediction.urgency_score) {
    urgencyFilter.value = String(latestPrediction.urgency_score);
  }

  // Pre-fill reason in booking form
  const reasonInput = document.getElementById('book-reason');
  if (reasonInput) {
    reasonInput.value = `AI Triage: Suspected ${latestPrediction.predicted_disease} (${latestPrediction.confidence}% confidence)`;
  }

  switchTab('appointments');
  loadOptimizedSlots();
  showToast(`Specialist pre-filtered: ${latestPrediction.recommended_specialist}`, 'info');
}

// Utility HTML escape
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
