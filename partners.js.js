// panels/partners.js
import { api } from '../api.js';

// Render the entire Partners tab UI
window.renderPartners = async function() {
  const container = document.getElementById('partnersTab');
  const html = `
    <div class="toolbar" style="margin-bottom: 1rem;">
      <div class="search-bar">
        <input type="text" id="searchPartners" placeholder="Search partners by name, contact, email..." oninput="filterPartners()">
      </div>
    </div>
    <div id="partnersGrid" class="cards-grid"></div>
    
    <div class="form-panel">
      <h3>➕ Register New Partner Organization</h3>
      <div class="form-grid">
        <input type="text" id="partnerName" placeholder="Organization Name">
        <input type="text" id="partnerContact" placeholder="Contact Person">
        <input type="email" id="partnerEmail" placeholder="Email Address">
        <input type="text" id="partnerPhone" placeholder="Phone Number">
        <select id="partnerType">
          <option>Strategic Partner</option>
          <option>Implementing Partner</option>
          <option>Funding Partner</option>
          <option>Technical Partner</option>
        </select>
        <input type="date" id="partnerAgreementDate" placeholder="Agreement Date">
        <textarea id="partnerDesc" placeholder="Partnership Scope / Description" rows="2"></textarea>
      </div>
      <button class="btn" onclick="addPartner()">Register Partner</button>
    </div>
  `;
  container.innerHTML = html;
  filterPartners(); // initial render
};

// Filter and display partners
window.filterPartners = function() {
  let filtered = [...window.appState.partners];
  const search = document.getElementById('searchPartners')?.value.toLowerCase() || '';
  if (search) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(search) ||
      (p.contactPerson && p.contactPerson.toLowerCase().includes(search)) ||
      (p.email && p.email.toLowerCase().includes(search))
    );
  }
  
  const grid = document.getElementById('partnersGrid');
  if (!grid) return;
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="record-card" style="text-align:center; padding:2rem;">No partners registered yet.</div>';
    return;
  }
  grid.innerHTML = filtered.map(p => `
    <div class="record-card">
      <div class="card-header" style="display:flex; justify-content:space-between;">
        <span>${p.type || 'Partner'}</span>
        <span>${p.agreementDate ? '📅 ' + p.agreementDate : ''}</span>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <p><strong>Contact:</strong> ${escapeHtml(p.contactPerson || 'N/A')}</p>
        <p><strong>Email:</strong> ${escapeHtml(p.email || 'N/A')}</p>
        <p><strong>Phone:</strong> ${escapeHtml(p.phone || 'N/A')}</p>
        <p><strong>Scope:</strong> ${escapeHtml(p.description || 'No description provided.')}</p>
        <div class="action-buttons">
          <button class="action-btn" onclick="editPartner(${p.id})">✏️ Edit</button>
          <button class="action-btn" onclick="deletePartner(${p.id})">🗑️ Delete</button>
        </div>
      </div>
    </div>
  `).join('');
};

// Add new partner
window.addPartner = async function() {
  const name = document.getElementById('partnerName').value.trim();
  if (!name) return alert('Organization name required');
  
  const newPartner = {
    name: name,
    contactPerson: document.getElementById('partnerContact').value,
    email: document.getElementById('partnerEmail').value,
    phone: document.getElementById('partnerPhone').value,
    type: document.getElementById('partnerType').value,
    agreementDate: document.getElementById('partnerAgreementDate').value,
    description: document.getElementById('partnerDesc').value
  };
  
  const created = await api.addPartner(newPartner);
  window.appState.partners.push(created);
  filterPartners();
  updateAnalytics();
  api.addLog('Partner Registered', created.name);
  
  // Clear form
  document.getElementById('partnerName').value = '';
  document.getElementById('partnerContact').value = '';
  document.getElementById('partnerEmail').value = '';
  document.getElementById('partnerPhone').value = '';
  document.getElementById('partnerAgreementDate').value = '';
  document.getElementById('partnerDesc').value = '';
  // Keep partnerType default
};

// Edit partner (inline edit via modal or prompt – using prompt for simplicity)
window.editPartner = async function(id) {
  const partner = window.appState.partners.find(p => p.id === id);
  if (!partner) return;
  
  const newName = prompt('Edit organization name:', partner.name);
  if (newName && newName !== partner.name) {
    partner.name = newName;
    await api.updatePartner(id, { name: newName });
    filterPartners();
    api.addLog('Partner Updated', newName);
  }
};

// Delete partner
window.deletePartner = async function(id) {
  if (!confirm('Delete this partner? This action cannot be undone.')) return;
  await api.deletePartner(id);
  window.appState.partners = window.appState.partners.filter(p => p.id !== id);
  filterPartners();
  updateAnalytics();
  api.addLog('Partner Deleted', `ID ${id}`);
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