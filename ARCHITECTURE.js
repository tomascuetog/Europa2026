/**
 * EUROPA 2026 - ARQUITECTURA ITINERARIO DINÁMICO
 * Guía técnica de implementación y referencia API
 */

// ============================================================================
// OVERVIEW
// ============================================================================

/*
COMPONENTES PRINCIPALES:

1. itinerary-data.js
   - Almacenamiento de estado del itinerario
   - Lógica de cálculo y cascada de fechas
   - Validación de conflictos con reservas
   - API pública: window.ItineraryCore

2. itinerary-editor.js
   - UI reactiva para editar duración de destinos
   - Sincronización en tiempo real del calendario
   - Generación de bloques de gasto dinámicos
   - Alertas de conflictos críticos

3. style.css (extendido)
   - Estilos para UI editable
   - Componentes de alertas
   - Modal de conflictos

FLUJO DE DATOS:

User Edit (nights) 
    ↓
itinerary-editor.js: handleNightsChange()
    ↓
itinerary-data.js: cascadeUpdate()
    ├─ Recalcula fechas en cascada
    ├─ Valida conflictos
    └─ Regenera títulos dinámicos
    ↓
itinerary-editor.js: renderItinerary()
    ├─ Actualiza estadísticas
    ├─ Actualiza destinos
    ├─ Actualiza calendario
    └─ Actualiza gastos
    ↓
showConflictModal() si existen alertas críticas
*/

// ============================================================================
// API PÚBLICA: window.ItineraryCore
// ============================================================================

/*
cascadeUpdate(destinationId, newNights) → {success, updatedDestinations, alerts, state}
  Recalcula toda la cascada cuando cambia duración de destino
  
  @param {string} destinationId - ID del destino (ej: 'bcn')
  @param {number} newNights - Nuevas noches (mínimo 1)
  
  @returns {object} {
    success: boolean,
    updatedDestinations: string[],
    alerts: [{
      id, type, severity, blockId, destinationId, message
    }],
    state: {...}
  }
  
  EJEMPLO:
    const result = window.ItineraryCore.cascadeUpdate('bcn', 5);
    if (result.success && result.alerts.length > 0) {
      // Mostrar modal de conflictos
    }
*/

/*
getTravelMetadata() → {startDate, endDate, totalDays, totalNights}
  Calcula estadísticas globales del viaje
  
  @returns {object} {
    startDate: '2026-09-01',
    endDate: '2026-09-25',
    totalDays: 25,
    totalNights: 18
  }
*/

/*
getCalendarDayMap() → {dateStr: destinationObj}
  Retorna mapa de fecha ISO → destino para renderizar calendario
  
  @returns {object} {
    '2026-09-01': {id, name, color, ...},
    '2026-09-02': {...},
    ...
  }
*/

/*
getExpenseBlocksGrouped() → {[destId]: [blocks]}
  Agrupa bloques de gasto por destino
  
  @returns {object} {
    'mad': [{id, title, items, ...}],
    'bcn': [{...}],
    'transport': [{...}],
    ...
  }
*/

/*
getExpenseTotals() → {estimated, actual, paid}
  Calcula totales de gastos
  
  @returns {object} {
    estimated: 1500,
    actual: 1200,
    paid: 800
  }
*/

/*
getState() → {...}
  Retorna estado completo del itinerario
  
  @returns {object} {
    destinations: [...],
    expenseBlocks: [...],
    alerts: [...]
  }
*/

/*
setState(newState) → void
  Reemplaza estado completo (úsalo con cuidado)
*/

// ============================================================================
// API PÚBLICA: window.ItineraryEditor
// ============================================================================

/*
render() → void
  Re-renderiza toda la UI del itinerario
  Útil después de cambios externos
*/

/*
cascadeUpdate(destinationId, newNights) → void
  Shortcut a la lógica de cascada + re-render
*/

/*
toggleEdit() → void
  Alterna modo edición
*/

/*
showConflictModal(alerts) → void
  Muestra modal de conflictos críticos
*/

