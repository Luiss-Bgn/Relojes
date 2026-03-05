import { showToast } from './toast.js';

const state = {
  isSubmitting: false,
  usernameTimer: null,
  pinTimer: null,
  usernameValid: false,
  pinValid: false
};

export function initCrearEmpleado(target) {
  if (!target) return;
  target.innerHTML = template();
  configurarOpcionesRol(target);
  bind(target.querySelector('form'));
}

function configurarOpcionesRol(target) {
  const form = target.querySelector('form');
  // Filtro de roles según el usuario actual
  const rolSelect = form?.querySelector('#role');
  const loggedUser = localStorage.getItem("loggedUser");
  const user = loggedUser ? JSON.parse(loggedUser) : null;
  const userRole = user?.role ?? "visitante";

  const allowedRoles = userRole === 'admin'
    ? ['empleado', 'supervisor', 'admin']
    : ['empleado'];

  const ROLE_LABELS = {
    empleado: 'Empleado',
    supervisor: 'Supervisor',
    admin: 'Administrador'
  };

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Rol:';
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.hidden = true;
  rolSelect.appendChild(placeholder);

  allowedRoles.forEach(role => {
    const option = document.createElement('option');
    option.value = role;
    option.textContent = ROLE_LABELS[role] || role;
    rolSelect.appendChild(option);
  });

}
function template() {
  return `
    <div class="panel-header">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
      Crear Empleado
    </div>
    <div class="panel-content">
    <form id="form-create-empleado" enctype="multipart/form-data">
      <div class="form-grid">
        <div class="input">
          <input id="nombre" name="nombre" placeholder="Nombre:" required>
        </div>
        <div class="input">
          <input id="puesto" name="puesto" placeholder="Puesto:" required>
        </div>
        <div class="input">
          <input id="username" name="username" placeholder="Nombre de usuario:" autocomplete="off" required>
          <div id="username-validation" class="hint"></div>
        </div>
        <div class="input">
          <input id="password" name="password" placeholder="Contraseña:" type="password" required>
        </div>
        <div class="input">
          <input id="pin" name="pin" placeholder="Código PIN (4 dígitos):" maxlength="4" pattern="\\d{4}" inputmode="numeric" required>
          <div id="pin-validation" class="hint"></div>
        </div>
        <div class="input">
          <select id="role" name="role" required></select>
        </div>
        <div class="input file-input-wrapper">
          <div class="file-upload-btn-wrapper">
            <button type="button" class="file-upload-btn" onclick="document.getElementById('imagen').click()">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
              Subir imagen
            </button>
            <input id="imagen" name="imagen" type="file" accept="image/*" style="display: none;">
          </div>
          <div id="file-name-display" class="hint"></div>
          <div id="image-preview-container" class="image-preview-container" style="display: none;">
            <img id="image-preview" class="image-preview" alt="Preview">
            <button type="button" class="remove-image-btn" id="remove-image">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div class="actions-row">
        <button class="primary-btn" type="submit">Crear Empleado</button>
      </div>
      <div id="form-feedback" class="feedback"></div>
    </form>
    </div>
  `;
}

function bind(form) {
  if (!form) return;
  const usernameInput = form.querySelector('#username');
  const usernameFeedback = form.querySelector('#username-validation');
  const pinInput = form.querySelector('#pin');
  const pinFeedback = form.querySelector('#pin-validation');
  const submitBtn = form.querySelector('button[type="submit"]');
  const fileInput = form.querySelector('#imagen');
  const fileLabel = form.querySelector('#file-name-display');
  const formFeedback = form.querySelector('#form-feedback');

  if (fileInput && fileLabel) {
    const previewContainer = form.querySelector('#image-preview-container');
    const previewImg = form.querySelector('#image-preview');
    const removeBtn = form.querySelector('#remove-image');

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) {
        fileLabel.textContent = `📷 ${file.name}`;
        
        // Mostrar preview
        const reader = new FileReader();
        reader.onload = (e) => {
          if (previewImg && previewContainer) {
            previewImg.src = e.target.result;
            previewContainer.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      } else {
        fileLabel.textContent = '';
        if (previewContainer) previewContainer.style.display = 'none';
      }
    });

    // Botón para remover imagen
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        fileInput.value = '';
        fileLabel.textContent = '';
        if (previewContainer) previewContainer.style.display = 'none';
        if (previewImg) previewImg.src = '';
      });
    }
  }

  if (pinInput && pinFeedback) {
    pinInput.addEventListener('input', () => handlePinChange(pinInput, pinFeedback));
  }

  if (usernameInput && usernameFeedback) {
    usernameInput.addEventListener('input', () => handleUsernameChange(usernameInput, usernameFeedback, submitBtn));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await submitForm(form, submitBtn, formFeedback);
  });


}

