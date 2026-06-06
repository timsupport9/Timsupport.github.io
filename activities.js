// panels/activities.js
import { api } from '../api.js';

// Render the entire Activities tab UI
window.renderActivities = async function() {
  const container = document.getElementById('activitiesTab');
  const html = `
    <div class="toolbar" style="margin-bottom: 1rem;">
      <div class="search-bar">
        <input type="text" id="searchActivities" placeholder="Search activities by title..." oninput="filterActivities()">
      </div>
    </div>
    <div id="activitiesGrid" class="cards-grid"></div>
    
    <div class="form-panel">
      <h3>➕ Log New Activity</h3>
      <div class="form-grid">
        <input type="text" id="activityTitle" placeholder="Activity Title">
        <input type="date" id="activityDate">
        <input type="text" id="activityLead" placeholder="Lead By (name)">
        <select id="activityType">
          <option>Training</option><option>Workshop</option><option>Meeting</option><option>Outreach</option><option>Seminar</option>
        </select>
        <input type="number" id="activityParticipants" placeholder="Number of Participants">
        <select id="activityOutcome">
          <option>Successful</option><option>Partial</option><option>Postponed</option><option>Cancelled</option>
        </select>
        <textarea id="activityReport" rows="3" placeholder="Activity Summary / Report"></textarea>
      </div>
      <button class="btn" onclick="addActivity()">Log Activity</button>
    </div>
  `;
  container.innerHTML = html;
  filterActivities(); // initial render
};

// Filter and display activities
window.filterActivities = function() {
  let filtered = [...window.appState.activities];
  const search = document.getElementById('searchActivities')?.value.toLowerCase() || '';
  if (search) filtered = filtered.filter(a => a.title.toLowerCase().includes(search));
  
  // Sort by date (newest first)
  filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
  
  const grid = document.getElementById('activitiesGrid');
  if (!grid) return;
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="record-card" style="text-align:center; padding:2rem;">No activities logged yet.</div>';
    return;
  }
  grid.innerHTML = filtered.map(a => `
    <div class="record-card">
      <div class="card-header" style="display:flex; justify-content:space-between;">
        <span>${a.type || 'Activity'}</span>
        <span>📅 ${a.date || 'Date not set'}</span>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(a.title)}</h3>
        <p><strong>Lead:</strong> ${a.leadBy || 'N/A'} | <strong>Participants:</strong> ${a.participants || 0}</p>
        <p><strong>Outcome:</strong> <span style="color: ${getOutcomeColor(a.outcome)}">${a.outcome || 'Pending'}</span></p>
        <p><strong>Report:</strong> ${escapeHtml(a.report) || 'No report provided.'}</p>
        <div class="action-buttons">
          <button class="action-btn" onclick="editActivity(${a.id})">✏️ Edit</button>
          <button class="action-btn" onclick="deleteActivity(${a.id})">🗑️ Delete</button>
        </div>
      </div>
    </div>
  `).join('');
};

// Helper to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Helper for outcome color
function getOutcomeColor(outcome) {
  if (outcome === 'Successful') return '#10b981';
  if (outcome === 'Partial') return '#f59e0b';
  if (outcome === 'Postponed') return '#3b82f6';
  if (outcome === 'Cancelled') return '#ef4444';
  return '#9ca3af';
}

// Add new activity
window.addActivity = async function() {
  const title = document.getElementById('activityTitle').value.trim();
  if (!title) return alert('Activity title is required');
  
  const newActivity = {
    title: title,
    date: document.getElementById('activityDate').value,
    leadBy: document.getElementById('activityLead').value,
    type: document.getElementById('activityType').value,
    participants: parseInt(document.getElementById('activityParticipants').value) || 0,
    outcome: document.getElementById('activityOutcome').value,
    report: document.getElementById('activityReport').value
  };
  
  const created = await api.addActivity(newActivity);
  window.appState.activities.push(created);
  filterActivities();
  updateAnalytics();
  api.addLog('Activity Logged', title);
  
  // Clear form
  document.getElementById('activityTitle').value = '';
  document.getElementById('activityDate').value = '';
  document.getElementById('activityLead').value = '';
  document.getElementById('activityParticipants').value = '';
  document.getElementById('activityReport').value = '';
};

// Edit activity (simple inline editing via prompt)
window.editActivity = async function(id) {
  const activity = window.appState.activities.find(a => a.id === id);
  if (!activity) return;
  
  const newTitle = prompt('Edit activity title:', activity.title);
  if (newTitle && newTitle !== activity.title) {
    activity.title = newTitle;
    await api.updateActivity?.(id, { title: newTitle }); // Note: You may need to implement updateActivity in api.js
    // If updateActivity not implemented, you can fallback to delete+add, but better to add the endpoint.
    // For now we'll update locally and assume the server has a PATCH endpoint.
    // If your API doesn't have updateActivity, use this alternative:
    // await api.deleteActivity(id);
    // const created = await api.addActivity(activity);
    // window.appState.activities = window.appState.activities.filter(a => a.id !== id);
    // window.appState.activities.push(created);
    // But to keep it simple, we'll call a generic update if available.
    // I'll assume you added api.updateActivity in api.js (similar to updateEvent).
    filterActivities();
    api.addLog('Activity Updated', newTitle);
  }
};

// Delete activity
window.deleteActivity = async function(id) {
  if (!confirm('Delete this activity record?')) return;
  await api.deleteActivity(id);
  window.appState.activities = window.appState.activities.filter(a => a.id !== id);
  filterActivities();
  updateAnalytics();
  api.addLog('Activity Deleted', `ID ${id}`);
};

// Helper to update analytics (reuse from app.js)
function updateAnalytics() {
  const revenue = window.appState.bookings.reduce((s, b) => s + (b.price || 0), 0);
  document.getElementById('totalRevenue').innerText = revenue.toLocaleString();
  const completed = window.appState.events.filter(e => e.status === 'Completed').length;
  document.getElementById('completionRate').innerText = window.appState.events.length ? Math.round((completed / window.appState.events.length) * 100) : 0;
  document.getElementById('activePrograms').innerText = window.appState.programs.filter(p => p.status === 'Active').length;
  document.getElementById('upcomingEvents').innerText = window.appState.events.filter(e => e.status === 'Upcoming').length;
  document.getElementById('partnerEngagement').innerText = window.appState.partners.length;
}