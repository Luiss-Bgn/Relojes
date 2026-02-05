import { loadModalHTML } from './modalLoader.js';
import { showToast, showConfirm } from '../toast.js';
import { createNotificationMessage, NOTIFICATION_TYPES } from '../../services/notificationTypes.js';
import { checkTimeConflict, getSelectedDayKey } from './revisarConflictoHorario.js';

export const showEditarTareasModal = async (emp) => {
  // Crear overlay
  const overlay = document.createElement('div');
  overlay.id = 'editar-tareas-overlay';
  overlay.className = 'editar-tareas-overlay';

  // Crear modal
  const modal = document.createElement('div');
  modal.className = 'editar-tareas-modal';

  // Cargar HTML del modal
  const modalHTML = await loadModalHTML('/web/Actividades/ui/modals/editarTareasModal.html');

  if (!modalHTML) {
    showToast('Error al cargar el modal', 'error');
    return;
  }

  modal.innerHTML = modalHTML;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Rellenar nombre del empleado
  const employeeNameSpan = modal.querySelector('#modal-employee-name-editar');
  if (employeeNameSpan) {
    employeeNameSpan.textContent = emp.nombre;
  }

  // Cargar tareas del empleado
  await loadEmployeeTasks(emp, modal);

  // Event listeners para botones de cerrar
  const closeBtn = modal.querySelector('#close-editar-tareas');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => overlay.remove());
  }

  // Event listeners para tabs
  const tabs = modal.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remover active de todos
      tabs.forEach(t => t.classList.remove('active'));
      // Activar el clickeado
      tab.classList.add('active');
      // Cargar tareas del día seleccionado
      const selectedDay = tab.dataset.day;
      renderTasksForDay(emp, selectedDay, modal);
    });
  });

  // Cerrar al hacer clic fuera
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
};

async function loadEmployeeTasks(emp, modal) {
  try {

    const response = await fetch(`http://localhost:8001/tareas/panel/obtener`);
    const result = await response.json();

    if (result.status === 'success' && result.panel) {
      // Encontrar el usuario en el panel
      const usuario = result.panel.find(u => u.id === emp.id);

      if (usuario && usuario.tareas_asignadas) {
        // Guardar las tareas en el modal para acceso posterior
        modal.dataset.tareas = JSON.stringify(usuario.tareas_asignadas);

        // Renderizar tareas del primer día (Lunes)
        renderTasksForDay(emp, 'Lunes', modal);
      } else {
        showNoTasksMessage(modal);
      }
    }
  } catch (error) {
    console.error('Error cargando tareas:', error);
    showNoTasksMessage(modal);
  }
}

function renderTasksForDay(emp, day, modal) {
  const tasksContent = modal.querySelector('#tasks-content-editar');
  const tareasData = modal.dataset.tareas ? JSON.parse(modal.dataset.tareas) : {};
  const tareasDelDia = tareasData[day] || [];

  if (tareasDelDia.length === 0) {
    tasksContent.innerHTML = `
      <div class="no-tasks-message">
        <p>📋 No hay tareas asignadas para ${day}</p>
      </div>
    `;
    return;
  }

  // Crear grid de tareas
  const tasksGrid = document.createElement('div');
  tasksGrid.className = 'tasks-grid';

  tareasDelDia.forEach(tarea => {
    const taskCard = createTaskCard(tarea, day, emp);
    tasksGrid.appendChild(taskCard);
  });

  tasksContent.innerHTML = '';
  tasksContent.appendChild(tasksGrid);
}

function createTaskCard(tarea, day, emp) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.tareaId = tarea.id;

  card.innerHTML = `
    <div class="task-field">
      <label class="task-field-label">Nombre</label>
      <input type="text" class="task-field-input" name="nombre" value="${tarea.nombre || ''}" />
    </div>
    
    <div class="task-field">
      <label class="task-field-label">Descripción</label>
      <input type="text" class="task-field-input" name="descripcion" value="${tarea.descripcion || ''}" />
    </div>
    
    <div class="time-fields">
      <div class="time-field-group">
        <label class="task-field-label">Hora Inicio</label>
        <input type="time" class="task-field-input" name="hora_ini" value="${tarea.hora_ini || ''}" />
      </div>
      
      <div class="time-field-group">
        <label class="task-field-label">Hora Fin</label>
        <input type="time" class="task-field-input" name="hora_fin" value="${tarea.hora_fin || ''}" />
      </div>
    </div>
    
    <div class="task-field">
      <label class="task-field-label">Puntos</label>
      <input type="number" class="task-field-input" name="puntos" value="${tarea.puntos || 1}" min="1" max="10" />
    </div>
    
    <div class="task-actions">
      <button class="btn-save-task" data-tarea-id="${tarea.id}">
        <span>💾</span>
        Guardar Cambios
      </button>
      <button class="btn-delete-task" data-tarea-id="${tarea.id}">
        <span>🗑️</span>
        Eliminar Tarea
      </button>
    </div>
  `;

  // Event listener para guardar
  const saveBtn = card.querySelector('.btn-save-task');
  saveBtn.addEventListener('click', async () => {
    await saveTaskChanges(card, tarea, day);
  });

  // Event listener para eliminar
  const deleteBtn = card.querySelector('.btn-delete-task');
  deleteBtn.addEventListener('click', async () => {
    await deleteTask(card, tarea.id, emp);
  });

  return card;
}

