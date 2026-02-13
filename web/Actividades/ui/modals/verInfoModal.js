import { loadModalHTML } from './modalLoader.js';
import { showToast } from '../toast.js';
import { createNotificationMessage, NOTIFICATION_TYPES } from '../../services/notificationTypes.js';

const state = {
  pinTimer: null,
  pinValid: true,
  originalPin: null,
  usernameTimer: null,
  usernameValid: true,
  originalUsername: null
};

const ROLE_LABELS = {
  empleado: '👤 Empleado',
  supervisor: '👔 Supervisor',
  admin: '👑 Administrador'
};

export const showVerInfoModal = async (emp) => {
  // console.log('Mostrando modal de información para el empleado:', emp);
  // Crear overlay
  const overlay = document.createElement('div');
  overlay.id = 'ver-info-overlay';
  overlay.className = 'ver-info-overlay';

  // Crear modal
  const modal = document.createElement('div');
  modal.className = 'ver-info-modal';

  // Cargar HTML del modal
  const modalHTML = await loadModalHTML('/web/Actividades/ui/modals/verInfoModal.html');
  
  if (!modalHTML) {
    showToast('Error al cargar el modal', 'error');
    return;
  }

  modal.innerHTML = modalHTML;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Obtener rol del usuario actual
  const loggedUser = localStorage.getItem("loggedUser");
  const user = loggedUser ? JSON.parse(loggedUser) : null;
  const userRole = user?.role ? user.role.toLowerCase() : "visitante";

  // Llenar campos con información del empleado
  fillEmployeeInfo(emp, modal, userRole);

  // Event listeners
  setupVerInfoEventListeners(emp, modal, overlay, userRole);

  // Cerrar al hacer clic fuera
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      clearTimeout(state.pinTimer);
      clearTimeout(state.usernameTimer);
      overlay.remove();
    }
  });
};

function fillEmployeeInfo(emp, modal, userRole) {
  // console.log('Llenando información del empleado:', emp);
  // Campos básicos
  modal.querySelector('#field-nombre').value = emp.nombre || '';
  modal.querySelector('#field-puesto').value = emp.puesto || '';
  modal.querySelector('#field-usuario').value = emp.usuario || '';  // Cambio: username en lugar de usuario
  modal.querySelector('#field-pin').value = emp.pin || '';  // Cambio: username en lugar de usuario
  modal.querySelector('#field-password').value = emp.contraseña || '';  // Cambio: username en lugar de usuario
  
  // Campo de rol con estilos visuales
  const rolSelect = modal.querySelector('#field-rol');
  const empleadoRol = emp.rol ? emp.rol.toLowerCase() : 'empleado';
  configureRoleOptions(rolSelect, userRole);
  const displayedRole = userRole === 'admin' ? empleadoRol : 'empleado';
  rolSelect.value = displayedRole;
  
  // Aplicar colores según el rol
  const roleColors = {
    'empleado': '#e8f0ff',   // Azul claro
    'supervisor': '#f0e8ff', // Morado claro
    'admin': '#fff2e8'       // Naranja claro
  };
  
  rolSelect.style.backgroundColor = roleColors[displayedRole] || roleColors['empleado'];
  rolSelect.style.fontWeight = '600';
  
  modal.querySelector('#field-id').value = emp.id || '';
  
  // Verificar estado de conexión del reloj
  checkRelojConnection(emp.id, modal);

  // Foto del empleado (si existe)
  const photo = modal.querySelector('#employee-photo');
  if (emp.imagen) {  // Cambio: imagen en lugar de foto
    photo.src = "/web/Images/" +emp.imagen;
  }

  // Mostrar credenciales solo para admin
  if (userRole === 'admin') {
    const credentialsSection = modal.querySelector('#credentials-section');
    credentialsSection.style.display = 'block';
    
    // Cargar credenciales del JSON
    modal.querySelector('#field-pin').value = emp.pin || '****';
    modal.querySelector('#field-password').value = emp.contraseña || '************';
  }
}

function configureRoleOptions(rolSelect, userRole) {
  const allowedRoles = userRole === 'admin'
    ? ['empleado', 'supervisor', 'admin']
    : ['empleado'];

  rolSelect.innerHTML = '';

  allowedRoles.forEach(role => {
    const option = document.createElement('option');
    option.value = role;
    option.textContent = ROLE_LABELS[role] || role;
    rolSelect.appendChild(option);
  });
}