function handlePinChange(pinInput, pinFeedback) {
  clearTimeout(state.pinTimer);
  let pin = pinInput.value.trim().replace(/\D/g, '');
  pinInput.value = pin;

  if (!pin) {
    pinFeedback.textContent = '';
    pinFeedback.style.color = '';
    pinInput.setCustomValidity('');
    return;
  }

  if (pin.length !== 4) {
    pinFeedback.textContent = `❌ El PIN debe tener 4 dígitos (${pin.length}/4)`;
    pinFeedback.style.color = '#e11d48';
    pinInput.setCustomValidity('PIN invalido');
    return;
  }

  pinFeedback.textContent = '⏳ Verificando PIN...';
  pinFeedback.style.color = '#6b7280';
  pinInput.setCustomValidity('');

  state.pinTimer = setTimeout(async () => {
    try {
      const response = await fetch(`/usuarios/pin/${pin}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          pinFeedback.textContent = '❌ Este PIN ya está registrado';
          pinFeedback.style.color = '#e11d48';
          pinInput.setCustomValidity('PIN ya existe');
          state.pinValid = false;
        } else {
          pinFeedback.textContent = '✅ PIN disponible';
          pinFeedback.style.color = '#16a34a';
          pinInput.setCustomValidity('');
          state.pinValid = true;
        }
      }
    } catch (err) {
      console.error('Error al verificar PIN:', err);
      pinFeedback.textContent = '⚠️ Error al verificar PIN';
      pinFeedback.style.color = '#e11d48';
      pinInput.setCustomValidity('');
      state.pinValid = false;
    }
  }, 500);
}

function handleUsernameChange(input, feedback, submitBtn) {
  clearTimeout(state.usernameTimer);
  const username = input.value.trim();

  if (!username) {
    feedback.textContent = '';
    feedback.style.color = '';
    input.setCustomValidity('');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    }
    return;
  }

  feedback.textContent = '⏳ Verificando disponibilidad...';
  feedback.style.color = '#6b7280';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
  }

  state.usernameTimer = setTimeout(async () => {
    try {
      const response = await fetch(`/usuarios/usuario/${username}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          feedback.textContent = '❌ Nombre de usuario ya registrado';
          feedback.style.color = '#e11d48';
          input.setCustomValidity('Username ya existe');
          state.usernameValid = false;
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
          }
        } else {
          feedback.textContent = '✅ Nombre de usuario disponible';
          feedback.style.color = '#16a34a';
          input.setCustomValidity('');
          state.usernameValid = true;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
          }
        }
      }
    } catch (err) {
      console.error('Error al verificar username:', err);
      feedback.textContent = '⚠️ Error al verificar disponibilidad';
      feedback.style.color = '#e11d48';
      input.setCustomValidity('');
      state.usernameValid = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
    }
  }, 500);
}

async function submitForm(form, submitBtn, formFeedback) {
  if (state.isSubmitting) return;

  const formData = new FormData(form);
  const cleanUsername = (formData.get('username') || '').trim().toLowerCase();
  const password = (formData.get('password') || '').trim();
  const pin = (formData.get('pin') || '').trim();
  const role = (formData.get('role') || '').trim();
  const nombre = (formData.get('nombre') || '').trim();
  const puesto = (formData.get('puesto') || '').trim();

  if (!cleanUsername) return show(formFeedback, '❌ El nombre de usuario es obligatorio', '#e11d48');
  if (!password) return show(formFeedback, '❌ La contraseña es obligatoria', '#e11d48');
  if (!pin) return show(formFeedback, '❌ El código PIN es obligatorio', '#e11d48');
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return show(formFeedback, '❌ El PIN debe ser de 4 dígitos numéricos', '#e11d48');
  if (!role) return show(formFeedback, '❌ Debes seleccionar un rol', '#e11d48');
  if (role === 'empleado') {
    if (!nombre) return show(formFeedback, '❌ El nombre es obligatorio para empleados', '#e11d48');
    if (!puesto) return show(formFeedback, '❌ El puesto es obligatorio para empleados', '#e11d48');
  }

  try {
    const checkResp = await fetch(`/usuarios/usuario/${cleanUsername}`);
    if (checkResp.ok) {
      const check = await checkResp.json();
      const exists = Boolean(check.exists || check.usuario);
      if (exists) return show(formFeedback, '❌ Nombre de usuario ya registrado', '#e11d48');
    }
  } catch (err) {
    console.error('Verificación username previa falló:', err);
  }

  state.isSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando...';
    submitBtn.style.opacity = '0.7';
  }

  const payload = new FormData();
  payload.append('nombre', nombre);
  payload.append('username', cleanUsername);
  payload.append('contraseña', password);
  payload.append('pin', pin);
  payload.append('rol', role);
  payload.append('puesto', puesto);
  const imagenFile = form.querySelector('#imagen')?.files?.[0];
  if (imagenFile) payload.append('imagen', imagenFile);

  console.log("payload:", {
    nombre,
    username: cleanUsername,
    contraseña: password,
    pin,
    rol: role,
    puesto,
    imagen: imagenFile
  });

  try {
    const response = await fetch('/usuarios', { method: 'POST', body: payload });
    if (response.ok) {
      // Mostrar notificación de éxito
      showToast('Empleado creado exitosamente', 'success', 3000);

      // Limpiar feedbacks
      const usernameFeedback = form.querySelector('#username-validation');
      const pinFeedback = form.querySelector('#pin-validation');
      const fileNameDisplay = form.querySelector('#file-name-display');
      const previewContainer = form.querySelector('#image-preview-container');
      const previewImg = form.querySelector('#image-preview');
      
      [usernameFeedback, pinFeedback, formFeedback, fileNameDisplay].forEach((el) => { if (el) el.textContent = ''; });
      
      // Limpiar preview de imagen
      if (previewContainer) previewContainer.style.display = 'none';
      if (previewImg) previewImg.src = '';
      
      // Resetear estado
      state.usernameValid = false;
      state.pinValid = false;
      
      form.reset();
      if (submitBtn) {
        submitBtn.textContent = 'Crear Empleado';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
      }

    } else {
      const error = await response.json();
      const message = error?.detail || error?.error || 'Error al crear empleado';
      showToast(message, 'error', 4000);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Crear Empleado';
        submitBtn.style.opacity = '1';
      }
    }
  } catch (err) {
    console.error('Error al enviar:', err);
    showToast('Error de conexión', 'error', 4000);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crear Empleado';
      submitBtn.style.opacity = '1';
    }
  } finally {
    state.isSubmitting = false;
  }
}

function show(el, text, color) {
  if (!el) return;
  el.textContent = text;
  el.style.color = color || '#1f2933';
}
