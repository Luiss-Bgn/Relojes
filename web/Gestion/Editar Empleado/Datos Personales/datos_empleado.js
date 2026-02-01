/* datos_empleado.js */
import { editarPersonalData } from './datos_del_empleado.js';

document.addEventListener('DOMContentLoaded', () => {
  const btnDatosEmpleado = document.getElementById('btn-datos-empleado');

  function closeActiveModals() {
    document
      .querySelectorAll('.modal.active')
      .forEach(m => m.classList.remove('active'));
  }

  btnDatosEmpleado.addEventListener('click', async () => {
    closeActiveModals();
    const modal = document.getElementById('modal-edit-personal-data');

    // Obtener rol del usuario logueado
    const loggedUserString = localStorage.getItem('loggedUser');
    const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'empleado' };
    const rolUsuarioActual = loggedUser.role;

    // Generar opciones de rol según el usuario actual
    let opcionesRol = '<option value="" disabled selected hidden></option>';
    if (rolUsuarioActual === "admin") {
      opcionesRol += `
        <option value="empleado">Empleado</option>
        <option value="supervisor">Supervisor</option>
        <option value="admin">Admin</option>`;
    } else if (rolUsuarioActual === "supervisor") {
      opcionesRol += '<option value="empleado">Empleado</option>';
    }

    modal.innerHTML = `
      <div class="form-modal-container">
        <form id="form-edit-personal-data" enctype="multipart/form-data">

          <img id="preview" src="" alt="Vista previa"
               style="max-width:75px;display:none;margin-bottom:1em;align-self:center;">

          <div class="inputGroup">
            <input id="nombre_dp"  name="nombre"  type="text" required>
            <label for="nombre_dp">Nombre</label>
          </div>

          <div class="inputGroup">
            <input id="puesto_dp"  name="puesto"  type="text" required>
            <label for="puesto_dp">Puesto</label>
          </div>

          <div class="inputGroup">
            <input id="username_dp" name="username" type="text" required>
            <label for="username_dp">Username</label>
          </div>

          <!-- 🕒 Reloj asignado -->
          <div class="inputGroup reloj-group">
            <input id="empleadoid_dp" name="empleado_id" type="text" readonly>
            <label for="empleadoid_dp">Reloj asignado</label>
          </div>

          <div class="inputGroup">
            <input id="password_dp" name="password_dp" type="password" required>
            <label for="password_dp">Password</label>
          </div>

          <div class="inputGroup">
            <select id="role_dp" name="role_dp" required>
              ${opcionesRol}
            </select>
            <label for="role_dp">Role</label>
          </div>

          <div class="inputGroup file-input-group" style="display: flex; flex-direction: column; gap: 8px;">
            <label style="font-size: 0.9rem; color: #666; font-weight: 500;">Foto (opcional):</label>
            <label for="img_dp" class="file-upload-label">
              <span class="file-upload-text">Subir imagen</span>
            </label>
            <input id="img_dp" name="img_dp" type="file" accept="image/*" style="display: none;">
            <span id="file-name-display-edit" style="font-size: 0.85rem; color: #666;"></span>
          </div>

          <button id="btn_edit_dp" type="button">Enviar</button>
        </form>
      </div>
    `;
    modal.classList.add('active');

    /* ---------- Vista previa ---------- */
    const inputImagen = document.getElementById('img_dp');
    const preview     = document.getElementById('preview');
    const fileGroup   = inputImagen.closest('.file-input-group');
    const fileNameDisplay = document.getElementById('file-name-display-edit');

    inputImagen.addEventListener('change', () => {
      const file = inputImagen.files[0];
      
      // Mostrar nombre del archivo
      if (file && fileNameDisplay) {
        fileNameDisplay.textContent = `📷 ${file.name}`;
        fileNameDisplay.style.color = '#667eea';
      } else if (fileNameDisplay) {
        fileNameDisplay.textContent = '';
      }
      if (file) {
        fileGroup.classList.add('has-file');
        const reader = new FileReader();
        reader.onload = e => {
          preview.src = e.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        fileGroup.classList.remove('has-file');
        preview.style.display = 'none';
      }
    });

    /* ---------- Cargar datos ---------- */
    let originalRelojId = null;

    try {
      const [empleado, user, relojes] = await Promise.all([
        fetch(`/empleados/${window.empleadoSeleccionadoID}`).then(r => r.json()),
        fetch(`/user/${window.empleadoSeleccionadoID}`).then(r => r.json()),
        fetch('/relojes_conectados.json').then(r => r.json())
      ]);

      /* Datos personales */
      document.getElementById('nombre_dp').value   = empleado.nombre  || '';
      document.getElementById('puesto_dp').value   = empleado.puesto  || '';
      document.getElementById('username_dp').value = user.username    || '';
      document.getElementById('password_dp').value = user.password    || '';
      document.getElementById('role_dp').value     = user.role        || '';

      /* Imagen */
      if (empleado.imagen) {
        preview.src = `/web/Images/${empleado.imagen}`;
        preview.style.display = 'block';
        fileGroup.classList.add('has-file');
      }

      /* ----- reloj asignado ----- */
      const empleadoIdStr = String(
        empleado.id ?? empleado._id ?? empleado.empleado_id
      );
      const relojAsignado = relojes.find(
        r => String(r.empleado_id) === empleadoIdStr
      );

      const relojInput = document.getElementById('empleadoid_dp');

      if (relojAsignado) {
        relojInput.value     = relojAsignado.reloj_id;
        originalRelojId      = relojAsignado.reloj_id;

        /* 🔓 Habilitamos edición solo para borrar */
        relojInput.readOnly = false;
        relojInput.addEventListener('input', () => {
          const val = relojInput.value.trim();
          // si escribe algo que no sea vacío ni el original, lo revertimos
          if (val && val !== originalRelojId) {
            relojInput.value = originalRelojId;
          }
        });
      } else {
        relojInput.value = 'Sin asignar';
      }

    } catch (e) {
      console.error(e);
      alert('No se pudo cargar la información del empleado');
      return;
    }

    /* ---------- Enviar ---------- */
    /* ---------- Enviar ---------- */
document.getElementById('btn_edit_dp').addEventListener('click', async () => {
  const relojVal = document.getElementById('empleadoid_dp').value.trim();

  let desasignadoOK = true; // ← bandera

  // ¿El usuario lo vació y antes existía reloj?
  if (
    originalRelojId &&
    (relojVal === '' || relojVal.toLowerCase() === 'sin asignar')
  ) {
    try {
      const resp = await fetch(`/relojes/${originalRelojId}`, {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ empleado_id: '' })
      });

      if (!resp.ok) {
        desasignadoOK = false;                // marcar error
        const txt = await resp.text();        // por si quieres ver el motivo
        console.error('❌ Backend respondió:', resp.status, txt);
      }
    } catch (e) {
      desasignadoOK = false;
      console.error('❌ Error fetch:', e);
    }
  }

  if (!desasignadoOK) {
    alert('No se pudo desasignar el reloj (los demás datos sí se guardarán).');
  }

  /* Guarda datos personales pase lo que pase */
  editarPersonalData();
});

  });
});