function setupVerInfoEventListeners(emp, modal, overlay, userRole) {
  let isEditing = false;
  let originalData = {};

  const closeBtn = modal.querySelector('#close-ver-info');
  const editBtn = modal.querySelector('#btn-toggle-edit');
  const cancelBtn = modal.querySelector('#btn-cancel-edit');
  const saveBtn = modal.querySelector('#btn-save-changes');
  const actionButtons = modal.querySelector('#action-buttons');
  const photoWrapper = modal.querySelector('.photo-wrapper');
  const photoInput = modal.querySelector('#photo-input');
  const pinInput = modal.querySelector('#field-pin');
  const pinFeedback = modal.querySelector('#pin-validation-feedback');
  const usernameInput = modal.querySelector('#field-usuario');
  const usernameFeedback = modal.querySelector('#username-validation-feedback');
  
  // Guardar PIN y username originales
  state.originalPin = emp.pin;
  state.originalUsername = emp.usuario;

  // Cerrar modal
  closeBtn.addEventListener('click', () => {
    clearTimeout(state.pinTimer);
    clearTimeout(state.usernameTimer);
    overlay.remove();
  });

  // Toggle edit mode
  editBtn.addEventListener('click', () => {
    isEditing = !isEditing;
    toggleEditMode(isEditing, modal, editBtn, actionButtons, photoWrapper);
    
    if (isEditing) {
      // Guardar datos originales
      originalData = captureCurrentData(modal);
      
      // Configurar validación de PIN si está visible
      if (pinInput && userRole === 'admin') {
        pinInput.addEventListener('input', () => handlePinChange(pinInput, pinFeedback, emp.id));
      }
      
      // Configurar validación de username
      if (usernameInput && usernameFeedback) {
        usernameInput.addEventListener('input', () => handleUsernameChange(usernameInput, usernameFeedback, emp.id));
      }
    } else {
      // Limpiar feedback al salir del modo edición
      if (pinFeedback) {
        pinFeedback.textContent = '';
        pinFeedback.style.color = '';
      }
      if (usernameFeedback) {
        usernameFeedback.textContent = '';
        usernameFeedback.style.color = '';
      }
    }
  });

  // Cancelar edición
  cancelBtn.addEventListener('click', () => {
    isEditing = false;
    toggleEditMode(false, modal, editBtn, actionButtons, photoWrapper);
    restoreOriginalData(originalData, modal);
    
    // Limpiar feedback de validación
    if (pinFeedback) {
      pinFeedback.textContent = '';
      pinFeedback.style.color = '';
    }
    if (usernameFeedback) {
      usernameFeedback.textContent = '';
      usernameFeedback.style.color = '';
    }
    state.pinValid = true;
    state.usernameValid = true;
  });

  // Guardar cambios
  saveBtn.addEventListener('click', async () => {
    await saveEmployeeChanges(emp, modal, overlay);
    isEditing = false;
    toggleEditMode(false, modal, editBtn, actionButtons, photoWrapper);
  });

  // Cambiar foto
  photoWrapper.addEventListener('click', () => {
    if (isEditing) {
      photoInput.click();
    }
  });

  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        modal.querySelector('#employee-photo').src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Toggle visibility de contraseñas
  const visibilityToggles = modal.querySelectorAll('.btn-toggle-visibility');
  visibilityToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = modal.querySelector(`#${targetId}`);
      
      if (input.type === 'password') {
        input.type = 'text';
        btn.querySelector('.eye-icon').textContent = '👁️‍🗨️';
      } else {
        input.type = 'password';
        btn.querySelector('.eye-icon').textContent = '👁️';
      }
    });
  });
}

function toggleEditMode(editing, modal, editBtn, actionButtons, photoWrapper) {
  const fields = [
    modal.querySelector('#field-nombre'),
    modal.querySelector('#field-puesto'),
    modal.querySelector('#field-usuario')
  ];

  const selectFields = [
    modal.querySelector('#field-rol')
  ];

  const credentialFields = [
    modal.querySelector('#field-pin'),
    modal.querySelector('#field-password')
  ];

  if (editing) {
    // Activar modo edición
    editBtn.classList.add('editing');
    editBtn.innerHTML = '<span>✓</span> Editando';
    actionButtons.style.display = 'flex';
    photoWrapper.classList.add('editable');

    fields.forEach(field => {
      if (field) field.removeAttribute('readonly');
    });

    selectFields.forEach(select => {
      if (select) select.removeAttribute('disabled');
    });

    credentialFields.forEach(field => {
      if (field && field.closest('#credentials-section').style.display !== 'none') {
        field.removeAttribute('readonly');
      }
    });
  } else {
    // Desactivar modo edición
    editBtn.classList.remove('editing');
    editBtn.innerHTML = '<span>✏️</span> Editar';
    actionButtons.style.display = 'none';
    photoWrapper.classList.remove('editable');

    fields.forEach(field => {
      if (field) field.setAttribute('readonly', true);
    });

    selectFields.forEach(select => {
      if (select) select.setAttribute('disabled', true);
    });

    credentialFields.forEach(field => {
      if (field) field.setAttribute('readonly', true);
    });
  }
}

