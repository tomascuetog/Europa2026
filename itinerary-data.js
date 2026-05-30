/**
 * EUROPA 2026 - DYNAMIC ITINERARY DATA LAYER
 * Phase 1: Core business logic for cascading date updates and conflict validation
 * 
 * This module provides the centralized state management and core algorithms for:
 * - Cascading date recalculation (O(n) complexity)
 * - Reservation conflict detection (RESERVED vs PROYECTADO)
 * - Dynamic expense block generation
 * - Travel metadata computation
 * - Calendar day mapping
 */

// ============================================================================
// CENTRALIZED STATE OBJECT
// ============================================================================

window.itineraryState = {
  destinations: [
    { id: 'madrid', name: 'Madrid', startDate: new Date(2026, 8, 1), nights: 3, color: '#1a3a52' },
    { id: 'bcn', name: 'Barcelona', startDate: new Date(2026, 8, 4), nights: 3, color: '#d32f2f' },
    { id: 'atenas', name: 'Atenas', startDate: new Date(2026, 8, 7), nights: 1, color: '#1565c0' },
    { id: 'islas', name: 'Islas Griegas', startDate: new Date(2026, 8, 8), nights: 7, color: '#0097a7' },
    { id: 'continental', name: 'Continental', startDate: new Date(2026, 8, 15), nights: 4, color: '#00796b' },
    { id: 'budapest', name: 'Budapest', startDate: new Date(2026, 8, 19), nights: 3, color: '#6a1b9a' }
  ],
  expenseBlocks: [
    { id: 'madrid', title: 'Madrid', transitions: [], items: [
      { id: 'vuelo', desc: 'Vuelo Buenos Aires → Madrid', amount: 1200, type: 'RESERVADO', dates: '1 Sep' }
    ] },
    { id: 'bcn', title: 'Barcelona', transitions: ['Madrid → Barcelona'], items: [
      { id: 'hotel', desc: 'BCN Sports Hostel', amount: 200, type: 'RESERVADO', dates: '4-7 Sep' },
      { id: 'traslado', desc: 'Traslado aeropuerto', amount: 80, type: 'PROYECTADO' }
    ] },
    { id: 'atenas', title: 'Atenas', transitions: ['Barcelona → Atenas'], items: [
      { id: 'vuelo-atenas', desc: 'Vuelo Barcelona → Atenas', amount: 150, type: 'RESERVADO', dates: '7 Sep' }
    ] },
    { id: 'islas', title: 'Islas Griegas', transitions: ['Atenas → Islas'], items: [
      { id: 'ferry', desc: 'Ferry Santorini', amount: 120, type: 'RESERVADO', dates: '8 Sep' },
      { id: 'alojamiento', desc: 'Alojamiento en villas', amount: 600, type: 'PROYECTADO' }
    ] },
    { id: 'continental', title: 'Continental', transitions: ['Islas → Continental'], items: [
      { id: 'road-trip', desc: 'Road Trip alquiler auto', amount: 300, type: 'PROYECTADO' }
    ] },
    { id: 'budapest', title: 'Budapest', transitions: ['Continental → Budapest'], items: [
      { id: 'tren', desc: 'Tren directo Budapest', amount: 250, type: 'RESERVADO', dates: '19 Sep' }
    ] }
  ],
  alerts: []
};

// ============================================================================
// CORE CASCADE ALGORITHM
// ============================================================================

/**
 * Main function: Cascade date updates from a modified destination to all subsequent ones
 * Algorithm: O(n) where n = number of destinations
 * 
 * @param {string} destinationId - ID of the destination that was modified
 * @param {number} newNights - New number of nights for this destination
 * @returns {object} Result object with success flag, updated destinations, and alerts
 */
window.ItineraryCore = window.ItineraryCore || {};

window.ItineraryCore.cascadeUpdate = function(destinationId, newNights) {
  // Validation
  if (!destinationId || typeof newNights !== 'number' || newNights < 1) {
    return { success: false, error: 'Invalid parameters' };
  }

  const state = window.itineraryState;
  const destIndex = state.destinations.findIndex(d => d.id === destinationId);
  
  if (destIndex === -1) {
    return { success: false, error: 'Destination not found' };
  }

  const oldNights = state.destinations[destIndex].nights;
  const nightsDiff = newNights - oldNights;

  // Update the modified destination
  state.destinations[destIndex].nights = newNights;

  // Cascade to all subsequent destinations
  if (nightsDiff !== 0) {
    for (let i = destIndex + 1; i < state.destinations.length; i++) {
      const msDiff = nightsDiff * 24 * 60 * 60 * 1000;
      state.destinations[i].startDate = new Date(state.destinations[i].startDate.getTime() + msDiff);
    }
  }

  // Validate conflicts after cascade
  const conflicts = window.ItineraryCore.validateReservationConflicts(destinationId);

  // Update state alerts
  state.alerts = conflicts;

  return {
    success: true,
    updatedDestinations: state.destinations,
    alerts: conflicts,
    nightsDiff: nightsDiff,
    state: state
  };
};

// ============================================================================
// CONFLICT VALIDATION
// ============================================================================

/**
 * Validate reservation conflicts after date changes
 * Differentiates between RESERVED (critical alert) and PROYECTADO (silent)
 * 
 * @param {string} destinationId - Destination that was modified
 * @returns {array} Array of conflict alert objects
 */
