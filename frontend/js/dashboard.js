/**
 * Visual Intelligence & Analytics Dashboard Module
 * Renders Chart.js clinical risk radars, benchmark wait-time comparisons,
 * 7-day biometric trend lines, and live Full-Stack Database Telemetry.
 */

let riskRadarChartInstance = null;
let waitTimeChartInstance = null;
let biometricsTrendChartInstance = null;

function initDashboardCharts() {
  renderRiskRadarChart();
  renderWaitTimeComparisonChart();
  renderBiometricsTrendChart();
  loadRecentRecordsPreview();
  loadDatabaseInspector();
}

// 1. Organ System Health Risk Radar Chart
function renderRiskRadarChart() {
  const ctx = document.getElementById('riskRadarChart');
  if (!ctx) return;

  if (riskRadarChartInstance) {
    riskRadarChartInstance.destroy();
  }

  const hr = parseInt(currentUser.vitals?.heartRate, 10) || 72;
  const spo2 = parseInt(currentUser.vitals?.spO2, 10) || 98;
  const cardioRisk = hr > 85 ? 42 : 18;
  const respRisk = spo2 < 96 ? 55 : 22;

  riskRadarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: [
        'Respiratory & ENT',
        'Cardiovascular',
        'Digestive & Gut',
        'Neurological',
        'Metabolic / Endocrine',
        'Musculoskeletal'
      ],
      datasets: [
        {
          label: 'Current Clinical Risk Index (%)',
          data: [respRisk, cardioRisk, 15, 20, 14, 18],
          backgroundColor: 'rgba(2, 132, 199, 0.22)',
          borderColor: '#0284c7',
          pointBackgroundColor: '#0284c7',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#0284c7',
          borderWidth: 2
        },
        {
          label: 'Healthy Demographic Baseline',
          data: [12, 15, 10, 12, 10, 14],
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          borderColor: '#10b981',
          pointBackgroundColor: '#10b981',
          borderDash: [4, 4],
          borderWidth: 1.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: '#e2e8f0' },
          grid: { color: '#f1f5f9' },
          suggestedMin: 0,
          suggestedMax: 60,
          ticks: { stepSize: 15, backdropColor: 'transparent', font: { size: 10 } },
          pointLabels: { font: { size: 11, family: 'Inter', weight: '600' }, color: '#334155' }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 11, family: 'Inter' } }
        }
      }
    }
  });
}

// 2. Hospital Wait-Time Reduction Comparison Chart
function renderWaitTimeComparisonChart() {
  const ctx = document.getElementById('waitTimeComparisonChart');
  if (!ctx) return;

  if (waitTimeChartInstance) {
    waitTimeChartInstance.destroy();
  }

  waitTimeChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['09:00 AM (Morning)', '11:30 AM (Peak Rush)', '02:00 PM (Midday)', '04:30 PM (Evening)'],
      datasets: [
        {
          label: 'Traditional Walk-in Queue (Minutes)',
          data: [48, 68, 42, 58],
          backgroundColor: '#fda4af',
          borderColor: '#f43f5e',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: 'HealthPulse AI Smart Schedule (Minutes)',
          data: [8, 12, 7, 10],
          backgroundColor: '#6ee7b7',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Lobby Waiting Time (Minutes)', font: { size: 11, family: 'Inter' } },
          grid: { color: '#f8fafc' }
        },
        x: {
          grid: { display: false }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 11, family: 'Inter' } }
        },
        tooltip: {
          callbacks: {
            afterBody: function(context) {
              const walkin = context[0]?.raw || 50;
              const optimized = context[1]?.raw || 10;
              const saved = Math.round(((walkin - optimized) / walkin) * 100);
              return `Efficiency Gain: ${saved}% Wait Time Eliminated`;
            }
          }
        }
      }
    }
  });
}

