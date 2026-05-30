/**
 * PLAN DE INTEGRACIÓN SUPABASE
 * Transición de datos hardcodeados a base de datos persistente
 */

// ============================================================================
// 1. ESQUEMA SQL PARA SUPABASE
// ============================================================================

/*
CREATE TABLE public.destinations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sequence INTEGER NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  nights INTEGER NOT NULL CHECK (nights >= 1),
  color_hex TEXT NOT NULL,
  temperature_avg DECIMAL(4,1),
  rainfall_days INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.expense_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id TEXT REFERENCES destinations(id),
  block_type TEXT NOT NULL, -- 'accommodation' | 'transport' | 'other'
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'projected', -- 'reserved' | 'projected'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_calculated BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES expense_blocks(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  tag TEXT NOT NULL, -- 'transporte' | 'hospedaje' | 'actividad' | 'otro'
  estimated_amount DECIMAL(10, 2),
  actual_amount DECIMAL(10, 2),
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  paid_date DATE,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.date_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id TEXT NOT NULL REFERENCES destinations(id),
  block_id UUID NOT NULL REFERENCES expense_blocks(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL, -- 'date_mismatch' | 'overlap' | 'duration_reduction'
  severity TEXT NOT NULL, -- 'warning' | 'critical'
  message TEXT NOT NULL,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX idx_destinations_sequence ON destinations(sequence);
CREATE INDEX idx_expense_blocks_destination ON expense_blocks(destination_id);
CREATE INDEX idx_expense_items_block ON expense_items(block_id);
CREATE INDEX idx_date_conflicts_destination ON date_conflicts(destination_id);
*/

// ============================================================================
// 2. MIGRACIÓN DE DATOS
// ============================================================================

/*
PASO 1: Exportar datos existentes de itinerary-data.js

const dataExport = {
  destinations: window.ItineraryCore.getState().destinations,
  expenseBlocks: window.ItineraryCore.getState().expenseBlocks
};

// Copiar a clipboard
console.log(JSON.stringify(dataExport, null, 2));

PASO 2: Importar en Supabase (SQL o Dashboard)

INSERT INTO destinations 
  (id, name, sequence, start_date, nights, color_hex, temperature_avg, rainfall_days, description)
VALUES 
  ('mad', 'Madrid', 1, '2026-09-01', 3, '#0d1b2a', 22, 5, 'Punto de entrada y cierre'),
  ('bcn', 'Barcelona', 2, '2026-09-04', 3, '#b91c1c', 24, 0, 'Gaudí, playa, tapas'),
  ...;

PASO 3: Verificar integridad

SELECT * FROM destinations ORDER BY sequence;
SELECT COUNT(*) FROM expense_blocks;
*/

// ============================================================================
// 3. REHACER itinerary-data.js CON SUPABASE
// ============================================================================

/*
VERSIÓN SUPABASE (pseudocódigo):

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadItineraryFromDB() {
  // Cargar destinos
  const { data: destinations, error: destError } = await supabase
    .from('destinations')
    .select('*')
    .order('sequence', { ascending: true });
    
  // Cargar bloques de gasto
  const { data: expenseBlocks, error: blockError } = await supabase
    .from('expense_blocks')
    .select('*, expense_items(*)')
    .order('start_date', { ascending: true });
    
  return { destinations, expenseBlocks };
}

// Actualizar destino (cascada → actualizar DB)
async function saveCascadeUpdate(destinationId, newNights) {
  // 1. Ejecutar cascada (lógica existente)
  const result = window.ItineraryCore.cascadeUpdate(destinationId, newNights);
  
  // 2. Actualizar todos los destinos modificados en DB
  const promises = result.updatedDestinations.map(destId => {
    const dest = getDestinationById(destId);
    return supabase
      .from('destinations')
      .update({ 
        start_date: dest.startDate,
        nights: dest.nights,
        updated_at: new Date()
      })
      .eq('id', destId);
  });
  
  // 3. Actualizar bloques de gasto asociados
  const blockPromises = updateExpenseBlocksInDB(result.updatedDestinations);
  
  // 4. Guardar alertas
  if (result.alerts.length > 0) {
    const conflictInserts = result.alerts.map(alert => ({
      destination_id: alert.destinationId,
      block_id: alert.blockId,
      conflict_type: alert.type,
      severity: alert.severity,
      message: alert.message
    }));
    
    await supabase
      .from('date_conflicts')
      .insert(conflictInserts);
  }
  
  await Promise.all([...promises, ...blockPromises]);
  
  return result;
}

// REALTIME SUBSCRIPTION (sincronización multi-usuario)
supabase
  .from('destinations')
  .on('*', payload => {
    console.log('Cambio en destinos:', payload);
    // Re-sincronizar UI
    window.ItineraryCore.setState(payload.new);
    window.ItineraryEditor.render();
  })
  .subscribe();
*/

