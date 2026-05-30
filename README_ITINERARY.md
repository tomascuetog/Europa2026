# Europa 2026 - Itinerario Dinámico ✈️

> Sistema de planificación de viajes personales con itinerario editable y sincronización en cascada

## 🎯 Objetivo

Transformar el itinerario **estático** de la aplicación a un sistema **dinámico** donde:
- ✅ Editar duración de destinos (noches)
- ✅ Recalcular fechas automáticamente en cascada
- ✅ Validar conflictos con reservas confirmadas
- ✅ Sincronizar calendario y gastos en tiempo real

---

## 📦 Archivos Principales

| Archivo | Tamaño | Propósito |
|---------|--------|-----------|
| **itinerary-data.js** | 13.7 KB | Lógica de cascada, validación, cálculos |
| **itinerary-editor.js** | 17.5 KB | UI reactiva, event handlers, render |
| **style.css** | +2 KB | Estilos para componentes dinámicos |
| **itinerario.html** | Modificado | Integración de scripts nuevos |
| **ARCHITECTURE.js** | 11.6 KB | Documentación técnica completa |
| **IMPLEMENTATION_GUIDE.md** | 7.3 KB | Guía de prueba y próximos pasos |
| **TEST_INTERACTIVE.js** | 7.2 KB | Suite de tests interactivos |

---

## 🚀 Características Implementadas

### 1️⃣ Cascada de Fechas
```
User: Barcelona noches 3 → 5
     ↓
System recalcula:
  Barcelona:      4-7 Sep → 4-9 Sep (+2 días)
  Atenas:         7 Sep → 9 Sep
  Islas:          8-15 Sep → 10-17 Sep
  Continental:    15-19 Sep → 17-21 Sep
  Budapest:       19-22 Sep → 21-24 Sep
```

### 2️⃣ Validación de Conflictos
```
IF cambio de fechas AND existe reserva RESERVED:
  → Mostrar ALERTA CRÍTICA en modal
  → Usuario puede confirmar o revertir
  
IF gasto es PROYECTADO:
  → No bloquea cambio (advertencia suave)
```

### 3️⃣ Sincronización Reactiva
- **Calendario**: Actualiza colores y rangos en tiempo real
- **Estadísticas**: Recalcula días, noches, presupuesto
- **Gastos**: Bloques de transporte regeneran títulos dinámicamente
- **UI**: Inputs editables para cada destino

### 4️⃣ Interfaz Intuitiva
- Botón "Editar" en header del itinerario
- Inputs numéricos inline para cambiar noches
- Modal visual para alertas de conflicto
- Notificaciones tipo toast

---

## 🧪 Cómo Probar

### Opción 1: Interfaz Gráfica (Recomendado)
```
1. Abre itinerario.html en navegador
2. Haz click en botón "Editar" (arriba a la derecha)
3. Modifica las noches de cualquier destino
4. Observa la cascada en tiempo real:
   - Fechas actualizan
   - Calendario cambia colores
   - Estadísticas recalculan
   - Gastos se reorganizan
```

### Opción 2: Consola del Navegador (Para Devs)
```javascript
// F12 → Console

// Ver estado actual
window.ItineraryCore.getState()

// Probar cascada
window.ItineraryCore.cascadeUpdate('bcn', 5)

// Ver alertas
window.ItineraryCore.getState().alerts

// Más tests...
// Ver TEST_INTERACTIVE.js para suite completa
```

### Opción 3: Script de Tests
```javascript
// En consola, cargar:
<script src="TEST_INTERACTIVE.js"></script>

// O copiar contenido y pegar en consola
// Ejecuta tests predefinidos automáticamente
```

---

## 📊 Casos de Uso Validados

### ✅ UC-1: Aumentar duración
**Input:** Barcelona 3 → 5 noches  
**Output:** Cascada completa, todos destinos posteriores +2 días  
**Validación:** ✅ Funciona

### ✅ UC-2: Detectar conflictos
**Input:** Barcelona 5 → 1 noche (con reserva 4-7 Sep)  
**Output:** ALERTA CRÍTICA en modal  
**Validación:** ✅ Sistema detecta overlap

### ✅ UC-3: Gastos proyectados
**Input:** Reduce destino con gasto PROYECTADO  
**Output:** Cambio permitido sin alerta crítica  
**Validación:** ✅ Solo RESERVED bloquean

---

## 🏗️ Arquitectura

```
┌──────────────────────────┐
│   itinerario.html        │
│  (UI + DOM)              │
└────────┬────────────────┘
         │ eventos
         ▼
┌──────────────────────────┐
│  itinerary-editor.js     │
│  (UI Controllers)        │
│ • handleNightsChange()   │
│ • renderItinerary()      │
│ • showConflictModal()    │
└────────┬────────────────┘
         │ llama
         ▼
┌──────────────────────────┐
│  itinerary-data.js       │
│  (Business Logic)        │
│ • cascadeUpdate()        │
│ • validateConflicts()    │
│ • getCalendarDayMap()    │
└──────────────────────────┘
         │
         ▼
    localStorage / Supabase (futura)
```