async function saveTaskChanges(card, tarea, day) {
  const nombre = card.querySelector('input[name="nombre"]').value;
  const descripcion = card.querySelector('input[name="descripcion"]').value;
  const hora_ini = card.querySelector('input[name="hora_ini"]').value;
  const hora_fin = card.querySelector('input[name="hora_fin"]').value;
  const puntos = parseInt(card.querySelector('input[name="puntos"]').value);

  if (!nombre || !descripcion || !hora_ini || !puntos) {
    showToast('Por favor completa todos los campos obligatorios', 'warning');
    return;
  }

  // console.log("dia seleccionado:", day);
  // console.log("tarea a editar:", tarea);

  const dia = getSelectedDayKey();

  const conflictInfo = await checkTimeConflict({
    empleadoId: tarea.id_dueño,
    dia: day,
    hora_ini,
    hora_fin,
    excludeTaskId: tarea.id,
  });
  if (conflictInfo) {
    showToast(`Ya existe "${conflictInfo.nombre}" el ${conflictInfo.dia} de ${conflictInfo.hora_ini} a ${conflictInfo.hora_fin}`, 'error', 5000);
    return;
  }

  const tareaData = {
    nombre,
    descripcion,
    hora_ini,
    hora_fin: hora_fin || null,
    puntos
  };

  try {
    const response = await fetch(`http://localhost:8001/tareas/${tarea.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tareaData)
    });

    const result = await response.json();

    if (response.ok) {
      showToast('Tarea actualizada exitosamente', 'success');
      // Agregar efecto visual de éxito
      card.style.borderColor = '#76d191';
      setTimeout(() => {
        card.style.borderColor = '#e3e5ed';
      }, 2000);

      createNotificationMessage(NOTIFICATION_TYPES.TAREA_ACTUALIZADA, {
        taskId: tarea.id,
        updatedFields: tareaData
      });
      // Actualizar la tabla principal sin recargar
      await refreshMainPanel();
    } else {
      showToast('Error al actualizar la tarea: ' + (result.message || 'Error desconocido'), 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Error al actualizar la tarea. Verifica tu conexión.', 'error');
  }
}

async function deleteTask(card, tareaId, emp) {
  const confirmed = await showConfirm('Esta acción no se puede deshacer.', '¿Eliminar esta tarea?');
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:8001/tareas/${tareaId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok) {
      showToast('Tarea eliminada exitosamente', 'success');
      // Animar y remover la tarjeta
      card.style.opacity = '0';
      card.style.transform = 'scale(0.9)';
      setTimeout(() => {
        card.remove();

        // Si no quedan más tareas, mostrar mensaje
        const modal = document.querySelector('.editar-tareas-modal');
        const tasksGrid = modal.querySelector('.tasks-grid');
        if (tasksGrid && tasksGrid.children.length === 0) {
          showNoTasksMessage(modal);
        }
      }, 300);

      createNotificationMessage(NOTIFICATION_TYPES.TAREA_ELIMINADA, {
        taskId: tareaId,
        assignedTo: emp.nombre
      });
      // Actualizar la tabla principal sin recargar
      await refreshMainPanel();
    } else {
      showToast('Error al eliminar la tarea: ' + (result.message || 'Error desconocido'), 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Error al eliminar la tarea. Verifica tu conexión.', 'error');
  }
}

function showNoTasksMessage(modal) {
  const tasksContent = modal.querySelector('#tasks-content-editar');
  if (tasksContent) {
    tasksContent.innerHTML = `
      <div class="no-tasks-message">
        <p>📋 No hay tareas asignadas para este día</p>
      </div>
    `;
  }
}

// Función para actualizar el panel principal sin recargar la página
async function refreshMainPanel() {
  try {
    // Disparar evento personalizado para que actividades.js actualice el panel
    const event = new CustomEvent('refreshPanel');
    window.dispatchEvent(event);
  } catch (error) {
    console.error('Error al actualizar panel:', error);
  }
}
