/*
  ResumenAgregado.js
  Esta madre muestra la tabla resumen de TODOS los empleados juntos
  para la quincena actual. Solo jala datos del backup.
*/
import { getColorByPercent } from '../utils/colorUtils.js';
import { getHoy, toISODate, isSameDay, obtenerQuincenaActual } from '../utils/dateUtils.js';
import { createQuincenaTable, crearCelda } from '../utils/domUtils.js';
import { WEEKDAY_SHORT } from '../utils/constants.js';
import { getEmpleados } from '../state/appState.js';
import { mostrarPanelTareasVencidas } from './TareasVencidas.js';

// muestra el panel de tareas vencidas + la tabla con el resumen de todos
export async function mostrarResumenAgregado() {
  // Asegurar que el panel izquierdo sea visible
  const leftPanel = document.querySelector('.left-panel');
  if (leftPanel) leftPanel.style.display = 'flex';

  mostrarPanelTareasVencidas();

  // Mostrar fecha en header
  const fechaDiv = document.getElementById('fecha-actual-informes');
  if (fechaDiv) fechaDiv.style.display = 'block';

  // Limpiar header derecho
  const rightInfo = document.getElementById('titulo-informes-right');
  if (rightInfo) rightInfo.innerHTML = '';

  const container = document.getElementById('calendario-container');
  if (!container) return;

  container.classList.remove('is-hidden');
  container.removeAttribute('style');
  container.style.display = 'block';
  container.style.marginTop = '30px';
  container.innerHTML = '';
  container.classList.add('tasks-card');

  const today = new Date();
  const hoy = getHoy();
  const empleados = getEmpleados();

  // Calcular rango de quincena
  const quincena = obtenerQuincenaActual();
  const { fechaInicio, fechaFin } = calcularRangoQuincena(today);

  const bodyDiv = document.createElement('div');
  bodyDiv.classList.add('tasks-card-body');

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'padding:20px;overflow:auto;flex:1;';

  const h3 = document.createElement('h3');
  h3.textContent = `${quincena.nombre} - Resumen de Todos los Empleados`;
  h3.style.cssText = 'text-align:center;color:#333;font-size:18px;font-weight:700;margin-bottom:20px;';
  wrapper.appendChild(h3);

  const table = createQuincenaTable();
  const tbody = document.createElement('tbody');

  // Pre-calcular totales hasta hoy
  let totalQ = { asignados: 0, realizados: 0, perdidos: 0, extras: 0 };
  let d = new Date(fechaInicio);
  while (d <= fechaFin && d <= hoy) {
    const pts = calcularPuntosAgregados(d, empleados);
    totalQ.asignados += pts.asignados;
    totalQ.realizados += pts.realizados;
    totalQ.perdidos += pts.perdidos;
    totalQ.extras += pts.extras;
    d.setDate(d.getDate() + 1);
  }

  const pctFinal = totalQ.asignados > 0 ? (totalQ.realizados / totalQ.asignados) * 100 : 0;
  const colorFinal = totalQ.asignados > 0 ? getColorByPercent(pctFinal) : '#9ca3af';

  // Encontrar primer y último día con datos
  let primerDia = null, ultimoDia = null;
  d = new Date(fechaInicio);
  while (d <= fechaFin && d <= hoy) {
    if (!primerDia) primerDia = new Date(d);
    ultimoDia = new Date(d);
    d.setDate(d.getDate() + 1);
  }

  // Agregar filas para cada día
  d = new Date(fechaInicio);
  while (d <= fechaFin) {
    const dayDate = new Date(d);
    const esHoy = isSameDay(dayDate, hoy);
    const esDiaActual = dayDate <= hoy;
    const puntos = calcularPuntosAgregados(dayDate, empleados);

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #e5e7eb';
    if (esHoy) tr.style.backgroundColor = '#e8f4ff';

    const weekday = WEEKDAY_SHORT[dayDate.getDay()];
    crearCelda(tr, `${weekday} ${dayDate.getDate()}`, 'padding:12px 8px;text-align:center;font-weight:500;font-size:14px;');
    crearCelda(tr, puntos.asignados, 'padding:12px 8px;text-align:center;font-weight:600;color:#4b5563;');
    crearCelda(tr, puntos.realizados, 'padding:12px 8px;text-align:center;font-weight:600;color:#10b981;');
    crearCelda(tr, puntos.perdidos, 'padding:12px 8px;text-align:center;font-weight:600;color:#ef4444;');
    crearCelda(tr, puntos.extras, 'padding:12px 8px;text-align:center;font-weight:600;color:#667eea;');
    crearCelda(tr, puntos.realizados + puntos.extras, 'padding:12px 8px;text-align:center;font-weight:600;color:#764ba2;');

    // % Diario
    const pctDiario = puntos.asignados > 0
      ? (puntos.realizados / puntos.asignados) * 100
      : null;

    if (pctDiario !== null) {
      const color = getColorByPercent(pctDiario);
      crearCelda(tr, pctDiario.toFixed(1) + '%',
        `padding:12px 8px;text-align:center;font-weight:600;background:${color};color:#fff;`);
    } else {
      crearCelda(tr, 'N/D',
        'padding:12px 8px;text-align:center;font-weight:600;background:repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 8px,#e5e7eb 8px,#e5e7eb 16px);color:#9ca3af;');
    }

    // % Quincenal - columna pintada con color final, borde del mismo color para efecto fluido
    const tdQ = document.createElement('td');
    if (esDiaActual) {
      let br = '0px';
      const esPrimero = primerDia && dayDate.getTime() === primerDia.getTime();
      const esUltimo = ultimoDia && dayDate.getTime() === ultimoDia.getTime();
      if (esPrimero && esUltimo) br = '4px';
      else if (esPrimero) br = '4px 4px 0 0';
      else if (esUltimo) br = '0 0 4px 4px';

      tdQ.style.cssText = `padding:12px 8px;text-align:center;font-weight:600;background:${colorFinal};color:#fff;border-radius:${br};border:1px solid ${colorFinal};`;
      tdQ.textContent = esHoy ? pctFinal.toFixed(1) + '%' : '';
    } else {
      tdQ.style.cssText = 'padding:12px 8px;text-align:center;color:#9ca3af;border:none;';
    }
    tr.appendChild(tdQ);
    tbody.appendChild(tr);
    d.setDate(d.getDate() + 1);
  }

  // Fila de totales
  tbody.appendChild(crearFilaTotalAgregado(totalQ, pctFinal, colorFinal, fechaInicio));

  table.appendChild(tbody);
  wrapper.appendChild(table);
  bodyDiv.appendChild(wrapper);
  container.appendChild(bodyDiv);
}

