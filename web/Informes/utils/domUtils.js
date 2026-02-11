// funciones pa crear tablas y celdas del DOM
import { getColorByPercent } from './colorUtils.js';

// crea la celda de porcentaje con su color de fondo
export function createPercentCell(rawPercent, { nd = false, useColorScale = false } = {}) {
  const td = document.createElement('td');
  td.className = 'percent-cell';

  if (nd || rawPercent === null || isNaN(rawPercent)) {
    td.classList.add('percent-nd');
    td.textContent = 'N/D';
    return td;
  }

  const color = useColorScale ? getColorByPercent(rawPercent) : '#6d28d9';
  td.style.backgroundColor = color;
  td.style.color = '#fff';
  td.textContent = `${Math.min(Math.round(rawPercent), 100)}%`;
  return td;
}

// arma la tabla con el header de 8 columnas que usamos en todas las quincenas
export function createQuincenaTable() {
  const table = document.createElement('table');
  table.className = 'puntos-table';

  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr class="tabla-header-row">
      <th>Día</th>
      <th>Puntos Asignados</th>
      <th>Puntos Ganados</th>
      <th>Puntos no Ganados</th>
      <th>Puntos Extra Ganados</th>
      <th>Puntos Totales Ganados</th>
      <th>% Diario</th>
      <th>% Quincenal</th>
    </tr>
  `;
  table.appendChild(thead);
  return table;
}

// crea una celda y la mete al tr
export function crearCelda(tr, text, style = '') {
  const td = document.createElement('td');
  td.style.cssText = style;
  td.textContent = text;
  tr.appendChild(td);
  return td;
}

// escapa HTML pa que no nos metan XSS
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