function captureCurrentData(modal) {
  return {
    nombre: modal.querySelector('#field-nombre').value,
    puesto: modal.querySelector('#field-puesto').value,
    usuario: modal.querySelector('#field-usuario').value,
    rol: modal.querySelector('#field-rol').value,
    pin: modal.querySelector('#field-pin')?.value,
    password: modal.querySelector('#field-password')?.value,
    photo: modal.querySelector('#employee-photo').src
  };
}

function restoreOriginalData(data, modal) {
  modal.querySelector('#field-nombre').value = data.nombre;
  modal.querySelector('#field-puesto').value = data.puesto;
  modal.querySelector('#field-usuario').value = data.usuario;
  modal.querySelector('#field-rol').value = data.rol;
  
  if (data.pin) modal.querySelector('#field-pin').value = data.pin;
  if (data.password) modal.querySelector('#field-password').value = data.password;
  
  modal.querySelector('#employee-photo').src = data.photo;
  
  // Limpiar feedback de validación
  const pinFeedback = modal.querySelector('#pin-validation-feedback');
  const usernameFeedback = modal.querySelector('#username-validation-feedback');
  if (pinFeedback) {
    pinFeedback.textContent = '';
    pinFeedback.style.color = '';
  }
  if (usernameFeedback) {
    usernameFeedback.textContent = '';
    usernameFeedback.style.color = '';
  }
  state.pinValid = true;
  state.usernameValid = true;
}

async function saveEmployeeChanges(emp, modal, overlay) {
  const updatedData = {
    nombre: modal.querySelector('#field-nombre').value,
    puesto: modal.querySelector('#field-puesto').value,
    username: modal.querySelector('#field-usuario').value,
    rol: modal.querySelector('#field-rol').value
  };

  // Validación básica
  if (!updatedData.nombre || !updatedData.username) {
    showToast('Nombre y usuario son campos obligatorios', 'warning');
    return;
  }
  
  // Validar PIN si fue modificado
  if (!state.pinValid) {
    showToast('El PIN ingresado ya está registrado', 'error');
    return;
  }
  
  // Validar username si fue modificado
  if (!state.usernameValid) {
    showToast('El nombre de usuario ya está registrado', 'error');
    return;
  }

  // Si hay credenciales visibles, incluirlas
  const credentialsSection = modal.querySelector('#credentials-section');
  if (credentialsSection.style.display !== 'none') {
    const pin = modal.querySelector('#field-pin').value;
    const contraseña = modal.querySelector('#field-password').value;
    
    // Solo incluir PIN si cambió y es válido
    if (pin && pin !== '****' && pin !== state.originalPin) {
      if (!/^\d{4}$/.test(pin)) {
        showToast('El PIN debe tener 4 dígitos numéricos', 'error');
        return;
      }
      updatedData.pin = pin;
    }
    if (contraseña && contraseña !== '************') updatedData.contraseña = contraseña;
  }

  try {
    console.log('Enviando datos actualizados al servidor:', updatedData);
    const response = await fetch(`http://localhost:8001/usuarios/${emp.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData)
    });

    const result = await response.json();

    if (response.ok) {
      showToast('Información actualizada exitosamente', 'success');
      // Orecargar la página 
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      createNotificationMessage(NOTIFICATION_TYPES.EMPLEADO_ACTUALIZADO, {
        employeeId: emp.id,
        updatedFields: updatedData
      });
    } else {
      showToast('Error al actualizar: ' + (result.message || 'Error desconocido'), 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Error al actualizar la información. Verifica tu conexión.', 'error');
  }
}

function handlePinChange(pinInput, pinFeedback, empleadoId) {
  clearTimeout(state.pinTimer);
  let pin = pinInput.value.trim().replace(/\D/g, '');
  pinInput.value = pin;

  if (!pin || pin === '****') {
    pinFeedback.textContent = '';
    pinFeedback.style.color = '';
    state.pinValid = true;
    return;
  }

  if (pin.length !== 4) {
    pinFeedback.textContent = `❌ El PIN debe tener 4 dígitos (${pin.length}/4)`;
    pinFeedback.style.color = '#e11d48';
    state.pinValid = false;
    return;
  }

  // Si el PIN es el mismo que el original, no validar
  if (pin === state.originalPin) {
    pinFeedback.textContent = '';
    pinFeedback.style.color = '';
    state.pinValid = true;
    return;
  }

  pinFeedback.textContent = '⏳ Verificando PIN...';
  pinFeedback.style.color = '#6b7280';
  state.pinValid = false;

  state.pinTimer = setTimeout(async () => {
    try {
      const response = await fetch(`http://localhost:8001/usuarios/pin/${pin}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          // El PIN existe, verificar si es del mismo empleado
          if (data.usuario && data.usuario.id === empleadoId) {
            // Es el mismo empleado, PIN válido
            pinFeedback.textContent = '';
            pinFeedback.style.color = '';
            state.pinValid = true;
          } else {
            // Es otro empleado
            pinFeedback.textContent = '❌ Este PIN ya está registrado';
            pinFeedback.style.color = '#e11d48';
            state.pinValid = false;
          }
        } else {
          // PIN disponible
          pinFeedback.textContent = '✅ PIN disponible';
          pinFeedback.style.color = '#16a34a';
          state.pinValid = true;
        }
      }
    } catch (err) {
      console.error('Error al verificar PIN:', err);
      pinFeedback.textContent = '⚠️ Error al verificar PIN';
      pinFeedback.style.color = '#e11d48';
      state.pinValid = false;
    }
  }, 500);
}

