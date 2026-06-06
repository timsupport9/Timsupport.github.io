// panels/strategy.js
import { api } from '../api.js';

// Render the entire Strategy tab UI
window.renderStrategy = async function() {
  const container = document.getElementById('plansTab');
  const html = `
    <div class="stats-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
      <div class="stat-card">
        <h3>🎯 Strategic Goals</h3>
        <div id="goalsList" class="logs-container" style="max-height: 300px;"></div>
        <button class="btn" onclick="showGoalForm()" style="margin-top: 0.5rem;">+ Add Goal</button>
      </div>
      <div class="stat-card">
        <h3>📊 Key Performance Indicators</h3>
        <div id="kpisList" class="logs-container" style="max-height: 300px;"></div>
        <button class="btn" onclick="showKPIForm()" style="margin-top: 0.5rem;">+ Add KPI</button>
      </div>
      <div class="stat-card">
        <h3>🚀 Active Projects</h3>
        <div id="projectsList" class="logs-container" style="max-height: 300px;"></div>
        <button class="btn" onclick="showProjectForm()" style="margin-top: 0.5rem;">+ Add Project</button>
      </div>
    </div>
  `;
  container.innerHTML = html;
  renderGoals();
  renderKPIs();
  renderProjects();
};

// ==================== GOALS ====================
function renderGoals() {
  const container = document.getElementById('goalsList');
  if (!container) return;
  const goals = window.appState.goals;
  if (goals.length === 0) {
    container.innerHTML = '<div class="log-entry">No strategic goals set.</div>';
    return;
  }
  container.innerHTML = goals.map(g => `
    <div class="log-entry" style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong>${escapeHtml(g.goal)}</strong><br>
        Target: ${g.targetYear || 'N/A'} | Progress: ${g.progress || 0}%
      </div>
      <div>
        <button class="action-btn" onclick="editGoal(${g.id})">✏️</button>
        <button class="action-btn" onclick="deleteGoal(${g.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

window.showGoalForm = function() {
  const modalContent = `
    <h3>➕ Add Strategic Goal</h3>
    <div class="form-grid">
      <input type="text" id="goalTitle" placeholder="Goal description" required>
      <input type="number" id="goalTargetYear" placeholder="Target year (e.g., 2030)">
      <input type="number" id="goalProgress" placeholder="Progress % (0-100)" value="0">
    </div>
    <div style="display: flex; gap: 10px; margin-top: 1rem;">
      <button class="btn" onclick="addGoal()">Save Goal</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `;
  showModal(modalContent);
};

window.addGoal = async function() {
  const goal = document.getElementById('goalTitle')?.value.trim();
  if (!goal) return alert('Goal description required');
  const newGoal = {
    goal: goal,
    targetYear: parseInt(document.getElementById('goalTargetYear')?.value) || null,
    progress: parseInt(document.getElementById('goalProgress')?.value) || 0,
    status: 'In Progress'
  };
  const created = await api.addGoal(newGoal);
  window.appState.goals.push(created);
  closeModal();
  renderGoals();
  api.addLog('Strategic Goal Added', goal);
};

window.editGoal = async function(id) {
  const goal = window.appState.goals.find(g => g.id === id);
  if (!goal) return;
  const newGoal = prompt('Edit goal description:', goal.goal);
  if (newGoal && newGoal !== goal.goal) {
    goal.goal = newGoal;
    await api.updateGoal?.(id, { goal: newGoal }); // if endpoint exists
    renderGoals();
    api.addLog('Goal Updated', newGoal);
  }
};

window.deleteGoal = async function(id) {
  if (!confirm('Delete this strategic goal?')) return;
  await api.deleteGoal(id);
  window.appState.goals = window.appState.goals.filter(g => g.id !== id);
  renderGoals();
  api.addLog('Goal Deleted', `ID ${id}`);
};

// ==================== KPIs ====================
function renderKPIs() {
  const container = document.getElementById('kpisList');
  if (!container) return;
  const kpis = window.appState.kpis;
  if (kpis.length === 0) {
    container.innerHTML = '<div class="log-entry">No KPIs defined.</div>';
    return;
  }
  container.innerHTML = kpis.map(k => `
    <div class="log-entry" style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong>${escapeHtml(k.indicator)}</strong><br>
        Target: ${k.target || 'N/A'} | Current: ${k.current || 'N/A'}
      </div>
      <div>
        <button class="action-btn" onclick="editKPI(${k.id})">✏️</button>
        <button class="action-btn" onclick="deleteKPI(${k.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

window.showKPIForm = function() {
  const modalContent = `
    <h3>➕ Add Key Performance Indicator</h3>
    <div class="form-grid">
      <input type="text" id="kpiIndicator" placeholder="Indicator name" required>
      <input type="text" id="kpiTarget" placeholder="Target (e.g., 95%)">
      <input type="text" id="kpiCurrent" placeholder="Current value">
    </div>
    <div style="display: flex; gap: 10px; margin-top: 1rem;">
      <button class="btn" onclick="addKPI()">Save KPI</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `;
  showModal(modalContent);
};

window.addKPI = async function() {
  const indicator = document.getElementById('kpiIndicator')?.value.trim();
  if (!indicator) return alert('Indicator required');
  const newKPI = {
    indicator: indicator,
    target: document.getElementById('kpiTarget')?.value,
    current: document.getElementById('kpiCurrent')?.value
  };
  const created = await api.addKPI(newKPI);
  window.appState.kpis.push(created);
  closeModal();
  renderKPIs();
  api.addLog('KPI Added', indicator);
};

window.editKPI = async function(id) {
  const kpi = window.appState.kpis.find(k => k.id === id);
  if (!kpi) return;
  const newIndicator = prompt('Edit indicator name:', kpi.indicator);
  if (newIndicator && newIndicator !== kpi.indicator) {
    kpi.indicator = newIndicator;
    await api.updateKPI?.(id, { indicator: newIndicator });
    renderKPIs();
    api.addLog('KPI Updated', newIndicator);
  }
};

window.deleteKPI = async function(id) {
  if (!confirm('Delete this KPI?')) return;
  await api.deleteKPI(id);
  window.appState.kpis = window.appState.kpis.filter(k => k.id !== id);
  renderKPIs();
  api.addLog('KPI Deleted', `ID ${id}`);
};

// ==================== PROJECTS ====================
function renderProjects() {
  const container = document.getElementById('projectsList');
  if (!container) return;
  const projects = window.appState.projects;
  if (projects.length === 0) {
    container.innerHTML = '<div class="log-entry">No active projects.</div>';
    return;
  }
  container.innerHTML = projects.map(p => `
    <div class="log-entry" style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong>${escapeHtml(p.name)}</strong><br>
        Status: ${p.status || 'Active'}
      </div>
      <div>
        <button class="action-btn" onclick="editProject(${p.id})">✏️</button>
        <button class="action-btn" onclick="deleteProject(${p.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

window.showProjectForm = function() {
  const modalContent = `
    <h3>➕ Add Strategic Project</h3>
    <div class="form-grid">
      <input type="text" id="projectName" placeholder="Project name" required>
      <select id="projectStatus">
        <option>Active</option><option>Planning</option><option>Completed</option><option>On Hold</option>
      </select>
    </div>
    <div style="display: flex; gap: 10px; margin-top: 1rem;">
      <button class="btn" onclick="addProject()">Save Project</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `;
  showModal(modalContent);
};

window.addProject = async function() {
  const name = document.getElementById('projectName')?.value.trim();
  if (!name) return alert('Project name required');
  const newProject = {
    name: name,
    status: document.getElementById('projectStatus')?.value || 'Active'
  };
  const created = await api.addProject(newProject);
  window.appState.projects.push(created);
  closeModal();
  renderProjects();
  api.addLog('Project Added', name);
};

window.editProject = async function(id) {
  const project = window.appState.projects.find(p => p.id === id);
  if (!project) return;
  const newName = prompt('Edit project name:', project.name);
  if (newName && newName !== project.name) {
    project.name = newName;
    await api.updateProject?.(id, { name: newName });
    renderProjects();
    api.addLog('Project Updated', newName);
  }
};

window.deleteProject = async function(id) {
  if (!confirm('Delete this project?')) return;
  await api.deleteProject(id);
  window.appState.projects = window.appState.projects.filter(p => p.id !== id);
  renderProjects();
  api.addLog('Project Deleted', `ID ${id}`);
};

// ==================== HELPERS ====================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function showModal(content) {
  const modal = document.getElementById('globalModal');
  const modalContentDiv = modal.querySelector('.modal-content');
  modalContentDiv.innerHTML = content;
  modal.style.display = 'flex';
}

window.closeModal = function() {
  const modal = document.getElementById('globalModal');
  if (modal) modal.style.display = 'none';
};