// panels/events.js
import { api } from '../api.js';

// Render the entire Events tab UI
window.renderEvents = async function() {
  const container = document.getElementById('eventsTab');
  const html = `
    <div class="toolbar" style="display: flex; gap: 1rem; margin-bottom: 1rem;">
      <div class="search-bar"><input type="text" id="searchEvents" placeholder="Search events..." oninput="filterEvents()"></div>
      <select id="eventStatusFilter" onchange="filterEvents()">
        <option value="all">All Status</option>
        <option>Upcoming</option><option>Ongoing</option><option>Completed</option>
      </select>
    </div>
    <div id="eventsListContainer" class="cards-grid"></div>
    
    <div class="form-panel">
      <h3>➕ Create New Event</h3>
      <div class="form-grid">
        <input type="text" id="eventName" placeholder="Event Name">
        <input type="date" id="eventDate">
        <input type="text" id="eventLocation" placeholder="Venue">
        <select id="eventStatus">
          <option>Upcoming</option><option>Ongoing</option><option>Completed</option>
        </select>
        <input type="number" id="eventBudget" placeholder="Budget (KES)">
        <input type="number" id="eventCapacity" placeholder="Capacity">
        <textarea id="eventDesc" placeholder="Description" rows="2"></textarea>
      </div>
      <button class="btn" onclick="createEvent()">Create Event</button>
    </div>

    <div class="form-panel">
      <h3>📝 Register Participant for Event</h3>
      <div class="form-grid">
        <select id="regEventSelect"></select>
        <input type="text" id="regName" placeholder="Full Name">
        <input type="email" id="regEmail" placeholder="Email">
        <input type="text" id="regPhone" placeholder="Phone">
        <button class="btn" onclick="registerForEvent()">Register</button>
      </div>
    </div>

    <div class="form-panel">
      <h3>📋 Registered Participants</h3>
      <div id="registrationsList" class="logs-container" style="max-height: 300px;"></div>
    </div>
  `;
  container.innerHTML = html;
  // Populate event dropdown for registration
  const select = document.getElementById('regEventSelect');
  if (select) {
    select.innerHTML = window.appState.events.map(e => `<option value="${e.id}">${e.name} (${e.date})</option>`).join('');
  }
  filterEvents();   // initial render of events grid
  renderRegistrations();
};

// Filter and display events
window.filterEvents = function() {
  let filtered = [...window.appState.events];
  const search = document.getElementById('searchEvents')?.value.toLowerCase() || '';
  if (search) filtered = filtered.filter(e => e.name.toLowerCase().includes(search));
  const status = document.getElementById('eventStatusFilter')?.value;
  if (status && status !== 'all') filtered = filtered.filter(e => e.status === status);
  
  const container = document.getElementById('eventsListContainer');
  if (!container) return;
  container.innerHTML = filtered.map(e => `
    <div class="record-card">
      <div class="card-header" style="display:flex; justify-content:space-between;">
        <span>${e.status}</span><span>📅 ${e.date || 'TBA'}</span>
      </div>
      <div class="card-body">
        <h3>${e.name}</h3>
        <p>📍 ${e.location || 'Venue TBD'}</p>
        <p>💰 Budget: KES ${(e.budget || 0).toLocaleString()} | Capacity: ${e.capacity || 0}</p>
        <p>${e.desc || ''}</p>
        <div class="action-buttons">
          <button class="action-btn" onclick="editEvent(${e.id})">✏️ Edit</button>
          <button class="action-btn" onclick="deleteEvent(${e.id})">🗑️ Delete</button>
          ${e.status !== 'Completed' ? `<button class="action-btn" onclick="markEventComplete(${e.id})">✅ Mark Complete</button>` : ''}
        </div>
      </div>
    </div>
  `).join('');
};

// Create new event (POST to server)
window.createEvent = async function() {
  const newEvent = {
    name: document.getElementById('eventName').value,
    date: document.getElementById('eventDate').value,
    location: document.getElementById('eventLocation').value,
    status: document.getElementById('eventStatus').value,
    budget: parseFloat(document.getElementById('eventBudget').value) || 0,
    capacity: parseInt(document.getElementById('eventCapacity').value) || 0,
    desc: document.getElementById('eventDesc').value
  };
  if (!newEvent.name) return alert('Event name required');
  const created = await api.addEvent(newEvent);
  window.appState.events.push(created);
  // Refresh dropdown for registration
  const select = document.getElementById('regEventSelect');
  if (select) select.innerHTML = window.appState.events.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  filterEvents();
  updateAnalytics();
  api.addLog('Event Created', created.name);
  // Clear form
  document.getElementById('eventName').value = '';
  document.getElementById('eventDesc').value = '';
};