// ============================================================================
// 4. IMPLEMENTACIÓN CON REACT CONTEXT
// ============================================================================

/*
// context/ItineraryContext.jsx

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ItineraryContext = createContext();

const initialState = {
  destinations: [],
  expenseBlocks: [],
  alerts: [],
  loading: true,
  error: null
};

function itineraryReducer(state, action) {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload, loading: false };
    case 'CASCADE_UPDATE':
      return { ...state, ...action.payload };
    case 'ADD_ALERT':
      return { ...state, alerts: [...state.alerts, action.payload] };
    case 'CLEAR_ALERTS':
      return { ...state, alerts: [] };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

export function ItineraryProvider({ children }) {
  const [state, dispatch] = useReducer(itineraryReducer, initialState);

  // Cargar datos inicial
  useEffect(() => {
    loadItinerary();
    subscribeToChanges();
  }, []);

  async function loadItinerary() {
    try {
      const [{ data: destinations }, { data: expenseBlocks }] = await Promise.all([
        supabase
          .from('destinations')
          .select('*')
          .order('sequence'),
        supabase
          .from('expense_blocks')
          .select('*, expense_items(*)')
          .order('start_date')
      ]);

      dispatch({
        type: 'SET_STATE',
        payload: { destinations, expenseBlocks }
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }

  function subscribeToChanges() {
    supabase
      .from('destinations')
      .on('*', payload => {
        if (payload.eventType === 'UPDATE') {
          const updated = state.destinations.map(d =>
            d.id === payload.new.id ? payload.new : d
          );
          dispatch({
            type: 'CASCADE_UPDATE',
            payload: { destinations: updated }
          });
        }
      })
      .subscribe();
  }

  async function cascadeUpdate(destinationId, newNights) {
    try {
      // Lógica de cascada (reutilizar itinerary-data.js)
      const result = window.ItineraryCore.cascadeUpdate(destinationId, newNights);

      if (!result.success) {
        throw new Error(result.errors.join(', '));
      }

      // Guardar en DB
      // ... (ver saveCascadeUpdate arriba)

      dispatch({
        type: 'CASCADE_UPDATE',
        payload: {
          destinations: result.state.destinations,
          expenseBlocks: result.state.expenseBlocks,
          alerts: result.alerts
        }
      });

      return result;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }

  return (
    <ItineraryContext.Provider
      value={{ state, dispatch, cascadeUpdate }}
    >
      {children}
    </ItineraryContext.Provider>
  );
}

export function useItinerary() {
  return useContext(ItineraryContext);
}

// USAGE EN COMPONENTES:

// pages/ItineraryPage.jsx
function ItineraryPage() {
  const { state, cascadeUpdate } = useItinerary();

  if (state.loading) return <div>Cargando...</div>;
  if (state.error) return <div>Error: {state.error}</div>;

  const handleNightsChange = async (destId, newNights) => {
    try {
      await cascadeUpdate(destId, newNights);
      // UI se actualiza automáticamente via dispatch
    } catch (error) {
      // Mostrar error
    }
  };

  return (
    <div>
      {state.destinations.map(dest => (
        <DestinationCard
          key={dest.id}
          destination={dest}
          onNightsChange={handleNightsChange}
        />
      ))}
      {state.alerts.length > 0 && (
        <ConflictModal alerts={state.alerts} />
      )}
    </div>
  );
}
*/

// ============================================================================
// 5. FUNCIONES AUXILIARES PARA SUPABASE
// ============================================================================

/*
// utils/supabaseHelpers.js

export async function updateDestinationDates(destId, startDate, nights) {
  return supabase
    .from('destinations')
    .update({
      start_date: startDate,
      nights: nights,
      updated_at: new Date()
    })
    .eq('id', destId);
}

export async function updateExpenseBlockDates(blockId, startDate, endDate) {
  return supabase
    .from('expense_blocks')
    .update({
      start_date: startDate,
      end_date: endDate,
      updated_at: new Date()
    })
    .eq('id', blockId);
}

export async function createConflictAlert(destId, blockId, type, severity, message) {
  return supabase
    .from('date_conflicts')
    .insert({
      destination_id: destId,
      block_id: blockId,
      conflict_type: type,
      severity: severity,
      message: message
    });
}

export async function acknowledgeConflict(conflictId) {
  return supabase
    .from('date_conflicts')
    .update({
      is_acknowledged: true,
      acknowledged_at: new Date()
    })
    .eq('id', conflictId);
}

export async function getDestinationHistory(destId) {
  return supabase
    .from('date_conflicts')
    .select('*')
    .eq('destination_id', destId)
    .order('created_at', { ascending: false });
}
*/

// ============================================================================
// 6. ROW LEVEL SECURITY (RLS) POLICIES
// ============================================================================

