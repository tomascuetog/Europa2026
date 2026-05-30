/**
 * ITINERARIO DINÁMICO - Data & State Management
 * Gestiona el estado central del itinerario con cálculo dinámico de fechas
 */

// ============================================================================
// INITIAL DATA (será reemplazado por Supabase en producción)
// ============================================================================

const INITIAL_DESTINATIONS = [
  {
    id: 'mad',
    name: 'Madrid',
    sequence: 1,
    startDate: '2026-09-01',
    nights: 3,
    color: '#0d1b2a',
    temp: 22,
    rainfall: 5,
    description: 'Punto de entrada y cierre'
  },
  {
    id: 'bcn',
    name: 'Barcelona',
    sequence: 2,
    startDate: '2026-09-04',
    nights: 3,
    color: '#b91c1c',
    temp: 24,
    rainfall: 0,
    description: 'Gaudí, playa, tapas'
  },
  {
    id: 'ath',
    name: 'Atenas',
    sequence: 3,
    startDate: '2026-09-07',
    nights: 1,
    color: '#1d4ed8',
    temp: 28,
    rainfall: 2,
    description: 'Acrópolis, Monastiraki'
  },
  {
    id: 'grecia-islas',
    name: 'Grecia — Islas',
    sequence: 4,
    startDate: '2026-09-08',
    nights: 7,
    color: '#0891b2',
    temp: 26,
    rainfall: 0,
    description: 'Santorini · Naxos · Creta'
  },
  {
    id: 'continental',
    name: 'Grecia Continental',
    sequence: 5,
    startDate: '2026-09-15',
    nights: 4,
    color: '#d97706',
    temp: 26,
    rainfall: 3,
    description: 'Road trip en auto'
  },
  {
    id: 'bud',
    name: 'Budapest',
    sequence: 6,
    startDate: '2026-09-19',
    nights: 3,
    color: '#7c3aed',
    temp: 19,
    rainfall: 8,
    description: 'Baños, Parlamento, ruin bars'
  }
];

const INITIAL_EXPENSE_BLOCKS = [
  {
    id: 'blk-mad-1',
    destinationId: 'mad',
    title: 'Madrid',
    type: 'accommodation',
    status: 'reserved',
    startDate: '2026-09-01',
    endDate: '2026-09-04',
    calculated: false,
    items: [
      {
        id: 'item-mad-1',
        description: 'Alojamiento Madrid (3 noches)',
        tag: 'hospedaje',
        estimatedAmount: 180,
        actualAmount: 180,
        paidAmount: 180,
        paidDate: '2026-08-15'
      }
    ]
  },
  {
    id: 'blk-mad-bcn',
    destinationId: null,
    title: 'Madrid → Barcelona',
    type: 'transport',
    status: 'reserved',
    startDate: '2026-09-04',
    endDate: '2026-09-04',
    calculated: true,
    items: [
      {
        id: 'item-transport-1',
        description: 'Vuelo Madrid → Barcelona',
        tag: 'transporte',
        estimatedAmount: 120,
        actualAmount: 120,
        paidAmount: 0
      }
    ]
  },
  {
    id: 'blk-bcn-1',
    destinationId: 'bcn',
    title: 'Barcelona',
    type: 'accommodation',
    status: 'reserved',
    startDate: '2026-09-04',
    endDate: '2026-09-07',
    calculated: false,
    items: [
      {
        id: 'item-bcn-1',
        description: 'BCN Sports Hostel',
        tag: 'hospedaje',
        estimatedAmount: 150,
        actualAmount: 150,
        paidAmount: 150,
        paidDate: '2026-08-20'
      },
      {
        id: 'item-bcn-2',
        description: 'Tour Sagrada Familia',
        tag: 'actividad',
        estimatedAmount: 80,
        actualAmount: null,
        paidAmount: 0
      }
    ]
  }
];

// ============================================================================
// ITINERARY STATE (en memoria, será reemplazado por Context en React)
// ============================================================================

