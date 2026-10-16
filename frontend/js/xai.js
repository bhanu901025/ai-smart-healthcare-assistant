/**
 * HealthPulse XAI & Clinical Validation Evidence Center
 * Visualizes Model Evaluation Metrics, Confusion Matrix Heatmap,
 * Feature Contributions (Gini Importance), and Queue Optimization Empirical Proof.
 */

let xaiModelData = null;
let featureChartInstance = null;
let queueChartInstance = null;

async function loadAiValidationCenter() {
  const container = document.getElementById('xai-content-container');
  if (!container) return;

  try {
    const res = await fetch('/api/ai/evaluation');
    const data = await res.json();

    if (!data.success) {
      container.innerHTML = `<div class="error-msg">Failed to retrieve AI model validation metrics.</div>`;
      return;
    }

    xaiModelData = data;
    renderValidationOverview(data);
    renderConfusionMatrix(data.confusion_matrix);
    renderPerClassMetricsTable(data.class_wise_metrics);
    renderFeatureImportanceChart(data.top_features_importance);
    renderQueueStudySection(data.queue_optimization_study);
  } catch (err) {
    console.error('Error loading AI validation metrics:', err);
    if (container) {
      container.innerHTML = `<div class="error-msg">Error connecting to evaluation engine: ${escapeHtml(err.message)}</div>`;
    }
  }
}

function renderValidationOverview(data) {
  const m = data.evaluation_metrics;
  const ds = data.dataset_info;

  const elAcc = document.getElementById('val-test-accuracy');
  const elCv = document.getElementById('val-cv-accuracy');
  const elF1 = document.getElementById('val-macro-f1');
  const elRecords = document.getElementById('val-total-records');
  const elSplit = document.getElementById('val-split-ratio');

  if (elAcc) elAcc.textContent = `${m.test_accuracy}%`;
  if (elCv) elCv.textContent = `${m.cv_accuracy_mean}% (±${m.cv_accuracy_std}%)`;
  if (elF1) elF1.textContent = `${m.macro_f1}%`;
  if (elRecords) elRecords.textContent = `${ds.total_records.toLocaleString()} cases`;
  if (elSplit) elSplit.textContent = `${ds.split_ratio} (Train: ${ds.train_samples} / Test: ${ds.test_samples})`;
}

/**
 * Renders the 22x22 Confusion Matrix Heatmap
 */
function renderConfusionMatrix(cm) {
  const gridContainer = document.getElementById('confusion-matrix-grid');
  if (!gridContainer || !cm || !cm.classes) return;

  const classes = cm.classes;
  const matrix = cm.matrix;
  const n = classes.length;

  let html = `<div class="cm-table-responsive"><table class="cm-heatmap-table"><thead><tr><th class="cm-corner">Actual \\ Pred</th>`;

  // Header row (predicted classes)
  for (let j = 0; j < n; j++) {
    const shortName = classes[j].length > 12 ? classes[j].slice(0, 10) + '..' : classes[j];
    html += `<th title="${classes[j]}">${shortName}</th>`;
  }
  html += `</tr></thead><tbody>`;

  // Matrix rows (actual classes)
  for (let i = 0; i < n; i++) {
    html += `<tr><th class="cm-row-label" title="${classes[i]}">${classes[i]}</th>`;
    for (let j = 0; j < n; j++) {
      const val = matrix[i][j];
      const isDiagonal = (i === j);
      let cellClass = 'cm-zero';
      let style = '';

      if (isDiagonal) {
        cellClass = 'cm-diag';
        const opacity = Math.min(Math.max(val / 20, 0.4), 1.0);
        style = `background-color: rgba(14, 165, 233, ${opacity}); color: #fff; font-weight: 700;`;
      } else if (val > 0) {
        cellClass = 'cm-miss';
        style = `background-color: rgba(239, 68, 68, 0.35); color: #f87171; font-weight: 600;`;
      }

      html += `<td class="cm-cell ${cellClass}" style="${style}" title="Actual: ${classes[i]} | Predicted: ${classes[j]} | Count: ${val}">${val}</td>`;
    }
    html += `</tr>`;
  }

  html += `</tbody></table></div>`;
  gridContainer.innerHTML = html;
}

