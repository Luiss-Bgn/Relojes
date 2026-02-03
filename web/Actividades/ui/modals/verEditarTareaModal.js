import { loadModalHTML } from './modalLoader.js';
import { showToast, showConfirm } from '../toast.js';

const STATUS_LABELS = {
  'sin_iniciar': 'Sin Iniciar',
  'en_progreso': 'En Progreso',
  'completada': 'Completada',
  'vencida': 'Vencida'
};

export const showVerEditarTareaModal = async (tarea, userRole, targetEmployeeId = null) => {
  console.log('Mostrando modal para tarea:', tarea);
  // Crear overlay
  const overlay = document.createElement('div');
  overlay.id = 'ver-editar-tarea-overlay';
  overlay.className = 'ver-editar-tarea-overlay';

  // Crear modal
  const modal = document.createElement('div');
  modal.className = 'ver-editar-tarea-modal';

  // Cargar HTML del modal
  const modalHTML = await loadModalHTML('/web/Actividades/ui/modals/verEditarTareaModal.html');
  
  if (!modalHTML) {
    showToast('Error al cargar el modal', 'error');
    return;
  }

  modal.innerHTML = modalHTML;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Determinar si es tarea extra disponible
  const isExtraAvailable = tarea.estatus === 'extra' && !tarea.completadaPor;
  
  // Obtener userId actual
  const currentUserId = parseInt(localStorage.getItem('userId')) || null;
  
  // Si es el dueño original de una tarea extra vencida, no puede completarla
  const isOriginalOwner = tarea.empleadoId === currentUserId && isExtraAvailable;

  // Determinar permisos
  const canEdit = (userRole === 'admin' || userRole === 'supervisor');
  const canComplete = tarea.estatus === 'en_progreso' && 
                      (userRole === 'admin' || userRole === 'supervisor' || userRole === 'empleado');
  const canCompleteExtra = isExtraAvailable && targetEmployeeId && !isOriginalOwner;
  const showEditButton = (userRole === 'admin' || userRole === 'supervisor');

  // Rellenar datos de la tarea
  fillTaskData(modal, tarea);

  // Configurar modo edición o solo lectura
  setupPermissions(modal, canEdit, canComplete, canCompleteExtra, tarea, showEditButton, isOriginalOwner);

  // Mostrar advertencias si aplica
  showWarnings(modal, tarea, targetEmployeeId, isOriginalOwner);

  // Event listeners
  setupEventListeners(modal, overlay, tarea, canEdit, canComplete, canCompleteExtra, targetEmployeeId, showEditButton);

  // Cerrar al hacer clic fuera
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
};

function fillTaskData(modal, tarea) {
  modal.querySelector('#tarea-nombre').value = tarea.nombre || '';
  modal.querySelector('#tarea-descripcion').value = tarea.descripcion || '';
  modal.querySelector('#tarea-hora-ini').value = tarea.hora_ini || '';
  modal.querySelector('#tarea-hora-fin').value = tarea.hora_fin || '';
  modal.querySelector('#tarea-puntos').value = tarea.puntos || 1;
  
  // Configurar el campo disponible_para con resaltado
  const disponibleParaSelect = modal.querySelector('#tarea-disponible-para');
  
  // Determinar el rol actual - priorizar el valor de la tarea
  let currentRole = 'todos'; // valor por defecto
  if (tarea.disponible_para_rol && tarea.disponible_para_rol !== '') {
    currentRole = tarea.disponible_para_rol;
  } else if (tarea.disponible_para && tarea.disponible_para !== '') {
    currentRole = tarea.disponible_para;
  }
  
  console.log('disponible_para_rol:', tarea.disponible_para_rol);
  console.log('disponible_para:', tarea.disponible_para);
  console.log('Rol seleccionado final:', currentRole);
  
  // Validar que el valor existe en las opciones del select
  const validRoles = ['todos', 'admin', 'empleado', 'supervisor'];
  if (!validRoles.includes(currentRole)) {
    currentRole = 'todos';
  }
  
  disponibleParaSelect.value = currentRole;
  
  // Aplicar estilo de resaltado según el rol actual
  const roleColors = {
    'todos': '#e8f5e8',      // Verde claro
    'admin': '#fff2e8',      // Naranja claro  
    'empleado': '#e8f0ff',   // Azul claro
    'supervisor': '#f0e8ff'  // Morado claro
  };
  
  const roleLabels = {
    'todos': '🌟',
    'admin': '👑', 
    'empleado': '👤',
    'supervisor': '👔'
  };
  
  disponibleParaSelect.style.backgroundColor = roleColors[currentRole] || roleColors['todos'];
  disponibleParaSelect.style.fontWeight = '600';
  
  modal.querySelector('#tarea-estado').value = STATUS_LABELS[tarea.estatus] || tarea.estatus;

  // Colorear el campo de estado según el estado
  const estadoInput = modal.querySelector('#tarea-estado');
  const colors = {
    'sin_iniciar': '#c4c7d1',
    'en_progreso': '#ffd54f',
    'completada': '#76d191',
    'vencida': '#ff6b6b'
  };
  estadoInput.style.background = colors[tarea.estatus] || '#f7f7fb';
}

