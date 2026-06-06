// panels/applications.js
import { api } from '../api.js';

// Render the entire Applications tab UI
window.renderApplications = async function() {
  const container = document.getElementById('applicationsTab');
  const html = `
    <div class="toolbar" style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
      <button class="btn" onclick="showApplicationForm('expert')">➕ New Expert Application</button>
      <button class="btn" onclick="showApplicationForm('corporate')">🏢 New Corporate Application</button>
      <button class="btn" onclick="showApplicationForm('membership')">👤 New Membership Application</button>
      <div class="search-bar" style="flex:1;">
        <input type="text" id="searchApplications" placeholder="Search by name/organization..." oninput="filterApplications()">
      </div>
      <select id="appTypeFilter" onchange="filterApplications()">
        <option value="all">All Types</option>
        <option value="expert">Experts</option>
        <option value="corporate">Corporates</option>
        <option value="membership">Membership</option>
      </select>
      <select id="appStatusFilter" onchange="filterApplications()">
        <option value="all">All Status</option>
        <option value="Pending">Pending</option>
        <option value="Approved">Approved</option>
        <option value="Declined">Declined</option>
      </select>
    </div>
    <div id="applicationsListContainer" class="cards-grid"></div>
  `;
  container.innerHTML = html;
  filterApplications();
};

// Combined list of all applications from state
function getAllApplications() {
  const expertApps = window.appState.expertApps.map(app => ({ ...app, type: 'expert', displayType: '👨‍🏫 Expert' }));
  const corpApps = window.appState.corporateApps.map(app => ({ ...app, type: 'corporate', displayType: '🏢 Corporate' }));
  const memApps = window.appState.membershipApps.map(app => ({ ...app, type: 'membership', displayType: '👥 Membership' }));
  return [...expertApps, ...corpApps, ...memApps];
}

// Filter and display applications
window.filterApplications = function() {
  let allApps = getAllApplications();
  const search = document.getElementById('searchApplications')?.value.toLowerCase() || '';
  const typeFilter = document.getElementById('appTypeFilter')?.value || 'all';
  const statusFilter = document.getElementById('appStatusFilter')?.value || 'all';
  
  if (search) {
    allApps = allApps.filter(app => 
      (app.name || app.organization || '').toLowerCase().includes(search) ||
      (app.email || '').toLowerCase().includes(search)
    );
  }
  if (typeFilter !== 'all') {
    allApps = allApps.filter(app => app.type === typeFilter);
  }
  if (statusFilter !== 'all') {
    allApps = allApps.filter(app => app.status === statusFilter);
  }
  
  const container = document.getElementById('applicationsListContainer');
  if (!container) return;
  if (allApps.length === 0) {
    container.innerHTML = '<div class="record-card" style="text-align:center; padding:2rem;">No applications found.</div>';
    return;
  }
  container.innerHTML = allApps.map(app => `
    <div class="record-card">
      <div class="card-header" style="display:flex; justify-content:space-between;">
        <span>${app.displayType}</span>
        <span style="background: ${getStatusColor(app.status)}; padding: 2px 8px; border-radius: 20px;">${app.status || 'Pending'}</span>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(app.name || app.organization || 'Unnamed')}</h3>
        <p><strong>Email:</strong> ${escapeHtml(app.email || 'N/A')}</p>
        <p><strong>Phone:</strong> ${escapeHtml(app.phone || 'N/A')}</p>
        <p><strong>Submitted:</strong> ${app.date ? new Date(app.date).toLocaleDateString() : 'Unknown'}</p>
        <p><strong>Details:</strong> ${escapeHtml(app.details || 'No additional details')}</p>
        <div class="action-buttons">
          <button class="action-btn" onclick="viewApplicationDetails('${app.type}', ${app.id})">🔍 View</button>
          ${app.status !== 'Approved' ? `<button class="action-btn" onclick="approveApplication('${app.type}', ${app.id})">✅ Approve</button>` : ''}
          ${app.status !== 'Declined' ? `<button class="action-btn" onclick="declineApplication('${app.type}', ${app.id})">❌ Decline</button>` : ''}
        </div>
      </div>
    </div>
  `).join('');
};

// Show modal form to submit a new application
window.showApplicationForm = function(type) {
  const typeLabels = {
    expert: 'Expert Application',
    corporate: 'Corporate Application',
    membership: 'Membership Application'
  };
  const modalContent = `
    <h3>➕ ${typeLabels[type]}</h3>
    <div class="form-grid">
      <input type="text" id="appName" placeholder="${type === 'corporate' ? 'Organization Name' : 'Full Name'}" required>
      <input type="email" id="appEmail" placeholder="Email Address" required>
      <input type="tel" id="appPhone" placeholder="Phone Number">
      ${type === 'corporate' ? '<input type="text" id="appContactPerson" placeholder="Contact Person Name">' : ''}
      <textarea id="appDetails" rows="4" placeholder="Additional details / qualifications / reason for applying"></textarea>
    </div>
    <div style="display: flex; gap: 10px; margin-top: 1rem;">
      <button class="btn" onclick="submitApplication('${type}')">Submit Application</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `;
  showModal(modalContent);
};

