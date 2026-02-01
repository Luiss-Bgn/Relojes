// Utilidades de tiempo y comparación de horas para Actividades

export function compareHour(h1 = '', h2 = '') {
  if (!h1 && !h2) return 0;
  if (!h1) return 1;
  if (!h2) return -1;
  const [H1, M1 = '0'] = h1.split(':');
  const [H2, M2 = '0'] = h2.split(':');
  const a = (parseInt(H1, 10) || 0) * 60 + (parseInt(M1, 10) || 0);
  const b = (parseInt(H2, 10) || 0) * 60 + (parseInt(M2, 10) || 0);
  return a - b;
}

export function hourToMinutes(hora = '') {
  if (!hora) return NaN;
  const [H, M = '0'] = hora.split(':');
  const h = parseInt(H, 10);
  const m = parseInt(M, 10);
  if (isNaN(h) || isNaN(m)) return NaN;
  return h * 60 + m;
}

export function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export function calculateIsFutureDay(dayIndex, now) {
  const currentDayIndex = now.getDay();
  return dayIndex > currentDayIndex;
}

export function getStatusClass(estatus, hora, isToday, now, isFutureDay = false) { // eslint-disable-line no-unused-vars
  if (estatus === 5) {
    return 'status-extra';
  }

  if (!isToday) {
    return 'status-todo';
  }

  switch (estatus) {
    case 1:
      return 'status-inprogress';
    case 2:
      return 'status-todo';
    case 3:
      return 'status-done';
    case 4:
      return 'status-overdue';
    case 5:
      return 'status-extra';
    default:
      break;
  }

  if (!hora) return 'status-todo';

  const mins = hourToMinutes(hora);
  if (isNaN(mins)) return 'status-todo';

  const nowMins = now.getHours() * 60 + now.getMinutes();
  if (nowMins >= mins) {
    return 'status-overdue';
  }
  return 'status-todo';
}
