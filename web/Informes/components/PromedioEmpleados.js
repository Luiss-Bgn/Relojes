/*
  PromedioEmpleados.js
  Esta madre pinta la dona con el rendimiento de todos los empleados juntos y solo usa los datos del backup.
*/
import { getColorByPercent } from '../utils/colorUtils.js';
import { getHoy, toISODate, obtenerQuincenaActual } from '../utils/dateUtils.js';
import { getEmpleados, getModoGrafica } from '../state/appState.js';

// pinta la grafiquita de progreso en el contenedor
export async function renderizarGraficaPromedio() {
  const container = document.getElementById('grafica-promedio-content');
  if (!container) return;

  const datos = calcularDatosProgreso();
  container.innerHTML = generarHTMLGraficaMini(datos);
}

/* calculo de datos pa la dona */

function calcularDatosProgreso() {
  const modoQuincena = getModoGrafica() === 'quincena';
  const empleados = getEmpleados();
  const hoy = getHoy();

  let puntosAsignados = 0, puntosGanados = 0, puntosNoGanados = 0, puntosExtras = 0;

  // Determinar rango de fechas según el modo
  let fechaInicio, fechaFin;
  if (modoQuincena) {
    const q = obtenerQuincenaActual();
    fechaInicio = q.fechaInicio;
    fechaFin = q.fechaFin;
  } else {
    fechaInicio = new Date(2025, 0, 13); // Fecha mínima histórica
    fechaFin = hoy;
  }

  let current = new Date(fechaInicio);
  while (current <= fechaFin && current <= hoy) {
    const fechaStr = toISODate(current);

    for (const emp of empleados) {
      const h = emp.historial_puntos?.[fechaStr];
      if (h) {
        puntosAsignados += h.asignados || 0;
        puntosGanados += h.completados || 0;
        puntosNoGanados += h.perdidos || 0;
        puntosExtras += h.extras || 0;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  const porcentaje = puntosAsignados > 0 ? (puntosGanados / puntosAsignados) * 100 : 0;
  return { puntosAsignados, puntosGanados, puntosNoGanados, puntosExtras, porcentaje };
}

/* calculo de datos pa la dona */

function generarHTMLGraficaMini({ puntosGanados, puntosNoGanados, puntosExtras, porcentaje }) {
  const pct = porcentaje;
  const textColor = pct > 100 ? '#2d79f3' : getColorByPercent(Math.min(pct, 100));
  const displayPct = pct > 100 ? '+100%' : Math.round(pct) + '%';
  const dashOffset = 220 - (Math.min(pct, 100) / 100) * 220;

  return `
    <div style="display:flex;align-items:center;gap:20px;">
      <!-- Gráfica circular donut -->
      <div style="position:relative;width:80px;height:80px;flex-shrink:0;">
        <svg width="80" height="80" style="transform:rotate(-90deg);">
          <circle cx="40" cy="40" r="35" fill="none" stroke="#eee" stroke-width="8"/>
          <circle cx="40" cy="40" r="35" fill="none" stroke="#dc3545" stroke-width="8"
                  stroke-dasharray="220" stroke-dashoffset="0"/>
          <circle cx="40" cy="40" r="35" fill="none" stroke="#28a745" stroke-width="8"
                  stroke-dasharray="220" stroke-dashoffset="${dashOffset}" stroke-linecap="round"/>
        </svg>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
          <div style="font-size:16px;font-weight:700;color:${textColor};line-height:1;">${displayPct}</div>
        </div>
      </div>

      <!-- Leyenda -->
      <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="width:10px;height:10px;background:#28a745;border-radius:2px;flex-shrink:0;"></span>
          <span style="color:#333;">Total puntos ganados</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="width:10px;height:10px;background:#dc3545;border-radius:2px;flex-shrink:0;"></span>
          <span style="color:#333;">Puntos no ganados</span>
        </div>
      </div>

      <!-- Separador -->
      <div style="width:1px;height:50px;background:#ddd;"></div>

      <!-- Extras -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <span style="font-size:12px;color:#666;">Puntos extras ganados</span>
        <span style="font-size:20px;font-weight:700;color:#2d79f3;">${puntosExtras}</span>
      </div>
    </div>
  `;
}