// ============================================================================
// ESTRUCTURA DE DATOS
// ============================================================================

/*
DESTINATION OBJECT:
{
  id: 'bcn',                          // ID único
  name: 'Barcelona',                  // Nombre ciudad
  sequence: 2,                        // Orden en itinerario (1-based)
  startDate: '2026-09-04',            // ISO date
  nights: 3,                          // Duración noches
  endDate: '2026-09-07',              // Calculado: startDate + nights
  color: '#b91c1c',                   // Color para calendario
  temp: 24,                           // Temperatura promedio
  rainfall: 0,                        // Días lluvia
  description: 'Gaudí, playa, tapas'  // Descripción corta
}

EXPENSE BLOCK OBJECT:
{
  id: 'blk-bcn-1',                    // ID único
  destinationId: 'bcn',               // Destino asociado (null si transporte)
  title: 'Barcelona',                 // Nombre bloque
  type: 'accommodation',              // accommodation | transport | other
  status: 'reserved',                 // reserved | projected
  startDate: '2026-09-04',            // Inicio
  endDate: '2026-09-07',              // Fin
  calculated: false,                  // ¿Generado automáticamente?
  items: [
    {
      id: 'item-bcn-1',
      description: 'BCN Sports Hostel',
      tag: 'hospedaje',               // transporte | hospedaje | actividad | otro
      estimatedAmount: 150,
      actualAmount: 150,
      paidAmount: 150,
      paidDate: '2026-08-20'
    }
  ]
}

ALERT OBJECT:
{
  id: 'conflict-blk-bcn-1',
  type: 'date_mismatch',              // date_mismatch | overlap | duration_reduction
  severity: 'critical',               // warning | critical
  blockId: 'blk-bcn-1',
  destinationId: 'bcn',
  message: 'Reserva confirmada "BCN Sports Hostel" (4-7 Sep) no coincide...'
}
*/

// ============================================================================
// CASOS DE USO IMPLEMENTADOS
// ============================================================================

/*
UC-1: AUMENTAR DURACIÓN DE BARCELONA

User action: Editar Barcelona 3 → 5 noches

Cascada:
  Madrid:        1-4 Sep (sin cambio) ✓
  Barcelona:     4-7 Sep → 4-9 Sep   (+2 días)
  Atenas:        7 Sep → 9 Sep        (desplazado +2)
  Islas:         8-15 Sep → 10-17 Sep (desplazado +2)
  Continental:   15-19 Sep → 17-21 Sep (desplazado +2)
  Budapest:      19-22 Sep → 21-24 Sep (desplazado +2)
  
Validación:
  - Si existe reserva "Barcelona Hostel 4-7 Sep" RESERVED
    → ALERTA CRÍTICA: "Reserva no coincide con nuevo rango 4-9 Sep"
    
UI Updates:
  - Estadísticas: totalDays 24 → 26, totalNights 18 → 20
  - Calendario: Rango Barcelona ahora cubre 4-9 Sep
  - Gastos: Bloque "Barcelona" re-fechado 4-9 Sep
  - Bloque "Barcelona → Atenas" re-fechado al 9 Sep

UC-2: VALIDACIÓN DE CONFLICTOS

Si usuario intenta reducir Barcelona de 3 a 1 noche mientras existe:
  - Reserva RESERVED "BCN Sports Hostel" 4-7 Sep

Sistema debe:
  1. Detectar overlap: [4-7] vs [4-5]
  2. Crear ALERTA con severity: 'critical'
  3. Mostrar ConflictModal con mensaje explícito
  4. Permitir usuario confirmar o revertir

UC-3: PROYECTADOS NO BLOQUEAN

Si usuario agrega gasto PROYECTADO "Cena en Barcelona" 7-8 Sep
  Y luego reduce Barcelona a 2 noches (4-6 Sep)
  
Sistema:
  - NO muestra alerta crítica (es proyectado)
  - Puede marcar gasto como "fuera de rango" (feature futura)
  - Permite cambio sin confirmación
*/