function setupPermissions(modal, canEdit, canComplete, canCompleteExtra, tarea, showEditButton, isOriginalOwner) {
  const inputs = modal.querySelectorAll('.form-input:not(#tarea-estado), .form-textarea');
  const disponibleParaSelect = modal.querySelector('#tarea-disponible-para');
  const btnGuardar = modal.querySelector('#btn-guardar-cambios-tarea');
  const btnEliminar = modal.querySelector('#btn-eliminar-tarea');
  const btnCompletar = modal.querySelector('#btn-completar-tarea');
  const btnEditar = modal.querySelector('#btn-editar-tarea');

  if (canEdit) {
    // Quitar readonly para permitir edición
    inputs.forEach(input => {
      if (input.id !== 'tarea-disponible-para') {
        input.removeAttribute('readonly');
      }
    });
    // Habilitar el select de disponible_para
    disponibleParaSelect.removeAttribute('disabled');
    
    btnGuardar.style.display = 'flex';
    btnEliminar.style.display = 'flex';
    
    // Cambiar título
    modal.querySelector('.modal-header h2').textContent = 'Editar Tarea';
  } else {
    // Solo lectura
    modal.querySelector('.modal-header h2').textContent = 'Ver Tarea';
    
    // Mostrar botón de editar si es admin/supervisor y no está en modo edición
    if (showEditButton && !canEdit) {
      btnEditar.style.display = 'flex';
    }
  }

  if (canComplete) {
    btnCompletar.style.display = 'flex';
  }

  if (canCompleteExtra) {
    // Cambiar texto del botón para tarea extra
    btnCompletar.textContent = '⭐ Completar Tarea Extra';
    btnCompletar.style.display = 'flex';
    btnCompletar.style.background = '#3b82f6';
  }
  
  // Si es el dueño original de una tarea vencida convertida en extra, ocultar botón de completar
  if (isOriginalOwner) {
    btnCompletar.style.display = 'none';
  }
}

function showWarnings(modal, tarea, targetEmployeeId = null, isOriginalOwner = false) {
  const warningBox = modal.querySelector('#warning-box');
  const warningText = modal.querySelector('#warning-text');

  if (tarea.estatus === 'extra' && !tarea.completadaPor) {
    // Tarea extra disponible
    warningBox.style.display = 'flex';
    
    if (isOriginalOwner) {
      // Es el dueño original - mostrar advertencia en rojo
      warningBox.style.background = '#fee2e2';
      warningBox.style.borderLeftColor = '#ef6c73';
      warningText.textContent = `⚠️ Esta es tu tarea vencida. No puedes completarla como tarea extra.`;
      warningText.style.color = '#991b1b';
    } else {
      warningBox.style.background = '#e0f2fe';
      warningBox.style.borderLeftColor = '#60a5fa';
      
      if (targetEmployeeId) {
        warningText.textContent = `⭐ Presiona el botón para completar esta tarea extra.`;
      } else {
        warningText.textContent = `⭐ Tarea extra disponible. Haz click en la columna de un empleado para completarla.`;
      }
      warningText.style.color = '#1e40af';
    }
  } else if (tarea.estatus === 'extra' && tarea.completadaPor) {
    // Tarea extra completada
    warningBox.style.display = 'flex';
    warningBox.style.background = '#dbeafe';
    warningBox.style.borderLeftColor = '#3b82f6';
    warningText.textContent = `✓ Tarea extra completada por empleado ID: ${tarea.completadaPor}`;
    warningText.style.color = '#1e40af';
  } else if (tarea.estatus === 'sin_iniciar') {
    // Calcular tiempo faltante
    const now = new Date();
    const [horaIni, minIni] = tarea.hora_ini.split(':').map(Number);
    const inicio = new Date();
    inicio.setHours(horaIni, minIni, 0);
    
    const diffMs = inicio - now;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (diffMins > 0) {
      warningBox.style.display = 'flex';
      warningBox.style.background = '#fff8e1';
      warningBox.style.borderLeftColor = '#ffd54f';
      warningText.textContent = `Tarea sin iniciar. Esta tarea inicia a las ${tarea.hora_ini}. Faltan ${hours}h ${mins}min.`;
      warningText.style.color = '#6b5b00';
    }
  }
}