// 3. 7-Day Physiological Vitals Trend Line Chart
function renderBiometricsTrendChart() {
  const ctx = document.getElementById('biometricsTrendChart');
  if (!ctx) return;

  if (biometricsTrendChartInstance) {
    biometricsTrendChartInstance.destroy();
  }

  biometricsTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
      datasets: [
        {
          label: 'Heart Rate (bpm)',
          data: [74, 76, 71, 75, 72, 70, 72],
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.1)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#0284c7'
        },
        {
          label: 'Blood Oxygen SpO2 (%)',
          data: [98, 97, 98, 99, 98, 98, 98],
          borderColor: '#10b981',
          borderDash: [5, 5],
          tension: 0.2,
          pointRadius: 3,
          pointBackgroundColor: '#10b981'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 60,
          max: 105,
          grid: { color: '#f1f5f9' },
          title: { display: true, text: 'Clinical Values', font: { size: 11 } }
        },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
      }
    }
  });
}

// 4. Load Recent Records preview for Dashboard
async function loadRecentRecordsPreview() {
  const container = document.getElementById('dash-recent-records');
  if (!container) return;

  try {
    const res = await fetch('/api/records?patientId=' + currentUser.id);
    const data = await res.json();

    if (data.success && data.records && data.records.length > 0) {
      container.innerHTML = data.records.slice(0, 3).map(rec => `
        <div class="mini-record-item">
          <div class="mini-record-date">${rec.date}</div>
          <div class="mini-record-info">
            <strong>${escapeHtml(rec.diagnosis)}</strong>
            <small>${escapeHtml(rec.doctorName)} • ${escapeHtml(rec.specialty)}</small>
          </div>
          <span class="status-pill ${rec.severity.toLowerCase()}">${rec.severity}</span>
        </div>
      `).join('');
    } else {
      container.innerHTML = `<p class="text-muted" style="padding: 10px;">No previous clinical records logged.</p>`;
    }
  } catch (err) {
    console.warn('Recent records preview error:', err);
  }
}

// 5. Full-Stack Database & Telemetry Inspector
async function loadDatabaseInspector() {
  try {
    const res = await fetch('/api/database/overview');
    const data = await res.json();

    if (data.success) {
      // Update DB Counts on dashboard HUD
      const userCountEl = document.getElementById('hud-db-users');
      const docCountEl = document.getElementById('hud-db-doctors');
      const aptCountEl = document.getElementById('hud-db-appointments');
      const recCountEl = document.getElementById('hud-db-records');
      const mlAccEl = document.getElementById('hud-ml-acc');

      if (userCountEl) userCountEl.textContent = data.tables.users.count;
      if (docCountEl) docCountEl.textContent = data.tables.doctors.count;
      if (aptCountEl) aptCountEl.textContent = data.tables.appointments.count;
      if (recCountEl) recCountEl.textContent = data.tables.records.count;
      if (mlAccEl) mlAccEl.textContent = `${data.aiModel.testAccuracy}%`;

      // Update dedicated Database Inspector table if present
      renderDatabaseInspectorTable(data);
    }
  } catch (err) {
    console.warn('Database inspector fetch skipped:', err.message);
  }
}

let cachedDatabaseData = null;

function renderDatabaseInspectorTable(data) {
  cachedDatabaseData = data;
  const jsonViewer = document.getElementById('db-raw-json-viewer');
  if (jsonViewer) {
    jsonViewer.textContent = JSON.stringify(data.tables, null, 2);
  }
}

function showDatabaseTableTab(tableName) {
  if (!cachedDatabaseData) return;
  const jsonViewer = document.getElementById('db-raw-json-viewer');
  if (!jsonViewer) return;

  document.querySelectorAll('.db-tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-db-${tableName}`);
  if (activeBtn) activeBtn.classList.add('active');

  const tableData = cachedDatabaseData.tables[tableName] || cachedDatabaseData.tables;
  jsonViewer.textContent = JSON.stringify(tableData, null, 2);
}

// Global expose
window.renderDashboardCharts = initDashboardCharts;
window.loadDatabaseInspector = loadDatabaseInspector;
window.showDatabaseTableTab = showDatabaseTableTab;
