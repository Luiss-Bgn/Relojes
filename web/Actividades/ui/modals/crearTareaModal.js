import { loadModalHTML } from './modalLoader.js';
import { showToast } from '../toast.js';
import { createNotificationMessage, NOTIFICATION_TYPES } from '../../services/notificationTypes.js';

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
    const diasSeleccionados = Array.from(form.querySelectorAll('input[name="dias"]:checked'))
      .map(cb => cb.value);
    
    if (diasSeleccionados.length === 0) {
      showToast('Debes seleccionar al menos un día de la semana', 'warning');
      return;
    }
    
    const hora_ini = formData.get('hora_ini');
    const hora_fin = formData.get('hora_fin') || null;
    
    // Validación 1: hora final no puede ser igual o menor a hora inicio
    if (hora_fin && hora_ini && hora_fin <= hora_ini) {
      showToast('La hora final debe ser mayor a la hora de inicio', 'warning');
      return;
    }
    
    // Determinar estatus según si la hora ya pasó
    const estatus = determinarEstatus(diasSeleccionados, hora_ini);
    
    const tareaData = {
      nombre: formData.get('nombre'),
      descripcion: formData.get('descripcion'),
      hora_ini: hora_ini,
      hora_fin: hora_fin,
      puntos: parseInt(formData.get('puntos')),
      disponible_para_rol: formData.get('disponible_para_rol'),
      fecha: diasSeleccionados,
      id_dueño: emp.id,
      estatus: estatus,
    };
    
    // Validación 2: verificar solapamiento de horarios
    const conflictInfo = await checkTimeConflict(emp.id, diasSeleccionados, hora_ini, hora_fin);
    if (conflictInfo) {
      showToast(`Ya existe "${conflictInfo.nombre}" el ${conflictInfo.dia} de ${conflictInfo.hora_ini} a ${conflictInfo.hora_fin}`, 'error', 5000);
      return;
    }
    
    console.log('Crear tarea:', tareaData);
    
    try {
      const response = await fetch(`/tareas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tareaData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        showToast('Tarea creada exitosamente', 'success');
        overlay.remove();
        // Actualizar panel sin recargar página
        const event = new CustomEvent('refreshPanel');

        createNotificationMessage(NOTIFICATION_TYPES.TAREA_CREADA );
        window.dispatchEvent(event);
      } else {
        showToast('Error al crear la tarea: ' + (result.message || 'Error desconocido'), 'error');
      }
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

// Función para determinar el estatus según si la hora ya pasó
function determinarEstatus(dias, hora_ini) {
  const ahora = new Date();
  const diaActual = ahora.toLocaleDateString("es-ES", { weekday: "long" });
  const diaActualCapitalizado = diaActual.charAt(0).toUpperCase() + diaActual.slice(1);
  
  const horaActualMinutos = ahora.getHours() * 60 + ahora.getMinutes();
  const horaIniMinutos = timeToMinutes(hora_ini);
  
  // Verificar si alguno de los días seleccionados es hoy
  const incluyeHoy = dias.includes(diaActualCapitalizado);
  
  if (incluyeHoy && horaIniMinutos < horaActualMinutos) {
    // La tarea es para hoy pero la hora ya pasó
    return 'proximo';
  }
  
  return 'sin_iniciar';
}

// Función para verificar conflicto de horarios
async function checkTimeConflict(empleadoId, dias, hora_ini, hora_fin) {
  try {
    // Obtener todas las tareas del panel
    const response = await fetch('http://localhost:8001/tareas/panel/obtener');
    const result = await response.json();
    
    if (result.status !== 'success' || !result.panel) {
      return null; // Si no se pueden obtener las tareas, permitir continuar
    }
    
    // Buscar el empleado en el panel
    const empleado = result.panel.find(u => u.id === empleadoId);
    if (!empleado || !empleado.tareas_asignadas) {
      return null; // No hay tareas asignadas, no hay conflicto
    }
    
    const nuevaInicio = timeToMinutes(hora_ini);
    const nuevaFin = hora_fin ? timeToMinutes(hora_fin) : nuevaInicio + 60; // Si no hay hora_fin, asumir 1 hora
    
    // Revisar cada día seleccionado
    for (const dia of dias) {
      const tareasDelDia = empleado.tareas_asignadas[dia] || [];
      
      // Verificar solapamiento con cada tarea existente
      for (const tarea of tareasDelDia) {
        const tareaInicio = timeToMinutes(tarea.hora_ini);
        const tareaFin = tarea.hora_fin ? timeToMinutes(tarea.hora_fin) : tareaInicio + 60;
        
        // Verificar si hay solapamiento
        // Dos rangos se solapan si: inicio1 < fin2 AND inicio2 < fin1
        if (nuevaInicio < tareaFin && tareaInicio < nuevaFin) {
          // Retornar información del conflicto
          return {
            nombre: tarea.nombre,
            dia: dia,
            hora_ini: tarea.hora_ini,
            hora_fin: tarea.hora_fin || tarea.hora_ini
          };
        }
      }
    }
    
    return null; // No hay conflicto
  } catch (error) {
    console.error('Error verificando conflictos:', error);
    return null; // En caso de error, permitir continuar
  }
}
