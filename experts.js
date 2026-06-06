// panels/experts.js
import { api } from '../api.js';

// Render experts grid
window.renderExperts = async function() {
  const container = document.getElementById('expertsTab');
  const state = window.appState.experts;
  const html = `
    <div class="toolbar" style="display: flex; gap: 1rem; margin-bottom: 1rem;">
      <div class="search-bar"><input type="text" id="searchExperts" placeholder="Search experts..." oninput="filterExperts()"></div>
      <select id="statusFilter" onchange="filterExperts()"><option value="all">All Status</option><option>Available</option><option>Limited</option><option>Unavailable</option></select>
      <select id="sortBy" onchange="filterExperts()"><option value="name">Name</option><option value="rating">Rating</option><option value="price_high">Highest Rate</option></select>
    </div>
    <div id="expertsGrid" class="cards-grid"></div>
    <div class="form-panel">
      <h3>➕ Register New Expert</h3>
      <div class="form-grid">
        <input type="text" id="expName" placeholder="Full Name"> <input type="text" id="expSpecialty" placeholder="Specialization">
        <select id="expCategory"><option>Business & Finance</option><option>Technology & AI</option><option>Healthcare</option><option>Education</option></select>
        <input type="number" id="expPrice" placeholder="Rate (KES)"> <input type="text" id="expLocation" placeholder="Location">
        <select id="expAvailability"><option>Available</option><option>Limited</option><option>Unavailable</option></select>
        <textarea id="expBio" placeholder="Bio"></textarea>
      </div>
      <button class="btn" onclick="addExpert()">Add Expert</button>
    </div>
  `;
  container.innerHTML = html;
  filterExperts(); // initial render
};

window.filterExperts = function() {
  let filtered = [...window.appState.experts];
  const search = document.getElementById('searchExperts')?.value.toLowerCase() || '';
  if (search) filtered = filtered.filter(e => e.name.toLowerCase().includes(search));
  const status = document.getElementById('statusFilter')?.value;
  if (status && status !== 'all') filtered = filtered.filter(e => e.availability === status);
  const sort = document.getElementById('sortBy')?.value;
  if (sort === 'rating') filtered.sort((a,b) => (b.rating||0) - (a.rating||0));
  else if (sort === 'price_high') filtered.sort((a,b) => b.price - a.price);
  else filtered.sort((a,b) => a.name.localeCompare(b.name));
  const grid = document.getElementById('expertsGrid');
  if (grid) grid.innerHTML = filtered.map(e => `
    <div class="record-card">
      <div class="card-header" style="display:flex; justify-content:space-between;"><span>${e.category}</span><span>⭐ ${e.rating || 4.5}</span></div>
      <div class="card-body">
        <h3>${e.name}</h3>
        <p>${e.specialty || ''} | ${e.location || ''}</p>
        <p>Status: ${e.availability}</p>
        <p class="price">KES ${e.price?.toLocaleString()}</p>
        <div class="action-buttons">
          <button class="action-btn action-btn-primary" onclick="bookExpert(${e.id})">📞 Book</button>
          <button class="action-btn" onclick="editExpert(${e.id})">✏️ Edit</button>
          <button class="action-btn" onclick="deleteExpert(${e.id})">🗑️ Delete</button>
        </div>
      </div>
    </div>
  `).join('');
};

window.addExpert = async function() {
  const newExpert = {
    name: document.getElementById('expName').value,
    category: document.getElementById('expCategory').value,
    specialty: document.getElementById('expSpecialty').value,
    availability: document.getElementById('expAvailability').value,
    price: parseFloat(document.getElementById('expPrice').value) || 0,
    location: document.getElementById('expLocation').value,
    bio: document.getElementById('expBio').value,
    rating: 4.5
  };
  if (!newExpert.name) return alert('Name required');
  const created = await api.addExpert(newExpert);
  window.appState.experts.push(created);
  filterExperts();
  updateAnalytics();
  api.addLog('Expert Added', created.name);
};

window.editExpert = async function(id) {
  const expert = window.appState.experts.find(e => e.id === id);
  const newName = prompt('New name:', expert.name);
  if (newName) {
    expert.name = newName;
    await api.updateExpert(id, { name: newName });
    filterExperts();
    api.addLog('Expert Updated', expert.name);
  }
};

window.deleteExpert = async function(id) {
  if (!confirm('Delete expert?')) return;
  await api.deleteExpert(id);
  window.appState.experts = window.appState.experts.filter(e => e.id !== id);
  filterExperts();
  updateAnalytics();
  api.addLog('Expert Deleted', `ID ${id}`);
};

window.bookExpert = function(id) {
  const expert = window.appState.experts.find(e => e.id === id);
  if (expert) {
    const booking = { expertId: expert.id, name: expert.name, price: expert.price, date: new Date().toISOString() };
    api.addBooking(booking).then(() => {
      window.appState.bookings.push(booking);
      updateAnalytics();
      api.addLog('Booking Made', `${expert.name} - KES ${expert.price}`);
      window.open(`https://wa.me/254724615550?text=${encodeURIComponent(`Booking: ${expert.name}`)}`, '_blank');
    });
  }
};

// Helper to refresh analytics (needs to be imported from app.js, but we'll redeclare)
function updateAnalytics() {
  const revenue = window.appState.bookings.reduce((s, b) => s + (b.price || 0), 0);
  document.getElementById('totalRevenue').innerText = revenue.toLocaleString();
  const completed = window.appState.events.filter(e => e.status === 'Completed').length;
  document.getElementById('completionRate').innerText = window.appState.events.length ? Math.round((completed / window.appState.events.length) * 100) : 0;
  document.getElementById('activePrograms').innerText = window.appState.programs.filter(p => p.status === 'Active').length;
  document.getElementById('upcomingEvents').innerText = window.appState.events.filter(e => e.status === 'Upcoming').length;
  document.getElementById('partnerEngagement').innerText = window.appState.partners.length;
}