---

## 🔌 API Pública

### `window.ItineraryCore`

```javascript
// Recalcular cascada
cascadeUpdate(destId, nights) → {success, updatedDestinations, alerts, state}

// Datos para render
getTravelMetadata() → {startDate, endDate, totalDays, totalNights}
getCalendarDayMap() → {dateStr: destination}
getExpenseBlocksGrouped() → {destId: [blocks]}
getExpenseTotals() → {estimated, actual, paid}

// Acceso directo
getState() → itineraryState object
setState(newState) → void
```

### `window.ItineraryEditor`

```javascript
render() → void
cascadeUpdate(destId, nights) → void
toggleEdit() → void
showConflictModal(alerts) → void
```

---

## ⚙️ Configuración & Datos

### Destinos (itinerary-data.js)
```javascript
INITIAL_DESTINATIONS = [
  {id, name, sequence, startDate, nights, color, temp, rainfall, description},
  ...
]
```

### Gastos (itinerary-data.js)
```javascript
INITIAL_EXPENSE_BLOCKS = [
  {id, destinationId, title, type, status, startDate, endDate, items: [...]},
  ...
]
```

Actualmente: Datos hardcodeados en JS  
**Mejora futura:** Migrar a Supabase RealTime

---

## 🎨 Restricciones Mantenidas

✅ No se pueden agregar nuevos destinos  
✅ No se pueden eliminar destinos  
✅ Enlaces a páginas de ciudades intactos  
✅ Navegación global funcionando  
✅ Bottom nav operacional  

❌ (Deliberados por requerimientos)

---

## 📈 Próximos Pasos (Fase 2)

- [ ] Migrar a Supabase + RealTime
- [ ] Implementar React Context
- [ ] Crear tabla de alertas persistentes
- [ ] Agregar Undo/Redo
- [ ] Testing automatizado (Jest + RTL)
- [ ] Exportar itinerario a PDF
- [ ] Compartir itinerario con otros usuarios
- [ ] Timeline visual de conflictos

---

## 🐛 Debugging

**En console del navegador:**
```javascript
// Ver estado completo (pretty print)
console.log(JSON.stringify(window.ItineraryCore.getState(), null, 2))

// Test cascada específica
window.ItineraryCore.cascadeUpdate('madrid', 4)

// Ver si hay alertas
window.ItineraryCore.getState().alerts

// Forzar re-render
window.ItineraryEditor.render()
```

---

## 📚 Documentación Adicional

- **ARCHITECTURE.js** - Especificación técnica completa
- **IMPLEMENTATION_GUIDE.md** - Guía paso a paso
- **TEST_INTERACTIVE.js** - Suite de tests en console
- **plan.md** (en carpeta sesión) - Plan original del proyecto

---

## 📋 Cambios en Archivos Existentes

### itinerario.html
```diff
- (function buildCalendar() { ... })();  // Removido script hardcodeado
+ <script src="itinerary-data.js"></script>
+ <script src="itinerary-editor.js"></script>
```

### style.css
```diff
+ .city-item-editor { ... }
+ .nights-input { ... }
+ .alert { ... }
+ .conflict-modal { ... }
+ .edit-toggle-btn { ... }
+ @keyframes slideUp, slideDown { ... }
```

---

## ✅ Checklist de Validación

- [x] Cascada de fechas funciona
- [x] Validación de conflictos detecta overlaps
- [x] Calendario se actualiza en tiempo real
- [x] Gastos se reagrupan automáticamente
- [x] Modal de alertas funciona
- [x] UI intuitiva y responsive
- [x] Restricciones mantenidas (solo editar duración)
- [x] Enlaces a ciudades intactos
- [x] Documentación completa

---

## 🤝 Contribuir

Para agregar features o bugs:

1. Crear rama: `git checkout -b feature/nueva-feature`
2. Hacer cambios: `git add -A`
3. Commit: `git commit -m "feat: descripción"`
4. Incluir: `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`
5. Push: `git push origin feature/nueva-feature`

---

## 📞 Soporte

- Consultas técnicas: Ver ARCHITECTURE.js
- Pruebas interactivas: Usa TEST_INTERACTIVE.js
- Bugs: Reproducir en console + incluir resultado de getState()

---

**Versión:** 1.0.0  
**Estado:** ✅ Completado  
**Última actualización:** 2026-05-30  
**Autor:** Copilot (Claude Haiku 4.5)

---

## License

Este proyecto es parte de Europa 2026 - Sistema de Planificación de Viajes.
