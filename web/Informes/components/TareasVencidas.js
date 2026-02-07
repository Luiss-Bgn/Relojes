/**
 * TareasVencidas.js
 * Maneja la visualización de tareas vencidas por quincena o completo
 */

import { renderizarGraficaPromedio, setModoGrafica } from './PromedioEmpleados.js';

let empleadosData = [];
let mostrandoQuincena = true;
let paginaActual = 1;
const ITEMS_POR_PAGINA = 10; // Paginación local: 10 por página
let tareasVencidasCache = { lista: [], periodo: '', total: 0 }; // Cache para las tareas y metadatos

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
  obtenerTareasVencidasDesdeAPI().then(data => {
    const lista = data?.top_tareas || [];
    const periodo = data?.periodo || '';
    const total = data?.total || lista.length;

    tareasVencidasCache = { lista, periodo, total }; // Guardar en cache
    
    if (lista.length === 0) {
      container.innerHTML = `
        <div class="tarea-vencida-empty">
          <div class="tarea-vencida-empty-icon">✅</div>
          <div class="tarea-vencida-empty-text">¡Excelente trabajo!</div>
          <div class="tarea-vencida-empty-subtext">No hay tareas vencidas ${mostrandoQuincena ? 'en esta quincena' : ''}</div>
        </div>
      `;
      return;
    }

    renderizarTareasVencidasPaginadas();
  });
}

/**
 * 🔥 NUEVO: Renderiza las tareas vencidas usando el cache (sin llamar al API de nuevo)
 */
function renderizarTareasVencidasPaginadas() {
  const container = document.getElementById('tareas-vencidas-content');
  if (!container || !tareasVencidasCache.lista || tareasVencidasCache.lista.length === 0) return;
  
  const tareasVencidas = tareasVencidasCache.lista;
  const totalPaginas = Math.ceil(tareasVencidas.length / ITEMS_POR_PAGINA) || 1;
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const fin = inicio + ITEMS_POR_PAGINA;
  const tareasPagina = tareasVencidas.slice(inicio, fin);
  
  // Renderizar tareas de la página actual en dos columnas de hasta 5 ítems cada una
  const col1 = tareasPagina.slice(0, 5);
  const col2 = tareasPagina.slice(5, 10);

  const renderColumna = (colItems, baseIndex) => colItems.map((item, idx) => {
    const rangoFechas = item.primera_fecha && item.ultima_fecha
      ? `${formatearFecha(item.primera_fecha)} — ${formatearFecha(item.ultima_fecha)}`
      : formatearFecha(item.ultima_fecha);

    return `
      <div class="tarea-vencida-item" style="animation-delay: ${(baseIndex + idx) * 0.05}s">
        <div class="tarea-vencida-header">
          <h3 class="tarea-vencida-titulo">${escapeHtml(item.nombre || 'Tarea')}</h3>
          <span class="tarea-vencida-badge">#${item.posicion || baseIndex + idx + 1}</span>
        </div>
        <div class="tarea-vencida-info">
          <span>🔥 ${item.total_vencidas} ${item.total_vencidas === 1 ? 'vez' : 'veces'}</span>
          <span>⭐ ${item.total_puntos || 0} pts</span>
          <span>📅 ${rangoFechas}</span>
          ${tareasVencidasCache.periodo ? `<span>🗓️ ${escapeHtml(tareasVencidasCache.periodo)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const columnasHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;align-items:start;">
      <div>${renderColumna(col1, inicio)}</div>
      <div>${renderColumna(col2, inicio + 5)}</div>
    </div>
  `;
  
  // Controles de paginación
  const paginacionHTML = `
    <div class="tareas-vencidas-paginacion">
      <button class="paginacion-btn" id="btn-prev-tareas" ${paginaActual === 1 ? 'disabled' : ''}>
        ← Anterior
      </button>
      <span class="paginacion-info">
        Página ${paginaActual} de ${totalPaginas} (${tareasVencidasCache.total || tareasVencidas.length} tareas)
      </span>
      <button class="paginacion-btn" id="btn-next-tareas" ${paginaActual === totalPaginas ? 'disabled' : ''}>
        Siguiente →
      </button>
    </div>
  `;
  
  container.innerHTML = columnasHTML + paginacionHTML;
  
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
      return { top_tareas: [], periodo: '', total: 0 };
    }
    
    const data = await response.json();
    console.log('Tareas vencidas obtenidas:', data);
    return data || { top_tareas: [], periodo: '', total: 0 };
  } catch (error) {
    console.error('Error en obtenerTareasVencidasDesdeAPI:', error);
    return { top_tareas: [], periodo: '', total: 0 };
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