/**
 * Renders Per-Class Performance Metrics (Precision, Recall, F1, Support)
 */
function renderPerClassMetricsTable(classMetrics) {
  const tbody = document.getElementById('class-metrics-tbody');
  if (!tbody || !classMetrics) return;

  tbody.innerHTML = classMetrics.map(item => {
    const f1Badge = item.f1_score >= 95 ? 'badge-green' : (item.f1_score >= 90 ? 'badge-blue' : 'badge-amber');
    return `
      <tr>
        <td><strong>${escapeHtml(item.disease)}</strong></td>
        <td>${item.precision.toFixed(1)}%</td>
        <td>${item.recall.toFixed(1)}%</td>
        <td><span class="metric-pill ${f1Badge}">${item.f1_score.toFixed(1)}%</span></td>
        <td>${item.support} cases</td>
      </tr>
    `;
  }).join('');
}

/**
 * Renders Feature Importance (Gini Index) Bar Chart
 */
function renderFeatureImportanceChart(features) {
  const canvas = document.getElementById('featureImportanceChart');
  if (!canvas || !features) return;

  const top12 = features.slice(0, 12);
  const labels = top12.map(f => f.symptom.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
  const dataVals = top12.map(f => f.importance);

  if (featureChartInstance) {
    featureChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  featureChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Gini Feature Importance (%)',
        data: dataVals,
        backgroundColor: 'rgba(14, 165, 233, 0.75)',
        borderColor: '#0284c7',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Information Gain: ${ctx.raw}% contribution`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8', callback: v => `${v}%` }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#cbd5e1', font: { size: 11, weight: '500' } }
        }
      }
    }
  });
}

/**
 * Renders Queue Optimization Mathematical Study & Benchmarking
 */
function renderQueueStudySection(study) {
  if (!study) return;

  const results = study.results;
  const tbody = document.getElementById('queue-study-tbody');
  if (tbody && results.by_urgency_tier) {
    tbody.innerHTML = results.by_urgency_tier.map(row => `
      <tr>
        <td><strong>${escapeHtml(row.tier)}</strong></td>
        <td><span class="wait-badge old">${row.baseline_wait}</span></td>
        <td><span class="wait-badge new">${row.optimized_wait}</span></td>
        <td><strong class="text-success"><i class="fa-solid fa-arrow-down"></i> ${row.savings}</strong></td>
        <td><span class="text-sm text-muted">${escapeHtml(row.priority_action)}</span></td>
      </tr>
    `).join('');
  }

  // Render Queue comparison chart
  const canvas = document.getElementById('queueComparisonChart');
  if (!canvas || !results.by_urgency_tier) return;

  if (queueChartInstance) {
    queueChartInstance.destroy();
  }

  const tiers = results.by_urgency_tier.map(r => r.tier.split(' ')[0]);
  const baselineData = results.by_urgency_tier.map(r => parseFloat(r.baseline_wait));
  const optimizedData = results.by_urgency_tier.map(r => parseFloat(r.optimized_wait));

  const ctx = canvas.getContext('2d');
  queueChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: tiers,
      datasets: [
        {
          label: 'Traditional Walk-in FIFO Wait (mins)',
          data: baselineData,
          backgroundColor: 'rgba(239, 68, 68, 0.65)',
          borderRadius: 4
        },
        {
          label: 'HealthPulse Smart Priority Wait (mins)',
          data: optimizedData,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#cbd5e1' }
        }
      },
      scales: {
        y: {
          title: { display: true, text: 'Average Queue Time (Minutes)', color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#cbd5e1' }
        }
      }
    }
  });
}
