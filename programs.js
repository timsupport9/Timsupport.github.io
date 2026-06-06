// panels/programs.js
import { api } from '../api.js';

// Render the entire Programs tab UI
window.renderPrograms = async function() {
  const container = document.getElementById('programsTab');
  const html = `
    <div class="toolbar" style="margin-bottom: 1rem;">
      <div class="search-bar">
        <input type="text" id="searchPrograms" placeholder="Search programs..." oninput="filterPrograms()">
      </div>
    </div>
    <div id="programsListContainer" class="cards-grid"></div>
    
    <div class="form-panel">
      <h3>➕ Create New Program</h3>
      <div class="form-grid">
        <input type="text" id="progName" placeholder="Program Name">
        <input type="text" id="progDuration" placeholder="Duration (e.g., 6 months)">
        <select id="progStatus">
          <option>Active</option><option>Upcoming</option><option>Completed</option><option>On Hold</option>
        </select>
        <input type="number" id="progBudget" placeholder="Budget (KES)">
        <textarea id="progDesc" placeholder="Program Description" rows="2"></textarea>
      </div>
      <button class="btn" onclick="createProgram()">Create Program</button>
    </div>

    <div class="form-panel">
      <h3>📌 Enroll Participant in Program</h3>
      <div class="form-grid">
        <select id="enrollProgramSelect"></select>
        <input type="text" id="enrollName" placeholder="Full Name">
        <input type="email" id="enrollEmail" placeholder="Email">
        <input type="text" id="enrollPhone" placeholder="Phone">
        <button class="btn" onclick="enrollInProgram()">Enroll</button>
      </div>
    </div>

    <div class="form-panel">
      <h3>📋 Enrollments & Completions</h3>
      <div id="enrollmentsList" class="logs-container" style="max-height: 350px;"></div>
    </div>
  `;
  container.innerHTML = html;
  // Populate program dropdown for enrollment
  const select = document.getElementById('enrollProgramSelect');
  if (select) {
    select.innerHTML = window.appState.programs.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }
  filterPrograms();      // initial render of programs grid
  renderEnrollments();   // render participant list
};

// Filter and display programs
window.filterPrograms = function() {
  let filtered = [...window.appState.programs];
  const search = document.getElementById('searchPrograms')?.value.toLowerCase() || '';
  if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
  
  const container = document.getElementById('programsListContainer');
  if (!container) return;
  if (filtered.length === 0) {
    container.innerHTML = '<div class="record-card" style="text-align:center; padding:2rem;">No programs created yet.</div>';
    return;
  }
  container.innerHTML = filtered.map(p => `
    <div class="record-card">
      <div class="card-header" style="display:flex; justify-content:space-between;">
        <span>${p.status}</span>
        <span>📅 ${p.duration || 'N/A'}</span>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <p>💰 Budget: KES ${(p.budget || 0).toLocaleString()}</p>
        <p>📝 ${escapeHtml(p.description) || 'No description provided.'}</p>
        <div class="action-buttons">
          <button class="action-btn" onclick="editProgram(${p.id})">✏️ Edit</button>
          <button class="action-btn" onclick="deleteProgram(${p.id})">🗑️ Delete</button>
        </div>
      </div>
    </div>
  `).join('');
};

// Create new program
window.createProgram = async function() {
  const name = document.getElementById('progName').value.trim();
  if (!name) return alert('Program name required');
  
  const newProgram = {
    name: name,
    duration: document.getElementById('progDuration').value,
    status: document.getElementById('progStatus').value,
    budget: parseFloat(document.getElementById('progBudget').value) || 0,
    description: document.getElementById('progDesc').value
  };
  
  const created = await api.addProgram(newProgram);
  window.appState.programs.push(created);
  
  // Refresh dropdown for enrollment
  const select = document.getElementById('enrollProgramSelect');
  if (select) select.innerHTML = window.appState.programs.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  
  filterPrograms();
  updateAnalytics();
  api.addLog('Program Created', created.name);
  
  // Clear form
  document.getElementById('progName').value = '';
  document.getElementById('progDuration').value = '';
  document.getElementById('progBudget').value = '';
  document.getElementById('progDesc').value = '';
};

