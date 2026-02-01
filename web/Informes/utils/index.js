// ----------- Helpers generales --------------

export function animateCounter(element, target) {
  let current = 0;
  const duration = 1000;
  const stepTime = 20;
  const step = target / (duration / stepTime);
  const interval = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    element.textContent = Math.floor(current);
  }, stepTime);
}

/**
 * Devuelve TODAS las tareas (cualquier estatus) aplanadas en un solo array
 * 
 * 🔥 CAMBIO: Ahora tareas_asignadas está organizado por FECHA, no por día de semana
 * {
 *   "2026-01-04": [{tarea1}, {tarea2}],
 *   "2026-01-11": [{tarea3}]
 * }
 * 
 * Cada tarea ya tiene los campos dia_semana y fecha_asignacion de la BD
 */
export function getAllTasks(empleado) {
  const tasks = [];
  if (!empleado || !empleado.tareas_asignadas) return tasks;

  // 🔥 CAMBIO: Las claves ahora son fechas (YYYY-MM-DD), no días de la semana
  Object.entries(empleado.tareas_asignadas).forEach(([fechaKey, dayTasks]) => {
    if (!Array.isArray(dayTasks)) return;
    
    // dayTasks contiene tareas con estructura: {id, nombre, dia_semana, fecha_asignacion, puntaje, estatus, ...}
    dayTasks.forEach(t => {
      // Asegurar que tenemos el campo fecha_asignacion
      const tarea_con_fecha = {
        ...t,
        fecha_asignacion: t.fecha_asignacion || fechaKey,  // Usar el campo fecha_asignacion de la tarea, o la clave como fallback
        fecha: t.fecha_asignacion || fechaKey,  // Alias para compatibilidad
        dia: t.dia_semana || 'desconocido'  // El día de semana viene en el objeto tarea
      };
      tasks.push(tarea_con_fecha);
    });
  });

  return tasks;
}

// Día actual en minúsculas
export function getCurrentDayName() {
  const days = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  return days[new Date().getDay()];
}

export const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * normalizeDay(str)
 * Normaliza un nombre de día: quita diacríticos y pasa a minúsculas.
 */
export function normalizeDay(str) {
  // Use the Unicode combining marks range instead of \p{Diacritic} which
  // may not be supported in some browser JS engines. After NFD normalization
  // diacritical marks are in the range U+0300..U+036F.
  return (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}