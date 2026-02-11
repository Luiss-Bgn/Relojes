/*
  Esta madre jala los empleados y su historial del backup.
  No toca tareas_semana para nada, puro historial.
*/
import { fetchUsuarios, fetchHistorialUsuario } from './apiService.js';

// jala los empleados y filtra los admins para que no aparezcan
export async function obtenerEmpleados() {
  try {
    const usuarios = await fetchUsuarios();
    return usuarios.filter(u =>
      u.rol && !['admin', 'Admin', 'administrador', 'Administrador'].includes(u.rol)
    );
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    return [];
  }
}

// esta madre jala el historial de puntos de cada usuario del backup, no toca tareas_semana
export async function obtenerBackup() {
  try {
    const usuarios = await fetchUsuarios();

    return Promise.all(usuarios.map(async (usuario) => {
      try {
        const historial = await fetchHistorialUsuario(usuario.id);

        return {
          id: usuario.id,
          nombre: usuario.nombre,
          username: usuario.username,
          puesto: usuario.puesto,
          rol: usuario.rol,
          imagen: usuario.imagen,
          historial_puntos: procesarHistorial(historial),
          puntos_totales: calcularPuntosTotales(historial),
        };
      } catch (err) {
        console.error(`Error al obtener datos de usuario ${usuario.id}:`, err);
        return crearEmpleadoVacio(usuario);
      }
    }));
  } catch (err) {
    console.error('Error al obtener backup:', err);
    return [];
  }
}

/* funciones internas pa procesar los datos */

function procesarHistorial(historial) {
  const puntos = {};

  historial.forEach(h => {
    const fecha = h.fecha;
    if (!puntos[fecha]) {
      puntos[fecha] = { asignados: 0, completados: 0, perdidos: 0, extras: 0, fecha };
    }

    const est = normalizarEstatus(h.estatus);
    const pts = h.puntos || 0;

    if (est === 3) { // completada
      puntos[fecha].asignados += pts;
      puntos[fecha].completados += pts;
    } else if (est === 4) { // vencida
      puntos[fecha].asignados += pts;
      puntos[fecha].perdidos += pts;
    } else if (est === 5) { // extra
      puntos[fecha].extras += pts;
    }
  });

  return puntos;
}

function normalizarEstatus(estatus) {
  if (typeof estatus === 'number') return estatus;

  const map = {
    sin_iniciar: 1, sininiciar: 1,
    en_progreso: 2, enprogreso: 2,
    completada: 3, completado: 3,
    vencida: 4, no_completado: 4, nocompletado: 4,
    extra: 5, extras: 5,
  };

  const key = String(estatus).toLowerCase().replace(/\s+/g, '_');
  return map[key] ?? parseInt(estatus, 10);
}

function calcularPuntosTotales(historial) {
  const puntos = procesarHistorial(historial);
  return Object.values(puntos).reduce(
    (sum, h) => sum + (h.completados || 0) + (h.extras || 0), 0
  );
}

function crearEmpleadoVacio(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    username: usuario.username,
    puesto: usuario.puesto,
    rol: usuario.rol,
    imagen: usuario.imagen,
    historial_puntos: {},
    puntos_totales: 0,
  };
}