function setupEventListeners(modal, overlay, tarea, canEdit, canComplete, canCompleteExtra, targetEmployeeId = null, showEditButton = false) {
  // Cerrar modal
  const closeBtn = modal.querySelector('#close-ver-editar-tarea');
  const cerrarBtn = modal.querySelector('#btn-cerrar-tarea');
  
  closeBtn.addEventListener('click', () => overlay.remove());
  cerrarBtn.addEventListener('click', () => overlay.remove());

  // Event listener para cambiar el color del select dinámicamente
  const disponibleParaSelect = modal.querySelector('#tarea-disponible-para');
  const roleColors = {
    'todos': '#e8f5e8',      // Verde claro
    'admin': '#fff2e8',      // Naranja claro  
    'empleado': '#e8f0ff',   // Azul claro
    'supervisor': '#f0e8ff'  // Morado claro
  };
  
  disponibleParaSelect.addEventListener('change', (e) => {
    const selectedRole = e.target.value;
    disponibleParaSelect.style.backgroundColor = roleColors[selectedRole] || roleColors['todos'];
  });

  // Guardar cambios
  if (canEdit) {
    const btnGuardar = modal.querySelector('#btn-guardar-cambios-tarea');
    btnGuardar.addEventListener('click', async () => {
      await saveTaskChanges(modal, tarea.id, overlay);
    });

    // Eliminar tarea
    const btnEliminar = modal.querySelector('#btn-eliminar-tarea');
    btnEliminar.addEventListener('click', async () => {
      await deleteTask(tarea.id, overlay);
    });
  }
  
  // Botón de editar (para admin/supervisor en modo solo lectura)
  if (showEditButton && !canEdit) {
    const btnEditar = modal.querySelector('#btn-editar-tarea');
    btnEditar.addEventListener('click', () => {
      // Cerrar modal actual y abrir en modo edición
      overlay.remove();
      // Re-abrir el modal pero forzando modo edición
      const userRole = localStorage.getItem('userRole');
      showVerEditarTareaModal(tarea, userRole, null);
    });
  }

  // Completar tarea (normal o extra)
  if (canComplete || canCompleteExtra) {
    const btnCompletar = modal.querySelector('#btn-completar-tarea');
    btnCompletar.addEventListener('click', async () => {
      if (canCompleteExtra) {
        // Completar tarea extra
        await completeExtraTask(tarea.id, targetEmployeeId, overlay);
      } else {
        // Completar tarea normal
        await completeTask(tarea.id, overlay);
      }
    });
  }
}

async function saveTaskChanges(modal, tareaId, overlay) {
  const nombre = modal.querySelector('#tarea-nombre').value;
  const descripcion = modal.querySelector('#tarea-descripcion').value;
  const hora_ini = modal.querySelector('#tarea-hora-ini').value;
  const hora_fin = modal.querySelector('#tarea-hora-fin').value;
  const puntos = parseInt(modal.querySelector('#tarea-puntos').value);
  const disponible_para_rol = modal.querySelector('#tarea-disponible-para').value;

  if (!nombre || !descripcion || !hora_ini || !puntos) {
    showToast('Por favor completa todos los campos obligatorios', 'warning');
    return;
  }

  console.log("disponible para rol:", disponible_para_rol);
  const tareaData = {
    nombre,
    descripcion,
    hora_ini,
    hora_fin: hora_fin || null,
    puntos,
    disponible_para_rol
  };

  try {
    const response = await fetch(`http://localhost:8001/tareas/${tareaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tareaData)
    });

    const result = await response.json();

    if (response.ok) {
      showToast('Tarea actualizada exitosamente', 'success');
      overlay.remove();
      
      // Actualizar panel
      const event = new CustomEvent('refreshPanel');
      window.dispatchEvent(event);
    } else {
      showToast('Error al actualizar la tarea: ' + (result.message || 'Error desconocido'), 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Error al actualizar la tarea. Verifica tu conexión.', 'error');
  }
}

async function deleteTask(tareaId, overlay) {
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
      overlay.remove();
      
      // Actualizar panel
      const event = new CustomEvent('refreshPanel');
      window.dispatchEvent(event);
    } else {
      showToast('Error al eliminar la tarea: ' + (result.message || 'Error desconocido'), 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Error al eliminar la tarea. Verifica tu conexión.', 'error');
  }
}

async function completeTask(tareaId, overlay) {
  const confirmed = await showConfirm('Marcarás esta tarea como completada.', '¿Completar tarea?');
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:8001/tareas/${tareaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ estatus: 'completada' })
    });

    const result = await response.json();

    if (response.ok) {
      showToast('✓ Tarea completada exitosamente', 'success');
      overlay.remove();
      
      // Actualizar panel
      const event = new CustomEvent('refreshPanel');
      window.dispatchEvent(event);
    } else {
      showToast('Error al completar la tarea: ' + (result.message || 'Error desconocido'), 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Error al completar la tarea. Verifica tu conexión.', 'error');
  }
}

async function completeExtraTask(tareaId, employeeId, overlay) {
  const confirmed = await showConfirm('Completarás esta tarea extra.', '¿Completar tarea extra?');
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:8001/tareas/${tareaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        estatus: 'extra',
        completadaPor: employeeId 
      })
    });

    const result = await response.json();

    if (response.ok) {
      showToast('⭐ Tarea extra completada exitosamente', 'success');
      overlay.remove();
      
      // Actualizar panel
      const event = new CustomEvent('refreshPanel');
      window.dispatchEvent(event);
    } else {
      showToast('Error al completar la tarea extra: ' + (result.message || 'Error desconocido'), 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Error al completar la tarea extra. Verifica tu conexión.', 'error');
  }
}
