// api.js
const API_BASE = 'https://management-dashboard-wj89.onrender.com/api';

// Helper to include auth token
function getHeaders() {
  const token = sessionStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

async function request(endpoint, method = 'GET', body = null) {
  const options = { method, headers: getHeaders() };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${API_BASE}/${endpoint}`, options);
  if (!response.ok) {
    if (response.status === 401) logout(); // token expired
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

// Export CRUD for each collection
export const api = {
  // Authentication
  login: (password) => request('login', 'POST', { password }),
  
  // Experts
  getExperts: () => request('experts'),
  addExpert: (data) => request('experts', 'POST', data),
  updateExpert: (id, data) => request(`experts/${id}`, 'PUT', data),
  deleteExpert: (id) => request(`experts/${id}`, 'DELETE'),
  
  // Events
  getEvents: () => request('events'),
  addEvent: (data) => request('events', 'POST', data),
  updateEvent: (id, data) => request(`events/${id}`, 'PUT', data),
  deleteEvent: (id) => request(`events/${id}`, 'DELETE'),
  
  // Activities
  getActivities: () => request('activities'),
  addActivity: (data) => request('activities', 'POST', data),
  deleteActivity: (id) => request(`activities/${id}`, 'DELETE'),
  
  // Programs
  getPrograms: () => request('programs'),
  addProgram: (data) => request('programs', 'POST', data),
  updateProgram: (id, data) => request(`programs/${id}`, 'PUT', data),
  deleteProgram: (id) => request(`programs/${id}`, 'DELETE'),
  
  // Partners
  getPartners: () => request('partners'),
  addPartner: (data) => request('partners', 'POST', data),
  updatePartner: (id, data) => request(`partners/${id}`, 'PUT', data),
  deletePartner: (id) => request(`partners/${id}`, 'DELETE'),
  
  // Applications (expert, corporate, membership)
  getExpertApplications: () => request('applications/expert'),
  getCorporateApplications: () => request('applications/corporate'),
  getMembershipApplications: () => request('applications/membership'),
  addApplication: (type, data) => request(`applications/${type}`, 'POST', data),
  updateApplicationStatus: (type, id, status) => request(`applications/${type}/${id}`, 'PATCH', { status }),
  
  // Strategic data
  getGoals: () => request('goals'),
  addGoal: (data) => request('goals', 'POST', data),
  deleteGoal: (id) => request(`goals/${id}`, 'DELETE'),
  getKPIs: () => request('kpis'),
  addKPI: (data) => request('kpis', 'POST', data),
  deleteKPI: (id) => request(`kpis/${id}`, 'DELETE'),
  getProjects: () => request('projects'),
  addProject: (data) => request('projects', 'POST', data),
  deleteProject: (id) => request(`projects/${id}`, 'DELETE'),
  
  // Logs & Bookings
  getLogs: () => request('logs'),
  addLog: (action, details) => request('logs', 'POST', { action, details }),
  getBookings: () => request('allocations'),
  addBooking: (data) => request('allocations', 'POST', data),
  
  // Event registrations & Program enrollments
  getEventRegistrations: () => request('eventRegistrations'),
  addEventRegistration: (data) => request('eventRegistrations', 'POST', data),
  updateAttendance: (id) => request(`eventRegistrations/${id}/attend`, 'PATCH'),
  getProgramEnrollments: () => request('programEnrollments'),
  addProgramEnrollment: (data) => request('programEnrollments', 'POST', data),
  completeEnrollment: (id) => request(`programEnrollments/${id}/complete`, 'PATCH')
};

// Global logout helper (used by api and app)
window.logout = function() {
  sessionStorage.removeItem('authToken');
  document.getElementById('mainDashboard').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'block';
  document.getElementById('passwordInput').value = '';
};
