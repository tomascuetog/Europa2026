/**
 * EUROPA 2026 - INTERACTIVE TEST SUITE
 * Run these tests in browser console: copy & paste each test
 * 
 * Quick start:
 * 1. Open itinerario.html in browser
 * 2. Open DevTools (F12)
 * 3. Go to Console tab
 * 4. Copy & paste each test below
 */

window.TEST = window.TEST || {};

// ============================================================================
// TEST 1: VERIFY INITIAL STATE
// ============================================================================

window.TEST.verifyInitialState = function() {
  console.log('🧪 TEST 1: Verify Initial State');
  const state = window.ItineraryCore.getState();
  
  console.assert(state.destinations.length === 6, 'Should have 6 destinations');
  console.assert(state.destinations[0].name === 'Madrid', 'First destination should be Madrid');
  console.assert(state.destinations[0].nights === 3, 'Madrid should have 3 nights');
  
  console.log('✅ Initial state verified');
  console.table(state.destinations.map(d => ({ name: d.name, nights: d.nights })));
};

// ============================================================================
// TEST 2: CASCADE UPDATE - INCREASE NIGHTS
// ============================================================================

window.TEST.cascadeIncrease = function() {
  console.log('\n🧪 TEST 2: Cascade Update (Increase Barcelona from 3 to 5 nights)');
  
  const before = window.ItineraryCore.getState();
  console.log('BEFORE:', {
    barcelona: before.destinations[1],
    atenas: before.destinations[2]
  });
  
  const result = window.ItineraryCore.cascadeUpdate('bcn', 5);
  
  const after = window.ItineraryCore.getState();
  console.log('AFTER:', {
    barcelona: after.destinations[1],
    atenas: after.destinations[2]
  });
  
  console.assert(result.success, 'Cascade should succeed');
  console.assert(result.nightsDiff === 2, 'Diff should be +2 days');
  console.assert(after.destinations[1].nights === 5, 'Barcelona should now have 5 nights');
  
  console.log('✅ Cascade increase validated');
};

// ============================================================================
// TEST 3: VERIFY DATE CHAIN
// ============================================================================

window.TEST.verifyDateChain = function() {
  console.log('\n🧪 TEST 3: Verify Date Chain Integrity');
  
  const state = window.ItineraryCore.getState();
  let allValid = true;
  
  for (let i = 0; i < state.destinations.length - 1; i++) {
    const current = state.destinations[i];
    const next = state.destinations[i + 1];
    
    const currentEndDate = new Date(current.startDate.getTime() + current.nights * 24 * 60 * 60 * 1000);
    const nextStartDate = next.startDate;
    
    const datesMatch = currentEndDate.getTime() === nextStartDate.getTime();
    console.log(`${current.name} → ${next.name}: ${datesMatch ? '✅' : '❌'}`);
    
    if (!datesMatch) allValid = false;
  }
  
  console.assert(allValid, 'All dates should chain properly');
  console.log(allValid ? '✅ Date chain validated' : '❌ Date chain has breaks');
};

// ============================================================================
// TEST 4: CASCADE DECREASE
// ============================================================================

window.TEST.cascadeDecrease = function() {
  console.log('\n🧪 TEST 4: Cascade Update (Decrease Barcelona to 2 nights)');
  
  const before = window.ItineraryCore.getState();
  const result = window.ItineraryCore.cascadeUpdate('bcn', 2);
  const after = window.ItineraryCore.getState();
  
  console.assert(result.success, 'Cascade should succeed');
  console.assert(result.nightsDiff === -1, 'Diff should be -1 day');
  console.assert(after.destinations[1].nights === 2, 'Barcelona should now have 2 nights');
  
  console.log('✅ Cascade decrease validated');
};

// ============================================================================
// TEST 5: CONFLICT DETECTION - RESERVED
// ============================================================================

window.TEST.conflictDetectionReserved = function() {
  console.log('\n🧪 TEST 5: Conflict Detection (RESERVED item)');
  
  // Reset to known state
  window.ItineraryCore.cascadeUpdate('madrid', 3);
  window.ItineraryCore.cascadeUpdate('bcn', 3);
  
  // Change Barcelona to 1 night (should conflict with 4-7 Sep reservation)
  const result = window.ItineraryCore.cascadeUpdate('bcn', 1);
  
  console.log('Alerts:', result.alerts);
  console.assert(result.alerts && result.alerts.length > 0, 'Should have alerts for RESERVED conflict');
  
  if (result.alerts.length > 0) {
    console.assert(result.alerts[0].type === 'RESERVATION_OUT_OF_BOUNDS', 'Alert type should match');
    console.assert(result.alerts[0].level === 'critical', 'Alert should be critical');
  }
  
  console.log('✅ Conflict detection validated');
};

// ============================================================================
// TEST 6: FORMAT FUNCTIONS
// ============================================================================

