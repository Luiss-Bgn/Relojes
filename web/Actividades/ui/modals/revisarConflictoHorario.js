// Util compartido para modales: validación de solapamiento de horarios

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(/[-\s:]+/).map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Verifica si existe conflicto de horarios para un empleado y días seleccionados.
 * Retorna `null` si no hay conflicto, o un objeto con info del conflicto si sí lo hay.
 */
export async function checkTimeConflict(empleadoId, dias, hora_ini, hora_fin, options = {}) {
  try {
    // Soportar modo objeto: checkTimeConflict({ empleadoId, dias|dia, hora_ini, hora_fin, excludeTaskId, panelUrl })
    if (typeof empleadoId === 'object' && empleadoId !== null) {
      const cfg = empleadoId;
      return await checkTimeConflict(
        cfg.empleadoId,
        cfg.dias ?? cfg.dia,
        cfg.hora_ini,
        cfg.hora_fin,
        {
          panelUrl: cfg.panelUrl,
          excludeTaskId: cfg.excludeTaskId,
        }
      );
    }
    console.log("DATTOS EN CONFLICT TIME:", empleadoId, dias, hora_ini, hora_fin, options);

    const diasArray = Array.isArray(dias) ? dias : dias ? [dias] : [];
    const panelUrl = options.panelUrl || new URL('/tareas/panel/obtener', window.location.origin).toString();
    const excludeTaskId = options.excludeTaskId ?? null;

    // Obtener todas las tareas del panel
    const response = await fetch(panelUrl);
    const result = await response.json();

    if (result.status !== 'success' || !result.panel) {
      return null;
    }

    // Buscar el empleado en el panel
    const empleado = result.panel.find((u) => u.id === empleadoId);
    if (!empleado || !empleado.tareas_asignadas) {
      return null;
    }

    const nuevaInicio = timeToMinutes(hora_ini);
    const nuevaFin = hora_fin ? timeToMinutes(hora_fin) : nuevaInicio + 60; // default 1 hora

    // Revisar cada día seleccionado
    for (const dia of diasArray) {
      const tareasDelDia = empleado.tareas_asignadas[dia] || [];

      // Verificar solapamiento con cada tarea existente
      for (const tarea of tareasDelDia) {
        if (excludeTaskId !== null && String(tarea.id) === String(excludeTaskId)) {
          continue;
        }

        const tareaInicio = timeToMinutes(tarea.hora_ini);
        const tareaFin = tarea.hora_fin ? timeToMinutes(tarea.hora_fin) : tareaInicio + 60;

        // Dos rangos se solapan si: inicio1 < fin2 AND inicio2 < fin1
        if (nuevaInicio < tareaFin && tareaInicio < nuevaFin) {
          return {
            nombre: tarea.nombre,
            dia,
            hora_ini: tarea.hora_ini,
            hora_fin: tarea.hora_fin || tarea.hora_ini,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error verificando conflictos:', error);
    return null;
  }
}

export const getSelectedDayKey = () => {
  const label = (document.getElementById('selected-date')?.textContent || '').trim();
  if (!label) return null;

  // Caso común: "LUNES", "MARTES", etc.
  const firstToken = label.split(/\s+/)[0];
  const lower = firstToken.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};