// Submit new application to server
window.submitApplication = async function(type) {
  const nameField = document.getElementById('appName');
  const emailField = document.getElementById('appEmail');
  if (!nameField.value.trim()) return alert('Name/Organization is required');
  if (!emailField.value.trim()) return alert('Email is required');
  
  const baseData = {
    name: nameField.value.trim(),
    email: emailField.value.trim(),
    phone: document.getElementById('appPhone')?.value || '',
    details: document.getElementById('appDetails')?.value || '',
    status: 'Pending',
    date: new Date().toISOString()
  };
  
  if (type === 'corporate') {
    baseData.organization = baseData.name;
    baseData.contactPerson = document.getElementById('appContactPerson')?.value || '';
    delete baseData.name; // corporate uses organization field
  }
  
  let created;
  if (type === 'expert') {
    created = await api.addApplication('expert', baseData);
    window.appState.expertApps.push(created);
  } else if (type === 'corporate') {
    created = await api.addApplication('corporate', baseData);
    window.appState.corporateApps.push(created);
  } else {
    created = await api.addApplication('membership', baseData);
    window.appState.membershipApps.push(created);
  }
  
  closeModal();
  filterApplications();
  api.addLog('Application Submitted', `${type}: ${baseData.name || baseData.organization}`);
};

// View application details (simple modal with full info)
window.viewApplicationDetails = function(type, id) {
  let app;
  if (type === 'expert') app = window.appState.expertApps.find(a => a.id === id);
  else if (type === 'corporate') app = window.appState.corporateApps.find(a => a.id === id);
  else app = window.appState.membershipApps.find(a => a.id === id);
  if (!app) return;
  
  const modalContent = `
    <h3>Application Details</h3>
    <div style="margin-top: 1rem;">
      <p><strong>${type === 'corporate' ? 'Organization' : 'Name'}:</strong> ${escapeHtml(app.name || app.organization || 'N/A')}</p>
      <p><strong>Email:</strong> ${escapeHtml(app.email || 'N/A')}</p>
      <p><strong>Phone:</strong> ${escapeHtml(app.phone || 'N/A')}</p>
      ${type === 'corporate' ? `<p><strong>Contact Person:</strong> ${escapeHtml(app.contactPerson || 'N/A')}</p>` : ''}
      <p><strong>Status:</strong> <span style="background: ${getStatusColor(app.status)}; padding: 2px 8px; border-radius: 20px;">${app.status || 'Pending'}</span></p>
      <p><strong>Submitted:</strong> ${app.date ? new Date(app.date).toLocaleString() : 'Unknown'}</p>
      <p><strong>Details:</strong><br>${escapeHtml(app.details || 'No details provided')}</p>
    </div>
    <div style="display: flex; gap: 10px; margin-top: 1rem;">
      ${app.status !== 'Approved' ? `<button class="btn" onclick="approveApplication('${type}', ${id}); closeModal();">✅ Approve</button>` : ''}
      ${app.status !== 'Declined' ? `<button class="btn btn-danger" onclick="declineApplication('${type}', ${id}); closeModal();">❌ Decline</button>` : ''}
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
    </div>
  `;
  showModal(modalContent);
};

// Approve application
window.approveApplication = async function(type, id) {
  const newStatus = 'Approved';
  let app, arr;
  if (type === 'expert') {
    arr = window.appState.expertApps;
    app = arr.find(a => a.id === id);
  } else if (type === 'corporate') {
    arr = window.appState.corporateApps;
    app = arr.find(a => a.id === id);
  } else {
    arr = window.appState.membershipApps;
    app = arr.find(a => a.id === id);
  }
  if (!app) return;
  app.status = newStatus;
  await api.updateApplicationStatus(type, id, newStatus);
  filterApplications();
  api.addLog('Application Approved', `${type}: ${app.name || app.organization}`);
};

// Decline application
window.declineApplication = async function(type, id) {
  const newStatus = 'Declined';
  let app, arr;
  if (type === 'expert') {
    arr = window.appState.expertApps;
    app = arr.find(a => a.id === id);
  } else if (type === 'corporate') {
    arr = window.appState.corporateApps;
    app = arr.find(a => a.id === id);
  } else {
    arr = window.appState.membershipApps;
    app = arr.find(a => a.id === id);
  }
  if (!app) return;
  app.status = newStatus;
  await api.updateApplicationStatus(type, id, newStatus);
  filterApplications();
  api.addLog('Application Declined', `${type}: ${app.name || app.organization}`);
};

// Helper: status background color
function getStatusColor(status) {
  switch(status) {
    case 'Approved': return '#10b981';
    case 'Declined': return '#ef4444';
    default: return '#f59e0b';
  }
}

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

// Helper to show modal (reuses global modal from index.html)
function showModal(content) {
  const modal = document.getElementById('globalModal');
  const modalContentDiv = modal.querySelector('.modal-content');
  modalContentDiv.innerHTML = content;
  modal.style.display = 'flex';
}

// Helper to close modal (global)
window.closeModal = function() {
  const modal = document.getElementById('globalModal');
  if (modal) modal.style.display = 'none';
};

// Helper to update analytics (if needed)
function updateAnalytics() {
  const revenue = window.appState.bookings.reduce((s, b) => s + (b.price || 0), 0);
  document.getElementById('totalRevenue').innerText = revenue.toLocaleString();
  const completedEvents = window.appState.events.filter(e => e.status === 'Completed').length;
  document.getElementById('completionRate').innerText = window.appState.events.length ? Math.round((completedEvents / window.appState.events.length) * 100) : 0;
  document.getElementById('activePrograms').innerText = window.appState.programs.filter(p => p.status === 'Active').length;
  document.getElementById('upcomingEvents').innerText = window.appState.events.filter(e => e.status === 'Upcoming').length;
  document.getElementById('partnerEngagement').innerText = window.appState.partners.length;
}