window.TEST.formatFunctions = function() {
  console.log('\n🧪 TEST 6: Format Functions');
  
  const date1 = new Date(2026, 8, 4); // Sep 4
  const formatted1 = window.ItineraryCore.formatDate(date1);
  console.assert(formatted1 === '4 Sep', 'Should format single date');
  
  const range1 = window.ItineraryCore.formatDateRange(new Date(2026, 8, 4), 3);
  console.assert(range1 === '4-6 Sep', 'Should format date range');
  
  console.log('Formatted dates:', { formatted1, range1 });
  console.log('✅ Format functions validated');
};

// ============================================================================
// TEST 7: METADATA CALCULATION
// ============================================================================

window.TEST.metadataCalculation = function() {
  console.log('\n🧪 TEST 7: Metadata Calculation');
  
  const meta = window.ItineraryCore.getTravelMetadata();
  
  console.log('Metadata:', meta);
  console.assert(meta.numDestinations === 6, 'Should have 6 destinations');
  console.assert(meta.firstDestination === 'Madrid', 'First should be Madrid');
  console.assert(meta.lastDestination === 'Budapest', 'Last should be Budapest');
  console.assert(meta.totalNights > 0, 'Should have positive nights');
  
  console.log('✅ Metadata calculation validated');
};

// ============================================================================
// TEST 8: CALENDAR DAY MAP
// ============================================================================

window.TEST.calendarDayMap = function() {
  console.log('\n🧪 TEST 8: Calendar Day Map');
  
  const dayMap = window.ItineraryCore.getCalendarDayMap();
  const keys = Object.keys(dayMap);
  
  console.log(`Generated ${keys.length} day mappings`);
  console.assert(keys.length > 0, 'Should have day mappings');
  
  // Sample a few dates
  const sampleDates = keys.slice(0, 3);
  console.log('Sample mappings:', {
    [sampleDates[0]]: dayMap[sampleDates[0]]?.name || 'N/A',
    [sampleDates[1]]: dayMap[sampleDates[1]]?.name || 'N/A',
    [sampleDates[2]]: dayMap[sampleDates[2]]?.name || 'N/A'
  });
  
  console.log('✅ Calendar day map validated');
};

// ============================================================================
// TEST 9: FULL WORKFLOW
// ============================================================================

window.TEST.fullWorkflow = function() {
  console.log('\n🧪 TEST 9: Full Workflow (Multi-step cascade)');
  
  // Step 1: Increase Madrid
  console.log('Step 1: Increase Madrid from 3 to 4 nights');
  const r1 = window.ItineraryCore.cascadeUpdate('madrid', 4);
  console.assert(r1.success && r1.nightsDiff === 1, 'Step 1 should succeed');
  
  // Step 2: Decrease Barcelona
  console.log('Step 2: Decrease Barcelona from 3 to 2 nights');
  const r2 = window.ItineraryCore.cascadeUpdate('bcn', 2);
  console.assert(r2.success && r2.nightsDiff === -1, 'Step 2 should succeed');
  
  // Step 3: Increase Islas
  console.log('Step 3: Increase Islas from 7 to 9 nights');
  const r3 = window.ItineraryCore.cascadeUpdate('islas', 9);
  console.assert(r3.success && r3.nightsDiff === 2, 'Step 3 should succeed');
  
  // Verify chain still intact
  const state = window.ItineraryCore.getState();
  let chainValid = true;
  for (let i = 0; i < state.destinations.length - 1; i++) {
    const current = state.destinations[i];
    const next = state.destinations[i + 1];
    const currentEnd = new Date(current.startDate.getTime() + current.nights * 24 * 60 * 60 * 1000);
    if (currentEnd.getTime() !== next.startDate.getTime()) {
      chainValid = false;
    }
  }
  
  console.assert(chainValid, 'Date chain should remain intact after multi-step');
  console.log('✅ Full workflow validated');
};

// ============================================================================
// TEST 10: UI INTEGRATION
// ============================================================================

window.TEST.uiIntegration = function() {
  console.log('\n🧪 TEST 10: UI Integration');
  
  const container = document.getElementById('itinerary-editor-container');
  console.assert(container, 'Should have itinerary container');
  
  const editBtn = document.getElementById('edit-toggle');
  console.assert(editBtn, 'Should have edit toggle button');
  
  const items = document.querySelectorAll('[data-dest-id]');
  console.log(`Found ${items.length} destination items in DOM`);
  
  console.log('✅ UI integration validated');
};

// ============================================================================
// RUN ALL TESTS
// ============================================================================

window.TEST.runAll = function() {
  console.clear();
  console.log('═══════════════════════════════════════════════════════════');
  console.log('    EUROPA 2026 - ITINERARIO DINÁMICO TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  window.TEST.verifyInitialState();
  window.TEST.cascadeIncrease();
  window.TEST.verifyDateChain();
  window.TEST.cascadeDecrease();
  window.TEST.conflictDetectionReserved();
  window.TEST.formatFunctions();
  window.TEST.metadataCalculation();
  window.TEST.calendarDayMap();
  window.TEST.fullWorkflow();
  window.TEST.uiIntegration();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('    ✅ ALL TESTS COMPLETED');
  console.log('═══════════════════════════════════════════════════════════');
};

console.log('✅ TEST suite loaded. Run: TEST.runAll()');
