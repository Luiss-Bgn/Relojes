// funciones de fecha y calculos de quincenas
import { MONTH_NAMES, FECHA_MINIMA_HISTORIAL } from './constants.js';

// regresa la fecha de hoy a medianoche
export function getHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// formatea fecha como YYYY-MM-DD
export function toISODate(date) {
  return date.toISOString().split('T')[0];
}

// formatea como DD/MM/YYYY bien bonito
export function formatearFecha(fecha) {
  if (!fecha) return '--/--/----';
  const d = typeof fecha === 'string' ? new Date(fecha + 'T00:00:00') : fecha;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// regresa la fecha completa tipo "MIERCOLES 11 DE FEBRERO"
export function getFechaCompleta(date = new Date()) {
  const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  return `${dias[date.getDay()]} ${date.getDate()} DE ${meses[date.getMonth()]}`;
}

// checa si dos fechas son el mismo dia
export function isSameDay(a, b) {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
}

// saca en que quincena estamos ahorita
// Q1: del 28 del mes pasado al 12 del mes actual
// Q2: del 13 al 27
export function obtenerQuincenaActual(ref = new Date()) {
  const dia = ref.getDate();
  const mes = ref.getMonth();
  const ano = ref.getFullYear();

  let fechaInicio, fechaFin, nombre;

  if (dia <= 12) {
    fechaInicio = new Date(ano, mes - 1, 28);
    fechaFin = new Date(ano, mes, 12);
    nombre = `Quincena 1 - ${MONTH_NAMES[mes]} ${ano}`;
  } else if (dia <= 27) {
    fechaInicio = new Date(ano, mes, 13);
    fechaFin = new Date(ano, mes, 27);
    nombre = `Quincena 2 - ${MONTH_NAMES[mes]} ${ano}`;
  } else {
    fechaInicio = new Date(ano, mes, 28);
    const mp = mes === 11 ? 0 : mes + 1;
    const ap = mes === 11 ? ano + 1 : ano;
    fechaFin = new Date(ap, mp, 12);
    nombre = `Quincena 1 - ${MONTH_NAMES[mp]} ${ap}`;
  }

  fechaInicio.setHours(0, 0, 0, 0);
  fechaFin.setHours(23, 59, 59, 999);

  return { fechaInicio, fechaFin, nombre };
}

// genera todas las quincenas desde que empezo el historial hasta hoy
// si no hay historial nomas regresa la quincena actual
export function generarTodasLasQuincenas(fechaInicioHistorial) {
  const hoy = getHoy();
  const quincenas = [];

  if (!fechaInicioHistorial) {
    const actual = obtenerQuincenaActual();
    quincenas.push({
      titulo: actual.nombre,
      fechaInicio: actual.fechaInicio,
      fechaFin: hoy,
      fechaFinOriginal: actual.fechaFin,
    });
    return quincenas;
  }

  let year = fechaInicioHistorial.getFullYear();
  let month = fechaInicioHistorial.getMonth();
  const diaIni = fechaInicioHistorial.getDate();
  let skipQ1 = diaIni >= 13 && diaIni <= 27;

  while (year < hoy.getFullYear() || (year === hoy.getFullYear() && month <= hoy.getMonth())) {
    if (!skipQ1) {
      const i1 = new Date(year, month - 1, 28);
      const f1 = new Date(year, month, 12);
      if (i1 <= hoy && !quincenas.some(q => q.fechaInicio.getTime() === i1.getTime())) {
        quincenas.push({
          titulo: `Quincena 1 - ${MONTH_NAMES[month]} ${year}`,
          fechaInicio: i1,
          fechaFin: f1 < hoy ? f1 : new Date(Math.min(f1.getTime(), hoy.getTime())),
          fechaFinOriginal: f1,
        });
      }
    }

    const i2 = new Date(year, month, 13);
    const f2 = new Date(year, month, 27);
    if (i2 <= hoy && !quincenas.some(q => q.fechaInicio.getTime() === i2.getTime())) {
      quincenas.push({
        titulo: `Quincena 2 - ${MONTH_NAMES[month]} ${year}`,
        fechaInicio: i2,
        fechaFin: f2 < hoy ? f2 : new Date(Math.min(f2.getTime(), hoy.getTime())),
        fechaFinOriginal: f2,
      });
    }

    month++;
    if (month > 11) { month = 0; year++; }
    skipQ1 = false;
  }

  // Asegurar que la quincena actual esté incluida
  const actual = obtenerQuincenaActual();
  if (!quincenas.some(q => q.fechaInicio.getTime() === actual.fechaInicio.getTime())) {
    quincenas.push({
      titulo: actual.nombre,
      fechaInicio: actual.fechaInicio,
      fechaFin: hoy,
      fechaFinOriginal: actual.fechaFin,
    });
  }

  return quincenas
    .filter(q => q.fechaInicio >= FECHA_MINIMA_HISTORIAL)
    .sort((a, b) => b.fechaInicio - a.fechaInicio);
}
