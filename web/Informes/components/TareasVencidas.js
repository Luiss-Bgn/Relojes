/**
 * TareasVencidas.js
 * Maneja la visualización de tareas vencidas por quincena o completo
 */

import { renderizarGraficaPromedio, setModoGrafica } from './PromedioEmpleados.js';

let empleadosData = [];
let mostrandoQuincena = true;
let paginaActual = 1;
const ITEMS_POR_PAGINA = 4;
let tareasVencidasCache = []; // Cache para las tareas

export function setEmpleadosDataVencidas(data) {
  empleadosData = data || [];
}

export function inicializarTareasVencidas() {
  const btnQuincena = document.getElementById('btn-quincena');
  const btnTodo = document.getElementById('btn-todo');
  
  if (btnQuincena) {
    btnQuincena.addEventListener('click', () => {
      mostrandoQuincena = true;
      paginaActual = 1; // Resetear paginación
      btnQuincena.classList.add('active');
      btnTodo.classList.remove('active');
      setModoGrafica('quincena'); // 🔥 Actualizar modo de la gráfica
      renderizarTareasVencidas();
      renderizarGraficaPromedio(); // 🔥 Actualizar gráfica al cambiar modo
    });
  }
  
  if (btnTodo) {
    btnTodo.addEventListener('click', () => {
      mostrandoQuincena = false;
      paginaActual = 1; // Resetear paginación
      btnTodo.classList.add('active');
      btnQuincena.classList.remove('active');
      setModoGrafica('todo'); // 🔥 Actualizar modo de la gráfica
      renderizarTareasVencidas();
      renderizarGraficaPromedio(); // 🔥 Actualizar gráfica al cambiar modo
    });
  }
  
  // Renderizar inicialmente tareas vencidas y gráfica
  renderizarTareasVencidas();
  renderizarGraficaPromedio();
}

export function renderizarTareasVencidas() {
  const container = document.getElementById('tareas-vencidas-content');
  if (!container) return;
  
  // 🔥 NUEVO: Llamar al endpoint de tareas vencidas
  obtenerTareasVencidasDesdeAPI().then(tareasVencidas => {
    tareasVencidasCache = tareasVencidas; // Guardar en cache
    
    if (tareasVencidas.length === 0) {
      container.innerHTML = `
        <div class="tarea-vencida-empty">
          <div class="tarea-vencida-empty-icon">✅</div>
          <div class="tarea-vencida-empty-text">¡Excelente trabajo!</div>
          <div class="tarea-vencida-empty-subtext">No hay tareas vencidas ${mostrandoQuincena ? 'en esta quincena' : ''}</div>
        </div>
      `;
      return;
    }
    
    // 🔥 Calcular paginación
    const totalPaginas = Math.ceil(tareasVencidas.length / ITEMS_POR_PAGINA);
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = inicio + ITEMS_POR_PAGINA;
    const tareasPagina = tareasVencidas.slice(inicio, fin);
    
    // Renderizar tareas de la página actual
    const tareasHTML = tareasPagina.map((item, index) => `
      <div class="tarea-vencida-item" style="animation-delay: ${index * 0.05}s">
        <div class="tarea-vencida-header">
          <h3 class="tarea-vencida-titulo">${escapeHtml(item.tarea)}</h3>
          <span class="tarea-vencida-badge">${item.veces} ${item.veces === 1 ? 'vez' : 'veces'}</span>
        </div>
        <div class="tarea-vencida-info">
          <span>👤 ${escapeHtml(item.empleado)}</span>
          <span>📅 ${formatearFecha(item.ultima_fecha)}</span>
          <span>⏰ ${item.hora}</span>
          ${item.puntaje ? `<span>⭐ ${item.puntaje} pts</span>` : ''}
        </div>
      </div>
    `).join('');
    
    // 🔥 Agregar controles de paginación
    const paginacionHTML = totalPaginas > 1 ? `
      <div class="tareas-vencidas-paginacion">
        <button class="paginacion-btn" id="btn-prev-tareas" ${paginaActual === 1 ? 'disabled' : ''}>
          ← Anterior
        </button>
        <span class="paginacion-info">
          Página ${paginaActual} de ${totalPaginas} (${tareasVencidas.length} tareas)
        </span>
        <button class="paginacion-btn" id="btn-next-tareas" ${paginaActual === totalPaginas ? 'disabled' : ''}>
          Siguiente →
        </button>
      </div>
    ` : '';
    
    container.innerHTML = tareasHTML + paginacionHTML;
    
    // 🔥 Agregar event listeners a los botones de paginación
    if (totalPaginas > 1) {
      const btnPrev = document.getElementById('btn-prev-tareas');
      const btnNext = document.getElementById('btn-next-tareas');
      
      if (btnPrev) {
        btnPrev.addEventListener('click', () => {
          if (paginaActual > 1) {
            paginaActual--;
            renderizarTareasVencidasPaginadas();
          }
        });
      }
      
      if (btnNext) {
        btnNext.addEventListener('click', () => {
          if (paginaActual < totalPaginas) {
            paginaActual++;
            renderizarTareasVencidasPaginadas();
          }
        });
      }
    }
  });
}

/**
 * 🔥 NUEVO: Renderiza las tareas vencidas usando el cache (sin llamar al API de nuevo)
 */