/*
-- Permitir lectura pública (o solo usuarios autenticados)
CREATE POLICY "Allow read destinations"
  ON destinations FOR SELECT
  USING (true); -- O: auth.uid() IS NOT NULL

CREATE POLICY "Allow update destinations"
  ON destinations FOR UPDATE
  USING (auth.uid() = current_user_id()); -- O: true para demo

-- Permitir cascada completa sin cuidado de permisos (demo)
CREATE POLICY "Allow all operations"
  ON destinations FOR ALL
  USING (true);

CREATE POLICY "Allow all operations"
  ON expense_blocks FOR ALL
  USING (true);

CREATE POLICY "Allow all operations"
  ON expense_items FOR ALL
  USING (true);

CREATE POLICY "Allow all operations"
  ON date_conflicts FOR ALL
  USING (true);

-- NOTA: Para producción, implementar RLS con auth.uid() adecuado
*/

// ============================================================================
// 7. TESTING QUERIES
// ============================================================================

/*
-- Ver todas las cascadas registradas
SELECT 
  dc.id,
  dc.destination_id,
  d.name as destination_name,
  dc.conflict_type,
  dc.severity,
  dc.message,
  dc.created_at
FROM date_conflicts dc
JOIN destinations d ON dc.destination_id = d.id
ORDER BY dc.created_at DESC;

-- Ver cambios recientes de destinos
SELECT 
  id,
  name,
  start_date,
  nights,
  updated_at
FROM destinations
ORDER BY updated_at DESC
LIMIT 10;

-- Ver total de conflictos no reconocidos
SELECT 
  severity,
  COUNT(*) as count
FROM date_conflicts
WHERE is_acknowledged = FALSE
GROUP BY severity;

-- Ver itinerario completo con gastos
SELECT 
  d.sequence,
  d.name,
  d.start_date,
  d.nights,
  COUNT(eb.id) as block_count,
  SUM(ei.estimated_amount) as total_estimated
FROM destinations d
LEFT JOIN expense_blocks eb ON d.id = eb.destination_id
LEFT JOIN expense_items ei ON eb.id = ei.block_id
GROUP BY d.id
ORDER BY d.sequence;
*/

// ============================================================================
// 8. CHECKLIST DE MIGRACIÓN
// ============================================================================

/*
FASE 2: MIGRACIÓN A SUPABASE

[ ] Crear cuenta Supabase
[ ] Crear proyecto Supabase
[ ] Ejecutar script SQL (esquema)
[ ] Verificar tablas creadas
[ ] Migrar datos iniciales
[ ] Crear archivo .env con SUPABASE_URL y SUPABASE_ANON_KEY
[ ] Instalar @supabase/supabase-js (npm)
[ ] Rehacer itinerary-data.js con Supabase queries
[ ] Crear ItineraryContext (React)
[ ] Rehacer itinerary-editor.js para usar Context
[ ] Implementar RLS policies
[ ] Pruebas de cascada (con DB real)
[ ] Pruebas de conflictos (con DB real)
[ ] Habilitar RealTime en tablas
[ ] Testing multi-usuario
[ ] Documentar cambios en ARCHITECTURE.js
[ ] Deploy a producción
*/

// ============================================================================
// 9. VENTAJAS DE MIGRACIÓN
// ============================================================================

/*
ANTES (Hardcodeado):
- ❌ Datos solo en memoria
- ❌ Se pierden al reload
- ❌ Solo usuario único
- ❌ Sin historial de cambios
- ❌ Sin auditoría de conflictos

DESPUÉS (Supabase):
- ✅ Datos persistentes
- ✅ Sincronización RealTime
- ✅ Multi-usuario
- ✅ Historial completo (table date_conflicts)
- ✅ Auditoría (timestamps)
- ✅ Escalable
- ✅ Backups automáticos
- ✅ API REST/GraphQL gratis
*/

// ============================================================================
// 10. TIMELINE ESTIMADO
// ============================================================================

/*
Semana 1:
  - [ ] Setup Supabase
  - [ ] Crear esquema SQL
  - [ ] Migrar datos
  - [ ] Testing queries básicas

Semana 2:
  - [ ] React Context + Hooks
  - [ ] Rehacer itinerary-data.js
  - [ ] Integración con UI
  - [ ] Testing end-to-end

Semana 3:
  - [ ] RealTime subscriptions
  - [ ] RLS policies
  - [ ] Testing multi-usuario
  - [ ] Optimizaciones

Semana 4:
  - [ ] Deploy producción
  - [ ] Monitoreo
  - [ ] Documentación final
  - [ ] Capacitación
*/

// ============================================================================

console.log('📚 PLAN DE MIGRACIÓN SUPABASE');
console.log('Ver comentarios en este archivo para detalles');
console.log('Seguir checklist en sección 8');
