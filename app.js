// app.js
import { api } from './api.js';

// Global state (will be populated from server)
window.appState = {
  experts: [],
  events: [],
  activities: [],
  programs: [],
  partners: [],
  expertApps: [],
  corporateApps: [],
  membershipApps: [],
  goals: [],
  kpis: [],
  projects: [],
  logs: [],
  bookings: [],
  eventRegistrations: [],
  programEnrollments: []
};

// Helper to reload all data from server
async function fetchAllData() {
  try {
    const [
      experts, events, activities, programs, partners,
      expertApps, corporateApps, membershipApps,
      goals, kpis, projects, logs, bookings,
      eventRegistrations, programEnrollments
    ] = await Promise.all([
      api.getExperts(), api.getEvents(), api.getActivities(), api.getPrograms(), api.getPartners(),
      api.getExpertApplications(), api.getCorporateApplications(), api.getMembershipApplications(),
      api.getGoals(), api.getKPIs(), api.getProjects(), api.getLogs(), api.getBookings(),
      api.getEventRegistrations(), api.getProgramEnrollments()
    ]);
    window.appState = { experts, events, activities, programs, partners, expertApps, corporateApps, membershipApps, goals, kpis, projects, logs, bookings, eventRegistrations, programEnrollments };
    updateAnalytics();
    // Call each panel's render function (they must be globally available)
    if (window.renderExperts) window.renderExperts();
    if (window.renderEvents) window.renderEvents();
    if (window.renderActivities) window.renderActivities();
    if (window.renderPrograms) window.renderPrograms();
    if (window.renderPartners) window.renderPartners();
    if (window.renderApplications) window.renderApplications();
    if (window.renderStrategy) window.renderStrategy();
    if (window.renderTracking) window.renderTracking();
  } catch (err) {
    console.error('Failed to load data:', err);
    alert('Could not load data from server. Is the backend running?');
  }
}

function updateAnalytics() {
  const revenue = window.appState.bookings.reduce((sum, b) => sum + (b.price || 0), 0);
  document.getElementById('totalRevenue').innerText = revenue.toLocaleString();
  const completedEvents = window.appState.events.filter(e => e.status === 'Completed').length;
  const completionRate = window.appState.events.length ? Math.round((completedEvents / window.appState.events.length) * 100) : 0;
  document.getElementById('completionRate').innerText = completionRate;
  document.getElementById('activePrograms').innerText = window.appState.programs.filter(p => p.status === 'Active').length;
  document.getElementById('upcomingEvents').innerText = window.appState.events.filter(e => e.status === 'Upcoming').length;
  document.getElementById('partnerEngagement').innerText = window.appState.partners.length;
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    btn.classList.add('active');
    const tabName = btn.dataset.tab;
    document.getElementById(`${tabName}Tab`).classList.add('active');
    // Re‑render the active panel (in case data changed)
    if (tabName === 'experts' && window.renderExperts) window.renderExperts();
    else if (tabName === 'events' && window.renderEvents) window.renderEvents();
    else if (tabName === 'activities' && window.renderActivities) window.renderActivities();
    else if (tabName === 'programs' && window.renderPrograms) window.renderPrograms();
    else if (tabName === 'partners' && window.renderPartners) window.renderPartners();
    else if (tabName === 'applications' && window.renderApplications) window.renderApplications();
    else if (tabName === 'plans' && window.renderStrategy) window.renderStrategy();
    else if (tabName === 'tracking' && window.renderTracking) window.renderTracking();
  });
});

// Login function
window.login = async function() {
  const pwd = document.getElementById('passwordInput').value;
  try {
    const { token } = await api.login(pwd);
    sessionStorage.setItem('authToken', token);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'block';
    await fetchAllData();
  } catch (err) {
    document.getElementById('loginError').style.display = 'block';
  }
};

// Export/Import (simple JSON dump/restore via server endpoints)
window.exportAllData = async function() {
  const data = window.appState;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup_${Date.now()}.json`;
  a.click();
};

window.importAllData = async function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const imported = JSON.parse(text);
  // Send to server's import endpoint (you'll need to implement it)
  const res = await fetch('http://localhost:5000/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('authToken')}` },
    body: text
  });
  if (res.ok) {
    alert('Import successful');
    await fetchAllData();
  } else alert('Import failed');
};

// Global modal helper
window.showModal = function(content) {
  const modal = document.getElementById('globalModal');
  document.querySelector('.modal-content').innerHTML = content;
  modal.style.display = 'flex';
};
window.closeModal = function() {
  document.getElementById('globalModal').style.display = 'none';
};