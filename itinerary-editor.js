/**
 * EUROPA 2026 - DYNAMIC ITINERARY UI LAYER
 * Phase 1: Reactive UI controllers and event handlers
 * 
 * This module manages:
 * - Itinerary view rendering
 * - User interactions (edit mode, night changes)
 * - Calendar synchronization
 * - Expense block updates
 * - Modal alerts for conflicts
 */

window.ItineraryEditor = window.ItineraryEditor || {};

let editMode = false;
let selectedDestinationId = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

window.ItineraryEditor.init = function() {
  console.log('🎯 Initializing ItineraryEditor');
  
  // Find container
  const container = document.querySelector('.itinerary-container') || document.querySelector('main');
  if (!container) {
    console.error('Container not found');
    return false;
  }

  // Render initial state
  window.ItineraryEditor.renderItinerary();
  window.ItineraryEditor.updateCalendar();
  
  // Set up event listeners
  window.ItineraryEditor.setupEventListeners();
  
  console.log('✅ ItineraryEditor initialized');
  return true;
};

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

window.ItineraryEditor.renderItinerary = function() {
  const state = window.itineraryState;
  const metadata = window.ItineraryCore.getTravelMetadata();
  
  // Find or create container
  let container = document.getElementById('itinerary-editor-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'itinerary-editor-container';
    const target = document.querySelector('[data-itinerary-target]') || document.querySelector('main');
    if (target) target.appendChild(container);
  }

  // Header with stats
  let html = `
    <div class="itinerary-header">
      <h2>Itinerario</h2>
      <button class="edit-toggle-btn" id="edit-toggle">
        ${editMode ? '✓ Listo' : '✏️ Editar'}
      </button>
      <div class="travel-stats">
        <span>${metadata.totalDays} días</span>
        <span>${metadata.numDestinations} ciudades</span>
        <span>${metadata.totalNights} noches</span>
      </div>
    </div>
    <div class="itinerary-list">
  `;

  // List destinations
  state.destinations.forEach((dest, idx) => {
    const endDate = new Date(dest.startDate.getTime() + dest.nights * 24 * 60 * 60 * 1000);
    const dateRangeStr = window.ItineraryCore.formatDateRange(dest.startDate, dest.nights);
    
    html += `
      <div class="city-item" data-dest-id="${dest.id}" style="border-left: 4px solid ${dest.color}">
        <div class="city-header">
          <h3 class="city-name">${idx + 1}. ${dest.name}</h3>
          <span class="city-date-range">${dateRangeStr}</span>
        </div>
        <div class="city-details">
          <span class="nights-count">${dest.nights} noche${dest.nights !== 1 ? 's' : ''}</span>
        </div>
    `;
    
    if (editMode) {
      html += `
        <div class="city-item-editor">
          <label>Noches:</label>
          <input type="number" class="nights-input" value="${dest.nights}" min="1" max="30" data-dest-id="${dest.id}">
          <span class="input-hint">días de permanencia</span>
        </div>
      `;
    }
    
    html += `</div>`;
  });

  html += `</div>`;
  container.innerHTML = html;

  // Attach event listeners
  if (editMode) {
    document.querySelectorAll('.nights-input').forEach(input => {
      input.addEventListener('change', window.ItineraryEditor.handleNightsChange);
      input.addEventListener('blur', window.ItineraryEditor.handleNightsChange);
    });
  }
  
  document.getElementById('edit-toggle').addEventListener('click', window.ItineraryEditor.toggleEditMode);
};

// ============================================================================
// EVENT HANDLERS
// ============================================================================

window.ItineraryEditor.toggleEditMode = function() {
  editMode = !editMode;
  window.ItineraryEditor.renderItinerary();
};

