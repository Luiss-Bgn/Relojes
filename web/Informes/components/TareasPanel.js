/*
  TareasPanel.js
  Esta madre arma las tablas quincenales de puntos cuando
  le picas a un empleado. Solo jala datos del backup.
*/
import { getColorByPercent, getColorQuincenal } from '../utils/colorUtils.js';
import { getHoy, toISODate, isSameDay, generarTodasLasQuincenas } from '../utils/dateUtils.js';
import { createPercentCell, createQuincenaTable } from '../utils/domUtils.js';
import { MONTH_NAMES, MONTH_NAMES_SHORT, WEEKDAY_SHORT, FECHA_MINIMA_HISTORIAL } from '../utils/constants.js';
import { isAdmin } from '../state/appState.js';
import { ocultarPanelTareasVencidas } from './TareasVencidas.js';

// cuando le picas a un empleado, esta funcion arma y muestra sus tablas
export async function mostrarTareasEmpleado(empleado) {
  ocultarPanelTareasVencidas();

  // Ocultar fecha del header principal
  const fechaDiv = document.getElementById('fecha-actual-informes');
  if (fechaDiv) fechaDiv.style.display = 'none';

  // Actualizar header derecho con nombre y mes
  const today = new Date();
  const rightInfo = obtenerOCrearHeaderDerecho();
  if (rightInfo) {
    rightInfo.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="display:flex;flex-direction:column;align-items:flex-end;">
          <span style="color:#333;font-size:18px;font-weight:500;">${empleado.nombre}</span>
          <span style="color:#666;font-size:16px;font-weight:500;margin-bottom:6px;">
            ${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}
          </span>
        </div>
      </div>
    `;
  }

  const container = document.getElementById('calendario-container');
  if (!container) return;

  // Preparar contenedor
  container.classList.remove('is-hidden');
  container.removeAttribute('style');
  container.style.display = 'flex';
  container.innerHTML = '';
  container.classList.add('tasks-card');

  // Crear contenedor con scroll
  const bodyDiv = document.createElement('div');
  bodyDiv.classList.add('tasks-card-body');

  // Generar quincenas según historial del empleado
  const quincenas = obtenerQuincenasEmpleado(empleado);
  const esAdminUser = isAdmin();

  if (!esAdminUser) {
    // Empleado: solo quincena actual (rango completo)
    if (quincenas.length > 0) {
      const q = quincenas[0];
      bodyDiv.appendChild(
        crearTablaQuincena(q.titulo, q.fechaInicio, q.fechaFinOriginal, empleado)
      );
    }
  } else {
    // Admin/Supervisor: todas las quincenas con historial
    quincenas.forEach(q => {
      if (q.fechaInicio <= q.fechaFinOriginal) {
        bodyDiv.appendChild(
          crearTablaQuincena(q.titulo, q.fechaInicio, q.fechaFinOriginal, empleado)
        );
      }
    });
  }

  container.appendChild(bodyDiv);

  // Scroll automático al día actual
  setTimeout(() => {
    const diaActual = bodyDiv.querySelector('.dia-actual-row');
    if (diaActual) {
      const top = diaActual.offsetTop - (bodyDiv.clientHeight / 2) + (diaActual.clientHeight / 2);
      bodyDiv.scrollTo({ top, behavior: 'smooth' });
    }
  }, 100);
}

/* ===========================
   funciones internas
   =========================== */

function obtenerOCrearHeaderDerecho() {
  const titulo = document.getElementById('titulo-informes');
  let rightInfo = document.getElementById('titulo-informes-right');
  if (!rightInfo && titulo) {
    rightInfo = document.createElement('span');
    rightInfo.id = 'titulo-informes-right';
    rightInfo.style.cssText =
      'display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-weight:500;font-size:18px;margin-left:auto;';
    titulo.appendChild(rightInfo);
  }
  return rightInfo;
}

function obtenerQuincenasEmpleado(empleado) {
  const historial = empleado.historial_puntos || {};
  const fechas = Object.keys(historial).sort();

  if (fechas.length === 0) return generarTodasLasQuincenas(null);

  const masAntigua = new Date(fechas[0] + 'T00:00:00');
  const inicio = masAntigua < FECHA_MINIMA_HISTORIAL ? FECHA_MINIMA_HISTORIAL : masAntigua;

  return generarTodasLasQuincenas(inicio);
}

// saca los puntos de un dia especifico del empleado, puro backup
function obtenerPuntosDia(empleado, fecha) {
  const fechaDate = typeof fecha === 'string' ? new Date(fecha + 'T00:00:00') : new Date(fecha);
  fechaDate.setHours(0, 0, 0, 0);
  const fechaStr = toISODate(fechaDate);

  const h = empleado.historial_puntos?.[fechaStr];
  if (h) {
    return {
      puntosAsignados: h.asignados || 0,
      puntosRealizados: h.completados || 0,
      puntosPerdidos: h.perdidos || 0,
      puntosExtras: h.extras || 0,
    };
  }

  return { puntosAsignados: 0, puntosRealizados: 0, puntosPerdidos: 0, puntosExtras: 0 };
}

// precalcula el color de la columna quincenal pa que todos los dias se pinten igual
function precalcularColorQuincenal(fechaInicio, fechaFin, empleado) {
  const hoy = getHoy();
  const limite = fechaFin <= hoy ? fechaFin : hoy;

  let acumAsig = 0, acumReal = 0, sinTareas = true;
  let d = new Date(fechaInicio);
  while (d <= limite) {
    const puntos = obtenerPuntosDia(empleado, d);
    acumAsig += puntos.puntosAsignados;
    acumReal += puntos.puntosRealizados;
    if (puntos.puntosAsignados > 0) sinTareas = false;
    d.setDate(d.getDate() + 1);
  }

  let colorFinal = '#d1d5db';
  if (acumAsig > 0) {
    colorFinal = getColorQuincenal((acumReal / acumAsig) * 100);
  } else if (sinTareas) {
    colorFinal = getColorQuincenal(0, { sinTareas: true });
  }

  return { colorFinal, sinTareasAsignadas: sinTareas };
}

// arma la tabla completa de una quincena para un empleado
function crearTablaQuincena(titulo, fechaInicio, fechaFin, empleado) {
  const section = document.createElement('div');
  section.className = 'quincena-section';

  const h3 = document.createElement('h3');
  h3.textContent = titulo;
  section.appendChild(h3);

  const table = createQuincenaTable();
  const tbody = document.createElement('tbody');
  const hoy = getHoy();

  let totales = { asignados: 0, realizados: 0, perdidos: 0, extras: 0, total: 0 };
  let acumAsignados = 0, acumRealizados = 0;
  const celdasQuincenales = [];

  // Pre-calcular color final de columna quincenal
  const { colorFinal, sinTareasAsignadas } = precalcularColorQuincenal(
    fechaInicio, fechaFin, empleado
  );

  let current = new Date(fechaInicio);
  while (current <= fechaFin) {
    const dayDate = new Date(current);
    dayDate.setHours(0, 0, 0, 0);
    const esHoy = isSameDay(dayDate, hoy);
    const esPasado = dayDate < hoy;
    const esFuturo = dayDate > hoy;
    const isDiaCorte = dayDate.getDate() === 12 || dayDate.getDate() === 27;

    const puntos = obtenerPuntosDia(empleado, dayDate);

    // Acumular totales
    totales.asignados += puntos.puntosAsignados;
    totales.realizados += puntos.puntosRealizados;
    totales.perdidos += puntos.puntosPerdidos;
    totales.extras += puntos.puntosExtras;
    totales.total += puntos.puntosRealizados + puntos.puntosExtras;

    acumAsignados += puntos.puntosAsignados;
    acumRealizados += puntos.puntosRealizados;

    // Porcentajes
    const rawDiario = puntos.puntosAsignados > 0
      ? (puntos.puntosRealizados / puntos.puntosAsignados) * 100
      : null;
    const rawQuincenal = acumAsignados > 0
      ? (acumRealizados / acumAsignados) * 100
      : null;

    // Fila del día
    const tr = crearFilaDia(dayDate, puntos, esHoy, isDiaCorte);

    // Celda % Diario
    const tdDiario = createPercentCell(rawDiario, {
      nd: puntos.puntosAsignados === 0,
      useColorScale: true,
    });
    tr.appendChild(tdDiario);

    // Celda % Quincenal
    const tdQuincenal = document.createElement('td');
    tdQuincenal.className = (esPasado || esHoy) ? 'quincenal-empty' : '';
    tdQuincenal.style.cssText = 'text-align:center;padding:8px 6px;font-size:11px;vertical-align:middle;border:none;';

    if (esFuturo) {
      tdQuincenal.style.background = 'transparent';
    }

    if (esPasado || esHoy) {
      celdasQuincenales.push(tdQuincenal);
    }

    // Mostrar texto solo en día actual o último día de quincena
    const esUltimoDia = current.getTime() === fechaFin.getTime();
    if ((esHoy || esUltimoDia) && !esFuturo) {
      if (acumAsignados === 0) {
        tdQuincenal.textContent = 'N/D';
      } else {
        tdQuincenal.textContent = `${Math.min(Math.round(rawQuincenal), 100)}%`;
      }
    }

    tr.appendChild(tdQuincenal);
    tbody.appendChild(tr);

    if (esHoy) tr.classList.add('dia-actual-row');

    current.setDate(current.getDate() + 1);
  }

  // Pintar todas las celdas quincenales con el color final
  celdasQuincenales.forEach(td => {
    td.style.background = `${colorFinal}`;
    td.style.color = sinTareasAsignadas ? '#666' : '#fff';
    td.style.fontWeight = '700';
    td.style.border = `1px solid ${colorFinal}`;
  });

  // Fila de totales
  tbody.appendChild(crearFilaTotal(titulo, totales));

  table.appendChild(tbody);
  section.appendChild(table);
  return section;
}

// arma una fila con los datos de un dia
function crearFilaDia(dayDate, puntos, esHoy, isDiaCorte) {
  const tr = document.createElement('tr');

  if (esHoy) tr.className = 'row-today';
  else if (isDiaCorte) tr.className = 'row-corte';

  const weekday = WEEKDAY_SHORT[dayDate.getDay()];
  const day = dayDate.getDate();
  const mes = MONTH_NAMES_SHORT[dayDate.getMonth()];

  tr.innerHTML = `
    <td style="font-weight:${esHoy ? '700' : '500'};">
      ${weekday} ${day} <span style="color:#888;font-size:10px;">(${mes})</span>
      ${esHoy ? '<span style="color:#667eea;margin-left:4px;font-size:9px;">●</span>' : ''}
      ${isDiaCorte ? '<span style="color:#ff9800;margin-left:4px;font-size:9px;font-weight:600;">CORTE</span>' : ''}
    </td>
    <td style="color:#555;">${puntos.puntosAsignados}</td>
    <td style="color:#28a745;font-weight:600;">${puntos.puntosRealizados}</td>
    <td style="color:#dc3545;font-weight:600;">${puntos.puntosPerdidos}</td>
    <td style="color:#2d79f3;font-weight:600;">${puntos.puntosExtras}</td>
    <td style="color:#000;font-weight:700;font-size:12px;">${puntos.puntosRealizados + puntos.puntosExtras}</td>
  `;

  return tr;
}

// arma la fila de totales al final de cada quincena
function crearFilaTotal(titulo, totales) {
  const tr = document.createElement('tr');
  tr.className = 'row-total';

  const pct = totales.asignados > 0 ? (totales.realizados / totales.asignados) * 100 : 0;
  const color = totales.asignados > 0 ? getColorByPercent(pct) : '#9ca3af';

  tr.innerHTML = `
    <td style="padding:6px 8px;font-size:11px;letter-spacing:0.3px;">TOTAL ${titulo.toUpperCase()}</td>
    <td style="text-align:center;color:#555;">${totales.asignados}</td>
    <td style="text-align:center;color:#28a745;">${totales.realizados}</td>
    <td style="text-align:center;color:#dc3545;">${totales.perdidos}</td>
    <td style="text-align:center;color:#2d79f3;">${totales.extras}</td>
    <td style="text-align:center;color:#000;font-size:12px;">${totales.total}</td>
    <td style="text-align:center;background:${color};color:#fff;font-weight:700;">${Math.round(pct)}%</td>
    <td style="text-align:center;background:${color};color:#fff;font-weight:700;">${Math.round(pct)}%</td>
  `;

  return tr;
}
