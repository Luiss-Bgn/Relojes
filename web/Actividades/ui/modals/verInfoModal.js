import { loadModalHTML } from './modalLoader.js';
import { showToast } from '../toast.js';

export const showVerInfoModal = async (emp) => {
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
      overlay.remove();
    }
  });
};

function fillEmployeeInfo(emp, modal, userRole) {
  // Campos básicos
  modal.querySelector('#field-nombre').value = emp.nombre || '';
  modal.querySelector('#field-puesto').value = emp.puesto || '';
  modal.querySelector('#field-usuario').value = emp.usuario || '';
  modal.querySelector('#field-rol').value = emp.rol ? emp.rol.toLowerCase() : 'empleado';
  modal.querySelector('#field-reloj').value = emp.reloj_id || '';
  modal.querySelector('#field-id').value = emp.id || '';

  // Foto del empleado (si existe)
  const photo = modal.querySelector('#employee-photo');
  if (emp.foto) {
    photo.src = emp.foto;
  }

  // Mostrar credenciales solo para admin
  if (userRole === 'admin') {
    const credentialsSection = modal.querySelector('#credentials-section');
    credentialsSection.style.display = 'block';
    
    // Cargar credenciales (normalmente desde API)
    modal.querySelector('#field-pin').value = emp.pin || '****';
    modal.querySelector('#field-password').value = emp.password || '************';
  }
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

  // Cerrar modal
  closeBtn.addEventListener('click', () => overlay.remove());

  // Toggle edit mode
  editBtn.addEventListener('click', () => {
    isEditing = !isEditing;
    toggleEditMode(isEditing, modal, editBtn, actionButtons, photoWrapper);
    
    if (isEditing) {
      // Guardar datos originales
      originalData = captureCurrentData(modal);
    }
  });

  // Cancelar edición
  cancelBtn.addEventListener('click', () => {
    isEditing = false;
    toggleEditMode(false, modal, editBtn, actionButtons, photoWrapper);
    restoreOriginalData(originalData, modal);
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
    modal.querySelector('#field-usuario'),
    modal.querySelector('#field-reloj')
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
    reloj: modal.querySelector('#field-reloj').value,
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
  modal.querySelector('#field-reloj').value = data.reloj;
  
  if (data.pin) modal.querySelector('#field-pin').value = data.pin;
  if (data.password) modal.querySelector('#field-password').value = data.password;
  
  modal.querySelector('#employee-photo').src = data.photo;
}

async function saveEmployeeChanges(emp, modal, overlay) {
  const updatedData = {
    nombre: modal.querySelector('#field-nombre').value,
    puesto: modal.querySelector('#field-puesto').value,
    usuario: modal.querySelector('#field-usuario').value,
    rol: modal.querySelector('#field-rol').value,
    reloj_id: modal.querySelector('#field-reloj').value || null
  };

  // Validación básica
  if (!updatedData.nombre || !updatedData.usuario) {
    showToast('Nombre y usuario son campos obligatorios', 'warning');
    return;
  }

  // Si hay credenciales visibles, incluirlas
  const credentialsSection = modal.querySelector('#credentials-section');
  if (credentialsSection.style.display !== 'none') {
    const pin = modal.querySelector('#field-pin').value;
    const password = modal.querySelector('#field-password').value;
    
    if (pin && pin !== '****') updatedData.pin = pin;
    if (password && password !== '************') updatedData.password = password;
  }

  try {
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
      // Opcional: recargar la página o actualizar el panel
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showToast('Error al actualizar: ' + (result.message || 'Error desconocido'), 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Error al actualizar la información. Verifica tu conexión.', 'error');
  }
}
