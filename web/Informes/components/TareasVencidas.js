/*
  TareasVencidas.js
  Este muestra las tareas mas vencidas con paginacion y puede filtrar por quincena actual o mostrar todo el historico
*/
import { fetchTareasVencidas } from '../services/apiService.js';
import { renderizarGraficaPromedio } from './PromedioEmpleados.js';
import { setModoGrafica } from '../state/appState.js';
import { formatearFecha } from '../utils/dateUtils.js';
import { escapeHtml } from '../utils/domUtils.js';
import { ITEMS_POR_PAGINA } from '../utils/constants.js';

let mostrandoQuincena = true;
let paginaActual = 1;
let cache = { lista: [], periodo: '', total: 0 };

// inicializa los botones de quincena/todo y les pone sus listeners
export function inicializarTareasVencidas() {
  const btnQuincena = document.getElementById('btn-quincena');
  const btnTodo = document.getElementById('btn-todo');

  btnQuincena?.addEventListener('click', () => {
    mostrandoQuincena = true;
    paginaActual = 1;
    btnQuincena.classList.add('active');
    btnTodo.classList.remove('active');
    setModoGrafica('quincena');
    renderizarTareasVencidas();
    renderizarGraficaPromedio();
  });

  btnTodo?.addEventListener('click', () => {
    mostrandoQuincena = false;
    paginaActual = 1;
    btnTodo.classList.add('active');
    btnQuincena.classList.remove('active');
    setModoGrafica('todo');
    renderizarTareasVencidas();
    renderizarGraficaPromedio();
  });
}

// esta madre jala las tareas vencidas de la api y las pinta en el panel
export async function renderizarTareasVencidas() {
  const container = document.getElementById('tareas-vencidas-content');
  if (!container) return;

  const data = await fetchTareasVencidas(mostrandoQuincena);
  cache = {
    lista: data?.top_tareas || [],
    periodo: data?.periodo || '',
    total: data?.total || (data?.top_tareas?.length || 0),
  };

  if (cache.lista.length === 0) {
    container.innerHTML = `
      <div class="tarea-vencida-empty">
        <div class="tarea-vencida-empty-icon">✅</div>
        <div class="tarea-vencida-empty-text">¡Excelente trabajo!</div>
        <div class="tarea-vencida-empty-subtext">
          No hay tareas vencidas ${mostrandoQuincena ? 'en esta quincena' : ''}
        </div>
      </div>
    `;
    return;
  }

  renderizarPagina();
}

// muestra el panel de vencidas y oculta el calendario del empleado
export function mostrarPanelTareasVencidas() {
  const panel = document.getElementById('tareas-vencidas-panel');
  const calendario = document.getElementById('calendario-container');

  // Limpiar header derecho
  document.getElementById('titulo-informes-right')?.remove();

  // Mostrar fecha
  const fechaDiv = document.getElementById('fecha-actual-informes');
  if (fechaDiv) fechaDiv.style.display = 'block';

  // Resetear selección de tarjetas
  document.querySelectorAll('.empleado-card').forEach(c => {
    c.classList.remove('selected', 'dimmed');
  });

  // Ocultar calendario
  if (calendario) {
    calendario.classList.add('is-hidden');
    calendario.setAttribute('style', 'display:none!important');
    calendario.innerHTML = '';
  }

  // Mostrar panel de vencidas (sin flash)
  if (panel) {
    panel.classList.remove('is-hidden', 'show');
    panel.removeAttribute('style');
    void panel.offsetHeight; // forzar reflow para reiniciar animación
    panel.classList.add('show');
  }

  renderizarTareasVencidas();
  renderizarGraficaPromedio();
}

// oculta el panel de vencidas
export function ocultarPanelTareasVencidas() {
  const panel = document.getElementById('tareas-vencidas-panel');
  if (panel) {
    panel.classList.remove('show');
    panel.classList.add('is-hidden');
    panel.setAttribute('style', 'display:none!important');
  }
}


function renderizarPagina() {
  const container = document.getElementById('tareas-vencidas-content');
  if (!container || cache.lista.length === 0) return;

  const totalPaginas = Math.ceil(cache.lista.length / ITEMS_POR_PAGINA) || 1;
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const tareasPagina = cache.lista.slice(inicio, inicio + ITEMS_POR_PAGINA);

  const col1 = tareasPagina.slice(0, 5);
  const col2 = tareasPagina.slice(5, 10);

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;align-items:start;">
      <div>${renderColumna(col1, inicio)}</div>
      <div>${renderColumna(col2, inicio + 5)}</div>
    </div>
    <div class="tareas-vencidas-paginacion">
      <button class="paginacion-btn" id="btn-prev-tareas" ${paginaActual === 1 ? 'disabled' : ''}>
        ← Anterior
      </button>
      <span class="paginacion-info">
        Página ${paginaActual} de ${totalPaginas} (${cache.total} tareas)
      </span>
      <button class="paginacion-btn" id="btn-next-tareas" ${paginaActual === totalPaginas ? 'disabled' : ''}>
        Siguiente →
      </button>
    </div>
  `;

  document.getElementById('btn-prev-tareas')?.addEventListener('click', () => {
    if (paginaActual > 1) { paginaActual--; renderizarPagina(); }
  });
  document.getElementById('btn-next-tareas')?.addEventListener('click', () => {
    if (paginaActual < totalPaginas) { paginaActual++; renderizarPagina(); }
  });
}

function renderColumna(items, baseIndex) {
  return items.map((item, idx) => {
    const rango = item.primera_fecha && item.ultima_fecha
      ? `${formatearFecha(item.primera_fecha)} — ${formatearFecha(item.ultima_fecha)}`
      : formatearFecha(item.ultima_fecha);

    return `
      <div class="tarea-vencida-item" style="animation-delay:${(baseIndex + idx) * 0.05}s">
        <div class="tarea-vencida-header">
          <h3 class="tarea-vencida-titulo">${escapeHtml(item.nombre || 'Tarea')}</h3>
          <span class="tarea-vencida-badge">#${item.posicion || baseIndex + idx + 1}</span>
        </div>
        <div class="tarea-vencida-info">
          <span>🔥 ${item.total_vencidas} ${item.total_vencidas === 1 ? 'vez' : 'veces'}</span>
          <span>⭐ ${item.total_puntos || 0} pts</span>
          <span>📅 ${rango}</span>
          ${cache.periodo ? `<span>🗓️ ${escapeHtml(cache.periodo)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}