// ============================================================================
// INTEGRACIÓN CON BACKEND (SUPABASE)
// ============================================================================

/*
PREPARACIÓN PARA MIGRACIÓN:

Actualmente: itinerary-data.js usa INITIAL_DESTINATIONS (hardcodeado)
Producción: Reemplazar con llamada a Supabase RealTime

RECOMENDACIÓN:
1. Crear Context React (ItineraryProvider)
2. useEffect que carga datos de Supabase al montar
3. Supabase RealTime subscription para sincronización multi-usuario
4. Optimistic updates locales + confirmación servidor

EJEMPLO FUTURO:
  const { state, cascadeUpdate } = useItinerary();
  
  useEffect(() => {
    supabase
      .from('destinations')
      .on('*', payload => {
        setState(payload.new);
      })
      .subscribe();
  }, []);
*/

// ============================================================================
// TESTING
// ============================================================================

/*
TEST CASES:

1. Cascada básica (BC-01)
   Input: bcn nights 3 → 5
   Expected: ath startDate cambia, islas desplazadas +2 días
   Status: Manual test en itinerario.html
   
2. Validación crítica (BC-02)
   Input: bcn nights 5 → 1 (con reserva 4-7)
   Expected: Alerta critical, modal muestra conflicto
   Status: Manual test
   
3. Proyectados ignorados (BC-03)
   Input: bcn nights 3 → 1 (con gasto proyectado 5-7)
   Expected: Sin alerta, cambio permitido
   Status: Manual test
   
4. Múltiples destinos cascada (BC-04)
   Input: mad nights 3 → 4
   Expected: Todos destinos posteriores +1 día
   Status: Manual test

Para testing automatizado:
  - Unit tests: itinerary-data.js (cascadeUpdate, validateReservationConflicts)
  - Integration tests: itinerary-editor.js (render flow)
  - E2E: Seleccio nium navegador real
*/

// ============================================================================
// NOTAS Y LIMITACIONES
// ============================================================================

/*
LIMITACIONES ACTUALES:

1. Solo editar noches (no agregar/eliminar destinos)
   → Restricción deliberada, según requerimientos

2. Validación de conflictos solo en destino modificado
   → No valida cascadas indirectas (ej: reserva en destino +3 afectada)

3. Bloque "final" Madrid (salida) hardcodeado
   → Depende de haber exactamente 6 destinos

4. Almacenamiento: localStorage
   → Para producción: Supabase persistent + RealTime

MEJORAS FUTURAS:

1. Drag-and-drop para cambiar orden destinos
2. Interface visual de conflictos (timeline overlay)
3. Sugerencias automáticas de ajuste de reservas
4. Historial de cambios (undo/redo)
5. Exportar itinerario a PDF con validación de fechas
6. Compartir itinerario con otros usuarios
*/

// ============================================================================
// DEBUGGING
// ============================================================================

/*
ACCESO GLOBAL EN CONSOLA:

window.ItineraryCore.getState()
  → Ver estado completo actual

window.ItineraryEditor.render()
  → Re-renderizar UI

window.ItineraryCore.cascadeUpdate('bcn', 5)
  → Probar cascada directo

JSON.stringify(window.ItineraryCore.getState(), null, 2)
  → Inspeccionar estado formateado

window.ItineraryEditor.showConflictModal([{
  message: 'Test alert',
  severity: 'critical'
}])
  → Probar modal de conflictos

localStorage.getItem('Europa2026_itinerary')
  → Ver estado persistido (cuando se implemente)
*/

// ============================================================================
// CONTACTO & SOPORTE
// ============================================================================

/*
Preguntas sobre esta arquitectura:
  - Revisar plan.md para context del proyecto
  - Revisar comentarios inline en itinerary-data.js
  - Revisar función específica + test cases

Para reportar bugs:
  - Reproducir en console (window.ItineraryCore)
  - Incluir estado actual (getState())
  - Incluir steps to reproduce
*/
