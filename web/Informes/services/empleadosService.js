export async function obtenerEmpleados() {
  try {
    // 🔥 ADAPTADO: Usar /usuarios (endpoint real)
    const response = await fetch("/usuarios", { cache: "no-store" });
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const data = await response.json();
    
    // 🔥 FILTRAR: Excluir usuarios con rol 'admin' o 'administrador'
    const usuariosFiltrados = (data.usuarios || []).filter(u => 
      u.rol && !['admin', 'Admin', 'administrador', 'Administrador'].includes(u.rol)
    );
    
    // Retornar en formato compatible esperado por el resto del código
    return usuariosFiltrados;
  } catch (error) {
    console.error("Error al obtener empleados:", error);
    return [];
  }
}

export async function obtenerBackup() {
  try {
    // 🔥 ADAPTADO: Usar /usuarios + /tareas/usuario/{id} + /historial/usuario/{id} (endpoints reales)
    const responseUsuarios = await fetch("/usuarios", { cache: "no-store" });
    if (!responseUsuarios.ok) throw new Error(`Error HTTP: ${responseUsuarios.status}`);
    const dataUsuarios = await responseUsuarios.json();
    const usuarios = dataUsuarios.usuarios || [];
    
    console.log("🔥 [obtenerBackup] Usuarios cargados:", usuarios.length);
    
    // Para cada usuario, obtener sus tareas asignadas Y su historial
    const backupData = await Promise.all(
      usuarios.map(async (usuario) => {
        try {
          // Obtener tareas asignadas y historial en paralelo
          const [respTareas, respHistorial] = await Promise.all([
            fetch(`/tareas/usuario/${usuario.id}`, { cache: "no-store" }),
            fetch(`/historial/usuario/${usuario.id}`, { cache: "no-store" })
          ]);
          
          const dataTareas = respTareas.ok ? await respTareas.json() : { registros: [] };
          const dataHistorial = respHistorial.ok ? await respHistorial.json() : { registros: [] };
          
          const tareas = dataTareas.registros || [];
          const historial = dataHistorial.registros || [];
          
          console.log(`📋 [${usuario.nombre}] Tareas: ${tareas.length}, Historial: ${historial.length}`);
          if (historial.length > 0) {
            console.log(`   Fechas del historial:`, historial.map(h => `${h.fecha}(s:${h.estatus})`).join(', '));
          }
          
          // 🔥 IMPORTANTE: Convertir historial a un objeto con fechas como claves
          // para que sea compatible con TareasPanel.js que espera este formato
          const historialPuntos = {};
          
          // Procesar historial para calcular puntos por fecha
          historial.forEach(h => {
            const fecha = h.fecha;
            
            if (!historialPuntos[fecha]) {
              historialPuntos[fecha] = {
                asignados: 0,
                completados: 0,
                perdidos: 0,
                extras: 0,
                fecha: fecha
              };
            }
            
            // 🔥 IMPORTANTE: estatus puede ser STRING o número
            // Mapear strings a números
            let estatus = h.estatus;
            if (typeof estatus === 'string') {
              const estatusLower = estatus.toLowerCase();
              if (estatusLower === 'sin iniciar' || estatusLower === 'sininiciar') {
                estatus = 1;
              } else if (estatusLower === 'en progreso' || estatusLower === 'enprogreso') {
                estatus = 2;
              } else if (estatusLower === 'completada' || estatusLower === 'completado') {
                estatus = 3;
              } else if (estatusLower === 'no completado' || estatusLower === 'nocompletado' || estatusLower === 'vencida') {
                estatus = 4;
              } else if (estatusLower === 'extra' || estatusLower === 'extras') {
                estatus = 5;
              } else {
                // Intentar parsear como número
                estatus = parseInt(estatus, 10);
              }
            }
            
            const puntos = h.puntos || 0;
            
            // 🔥 IMPORTANTE: Si la tarea está en historial (excepto extras), significa que estaba asignada
            // Por lo tanto, sus puntos cuentan como asignados
            if (estatus !== 5) { // Todas las tareas excepto extras cuentan como asignadas
              historialPuntos[fecha].asignados += puntos;
            }
            
            // Mapeo de estatus:
            // 1 = sin iniciar → perdido
            // 2 = en progreso → perdido
            // 3 = completada → completado
            // 4 = no completado → perdido
            // 5 = extra → extra (NO cuenta como asignado)
            
            if (estatus === 3) { // Completada
              historialPuntos[fecha].completados += puntos;
            } else if (estatus === 1 || estatus === 2 || estatus === 4) { // Sin iniciar, en progreso, o no completado
              historialPuntos[fecha].perdidos += puntos;
            } else if (estatus === 5) { // Extras
              historialPuntos[fecha].extras += puntos;
            }
          });
          
          // 🔥 Calcular puntos asignados por fecha desde las tareas originales
          // Las tareas tienen puntos asignados
          tareas.forEach(t => {
            // Las tareas pueden tener una fecha asociada o no
            // Si tienen fecha, usarla; si no, probablemente sean tareas semanales recurrentes
            if (t.fecha) {
              const fecha = t.fecha;
              if (!historialPuntos[fecha]) {
                historialPuntos[fecha] = {
                  asignados: 0,
                  completados: 0,
                  perdidos: 0,
                  extras: 0,
                  fecha: fecha
                };
              }
              historialPuntos[fecha].asignados += t.puntos || 0;
            }
          });
          
          // 🔥 Organizar tareas por día de la semana desde tareas asignadas
          const tareasAsignadas = {};
          const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
          
          tareas.forEach(t => {
            // Determinar el día de la semana
            let diaNombre = null;
            
            // Si la tarea tiene una fecha, extraer el día de la semana de esa fecha
            if (t.fecha) {
              try {
                const fecha = new Date(t.fecha);
                const diaNum = fecha.getDay();
                diaNombre = diasSemana[diaNum];
              } catch (err) {
                console.warn(`No se pudo procesar fecha ${t.fecha}:`, err);
              }
            }
            
            // Si tiene un campo dia, usarlo
            if (t.dia && !diaNombre) {
              diaNombre = t.dia.toLowerCase();
            }
            
            if (diaNombre) {
              if (!tareasAsignadas[diaNombre]) {
                tareasAsignadas[diaNombre] = [];
              }
              
              tareasAsignadas[diaNombre].push({
                id: t.id,
                nombre: t.nombre,
                descripcion: t.descripcion,
                hora_ini: t.hora_ini,
                hora_fin: t.hora_fin,
                fecha: t.fecha,
                puntos: t.puntos || 0,
                estatus: t.estatus || 2, // Por defecto sin iniciar
                completadaPor: t.completadaPor,
                dia: t.dia
              });
            }
          });
          
          const resultado = {
            id: usuario.id,
            nombre: usuario.nombre,
            username: usuario.username,
            puesto: usuario.puesto,
            rol: usuario.rol,
            imagen: usuario.imagen,
            tareas_asignadas: tareasAsignadas,
            historial_puntos: historialPuntos,
            puntos_totales: Object.values(historialPuntos).reduce((sum, h) => sum + (h.completados || 0) + (h.extras || 0), 0)
          };
          
          // 🔥 DEBUG: Mostrar estructura de historialPuntos
          console.log(`   📊 historial_puntos keys:`, Object.keys(historialPuntos).slice(0, 3).join(', '));
          if (Object.keys(historialPuntos).length > 0) {
            const firstKey = Object.keys(historialPuntos)[0];
            console.log(`   💾 Primer registro [${firstKey}]:`, historialPuntos[firstKey]);
          }
          
          return resultado;
        } catch (err) {
          console.error(`Error al obtener datos de usuario ${usuario.id}:`, err);
          return {
            id: usuario.id,
            nombre: usuario.nombre,
            username: usuario.username,
            puesto: usuario.puesto,
            rol: usuario.rol,
            imagen: usuario.imagen,
            tareas_asignadas: {},
            historial_puntos: {},
            puntos_totales: 0
          };
        }
      })
    );
    
    return backupData;
  } catch (err) {
    console.error("Error al obtener backup:", err);
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