// Edit event (simple prompt for name)
window.editEvent = async function(id) {
  const event = window.appState.events.find(e => e.id === id);
  const newName = prompt('Edit event name:', event.name);
  if (newName) {
    event.name = newName;
    await api.updateEvent(id, { name: newName });
    filterEvents();
    api.addLog('Event Updated', event.name);
  }
};

// Delete event
window.deleteEvent = async function(id) {
  if (!confirm('Delete this event? All registrations will be lost.')) return;
  await api.deleteEvent(id);
  window.appState.events = window.appState.events.filter(e => e.id !== id);
  // Also remove registrations for this event
  window.appState.eventRegistrations = window.appState.eventRegistrations.filter(r => r.eventId !== id);
  filterEvents();
  renderRegistrations();
  updateAnalytics();
  api.addLog('Event Deleted', `ID ${id}`);
};

// Mark event as completed
window.markEventComplete = async function(id) {
  const event = window.appState.events.find(e => e.id === id);
  if (event && event.status !== 'Completed') {
    event.status = 'Completed';
    await api.updateEvent(id, { status: 'Completed' });
    filterEvents();
    updateAnalytics();
    api.addLog('Event Completed', event.name);
  }
};

// Register a participant for an event
window.registerForEvent = async function() {
  const eventId = parseInt(document.getElementById('regEventSelect').value);
  const name = document.getElementById('regName').value.trim();
  if (!name) return alert('Participant name required');
  const newReg = {
    eventId,
    participantName: name,
    email: document.getElementById('regEmail').value,
    phone: document.getElementById('regPhone').value,
    attendance: 'Pending'
  };
  const created = await api.addEventRegistration(newReg);
  window.appState.eventRegistrations.push(created);
  renderRegistrations();
  api.addLog('Registration', `${name} -> Event ${eventId}`);
  // Clear fields
  document.getElementById('regName').value = '';
  document.getElementById('regEmail').value = '';
  document.getElementById('regPhone').value = '';
};

// Render registrations list with check-in button
function renderRegistrations() {
  const container = document.getElementById('registrationsList');
  if (!container) return;
  const regs = window.appState.eventRegistrations;
  if (regs.length === 0) {
    container.innerHTML = '<div class="log-entry">No registrations yet.</div>';
    return;
  }
  container.innerHTML = regs.map(reg => {
    const event = window.appState.events.find(e => e.id === reg.eventId);
    return `<div class="log-entry">
      👤 ${reg.participantName} | ${event?.name || 'Unknown event'} | Status: ${reg.attendance}
      ${reg.attendance !== 'Present' ? `<button class="action-btn" onclick="markAttendance(${reg.id})">✅ Check In</button>` : ''}
    </div>`;
  }).join('');
}

// Mark attendance for a participant
window.markAttendance = async function(regId) {
  const reg = window.appState.eventRegistrations.find(r => r.id === regId);
  if (reg && reg.attendance !== 'Present') {
    await api.updateAttendance(regId);
    reg.attendance = 'Present';
    renderRegistrations();
    api.addLog('Attendance Marked', reg.participantName);
  }
};

// Helper to refresh analytics (needs to be defined if not globally available)
function updateAnalytics() {
  const revenue = window.appState.bookings.reduce((s, b) => s + (b.price || 0), 0);
  document.getElementById('totalRevenue').innerText = revenue.toLocaleString();
  const completed = window.appState.events.filter(e => e.status === 'Completed').length;
  document.getElementById('completionRate').innerText = window.appState.events.length ? Math.round((completed / window.appState.events.length) * 100) : 0;
  document.getElementById('activePrograms').innerText = window.appState.programs.filter(p => p.status === 'Active').length;
  document.getElementById('upcomingEvents').innerText = window.appState.events.filter(e => e.status === 'Upcoming').length;
  document.getElementById('partnerEngagement').innerText = window.appState.partners.length;
}