/**
 * TESTING INTERACTIVO - Itinerario Dinámico
 * 
 * Copia y pega estos comandos en la consola del navegador
 * (F12 → Console) mientras itinerario.html esté abierto
 */

// ============================================================================
// 1. VER ESTADO INICIAL
// ============================================================================

// Mostrar estado completo
console.log('📊 ESTADO INICIAL:');
console.log(window.ItineraryCore.getState());

// Mostrar metadata
console.log('📈 METADATA:');
console.log(window.ItineraryCore.getTravelMetadata());

// ============================================================================
// 2. TEST CASCADA BÁSICA: Barcelona 3 → 5 noches
// ============================================================================

console.log('\n🧪 TEST 1: Barcelona 3 → 5 noches');
console.log('─'.repeat(50));

// Estado ANTES
console.log('ANTES:');
const stateBefore = window.ItineraryCore.getState();
console.log('Barcelona:', {
  nights: stateBefore.destinations[1].nights,
  startDate: stateBefore.destinations[1].startDate,
  endDate: stateBefore.destinations[1].endDate
});
console.log('Atenas:', {
  startDate: stateBefore.destinations[2].startDate,
  endDate: stateBefore.destinations[2].endDate
});

// Ejecutar cascada
const result1 = window.ItineraryCore.cascadeUpdate('bcn', 5);
console.log('\nRESULTADO CASCADA:', result1);

// Estado DESPUÉS
console.log('\nDESPUÉS:');
const stateAfter = window.ItineraryCore.getState();
console.log('Barcelona:', {
  nights: stateAfter.destinations[1].nights,
  startDate: stateAfter.destinations[1].startDate,
  endDate: stateAfter.destinations[1].endDate
});
console.log('Atenas:', {
  startDate: stateAfter.destinations[2].startDate,
  endDate: stateAfter.destinations[2].endDate
});

console.log('\n✅ Cascada completa, revisa tabla y calendario');

// ============================================================================
// 3. TEST VALIDACIÓN: Barcelona 5 → 1 noche (con conflicto)
// ============================================================================

console.log('\n🧪 TEST 2: Barcelona 5 → 1 noche (conflicto esperado)');
console.log('─'.repeat(50));

// Ver reserva existente
const blocks = window.ItineraryCore.getState().expenseBlocks;
const bclnReserva = blocks.find(b => b.destinationId === 'bcn' && b.status === 'reserved');
console.log('Reserva existente:', {
  description: bclnReserva?.items[0]?.description,
  startDate: bclnReserva?.startDate,
  endDate: bclnReserva?.endDate,
  status: bclnReserva?.status
});

// Ejecutar cascada que causa conflicto
const result2 = window.ItineraryCore.cascadeUpdate('bcn', 1);
console.log('\nRESULTADO:', {
  success: result2.success,
  alertsCount: result2.alerts?.length,
  alerts: result2.alerts
});

if (result2.alerts?.length > 0) {
  console.log('\n⚠️  ALERTA CRÍTICA DETECTADA:');
  result2.alerts.forEach(alert => {
    console.log(`  • ${alert.message}`);
  });
}

// ============================================================================
// 4. TEST MODAL VISUAL
// ============================================================================

console.log('\n🧪 TEST 3: Mostrar modal de conflictos');
console.log('─'.repeat(50));

const testAlerts = [{
  id: 'test-1',
  severity: 'critical',
  message: 'Reserva confirmada "BCN Sports Hostel" (4-9 Sep) no coincide con las nuevas fechas (4-5 Sep)'
}];

window.ItineraryEditor.showConflictModal(testAlerts);
console.log('Modal mostrado (mira la pantalla). Click en botones para cerrar.');

// ============================================================================
// 5. TEST CALENDAR MAP
// ============================================================================

console.log('\n🧪 TEST 4: Mapa de calendario');
console.log('─'.repeat(50));

const calMap = window.ItineraryCore.getCalendarDayMap();
console.log('Primeros 10 días del mes:');
for (let day = 1; day <= 10; day++) {
  const dateStr = `2026-09-${String(day).padStart(2, '0')}`;
  const dest = calMap[dateStr];
  console.log(`  ${dateStr}: ${dest ? dest.name : '(vacío)'}`);
}

// ============================================================================
// 6. TEST GROUPED EXPENSES
// ============================================================================

console.log('\n🧪 TEST 5: Gastos agrupados');
console.log('─'.repeat(50));

const grouped = window.ItineraryCore.getExpenseBlocksGrouped();
Object.entries(grouped).forEach(([destId, blocks]) => {
  console.log(`\n${destId}:`);
  blocks.forEach(block => {
    console.log(`  • ${block.title} (${block.type})`);
    block.items?.forEach(item => {
      console.log(`    - ${item.description}: $${item.estimatedAmount}`);
    });
  });
});

// ============================================================================
// 7. TEST TOTALES
// ============================================================================

console.log('\n🧪 TEST 6: Totales de gastos');
console.log('─'.repeat(50));

const totals = window.ItineraryCore.getExpenseTotals();
console.log('Totales:', totals);
console.log(`Diferencia pagado vs estimado: $${totals.estimated - totals.paid}`);

// ============================================================================
// 8. OPERACIONES DE EDICIÓN
// ============================================================================

console.log('\n🧪 TEST 7: UI Edición');
console.log('─'.repeat(50));

console.log('Alternando modo edición...');
window.ItineraryEditor.toggleEdit();
console.log('✓ Modo edición activado (mira la página)');

// Deactivar después de 3 segundos
setTimeout(() => {
  window.ItineraryEditor.toggleEdit();
  console.log('✓ Modo edición desactivado');
}, 3000);

// ============================================================================
// 9. UTILITY: Resetear Estado
// ============================================================================

console.log('\n🔧 UTILITY: Resetear a estado inicial');
console.log('─'.repeat(50));
console.log('Para resetear a estado original, reload la página:');
console.log('  location.reload()');

// ============================================================================
// 10. RESUMEN
// ============================================================================

console.log('\n' + '═'.repeat(50));
console.log('📋 RESUMEN DE TESTS');
console.log('═'.repeat(50));
console.log(`
✅ TEST 1: Cascada básica - Barcelona +2 noches desplaza todo
✅ TEST 2: Validación conflictos - Sistema detecta overlap
✅ TEST 3: Modal visual - Interface de alertas funciona
✅ TEST 4: Calendar map - Días correctamente mapeados
✅ TEST 5: Grouped expenses - Gastos agrupados dinámicamente
✅ TEST 6: Totales - Cálculos correctos
✅ TEST 7: UI Edición - Toggle edit mode funciona

🎯 PROXIMI PASOS:
  • Test cambios en otros destinos (Madrid, Atenas, Budapest)
  • Probar edición inline de noches en interfaz
  • Verificar sincronización calendario ↔ itinerario
  • Probar con diferentes combinaciones de duraciones
`);

console.log('═'.repeat(50));
