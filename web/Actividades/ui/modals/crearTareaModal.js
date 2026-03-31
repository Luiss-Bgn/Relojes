import { loadModalHTML } from './modalLoader.js';
import { showToast } from '../toast.js';
import { createNotificationMessage, NOTIFICATION_TYPES } from '../../services/notificationTypes.js';
import { checkTimeConflict } from './revisarConflictoHorario.js';

export const showCrearTareaModal = async (emp) => {
  // Crear overlay
  const overlay = document.createElement('div');
  overlay.id = 'crear-tarea-overlay';
  overlay.className = 'crear-tarea-overlay';

  // Crear modal
  const modal = document.createElement('div');
  modal.className = 'crear-tarea-modal';

  // Cargar HTML del modal
  const modalHTML = await loadModalHTML('/web/Actividades/ui/modals/crearTareaModal.html');

  if (!modalHTML) {
    showToast('Error al cargar el modal', 'error');
    return;
  }

  modal.innerHTML = modalHTML;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Rellenar nombre del empleado
  const employeeNameSpan = modal.querySelector('#modal-employee-name');
  if (employeeNameSpan) {
    employeeNameSpan.textContent = emp.nombre;
  }

  // Event listeners para botones de cerrar
  const closeBtn = modal.querySelector('#close-crear-tarea');
  const cancelBtn = modal.querySelector('#cancel-crear-tarea');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => overlay.remove());
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => overlay.remove());
  }

  // Handler para el formulario
  const form = modal.querySelector('#crear-tarea-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const diasSeleccionados = Array.from(
      form.querySelectorAll('input[name="dias"]:checked')
    ).map(cb => cb.value);

    if (diasSeleccionados.length === 0) {
      showToast('Debes seleccionar al menos un día de la semana', 'warning');
      return;
    }

    const hora_ini = formData.get('hora_ini');
    const hora_fin = formData.get('hora_fin');

    // Validación 1: hora final no puede ser igual o menor a hora inicio
    if (hora_fin && hora_ini && hora_fin <= hora_ini) {
      showToast('La hora final debe ser mayor a la hora de inicio', 'warning');
      return;
    }

    // Validación 2: verificar solapamiento de horarios
    const conflictInfo = await checkTimeConflict(emp.id, diasSeleccionados, hora_ini, hora_fin);
    if (conflictInfo) {
      showToast(
        `Ya existe "${conflictInfo.nombre}" el ${conflictInfo.dia} de ${conflictInfo.hora_ini} a ${conflictInfo.hora_fin}`,
        'error',
        5000
      );
      return;
    }

    // Crear una tarea independiente por cada día seleccionado
    // IMPORTANTE: fecha se manda como arreglo con un solo elemento
    // para que siga siendo compatible con el backend actual.
    const tareasPorCrear = diasSeleccionados.map(dia => ({
      nombre: formData.get('nombre'),
      descripcion: formData.get('descripcion'),
      hora_ini: hora_ini,
      hora_fin: hora_fin,
      puntos: parseInt(formData.get('puntos'), 10),
      disponible_para_rol: formData.get('disponible_para_rol'),
      fecha: [dia],
      id_dueño: emp.id,
      estatus: determinarEstatusPorDia(dia, hora_ini),
    }));

    console.log('Tareas a crear:', tareasPorCrear);

    try {
      for (const tareaData of tareasPorCrear) {
        const response = await fetch('/tareas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tareaData),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Respuesta con error:', result);
          showToast(
            `Error al crear la tarea para ${tareaData.fecha[0]}: ${result.detail || result.message || 'Error desconocido'}`,
            'error'
          );
          return;
        }
      }

      const algunaFutura = tareasPorCrear.some(t => t.estatus === 'futura');

      if (algunaFutura) {
        showToast(
          'Tareas creadas exitosamente. La del día de hoy se marcó como futura porque la hora de inicio ya pasó.',
          'info',
          7000
        );
      } else {
        showToast('Tareas creadas exitosamente', 'success');
      }

      overlay.remove();

      // Actualizar panel sin recargar página
      const event = new CustomEvent('refreshPanel');
      createNotificationMessage(NOTIFICATION_TYPES.TAREA_CREADA, { id_dueño: emp.id });
      window.dispatchEvent(event);

    } catch (error) {
      console.error('Error:', error);
      showToast('Error al crear la tarea. Verifica tu conexión.', 'error');
    }
  });

  // Cerrar al hacer clic fuera
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
};

// Función auxiliar para convertir hora "HH:MM" a minutos
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Determina el estatus de una tarea para un día específico
function determinarEstatusPorDia(dia, hora_ini) {
  const ahora = new Date();
  const diaActual = ahora.toLocaleDateString('es-ES', { weekday: 'long' });
  const diaActualCapitalizado = diaActual.charAt(0).toUpperCase() + diaActual.slice(1);

  const horaActualMinutos = ahora.getHours() * 60 + ahora.getMinutes();
  const horaIniMinutos = timeToMinutes(hora_ini);

  // Solo se marca como futura si el día evaluado es hoy y la hora ya pasó
  if (dia === diaActualCapitalizado && horaIniMinutos < horaActualMinutos) {
    return 'futura';
  }

  return 'sin_iniciar';
}