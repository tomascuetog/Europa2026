/**
 * EDITOR DE ITINERARIO DINÁMICO - UI Reactiva
 * Permite editar duración de destinos y muestra sincronización en cascada
 */

(function() {
  'use strict';

  // Verificar que itinerary-data.js está cargado
  if (typeof window.ItineraryCore === 'undefined') {
    console.error('itinerary-data.js no está cargado');
    return;
  }

  const Core = window.ItineraryCore;

  // ========================================================================
  // ESTADO DE LA UI
  // ========================================================================

  let editMode = false;
  let pendingChanges = {};
  let currentEditing = null;

  // ========================================================================
  // FUNCIONES DE UTILIDAD
  // ========================================================================

  /**
   * Formatea ISO date a "X-Y Mon"
   */
  function formatDateRange(startDate, nights) {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(startDate + 'T00:00:00Z');
    end.setUTCDate(end.getUTCDate() + nights);

    const startDay = start.getUTCDate();
    const endDay = end.getUTCDate();
    const monthIdx = start.getUTCMonth();
    const monthName = months[monthIdx];

    return `${startDay}–${endDay} ${monthName}`;
  }

  /**
   * Renderiza la vista del itinerario completo
   */
  function renderItinerary() {
    const container = document.getElementById('itineraryContainer');
    if (!container) return;

    const state = Core.getState();
    const metadata = Core.getTravelMetadata();

    // Actualizar estadísticas
    updateStats(metadata);

    // Renderizar destinos
    const citiesList = document.querySelector('.city-list');
    if (citiesList) {
      citiesList.innerHTML = '<div class="route-line"></div>';

      state.destinations.forEach((dest, idx) => {
        const dateRange = formatDateRange(dest.startDate, dest.nights);
        const nightsText = dest.nights === 1 ? 'noche' : 'noches';

        const cityItem = document.createElement('div');
        cityItem.className = 'city-item-editor';
        cityItem.dataset.destinationId = dest.id;

        cityItem.innerHTML = `
          <div class="city-num">${dest.sequence}</div>
          <div class="city-info">
            <div class="city-name">${dest.name}</div>
            <div class="city-dates-display" id="dates-${dest.id}">
              ${dateRange} · ${dest.nights} ${nightsText} · ${dest.description}
            </div>
            <div class="city-dates-editor" id="editor-${dest.id}" style="display:none;">
              <input type="number" min="1" class="nights-input" value="${dest.nights}" 
                     id="nights-input-${dest.id}" placeholder="Noches">
              <span class="nights-label">${nightsText}</span>
            </div>
          </div>
          <div class="city-right">
            <div class="city-temp">${dest.temp}°C</div>
            <div class="city-rain">${dest.rainfall}d lluvia</div>
          </div>
          <div class="city-arrow">›</div>
        `;

        const linkWrapper = document.createElement('a');
        linkWrapper.href = getCityPageUrl(dest.id);
        linkWrapper.className = 'city-item';
        linkWrapper.style.textDecoration = 'none';
        linkWrapper.style.color = 'inherit';
        linkWrapper.appendChild(cityItem);

        citiesList.appendChild(linkWrapper);

        // Event listener para edición
        const nightsInput = cityItem.querySelector('.nights-input');
        if (nightsInput) {
          nightsInput.addEventListener('change', (e) => {
            const newNights = parseInt(e.target.value);
            handleNightsChange(dest.id, newNights);
          });
        }
      });
    }

    // Actualizar calendario
    updateCalendar();

    // Actualizar bloques de gasto
    updateExpenseBlocks();

    // Mostrar alertas si existen
    showAlerts(state.alerts);
  }

  /**
   * Actualiza las estadísticas del viaje
   */
  function updateStats(metadata) {
    const statsContainer = document.querySelector('.itin-total');
    if (!statsContainer) return;

    const state = Core.getState();
    const totals = Core.getExpenseTotals();

    statsContainer.innerHTML = `
      <div class="itin-stat">
        <div class="itin-stat-val">${metadata.totalDays}</div>
        <div class="itin-stat-label">Días</div>
      </div>
      <div class="itin-stat">
        <div class="itin-stat-val">${state.destinations.length}</div>
        <div class="itin-stat-label">Destinos</div>
      </div>
      <div class="itin-stat">
        <div class="itin-stat-val">${metadata.totalNights}</div>
        <div class="itin-stat-label">Noches</div>
      </div>
      <div class="itin-stat">
        <div class="itin-stat-val">~${Math.round(totals.estimated / 100) / 10}k</div>
        <div class="itin-stat-label">USD p/p</div>
      </div>
    `;
  }

  /**
   * Maneja cambio de duración de destino
   */
  function handleNightsChange(destinationId, newNights) {
    if (newNights < 1) {
      showNotification('Las noches deben ser al menos 1', 'error');
      return;
    }

    // Ejecutar cascada
    const result = Core.cascadeUpdate(destinationId, newNights);

    if (!result.success) {
      showNotification(result.errors.join('; '), 'error');
      return;
    }

    // Renderizar cambios
    renderItinerary();

    // Si hay alertas críticas, mostrar modal
    if (result.alerts && result.alerts.length > 0) {
      showConflictModal(result.alerts);
    } else {
      showNotification('Itinerario actualizado correctamente', 'success');
    }
  }

  /**
   * Actualiza calendario dinámicamente
   */
  function updateCalendar() {
    const calWrap = document.getElementById('calWrap');
    if (!calWrap) return;

    const state = Core.getState();
    const metadata = Core.getTravelMetadata();

    // Crear mapa de días
    const dayMap = Core.getCalendarDayMap();

    // Generar HTML del calendario
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const heads = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    let html = '<div class="cal-month-label">Septiembre 2026</div><div class="cal-grid">';

    // Cabeceras
    heads.forEach(h => {
      html += '<div class="cal-head">' + h + '</div>';
    });

    // Dias vacíos al inicio (Sep 2026 comienza martes = offset 1)
    const startOffset = 1;
    for (let i = 0; i < startOffset; i++) {
      html += '<div class="cal-cell empty"></div>';
    }

    // Días del mes
    for (let day = 1; day <= 30; day++) {
      const dateStr = `2026-09-${String(day).padStart(2, '0')}`;
      const dest = dayMap[dateStr];

      if (dest) {
        const isTransit = false; // TODO: calcular basado en cambios de destino
        html += `<div class="cal-cell trip" style="background:${dest.color}" title="${dest.name}">
                  <span class="cal-num">${day}</span>
                  <span class="cal-lbl">${dest.id.substring(0, 3).toUpperCase()}</span>
                  ${isTransit ? '<span class="cal-dot"></span>' : ''}
                </div>`;
      } else {
        html += `<div class="cal-cell post"><span class="cal-num">${day}</span></div>`;
      }
    }

    // Rellenar última fila
    const totalCells = startOffset + 30;
    const rem = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < rem; i++) {
      html += '<div class="cal-cell empty"></div>';
    }

    html += '</div>';

    // Leyenda
    html += '<div class="cal-legend">';
    const seen = {};
    state.destinations.forEach(dest => {
      if (!seen[dest.id]) {
        seen[dest.id] = true;
        html += `<span class="cal-leg">
                  <span class="cal-leg-sq" style="background:${dest.color}"></span>
                  ${dest.name}
                </span>`;
      }
    });
    html += '</div>';

    calWrap.innerHTML = html;
  }

  /**
   * Actualiza bloque dinámico de gastos
   */
  function updateExpenseBlocks() {
    const expenseContainer = document.getElementById('expenseBlocksContainer');
    if (!expenseContainer) return;

    const state = Core.getState();
    const grouped = Core.getExpenseBlocksGrouped();

    let html = '';

    Object.entries(grouped).forEach(([key, blocks]) => {
      const destName = key === 'transport' ? 'Transporte' : 
                       state.destinations.find(d => d.id === key)?.name || key;

      blocks.forEach(block => {
        const statusClass = block.status === 'reserved' ? 'reservado' : 'proyectado';
        const statusLabel = block.status === 'reserved' ? 'RESERVADO' : 'PROYECTADO';

        html += `
          <div class="bg-group-header">
            <span class="bg-group-title">${block.title}</span>
          </div>
        `;

        block.items.forEach(item => {
          const itemTotal = item.actualAmount || item.estimatedAmount || 0;
          html += `
            <div class="budget-item ${statusClass}">
              <div class="bi-main">
                <button class="bi-pill ${block.status}">${statusLabel}</button>
                <span class="bi-tag ${item.tag}">${item.tag.toUpperCase()}</span>
                <div class="bi-label">${item.description}</div>
                <div class="bi-price-wrap">
                  <span class="bi-price-sym">USD</span>
                  <span>${itemTotal}</span>
                </div>
              </div>
            </div>
          `;
        });
      });
    });

    expenseContainer.innerHTML = html || '<p style="text-align:center;color:rgba(13,27,42,.4);">Sin gastos registrados</p>';
  }

  /**
   * Muestra modal de alertas de conflicto
   */
  function showConflictModal(alerts) {
    const modal = document.getElementById('conflictModal') || createConflictModal();

    const alertsList = modal.querySelector('.conflict-alerts-list');
    alertsList.innerHTML = '';

    alerts.forEach(alert => {
      const alertEl = document.createElement('div');
      alertEl.className = 'conflict-alert ' + alert.severity;
      alertEl.innerHTML = `
        <div class="conflict-severity">⚠️ ${alert.severity === 'critical' ? 'CRÍTICA' : 'ADVERTENCIA'}</div>
        <div class="conflict-message">${alert.message}</div>
      `;
      alertsList.appendChild(alertEl);
    });

    modal.classList.add('open');
  }

  /**
   * Crea modal de conflictos si no existe
   */
  function createConflictModal() {
    const modal = document.createElement('div');
    modal.id = 'conflictModal';
    modal.className = 'conflict-modal';
    modal.innerHTML = `
      <div class="conflict-modal-content">
        <h2>⚠️ Alertas de Conflicto de Fechas</h2>
        <div class="conflict-alerts-list"></div>
        <div class="conflict-modal-actions">
          <button id="conflictConfirm" class="btn-primary">Confirmar Cambios</button>
          <button id="conflictCancel" class="btn-secondary">Deshacer</button>
        </div>
      </div>
    `;

    modal.querySelector('#conflictConfirm')?.addEventListener('click', () => {
      modal.classList.remove('open');
      showNotification('Cambios confirmados (nota: revisar reservas)', 'info');
    });

    modal.querySelector('#conflictCancel')?.addEventListener('click', () => {
      modal.classList.remove('open');
      location.reload(); // Recargar para revertir
    });

    document.body.appendChild(modal);
    return modal;
  }

  /**
   * Muestra notificación temporal
   */
  function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `notification notification-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-family: Outfit, sans-serif;
      font-size: 0.85rem;
      z-index: 2000;
      animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Muestra alertas en el UI
   */
  function showAlerts(alerts) {
    const alertsContainer = document.getElementById('itineraryAlerts');
    if (!alertsContainer) return;

    if (alerts.length === 0) {
      alertsContainer.style.display = 'none';
      return;
    }

    alertsContainer.style.display = 'block';
    alertsContainer.innerHTML = '';

    alerts.forEach(alert => {
      const alertEl = document.createElement('div');
      alertEl.className = `alert alert-${alert.severity}`;
      alertEl.innerHTML = `
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <strong>${alert.severity === 'critical' ? 'CRÍTICA' : 'ADVERTENCIA'}</strong>
          <p>${alert.message}</p>
        </div>
      `;
      alertsContainer.appendChild(alertEl);
    });
  }

  /**
   * Obtiene URL de página ciudad según ID
   */
  function getCityPageUrl(destinationId) {
    const pageMap = {
      'mad': 'madrid.html',
      'bcn': 'barcelona.html',
      'ath': 'atenas.html',
      'grecia-islas': 'grecia-islas.html',
      'continental': 'continental.html',
      'bud': 'budapest.html'
    };
    return pageMap[destinationId] || '#';
  }

  /**
   * Alterna modo edición
   */
  function toggleEditMode() {
    editMode = !editMode;
    const button = document.getElementById('editToggleBtn');
    if (button) {
      button.classList.toggle('active', editMode);
      button.textContent = editMode ? 'Guardar' : 'Editar';
    }

    document.querySelectorAll('.city-dates-display').forEach(el => {
      el.style.display = editMode ? 'none' : 'block';
    });

    document.querySelectorAll('.city-dates-editor').forEach(el => {
      el.style.display = editMode ? 'flex' : 'none';
    });
  }

  // ========================================================================
  // INICIALIZACIÓN
  // ========================================================================

  function init() {
    // Crear container si no existe
    let container = document.getElementById('itineraryContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'itineraryContainer';
      const body = document.querySelector('.itin-body');
      if (body) {
        body.insertBefore(container, body.firstChild);
      }
    }

    // Crear container para alertas
    let alertsContainer = document.getElementById('itineraryAlerts');
    if (!alertsContainer) {
      alertsContainer = document.createElement('div');
      alertsContainer.id = 'itineraryAlerts';
      alertsContainer.style.marginBottom = '1.5rem';
      const body = document.querySelector('.itin-body');
      if (body) {
        body.insertBefore(alertsContainer, body.firstChild);
      }
    }

    // Crear container para gastos
    let expenseContainer = document.getElementById('expenseBlocksContainer');
    if (!expenseContainer && document.querySelector('[data-section="gastos"]')) {
      expenseContainer = document.createElement('div');
      expenseContainer.id = 'expenseBlocksContainer';
      const section = document.querySelector('[data-section="gastos"]');
      section.appendChild(expenseContainer);
    }

    // Botón de editar
    let editBtn = document.getElementById('editToggleBtn');
    if (!editBtn) {
      const header = document.querySelector('.itin-header');
      if (header) {
        editBtn = document.createElement('button');
        editBtn.id = 'editToggleBtn';
        editBtn.textContent = 'Editar';
        editBtn.className = 'edit-toggle-btn';
        editBtn.style.cssText = `
          position: absolute;
          top: 1rem;
          right: 1.5rem;
          font-family: Outfit, sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.4rem 0.9rem;
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 10;
        `;

        editBtn.addEventListener('click', toggleEditMode);
        header.style.position = 'relative';
        header.appendChild(editBtn);
      }
    }

    // Renderizar itinerario inicial
    renderItinerary();
  }

  // Inicializar cuando DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exportar para acceso global
  window.ItineraryEditor = {
    render: renderItinerary,
    cascadeUpdate: handleNightsChange,
    toggleEdit: toggleEditMode,
    showConflictModal
  };
})();
