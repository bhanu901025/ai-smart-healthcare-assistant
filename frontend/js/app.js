/**
 * Main Application Orchestrator
 * Coordinates tab switching, authentication state, charts, notifications, and dashboard metrics.
 */

// Global Tab Switcher
function switchTab(tabId) {
  // Update Navigation buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  // Update Tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const targetPane = document.getElementById(`tab-${tabId}`);
  if (targetPane) {
    targetPane.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Lazy-load relevant data per tab
  if (tabId === 'dashboard') {
    if (window.renderDashboardCharts) window.renderDashboardCharts();
  } else if (tabId === 'appointments') {
    loadOptimizedSlots();
  } else if (tabId === 'records') {
    loadPatientRecords();
  } else if (tabId === 'doctor-portal') {
    loadDoctorTriageQueue();
  } else if (tabId === 'my-bookings') {
    loadMyAppointments();
  }
}

// Toast Notification Engine
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'info-circle';
  if (type === 'success') icon = 'circle-check';
  if (type === 'error') icon = 'triangle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid fa-${icon}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Fetch and render dashboard metrics
async function loadDashboardStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      const navCount = document.getElementById('nav-booking-count');
      if (navCount) navCount.textContent = data.stats.confirmedAppointments;
    }
  } catch (err) {
    console.warn('Dashboard stats request skipped:', err.message);
  }
}

// Global App Initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log('HealthPulse Enterprise AI Initializing...');
  
  // Initialize user session & auth UI
  if (window.updateAuthUI) updateAuthUI();

  // Initialize visual intelligence charts
  if (window.renderDashboardCharts) {
    setTimeout(() => window.renderDashboardCharts(), 150);
  }

  // Initialize symptoms catalog
  initSymptomSelector();
  
  // Load dashboard overview statistics
  loadDashboardStats();

  // Pre-load appointments count
  loadMyAppointments();
});