window.ItineraryEditor.handleNightsChange = function(event) {
  const input = event.target;
  const destId = input.getAttribute('data-dest-id');
  const newNights = parseInt(input.value);
  
  if (isNaN(newNights) || newNights < 1) {
    console.error('Invalid night value');
    return;
  }

  // Execute cascade
  const result = window.ItineraryCore.cascadeUpdate(destId, newNights);
  
  if (!result.success) {
    console.error('Cascade failed:', result.error);
    return;
  }

  console.log('✅ Cascade completed:', result);
  
  // Check for conflicts
  if (result.alerts && result.alerts.length > 0) {
    window.ItineraryEditor.showConflictModal(result.alerts[0]);
  }
  
  // Re-render UI
  window.ItineraryEditor.renderItinerary();
  window.ItineraryEditor.updateCalendar();
  window.ItineraryEditor.updateExpenseBlocks();
};

// ============================================================================
// CALENDAR UPDATE
// ============================================================================

window.ItineraryEditor.updateCalendar = function() {
  const dayMap = window.ItineraryCore.getCalendarDayMap();
  const state = window.itineraryState;
  
  // Update calendar cells if they exist
  document.querySelectorAll('[data-calendar-day]').forEach(cell => {
    const dateStr = cell.getAttribute('data-calendar-day');
    const dest = dayMap[dateStr];
    
    if (dest) {
      cell.style.backgroundColor = dest.color;
      cell.style.color = '#fff';
    } else {
      cell.style.backgroundColor = '';
      cell.style.color = '';
    }
  });
};

// ============================================================================
// EXPENSE BLOCKS UPDATE
// ============================================================================

window.ItineraryEditor.updateExpenseBlocks = function() {
  const blocks = window.ItineraryCore.getExpenseBlocksGrouped();
  
  // Update expense block titles and dates
  document.querySelectorAll('[data-expense-block]').forEach((block, idx) => {
    if (idx < blocks.length) {
      const blockData = blocks[idx];
      const dest = blockData.destination;
      
      // Update date range in block header
      const dateRangeStr = window.ItineraryCore.formatDateRange(dest.startDate, dest.nights);
      const titleEl = block.querySelector('[data-block-title]');
      if (titleEl) {
        titleEl.textContent = `${dest.name} · ${dateRangeStr}`;
      }
    }
  });
};

// ============================================================================
// CONFLICT MODAL
// ============================================================================

window.ItineraryEditor.showConflictModal = function(alert) {
  // Create modal if not exists
  let modal = document.getElementById('conflict-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'conflict-modal';
    modal.className = 'conflict-modal';
    document.body.appendChild(modal);
  }

  const dest = alert.destination;
  const item = alert.item;
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header alert-critical">
        <span class="icon">⚠️</span>
        <h3>Conflicto de Fechas</h3>
        <button class="close-btn" onclick="document.getElementById('conflict-modal').style.display='none'">×</button>
      </div>
      <div class="modal-body">
        <p><strong>Reserva Confirmada:</strong> ${item.desc}</p>
        <p><strong>Fechas de Reserva:</strong> ${item.dates}</p>
        <p><strong>Nuevas Fechas de ${dest.name}:</strong> ${window.ItineraryCore.formatDateRange(dest.startDate, dest.nights)}</p>
        <p class="warning">⚠️ Las fechas de tu reserva ya no coinciden con los días asignados.</p>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="document.getElementById('conflict-modal').style.display='none'">Deshacer</button>
        <button class="btn-primary" onclick="document.getElementById('conflict-modal').style.display='none'">Confirmar cambios</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'flex';
};

// ============================================================================
// EVENT SETUP
// ============================================================================

window.ItineraryEditor.setupEventListeners = function() {
  // Listen for state changes from other parts of app
  document.addEventListener('itinerary:cascadeUpdate', (e) => {
    console.log('Cascade update event received');
    window.ItineraryEditor.renderItinerary();
    window.ItineraryEditor.updateCalendar();
  });
};

// ============================================================================
// PUBLIC API
// ============================================================================

window.ItineraryEditor.getEditMode = function() {
  return editMode;
};

window.ItineraryEditor.setEditMode = function(value) {
  editMode = !!value;
  window.ItineraryEditor.renderItinerary();
};

console.log('✅ ItineraryEditor loaded');

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.ItineraryEditor.init);
} else {
  window.ItineraryEditor.init();
}
