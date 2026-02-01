// Estado compartido y constantes base para Actividades

export const diasSemana = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export const state = {
  currentDayIndex: new Date().getDay(),
  daysOffset: 0,
  trabajadores: [],
  currentEmpPage: 0,
  // pageSize ahora será dinámico = número de empleados cargados
  lastRowsData: [],
  lastMinuteScrolled: null,
  lastTargetIndex: 0,
  activitiesByDay: new Map()
};

export const DOM = {};

// Control de tareas extra
export let tareasExtraActivas = [];
export let tareasExtrasCompletadas = [];
export let _lastExtrasTaskIds = new Set();
export let _lastExtraCheckTime = 0;
export const EXTRA_CHECK_INTERVAL_MS = 5000; // Verificar extras cada 5 segundos

export function setTareasExtraActivas(value) {
  tareasExtraActivas = Array.isArray(value) ? value : [];
}

export function setTareasExtrasCompletadas(value) {
  tareasExtrasCompletadas = Array.isArray(value) ? value : [];
}

export function setLastExtrasTaskIds(value) {
  _lastExtrasTaskIds = value instanceof Set ? value : new Set(value);
}

export function setLastExtraCheckTime(value) {
  _lastExtraCheckTime = Number(value) || 0;
}