function calcularRangoQuincena(today) {
  const day = today.getDate();
  const month = today.getMonth();
  const year = today.getFullYear();

  if (day <= 12) {
    return { fechaInicio: new Date(year, month - 1, 28), fechaFin: new Date(year, month, 12) };
  } else if (day <= 27) {
    return { fechaInicio: new Date(year, month, 13), fechaFin: new Date(year, month, 27) };
  } else {
    const mp = month === 11 ? 0 : month + 1;
    const ap = month === 11 ? year + 1 : year;
    return { fechaInicio: new Date(year, month, 28), fechaFin: new Date(ap, mp, 12) };
  }
}

// suma los puntos de todos los empleados para un dia, solo del backup
function calcularPuntosAgregados(dayDate, empleados) {
  const fechaStr = toISODate(dayDate);
  let total = { asignados: 0, realizados: 0, perdidos: 0, extras: 0 };

  for (const emp of empleados) {
    const h = emp.historial_puntos?.[fechaStr];
    if (h) {
      total.asignados += h.asignados || 0;
      total.realizados += h.completados || 0;
      total.perdidos += h.perdidos || 0;
      total.extras += h.extras || 0;
    }
  }

  return total;
}

function crearFilaTotalAgregado(totales, pctFinal, colorFinal, fechaInicio) {
  const tr = document.createElement('tr');
  tr.style.cssText = 'background:#f3f4f6;font-weight:700;border-top:2px solid #667eea;';

  const qNum = fechaInicio.getDate() === 28 ? 1 : 2;
  const s = 'padding:12px 8px;text-align:center;font-weight:700;font-size:15px;';

  crearCelda(tr, `TOTAL QUINCENA ${qNum}`, s);
  crearCelda(tr, totales.asignados, `${s}color:#4b5563;`);
  crearCelda(tr, totales.realizados, `${s}color:#10b981;`);
  crearCelda(tr, totales.perdidos, `${s}color:#ef4444;`);
  crearCelda(tr, totales.extras, `${s}color:#667eea;`);
  crearCelda(tr, totales.realizados + totales.extras, `${s}color:#764ba2;`);

  const pctDiario = totales.asignados > 0 ? (totales.realizados / totales.asignados) * 100 : 0;
  const colorD = totales.asignados > 0 ? getColorByPercent(pctDiario) : '#9ca3af';
  crearCelda(tr, totales.asignados > 0 ? pctDiario.toFixed(1) + '%' : 'N/A', `${s}background:${colorD};color:#fff;`);
  crearCelda(tr, pctFinal.toFixed(1) + '%', `${s}background:${colorFinal};color:#fff;border-radius:4px;`);

  return tr;
}
