/*
  main.js - aqui arranca todo el modulo de Informes.
  Carga empleados, backup y decide que mostrar segun el rol del usuario
*/
import { obtenerEmpleados, obtenerBackup } from './services/empleadosService.js';
import { createEmpleadoCard, clearSelection } from './components/EmpleadoCard.js';
import { mostrarTareasEmpleado } from './components/TareasPanel.js';
import { mostrarResumenAgregado } from './components/ResumenAgregado.js';
import { inicializarTareasVencidas } from './components/TareasVencidas.js';
import { setEmpleados, getUsuario, getRol, isAdmin } from './state/appState.js';
import { getFechaCompleta } from './utils/dateUtils.js';

/* checamos que el usuario este logueado, si no lo mandamos a actividades*/

const usuario = getUsuario();

if (!usuario || !['admin', 'administrador', 'supervisor', 'empleado'].includes(usuario.role)) {
  window.location.href = '/actividades';
}

/* datos que usamos en este archivo  */

let empleadosData = [];

/* esta madre genera las tarjetas de empleados para admin/supervisor */

async function generarItinerarios() {
  const container = document.getElementById('tarjetas-container');
  if (!container) return;

  container.style.display = 'block';
  container.innerHTML = '';

  // Botón "Promedio de todos los empleados"
  container.appendChild(crearBotonPromedio());

  // Filtrar empleados según el rol del usuario
  const userRole = getRol();
  const filtrados = empleadosData.filter(emp => {
    const empRole = emp.rol?.toLowerCase() || 'empleado';
    if (['admin', 'administrador'].includes(empRole)) return false;
    if (['visitante', 'empleado'].includes(userRole)) return empRole === 'empleado';
    return ['empleado', 'supervisor'].includes(empRole);
  });

  filtrados.forEach((emp, i) => container.appendChild(createEmpleadoCard(emp, i)));

  // Mostrar resumen agregado al inicio y luego revelar con animación
  await mostrarResumenAgregado();
  document.getElementById('informes-content')?.classList.add('show');
}

function crearBotonPromedio() {
  const card = document.createElement('div');
  card.classList.add('empleado-card', 'promedio-btn-card');

  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;color:white;">
      <span style="font-size:28px;">📊</span>
      <span style="font-size:16px;font-weight:600;">Promedio de todos los empleados</span>
    </div>
  `;

  card.addEventListener('click', () => {
    clearSelection();
    card.classList.add('selected');
    mostrarResumenAgregado();
  });

  return card;
}

/* vista para cuando un empleado normal entra a informes */

async function mostrarPanelDerecho(empleadoId) {
  const leftPanel = document.querySelector('.left-panel');
  if (leftPanel) leftPanel.style.display = 'none';

  const empleado = empleadosData.find(e => e.id === empleadoId);
  if (!empleado) return;

  await mostrarTareasEmpleado(empleado);
  document.getElementById('informes-content')?.classList.add('show');
}

/* aqui se inicializa todo cuando carga la pagina */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Mostrar fecha completa en el header
    const fechaDiv = document.getElementById('fecha-actual-informes');
    if (fechaDiv) fechaDiv.textContent = getFechaCompleta();

    // Cargar datos en paralelo
    const [emps, backup] = await Promise.all([
      obtenerEmpleados(),
      obtenerBackup(),
    ]);

    // Combinar empleados con historial del backup
    empleadosData = emps.map(emp => {
      const fromBackup = backup.find(b => b.id === emp.id);
      if (fromBackup?.historial_puntos) {
        emp.historial_puntos = fromBackup.historial_puntos;
      }
      return emp;
    });

    // Establecer estado centralizado
    setEmpleados(empleadosData);

    // Inicializar panel de tareas vencidas + gráfica
    inicializarTareasVencidas();

    // Restaurar título
    const titulo = document.getElementById('titulo-informes');
    if (titulo) {
      titulo.textContent = 'Informes';
      document.getElementById('titulo-informes-right')?.remove();
    }

    // Rutas por rol
    const { role, empleado_id } = usuario;
    if (isAdmin()) {
      await generarItinerarios();
    } else if (role === 'empleado') {
      await mostrarPanelDerecho(parseInt(empleado_id, 10));
    }
  } catch (e) {
    console.error('Error inicializando aplicación:', e);
  }
});