let itineraryState = {
  destinations: JSON.parse(JSON.stringify(INITIAL_DESTINATIONS)),
  expenseBlocks: JSON.parse(JSON.stringify(INITIAL_EXPENSE_BLOCKS)),
  alerts: []
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Suma días a una fecha ISO 8601
 */
function addDays(dateStr, days) {
  const date = new Date(dateStr + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Calcula la diferencia en días entre dos fechas ISO
 */
function daysDifference(startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

/**
 * Obtiene el destino anterior (por sequence)
 */
function getPreviousDestination(sequence) {
  return itineraryState.destinations.find(d => d.sequence === sequence - 1) || null;
}

/**
 * Obtiene el siguiente destino (por sequence)
 */
function getNextDestination(sequence) {
  return itineraryState.destinations.find(d => d.sequence === sequence + 1) || null;
}

/**
 * Calcula fecha de fin basado en startDate + nights
 */
function calculateEndDate(startDate, nights) {
  return addDays(startDate, nights);
}

// ============================================================================
// CASCADING LOGIC
// ============================================================================

/**
 * NÚCLEO: Recalcula todas las fechas en cascada cuando se modifica una duración
 * @param {string} destinationId - ID del destino modificado
 * @param {number} newNights - Nuevo número de noches
 */
function cascadeUpdate(destinationId, newNights) {
  const destIndex = itineraryState.destinations.findIndex(d => d.id === destinationId);
  if (destIndex === -1) {
    console.error('Destination not found:', destinationId);
    return { success: false, errors: ['Destino no encontrado'] };
  }

  const errors = [];
  const updatedDestinations = [];

  // Validar nuevas noches (mínimo 1)
  if (newNights < 1) {
    errors.push('Las noches deben ser al menos 1');
    return { success: false, errors };
  }

  // Calcular diferencia en duración
  const currentDest = itineraryState.destinations[destIndex];
  const nightsDiff = newNights - currentDest.nights;

  // PASO 1: Actualizar destino modificado
  currentDest.nights = newNights;
  currentDest.endDate = calculateEndDate(currentDest.startDate, newNights);
  updatedDestinations.push(currentDest.id);

  // PASO 2: Propagar cambios a destinos posteriores
  for (let i = destIndex + 1; i < itineraryState.destinations.length; i++) {
    const nextDest = itineraryState.destinations[i];
    nextDest.startDate = addDays(nextDest.startDate, nightsDiff);
    nextDest.endDate = calculateEndDate(nextDest.startDate, nextDest.nights);
    updatedDestinations.push(nextDest.id);
  }

  // PASO 3: Actualizar bloques de gasto asociados
  updateExpenseBlockDates(currentDest, nightsDiff);

  // PASO 4: Validar conflictos con reservas
  const conflicts = validateReservationConflicts(currentDest);
  if (conflicts.length > 0) {
    itineraryState.alerts = conflicts;
  } else {
    itineraryState.alerts = [];
  }

  // PASO 5: Recalcular títulos de bloques de transporte
  regenerateTransportBlockTitles();

  return {
    success: true,
    updatedDestinations,
    alerts: itineraryState.alerts,
    state: itineraryState
  };
}

/**
 * Actualiza fechas de bloques de gasto asociados a un destino
 */
function updateExpenseBlockDates(destination, nightsDiff) {
  itineraryState.expenseBlocks.forEach(block => {
    // Bloques de hospedaje
    if (block.destinationId === destination.id && block.type === 'accommodation') {
      block.startDate = destination.startDate;
      block.endDate = destination.endDate;
    }

    // Bloques de transporte (si el destino anterior se modificó, afecta el bloque saliente)
    if (block.type === 'transport') {
      const prevDest = getPreviousDestination(destination.sequence);
      if (prevDest && block.destinationId === prevDest.id) {
        // Ajustar fecha de transporte
        block.startDate = addDays(block.startDate, nightsDiff);
        block.endDate = block.startDate;
      }
    }
  });
}

/**
 * Valida conflictos entre fechas del itinerario y reservas RESERVED
 * Retorna array de alertas críticas
 */
function validateReservationConflicts(destination) {
  const conflicts = [];
  const accommodationBlocks = itineraryState.expenseBlocks.filter(
    b => b.destinationId === destination.id && b.type === 'accommodation'
  );

  accommodationBlocks.forEach(block => {
    if (block.status === 'reserved') {
      // Verificar si reserva coincide con nuevo rango de fechas del destino
      const blockStart = new Date(block.startDate + 'T00:00:00Z');
      const blockEnd = new Date(block.endDate + 'T00:00:00Z');
      const destStart = new Date(destination.startDate + 'T00:00:00Z');
      const destEnd = new Date(destination.endDate + 'T00:00:00Z');

      // Si hay solapamiento parcial o desajuste
      if (blockEnd > destEnd || blockStart < destStart) {
        conflicts.push({
          id: `conflict-${block.id}`,
          type: 'date_mismatch',
          severity: 'critical',
          blockId: block.id,
          destinationId: destination.id,
          message: `⚠️ ALERTA CRÍTICA: Reserva confirmada "${block.items.map(i => i.description).join(', ')}" ` +
                   `(${block.startDate} al ${block.endDate}) no coincide con ` +
                   `las nuevas fechas del itinerario (${destination.startDate} al ${destination.endDate})`
        });
      }
    }
  });

  return conflicts;
}

/**
 * Regenera títulos de bloques de transporte dinámicamente
 * Ej: "Madrid → Barcelona"
 */
function regenerateTransportBlockTitles() {
  itineraryState.expenseBlocks.forEach((block, idx) => {
    if (block.type === 'transport' && block.calculated) {
      const currentDest = itineraryState.destinations.find(
        d => d.sequence === idx // Heurística simple: buscar por posición
      );

      if (!currentDest) {
        // Buscar destino por índice aproximado de bloques de transporte
        const prevAccommodation = itineraryState.expenseBlocks
          .slice(0, idx)
          .reverse()
          .find(b => b.type === 'accommodation');

        const currentAccommodation = itineraryState.expenseBlocks
          .slice(idx)
          .find(b => b.type === 'accommodation');

        if (prevAccommodation && currentAccommodation) {
          const prevDest = itineraryState.destinations.find(
            d => d.id === prevAccommodation.destinationId
          );
          const currDest = itineraryState.destinations.find(
            d => d.id === currentAccommodation.destinationId
          );

          if (prevDest && currDest) {
            block.title = `${prevDest.name} → ${currDest.name}`;
          }
        }
      }
    }
  });
}

// ============================================================================
// GETTERS & QUERIES
// ============================================================================

/**
 * Obtiene estadísticas totales del viaje
 */
function getTravelMetadata() {
  const destinations = itineraryState.destinations;
  if (destinations.length === 0) {
    return { totalDays: 0, totalNights: 0, startDate: null, endDate: null };
  }

  const startDate = destinations[0].startDate;
  const lastDest = destinations[destinations.length - 1];
  const endDate = calculateEndDate(lastDest.startDate, lastDest.nights);
  const totalNights = destinations.reduce((sum, d) => sum + d.nights, 0);
  const totalDays = daysDifference(startDate, endDate) + 1;

  return { startDate, endDate, totalDays, totalNights };
}

/**
 * Obtiene objeto para renderizar calendario (mapa de día → destino)
 */
function getCalendarDayMap() {
  const dayMap = {};
  itineraryState.destinations.forEach(dest => {
    const startDate = new Date(dest.startDate + 'T00:00:00Z');
    const endDate = new Date(dest.endDate + 'T00:00:00Z');

    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const dayKey = d.toISOString().split('T')[0];
      dayMap[dayKey] = dest;
    }
  });
  return dayMap;
}

/**
 * Agrupa bloques de gasto por destino y tipo
 */
function getExpenseBlocksGrouped() {
  const grouped = {};
  itineraryState.expenseBlocks.forEach(block => {
    const key = block.destinationId || 'transport';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(block);
  });
  return grouped;
}

/**
 * Calcula totales de gasto
 */
function getExpenseTotals() {
  const totals = {
    estimated: 0,
    actual: 0,
    paid: 0
  };

  itineraryState.expenseBlocks.forEach(block => {
    block.items.forEach(item => {
      if (item.estimatedAmount) totals.estimated += item.estimatedAmount;
      if (item.actualAmount) totals.actual += item.actualAmount;
      if (item.paidAmount) totals.paid += item.paidAmount;
    });
  });

  return totals;
}

// ============================================================================
// EXPORTS (para uso global o en módulos)
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cascadeUpdate,
    getTravelMetadata,
    getCalendarDayMap,
    getExpenseBlocksGrouped,
    getExpenseTotals,
    itineraryState,
    validateReservationConflicts
  };
}

// Para uso global en navegador
window.ItineraryCore = {
  cascadeUpdate,
  getTravelMetadata,
  getCalendarDayMap,
  getExpenseBlocksGrouped,
  getExpenseTotals,
  getState: () => itineraryState,
  setState: (newState) => { itineraryState = newState; }
};