// Edit program (simple name edit)
window.editProgram = async function(id) {
  const program = window.appState.programs.find(p => p.id === id);
  if (!program) return;
  const newName = prompt('Edit program name:', program.name);
  if (newName && newName !== program.name) {
    program.name = newName;
    await api.updateProgram(id, { name: newName });
    filterPrograms();
    api.addLog('Program Updated', newName);
  }
};

// Delete program
window.deleteProgram = async function(id) {
  if (!confirm('Delete this program? All enrollments will also be removed.')) return;
  await api.deleteProgram(id);
  window.appState.programs = window.appState.programs.filter(p => p.id !== id);
  // Also remove enrollments for this program
  window.appState.programEnrollments = window.appState.programEnrollments.filter(e => e.programId !== id);
  // Refresh dropdown
  const select = document.getElementById('enrollProgramSelect');
  if (select) select.innerHTML = window.appState.programs.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  filterPrograms();
  renderEnrollments();
  updateAnalytics();
  api.addLog('Program Deleted', `ID ${id}`);
};

// Enroll participant in a program
window.enrollInProgram = async function() {
  const programId = parseInt(document.getElementById('enrollProgramSelect').value);
  const name = document.getElementById('enrollName').value.trim();
  if (!name) return alert('Participant name required');
  
  const newEnrollment = {
    programId: programId,
    participantName: name,
    email: document.getElementById('enrollEmail').value,
    phone: document.getElementById('enrollPhone').value,
    completed: false
  };
  
  const created = await api.addProgramEnrollment(newEnrollment);
  window.appState.programEnrollments.push(created);
  renderEnrollments();
  api.addLog('Enrollment', `${name} → Program ${programId}`);
  
  // Clear fields
  document.getElementById('enrollName').value = '';
  document.getElementById('enrollEmail').value = '';
  document.getElementById('enrollPhone').value = '';
};

// Render enrollments list with completion toggle
function renderEnrollments() {
  const container = document.getElementById('enrollmentsList');
  if (!container) return;
  const enrollments = window.appState.programEnrollments;
  if (enrollments.length === 0) {
    container.innerHTML = '<div class="log-entry">No enrollments yet.</div>';
    return;
  }
  container.innerHTML = enrollments.map(e => {
    const program = window.appState.programs.find(p => p.id === e.programId);
    const status = e.completed ? '✅ Completed' : '🟡 Active';
    return `
      <div class="log-entry">
        👤 ${escapeHtml(e.participantName)} | ${program?.name || 'Unknown Program'} | ${status}
        ${!e.completed ? `<button class="action-btn" onclick="markProgramComplete(${e.id})">🏆 Mark Completed</button>` : ''}
      </div>
    `;
  }).join('');
}

// Mark a participant as completed for a program
window.markProgramComplete = async function(enrollmentId) {
  const enrollment = window.appState.programEnrollments.find(e => e.id === enrollmentId);
  if (enrollment && !enrollment.completed) {
    await api.completeEnrollment(enrollmentId);
    enrollment.completed = true;
    renderEnrollments();
    api.addLog('Completion Marked', `${enrollment.participantName} completed program`);
  }
};

// Helper: escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Helper to update analytics (reuse)
function updateAnalytics() {
  const revenue = window.appState.bookings.reduce((s, b) => s + (b.price || 0), 0);
  document.getElementById('totalRevenue').innerText = revenue.toLocaleString();
  const completedEvents = window.appState.events.filter(e => e.status === 'Completed').length;
  document.getElementById('completionRate').innerText = window.appState.events.length ? Math.round((completedEvents / window.appState.events.length) * 100) : 0;
  document.getElementById('activePrograms').innerText = window.appState.programs.filter(p => p.status === 'Active').length;
  document.getElementById('upcomingEvents').innerText = window.appState.events.filter(e => e.status === 'Upcoming').length;
  document.getElementById('partnerEngagement').innerText = window.appState.partners.length;
}