function renderizarTareasVencidasPaginadas() {
  const container = document.getElementById('tareas-vencidas-content');
  if (!container || tareasVencidasCache.length === 0) return;
  
  const tareasVencidas = tareasVencidasCache;
  const totalPaginas = Math.ceil(tareasVencidas.length / ITEMS_POR_PAGINA);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const fin = inicio + ITEMS_POR_PAGINA;
  const tareasPagina = tareasVencidas.slice(inicio, fin);
  
  // Renderizar tareas de la página actual
  const tareasHTML = tareasPagina.map((item, index) => `
    <div class="tarea-vencida-item" style="animation-delay: ${index * 0.05}s">
      <div class="tarea-vencida-header">
        <h3 class="tarea-vencida-titulo">${escapeHtml(item.tarea)}</h3>
        <span class="tarea-vencida-badge">${item.veces} ${item.veces === 1 ? 'vez' : 'veces'}</span>
      </div>
      <div class="tarea-vencida-info">
        <span>👤 ${escapeHtml(item.empleado)}</span>
        <span>📅 ${formatearFecha(item.ultima_fecha)}</span>
        <span>⏰ ${item.hora}</span>
        ${item.puntaje ? `<span>⭐ ${item.puntaje} pts</span>` : ''}
      </div>
    </div>
  `).join('');
  
  // Controles de paginación
  const paginacionHTML = `
    <div class="tareas-vencidas-paginacion">
      <button class="paginacion-btn" id="btn-prev-tareas" ${paginaActual === 1 ? 'disabled' : ''}>
        ← Anterior
      </button>
      <span class="paginacion-info">
        Página ${paginaActual} de ${totalPaginas} (${tareasVencidas.length} tareas)
      </span>
      <button class="paginacion-btn" id="btn-next-tareas" ${paginaActual === totalPaginas ? 'disabled' : ''}>
        Siguiente →
      </button>
    </div>
  `;
  
  container.innerHTML = tareasHTML + paginacionHTML;
  
  // Event listeners
  const btnPrev = document.getElementById('btn-prev-tareas');
  const btnNext = document.getElementById('btn-next-tareas');
  
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (paginaActual > 1) {
        paginaActual--;
        renderizarTareasVencidasPaginadas();
      }
    });
  }
  
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (paginaActual < totalPaginas) {
        paginaActual++;
        renderizarTareasVencidasPaginadas();
      }
    });
  }
}

/**
 * 🔥 NUEVO: Obtiene tareas vencidas desde el endpoint /historial/top-vencidas
 */
async function obtenerTareasVencidasDesdeAPI() {
  try {
    const url = mostrandoQuincena 
      ? '/historial/top-vencidas?solo_quincena_actual=true' 
      : '/historial/top-vencidas?solo_quincena_actual=false';
    
    const response = await fetch(url, { cache: 'no-store' });
    console.log("response", response);
    if (!response.ok) {
      console.error('Error obteniendo tareas vencidas:', response.status);
      return [];
    }
    
    const data = await response.json();
    console.log('Tareas vencidas obtenidas:', data);
    return data || [];
  } catch (error) {
    console.error('Error en obtenerTareasVencidasDesdeAPI:', error);
    return [];
  }
}

function formatearFecha(fecha) {
  if (!fecha) return '--/--/----';
  const date = typeof fecha === 'string' ? new Date(fecha + 'T00:00:00') : fecha;
  const dia = date.getDate().toString().padStart(2, '0');
  const mes = (date.getMonth() + 1).toString().padStart(2, '0');
  const año = date.getFullYear();
  return `${dia}/${mes}/${año}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Función para mostrar el panel de tareas vencidas (ocultar calendario y promedio)
export function mostrarPanelTareasVencidas() {
  const tareasVencidasPanel = document.getElementById('tareas-vencidas-panel');
  const calendarioContainer = document.getElementById('calendario-container');
  
  // 1. Limpiar header (nombre, fecha, botón volver)
  const rightInfo = document.getElementById('titulo-informes-right');
  if (rightInfo) {
    rightInfo.remove();
  }
  
  // 🔥 Mostrar de nuevo la fecha del encabezado principal
  const fechaDiv = document.getElementById('fecha-actual-informes');
  if (fechaDiv) {
    fechaDiv.style.display = 'block';
  }

  // 2. Resetear selección de empleados
  document.querySelectorAll(".empleado-card").forEach(c => {
    c.classList.remove("selected");
    c.classList.remove("dimmed");
  });
  window.currentEmpleado = null;

  // 3. Ocultar calendario
  if (calendarioContainer) {
    calendarioContainer.classList.add('is-hidden');
    calendarioContainer.setAttribute('style', 'display: none !important');
    calendarioContainer.innerHTML = ''; // Limpiar contenido
  }
  
  // 4. Mostrar panel principal (tareas vencidas + gráfica)
  if (tareasVencidasPanel) {
    tareasVencidasPanel.classList.remove('is-hidden');
    tareasVencidasPanel.removeAttribute('style'); // Remover cualquier estilo inline que lo oculte
    setTimeout(() => tareasVencidasPanel.classList.add('show'), 50);
  }
  
  // 5. Renderizar ambos contenidos
  renderizarTareasVencidas();
  renderizarGraficaPromedio();
}

// Función para ocultar el panel de tareas vencidas (mostrar calendario)
export function ocultarPanelTareasVencidas() {
  const tareasVencidasPanel = document.getElementById('tareas-vencidas-panel');
  
  // Ocultar tareas vencidas
  if (tareasVencidasPanel) {
    tareasVencidasPanel.classList.remove('show');
    tareasVencidasPanel.classList.add('is-hidden');
    // Usar setAttribute para forzar el display none con mayor prioridad
    tareasVencidasPanel.setAttribute('style', 'display: none !important');
  }
}