window.ItineraryCore.validateReservationConflicts = function(destinationId) {
  const state = window.itineraryState;
  const alerts = [];
  
  const destIndex = state.destinations.findIndex(d => d.id === destinationId);
  if (destIndex === -1) return alerts;

  const dest = state.destinations[destIndex];
  const destStartDate = dest.startDate;
  const destEndDate = new Date(destStartDate.getTime() + dest.nights * 24 * 60 * 60 * 1000);

  // Check expense blocks for this destination
  const expenseBlock = state.expenseBlocks[destIndex];
  if (!expenseBlock) return alerts;

  for (const item of expenseBlock.items) {
    if (item.type === 'RESERVADO' && item.dates) {
      // Parse dates (e.g., "4-7 Sep" or "7 Sep")
      const itemDates = window.ItineraryCore.parseItemDates(item.dates);
      
      if (itemDates) {
        // Check if item dates are within destination dates
        if (itemDates.end < destStartDate || itemDates.start > destEndDate) {
          alerts.push({
            level: 'critical',
            type: 'RESERVATION_OUT_OF_BOUNDS',
            destinationId: destinationId,
            itemId: item.id,
            message: `⚠️ ALERTA: La reserva "${item.desc}" (${item.dates}) ya no coincide con los nuevos días de ${dest.name}`,
            item: item,
            destination: dest
          });
        }
      }
    }
  }

  return alerts;
};

/**
 * Parse item date strings (e.g., "4-7 Sep" or "7 Sep")
 * Returns date objects or null if parsing fails
 */
window.ItineraryCore.parseItemDates = function(dateStr) {
  if (!dateStr) return null;
  
  // Format: "4-7 Sep" or "7 Sep"
  const parts = dateStr.split(' ');
  if (parts.length < 2) return null;
  
  const month = parts[parts.length - 1]; // "Sep"
  const dayPart = parts.slice(0, -1).join(' '); // "4-7" or "7"
  
  const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
  if (monthIndex === -1) return null;
  
  if (dayPart.includes('-')) {
    const [startDay, endDay] = dayPart.split('-').map(d => parseInt(d.trim()));
    return {
      start: new Date(2026, monthIndex, startDay),
      end: new Date(2026, monthIndex, endDay + 1)
    };
  } else {
    const day = parseInt(dayPart);
    return {
      start: new Date(2026, monthIndex, day),
      end: new Date(2026, monthIndex, day + 1)
    };
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get comprehensive travel metadata
 */
window.ItineraryCore.getTravelMetadata = function() {
  const state = window.itineraryState;
  const firstDest = state.destinations[0];
  const lastDest = state.destinations[state.destinations.length - 1];
  
  const totalNights = state.destinations.reduce((sum, d) => sum + d.nights, 0);
  const firstDay = new Date(firstDest.startDate);
  const lastDay = new Date(lastDest.startDate.getTime() + lastDest.nights * 24 * 60 * 60 * 1000);
  const totalDays = Math.ceil((lastDay - firstDay) / (24 * 60 * 60 * 1000));

  return {
    firstDestination: firstDest.name,
    lastDestination: lastDest.name,
    totalNights: totalNights,
    totalDays: totalDays,
    numDestinations: state.destinations.length,
    firstDate: firstDay,
    lastDate: lastDay,
    startMonth: firstDay.toLocaleString('es-ES', { month: 'long' }),
    startYear: firstDay.getFullYear()
  };
};

/**
 * Get calendar day to destination mapping
 */
window.ItineraryCore.getCalendarDayMap = function() {
  const state = window.itineraryState;
  const dayMap = {}; // day -> destination
  
  state.destinations.forEach(dest => {
    for (let i = 0; i < dest.nights; i++) {
      const day = new Date(dest.startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const key = day.toISOString().split('T')[0]; // YYYY-MM-DD
      dayMap[key] = dest;
    }
  });
  
  return dayMap;
};

/**
 * Get expense blocks grouped and ordered by date
 */
window.ItineraryCore.getExpenseBlocksGrouped = function() {
  const state = window.itineraryState;
  return state.expenseBlocks.map((block, idx) => {
    const dest = state.destinations[idx];
    return {
      ...block,
      destination: dest,
      startDate: dest.startDate,
      endDate: new Date(dest.startDate.getTime() + dest.nights * 24 * 60 * 60 * 1000)
    };
  });
};

/**
 * Get destination by ID
 */
window.ItineraryCore.getDestinationById = function(id) {
  return window.itineraryState.destinations.find(d => d.id === id);
};

/**
 * Get current state snapshot
 */
window.ItineraryCore.getState = function() {
  return JSON.parse(JSON.stringify(window.itineraryState));
};

/**
 * Format date to "D Mon" format (e.g., "4 Sep")
 */
window.ItineraryCore.formatDate = function(date) {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

/**
 * Format date range (e.g., "4-7 Sep")
 */
window.ItineraryCore.formatDateRange = function(startDate, nights) {
  const endDay = startDate.getDate() + nights - 1;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthStr = months[startDate.getMonth()];
  
  if (nights === 1) {
    return `${startDate.getDate()} ${monthStr}`;
  }
  return `${startDate.getDate()}-${endDay} ${monthStr}`;
};

console.log('✅ ItineraryCore loaded');
