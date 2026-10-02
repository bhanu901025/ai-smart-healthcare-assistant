/**
 * Visual Intelligence & Analytics Dashboard Module
 * Renders Chart.js clinical risk radars, benchmark wait-time comparisons, and vitality metrics.
 */

let riskRadarChartInstance = null;
let waitTimeChartInstance = null;

function initDashboardCharts() {
  renderRiskRadarChart();
  renderWaitTimeComparisonChart();
  loadRecentRecordsPreview();
}

// 1. Organ System Health Risk Radar Chart
function renderRiskRadarChart() {
  const ctx = document.getElementById('riskRadarChart');
  if (!ctx) return;

  if (riskRadarChartInstance) {
    riskRadarChartInstance.destroy();
  }

  // Calculate dynamic baseline based on active user vitals
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

// Load Recent Records preview for Dashboard
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

// Global expose
window.renderDashboardCharts = initDashboardCharts;
