/**
 * Main Application Orchestrator
 * Coordinates sidebar navigation, tab switching, authentication state,
 * charts, database telemetry, and mobile responsiveness.
 */

const TAB_TITLES = {
  'dashboard': 'Visual Intelligence Dashboard & Command Center',
  'predictor': 'AI Multi-Class Disease Prediction & Clinical Triage',
  'appointments': 'Smart Appointment Scheduling & Queue Optimizer',
  'records': 'Patient Electronic Health Records (EHR)',
  'doctor-portal': 'Doctor Emergency Triage & Hospital Intake Queue',
  'my-bookings': 'Scheduled Consultation Passes & QR Verification',
  'doctors': 'Certified Medical Faculty & Specialists Directory',
  'db-inspector': 'Full-Stack Datastore & Telemetry Architecture'
};

// Global Tab Switcher
function switchTab(tabId) {
  // Update Navigation buttons in sidebar and navbar
  document.querySelectorAll('.nav-item, .nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  // Update Tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const targetPane = document.getElementById(`tab-${tabId}`);
  if (targetPane) {
    targetPane.classList.add('active');
    
    // Scroll content area back to top
    const contentArea = document.querySelector('.app-content-area');
    if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update topbar breadcrumb active title
  const activeTitleEl = document.getElementById('topbar-active-title');
  if (activeTitleEl) {
    activeTitleEl.textContent = TAB_TITLES[tabId] || 'Healthcare Platform';
  }

  // Close mobile sidebar if open
  closeSidebarOnMobile();

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
  } else if (tabId === 'doctors') {
    loadDoctorDirectory();
  } else if (tabId === 'db-inspector') {
    if (window.loadDatabaseInspector) window.loadDatabaseInspector();
  }
}

// Mobile Sidebar Toggle
function toggleSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.toggle('open');
  if (backdrop) backdrop.classList.toggle('open');
}

function closeSidebarOnMobile() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
}

// 1-Click Role Switcher (Patient <-> Doctor)
function toggleRoleSwitch() {
  if (currentUser.role === 'patient') {
    loginDemo('doctor');
    const label = document.getElementById('btn-role-switch-label');
    if (label) label.textContent = 'Switch to Patient';
  } else {
    loginDemo('patient');
    const label = document.getElementById('btn-role-switch-label');
    if (label) label.textContent = 'Switch to Doctor';
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

      const recCount = document.getElementById('nav-records-count');
      if (recCount) recCount.textContent = data.stats.totalRecordsLogged || 3;
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

  // Pre-load appointments & records
  loadMyAppointments();
});
