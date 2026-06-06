// panels/tracking.js
import { api } from '../api.js';

// Render the entire Tracking tab UI
window.renderTracking = async function() {
  const container = document.getElementById('trackingTab');
  const html = `
    <div class="analytics-dashboard" style="background: var(--surface); padding: 1rem; border-radius: 1rem; margin-bottom: 1rem;">
      <h3>📜 System Activity Logs</h3>
      <div id="activityLogs" class="logs-container" style="max-height: 300px; margin-top: 0.5rem;"></div>
    </div>
    <div class="form-panel">
      <h3>📞 Booking & Allocation Records</h3>
      <div id="bookingsLogs" class="logs-container" style="max-height: 300px;"></div>
    </div>
  `;
  container.innerHTML = html;
  renderActivityLogs();
  renderBookingLogs();
};

// Render system logs
function renderActivityLogs() {
  const container = document.getElementById('activityLogs');
  if (!container) return;
  const logs = window.appState.logs;
  if (!logs || logs.length === 0) {
    container.innerHTML = '<div class="log-entry">No activity logs recorded.</div>';
    return;
  }
  container.innerHTML = logs.slice(0, 50).map(log => `
    <div class="log-entry" style="border-bottom: 1px solid var(--border); padding: 6px 0;">
      <strong>[${log.timestamp || new Date(log.id).toLocaleString()}]</strong> 
      ${escapeHtml(log.action)}: ${escapeHtml(log.details)}
    </div>
  `).join('');
}

// Render booking allocations
function renderBookingLogs() {
  const container = document.getElementById('bookingsLogs');
  if (!container) return;
  const bookings = window.appState.bookings;
  if (!bookings || bookings.length === 0) {
    container.innerHTML = '<div class="log-entry">No bookings or allocations yet.</div>';
    return;
  }
  // Show most recent first
  const sorted = [...bookings].reverse();
  container.innerHTML = sorted.map(booking => `
    <div class="log-entry" style="border-bottom: 1px solid var(--border); padding: 6px 0;">
      📅 ${booking.date || new Date(booking.id).toLocaleString()} — 
      <strong>${escapeHtml(booking.name)}</strong> 
      booked at KES ${(booking.price || 0).toLocaleString()}
      ${booking.method ? `via ${booking.method}` : ''}
    </div>
  `).join('');
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