function handleUsernameChange(usernameInput, usernameFeedback, empleadoId) {
  clearTimeout(state.usernameTimer);
  const username = usernameInput.value.trim();

  if (!username) {
    usernameFeedback.textContent = '';
    usernameFeedback.style.color = '';
    state.usernameValid = true;
    return;
  }

  // Si el username es el mismo que el original, no validar
  if (username === state.originalUsername) {
    usernameFeedback.textContent = '';
    usernameFeedback.style.color = '';
    state.usernameValid = true;
    return;
  }

  usernameFeedback.textContent = '⏳ Verificando disponibilidad...';
  usernameFeedback.style.color = '#6b7280';
  state.usernameValid = false;

  state.usernameTimer = setTimeout(async () => {
    try {
      const response = await fetch(`http://localhost:8001/usuarios/usuario/${username}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          // El username existe, verificar si es del mismo empleado
          if (data.usuario && data.usuario.id === empleadoId) {
            // Es el mismo empleado, username válido
            usernameFeedback.textContent = '';
            usernameFeedback.style.color = '';
            state.usernameValid = true;
          } else {
            // Es otro empleado
            usernameFeedback.textContent = '❌ Nombre de usuario ya registrado';
            usernameFeedback.style.color = '#e11d48';
            state.usernameValid = false;
          }
        } else {
          // Username disponible
          usernameFeedback.textContent = '✅ Nombre de usuario disponible';
          usernameFeedback.style.color = '#16a34a';
          state.usernameValid = true;
        }
      }
    } catch (err) {
      console.error('Error al verificar username:', err);
      usernameFeedback.textContent = '⚠️ Error al verificar disponibilidad';
      usernameFeedback.style.color = '#e11d48';
      state.usernameValid = false;
    }
  }, 500);
}

async function checkRelojConnection(empleadoId, modal) {
  const statusContainer = modal.querySelector('#reloj-status');
  const statusIndicator = statusContainer?.querySelector('.status-indicator');
  const statusText = statusContainer?.querySelector('.status-text');
  
  if (!statusContainer) return;
  
  try {
    const response = await fetch('http://localhost:8001/relojes-conectados');
    if (!response.ok) throw new Error('Error al cargar relojes');
    
    const relojes = await response.json();
    // console.log('Relojes conectados:', relojes);
    // console.log('Empleado ID:', empleadoId);
    // Buscar si hay un reloj conectado para este empleado
    const relojConectado = Array.isArray(relojes) 
      ? relojes.find(r => r.empleado_id === empleadoId)
      : null;
    
    if (relojConectado) {
      // Reloj conectado
      statusContainer.classList.add('connected');
      statusContainer.classList.remove('disconnected');
      if (statusIndicator) statusIndicator.style.background = '#16a34a';
      if (statusText) statusText.textContent = 'Conectado';
    } else {
      // Reloj no conectado
      statusContainer.classList.add('disconnected');
      statusContainer.classList.remove('connected');
      if (statusIndicator) statusIndicator.style.background = '#9ca3af';
      if (statusText) statusText.textContent = 'Desconectado';
    }
  } catch (error) {
    console.error('Error al verificar conexión del reloj:', error);
    statusContainer.classList.add('disconnected');
    if (statusIndicator) statusIndicator.style.background = '#ef4444';
    if (statusText) statusText.textContent = 'Error';
  }
}
