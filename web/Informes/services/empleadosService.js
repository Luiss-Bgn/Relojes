export async function obtenerEmpleados() {
  try {
    // 🔥 CAMBIO: Usar /empleados-con-tareas en lugar de /empleados
    // porque /empleados no devuelve tareas_asignadas
    // /empleados-con-tareas devuelve todos los usuarios con sus tareas (asignadas + completadas)
    const response = await fetch("/empleados-con-tareas", { cache: "no-store" });
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error al obtener empleados:", error);
    return [];
  }
}

export async function obtenerBackup() {
  try {
    const resp = await fetch("/backup.json", { cache: "no-store" });
    if (!resp.ok) throw new Error(`Error HTTP: ${resp.status}`);
    return await resp.json();
  } catch (err) {
    console.error("Error al obtener backup.json:", err);
    return [];
  }
}

/**
 * Convierte backup.json a un mapa:
 *   { [empleadoId]: [ tareasConEstatus0 ... ] }
 */
export function crearMapaTareasRealizadas(backupData = []) {
  const mapa = {};
  backupData.forEach(emp => {
    const terminadas = [];
    Object.entries(emp.tareas_asignadas || {}).forEach(([dia, tasks]) => {
      tasks.forEach(t => terminadas.push({ ...t, dia }));
    });
    mapa[emp.id] = terminadas;
  });
  return mapa;
}