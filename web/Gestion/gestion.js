/* gestion.js ----  /* 2 · Referencias ------------------------------------------------------- */
  // NOTA: La lógica completa de "Editar Empleado" está en editar.js
  // para evitar duplicación y conflictos
  /*
  const menuPrincipal   = document.getElementById("menu-principal");
  const seccionEditar   = document.getElementById("seccion-editar");
  const listaEmpleados  = document.getElementById("lista-empleados");    // <div>
  const opcionesEdicion = document.getElementById("opciones-edicion");

  const btnVolverEditar   = document.getElementById("btn-volver-editar");
  const btnEditarEmpleado = document.getElementById("editar-empleado");

  window.empleadoSeleccionadoID = null;

  /* 3 · Estado inicial ---------------------------------------------------- */
  /*
  seccionEditar.style.display = "none";
  opcionesEdicion.style.display = "none";

  /* 4 · Botón "Editar Empleado" ------------------------------------------ */
  /*
  btnEditarEmpleado.addEventListener("click", () => {------------------------------------------ */
export function abrirModal(id) {
  const modal = document.getElementById(id);
  modal ? modal.classList.add("active")
        : console.error(`No se encontró el modal con id="${id}"`);
}

/* -------- restricción de rol -------- */
const usuario = JSON.parse(localStorage.getItem("loggedUser"));
if (!usuario || (usuario.role !== "admin" && usuario.role !== "supervisor")) {
  window.location.href = "/actividades";
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("🟢 Script gestion.js cargado");
  
  // 🔥 MOSTRAR FECHA COMPLETA en el encabezado
  const fechaDiv = document.getElementById('fecha-actual-gestion');
  if (fechaDiv) {
    const hoy = new Date();
    const diasSemana = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const diaNumero = hoy.getDate();
    const diaNombre = diasSemana[hoy.getDay()];
    const mesNombre = meses[hoy.getMonth()];
    fechaDiv.textContent = `${diaNombre} ${diaNumero} DE ${mesNombre}`;
  }
  
  // 🔥 MOSTRAR NOMBRE DEL USUARIO en esquina superior izquierda
  const userName = usuario.nombre || usuario.name || usuario.username || 'Usuario';
  let userNameDisplay = document.getElementById('user-name-display');
  if (!userNameDisplay) {
    userNameDisplay = document.createElement('div');
    userNameDisplay.id = 'user-name-display';
    userNameDisplay.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    document.body.appendChild(userNameDisplay);
  }
  
  // Actualizar contenido según el rol
  const rolDisplay = usuario.role === 'admin' ? 'Administrador' : 'Supervisor';
  userNameDisplay.innerHTML = `
    <span style="font-size: 16px;">👤</span>
    <span>${userName} (${rolDisplay})</span>
  `;
  
  /* 1 · FADE-IN al contenedor general ------------------------------------ */
  const subContenedor = document.getElementById("contenido-fade");
  subContenedor && requestAnimationFrame(() => subContenedor.classList.add("show"));

  // 🔥 CARGAR AUTOMÁTICAMENTE AMBAS SECCIONES
  cargarCrearEmpleado();
  cargarRegistrarEquipo();
  
  // 🔥 CONFIGURAR EVENT LISTENERS DEL MODAL
  const modalClose = document.getElementById('modal-close');
  const modalReloj = document.getElementById('modal-reloj');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  
  // Cerrar con botón X
  if (modalClose) {
    modalClose.addEventListener('click', cerrarModalAsignarReloj);
  }
  
  // Cerrar con botón Cancelar
  if (btnModalCancel) {
    btnModalCancel.addEventListener('click', cerrarModalAsignarReloj);
  }
  
  // Click en el fondo oscuro (fuera del modal) para cerrar
  if (modalReloj) {
    modalReloj.addEventListener('click', function(e) {
      // Si el click fue en el overlay (no en el contenido), cerrar
      if (e.target === modalReloj) {
        cerrarModalAsignarReloj();
      }
    });
  }
  
  console.log('✅ Event listeners del modal configurados');
});

// 🔥 NUEVAS FUNCIONES PARA CARGAR CONTENIDO AUTOMÁTICAMENTE

/**
 * cargarCrearEmpleado()
 * Carga el formulario de crear empleado en su contenedor
 */
function cargarCrearEmpleado() {
  const container = document.getElementById('crear-empleado-content');
  if (!container) {
    console.warn('No se encontró el contenedor crear-empleado-content');
    return;
  }
  
  // 🔥 OBTENER ROL CORRECTAMENTE DESDE localStorage
  let rolUsuarioActual = "empleado"; // Default
  try {
    const loggedUser = localStorage.getItem("loggedUser");
    if (loggedUser) {
      const userData = JSON.parse(loggedUser);
      rolUsuarioActual = userData.role || "empleado";
    }
  } catch (error) {
    console.error('❌ Error al obtener rol del usuario:', error);
  }
  
  console.log('🔐 Rol del usuario actual:', rolUsuarioActual);
  
  // Generar opciones del select según rol del usuario actual
  let opcionesRol = '';
  if (rolUsuarioActual === "admin") {
    opcionesRol = `
      <option value="" disabled selected></option>
      <option value="empleado">Empleado</option>
      <option value="supervisor">Supervisor</option>
      <option value="admin">Administrador</option>`;
  } else if (rolUsuarioActual === "supervisor") {
    opcionesRol = `
      <option value="" disabled selected></option>
      <option value="empleado">Empleado</option>`;
  } else {
    // Usuario sin permisos
    opcionesRol = `
      <option value="" disabled selected></option>`;
  }

  console.log('✅ Opciones de rol generadas para:', rolUsuarioActual);

  // Crear el formulario con layout de 2 columnas
  container.innerHTML = `
    <div class="form-scope">
      <div class="form-scope-container">
        <form id="form-create-empleado" method="POST" enctype="multipart/form-data">
          <div class="form-grid">
            <div class="inputGroup">
              <input type="text" id="nombre" name="nombre" required>
              <label for="nombre">Nombre:</label>
            </div>
            <div class="inputGroup">
              <input type="text" id="puesto" name="puesto" required>
              <label for="puesto">Puesto:</label>
            </div>
            <div class="inputGroup">
              <input type="text" id="username" name="username" required minlength="3">
              <label for="username">Nombre de usuario:</label>
              <span id="username-validation" style="font-size: 0.85rem; margin-top: 4px; display: block;"></span>
            </div>
            <div class="inputGroup">
              <input type="password" id="password" name="password" required minlength="6">
              <label for="password">Contraseña:</label>
            </div>
            <div class="inputGroup">
              <input type="text" id="pin" name="pin" required maxlength="4" pattern="\\d{4}" inputmode="numeric">
              <label for="pin">Código PIN (4 dígitos):</label>
              <span id="pin-validation" style="font-size: 0.85rem; margin-top: 4px; display: block;"></span>
            </div>
            <div class="inputGroup">
              <select id="role" name="role" required>
                ${opcionesRol}
              </select>
              <label for="role">Rol:</label>
            </div>
          </div>
          <div class="inputGroup" style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;">
            <label style="font-size: 0.9rem; color: #666; font-weight: 500;">Foto (opcional):</label>
            <label for="imagen" class="file-upload-label">
              <span class="file-upload-text">Subir imagen</span>
            </label>
            <input type="file" id="imagen" name="imagen" accept="image/*" style="display: none;">
            <span id="file-name-display" style="font-size: 0.85rem; color: #666;"></span>
          </div>
          <button type="submit">Crear Empleado</button>
        </form>
      </div>
    </div>
  `;

  // Registrar evento de envío del formulario
  const form = document.getElementById("form-create-empleado");
  if (form) {
    // 🔥 Remover listeners previos para evitar duplicados
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // 🔥 VALIDACIÓN EN TIEMPO REAL DEL USERNAME
    const usernameInput = newForm.querySelector('#username');
    const validationSpan = newForm.querySelector('#username-validation');
    const submitBtn = newForm.querySelector('button[type="submit"]');
    let debounceTimer;
    
    if (usernameInput && validationSpan) {
      usernameInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const username = this.value.trim();
        
        if (!username) {
          validationSpan.textContent = '';
          validationSpan.style.color = '';
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.backgroundColor = '';
            submitBtn.style.opacity = '1';
          }
          return;
        }
        
        validationSpan.textContent = '⏳ Verificando disponibilidad...';
        validationSpan.style.color = '#666';
        
        // 🔥 Deshabilitar botón mientras verifica
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.5';
        }
        
        debounceTimer = setTimeout(async () => {
          try {
            const response = await fetch(`/check-username?username=${encodeURIComponent(username)}`);
            if (response.ok) {
              const data = await response.json();
              if (data.exists) {
                validationSpan.textContent = '❌ Nombre de usuario ya registrado';
                validationSpan.style.color = '#ff0000';
                validationSpan.style.fontWeight = 'bold';
                usernameInput.setCustomValidity('Username ya existe');
                
                // 🔥 BLOQUEAR BOTÓN
                if (submitBtn) {
                  submitBtn.disabled = true;
                  submitBtn.style.backgroundColor = '#cccccc';
                  submitBtn.style.opacity = '0.6';
                  submitBtn.style.cursor = 'not-allowed';
                }
              } else {
                validationSpan.textContent = '✅ Nombre de usuario disponible';
                validationSpan.style.color = '#4caf50';
                validationSpan.style.fontWeight = 'normal';
                usernameInput.setCustomValidity('');
                
                // 🔥 DESBLOQUEAR BOTÓN
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.style.backgroundColor = '';
                  submitBtn.style.opacity = '1';
                  submitBtn.style.cursor = 'pointer';
                }
              }
            }
          } catch (error) {
            console.error('Error al verificar username:', error);
            validationSpan.textContent = '⚠️ Error al verificar disponibilidad';
            validationSpan.style.color = '#ff9800';
            usernameInput.setCustomValidity('');
            
            // Habilitar botón en caso de error de red (el backend validará)
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.style.backgroundColor = '';
              submitBtn.style.opacity = '1';
            }
          }
        }, 500); // Esperar 500ms después de que el usuario deje de escribir
      });
    }
    
    // 🔥 VALIDACIÓN EN TIEMPO REAL DEL PIN
    const pinInput = newForm.querySelector('#pin');
    const pinValidationSpan = newForm.querySelector('#pin-validation');
    let pinDebounceTimer;
    
    if (pinInput && pinValidationSpan) {
      pinInput.addEventListener('input', function() {
        clearTimeout(pinDebounceTimer);
        const pin = this.value.trim();
        
        if (!pin) {
          pinValidationSpan.textContent = '';
          pinValidationSpan.style.color = '';
          return;
        }
        
        // Validar formato (solo números y 4 dígitos)
        if (!/^\d{0,4}$/.test(pin)) {
          pinValidationSpan.textContent = '❌ Solo números (4 dígitos)';
          pinValidationSpan.style.color = '#ff0000';
          pinInput.setCustomValidity('PIN debe ser numérico');
          return;
        }
        
        if (pin.length < 4) {
          pinValidationSpan.textContent = '';
          pinValidationSpan.style.color = '';
          pinInput.setCustomValidity('');
          return;
        }
        
        pinValidationSpan.textContent = '⏳ Verificando PIN...';
        pinValidationSpan.style.color = '#666';
        
        pinDebounceTimer = setTimeout(async () => {
          try {
            const response = await fetch(`/check-pin?pin=${encodeURIComponent(pin)}`);
            if (response.ok) {
              const data = await response.json();
              if (data.exists) {
                pinValidationSpan.textContent = '❌ Este PIN ya está registrado';
                pinValidationSpan.style.color = '#ff0000';
                pinValidationSpan.style.fontWeight = 'bold';
                pinInput.setCustomValidity('PIN ya existe');
              } else {
                pinValidationSpan.textContent = '✅ PIN disponible';
                pinValidationSpan.style.color = '#4caf50';
                pinValidationSpan.style.fontWeight = 'normal';
                pinInput.setCustomValidity('');
              }
            }
          } catch (error) {
            console.error('Error al verificar PIN:', error);
            pinValidationSpan.textContent = '⚠️ Error al verificar PIN';
            pinValidationSpan.style.color = '#ff9800';
            pinInput.setCustomValidity('');
          }
        }, 500);
      });
    }
    
    // 🔥 Evento para mostrar nombre del archivo seleccionado
    const imagenInput = newForm.querySelector('#imagen');
    const fileNameDisplay = newForm.querySelector('#file-name-display');
    
    if (imagenInput && fileNameDisplay) {
      imagenInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
          fileNameDisplay.textContent = `📷 ${this.files[0].name}`;
          fileNameDisplay.style.color = '#667eea';
        } else {
          fileNameDisplay.textContent = '';
        }
      });
    }
    
    // 🔥 Agregar el listener al formulario nuevo
    newForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      event.stopPropagation(); // 🔥 Prevenir propagación
      await enviarFormularioEmpleado();
    }, { once: false }); // 🔥 No usar once, pero prevenimos duplicados con la bandera
  }

  console.log('✅ Sección Crear Empleado cargada');
}

/**
 * enviarFormularioEmpleado()
 * Envía el formulario de crear empleado al servidor
 */
let isSubmitting = false; // 🔥 Bandera para prevenir envíos duplicados

async function enviarFormularioEmpleado() {
  // 🔥 Prevenir envíos duplicados
  if (isSubmitting) {
    console.warn("⚠️ Ya se está enviando un formulario");
    return;
  }
  
  const form = document.getElementById("form-create-empleado");
  const formData = new FormData(form);
  const validationSpan = form.querySelector('#username-validation');
  
  // 🔥 VALIDAR QUE NO HAYA CAMPOS VACÍOS
  const username = formData.get("username");
  const password = formData.get("password");
  const role = formData.get("role");
  const nombre = formData.get("nombre");
  const puesto = formData.get("puesto");
  const pin = formData.get("pin");
  
  // 🔥 Limpiar username (eliminar espacios)
  const cleanUsername = username ? username.trim() : "";
  
  if (!cleanUsername) {
    if (validationSpan) {
      validationSpan.textContent = '❌ El nombre de usuario es obligatorio';
      validationSpan.style.color = '#ff0000';
    }
    return;
  }
  
  if (!password || password.trim() === "") {
    if (validationSpan) {
      validationSpan.textContent = '❌ La contraseña es obligatoria';
      validationSpan.style.color = '#ff0000';
    }
    return;
  }
  
  if (!role || role.trim() === "") {
    if (validationSpan) {
      validationSpan.textContent = '❌ Debes seleccionar un rol';
      validationSpan.style.color = '#ff0000';
    }
    return;
  }
  
  // 🔥 VALIDAR PIN
  if (!pin || pin.trim() === "") {
    if (validationSpan) {
      validationSpan.textContent = '❌ El PIN es obligatorio (4 dígitos)';
      validationSpan.style.color = '#ff0000';
    }
    return;
  }
  
  if (!/^\d{4}$/.test(pin.trim())) {
    if (validationSpan) {
      validationSpan.textContent = '❌ El PIN debe ser numérico de 4 dígitos';
      validationSpan.style.color = '#ff0000';
    }
    return;
  }
  
  // 🔥 Validar campos para empleado
  if (role === "empleado") {
    if (!nombre || nombre.trim() === "") {
      if (validationSpan) {
        validationSpan.textContent = '❌ El nombre es obligatorio para empleados';
        validationSpan.style.color = '#ff0000';
      }
      return;
    }
    if (!puesto || puesto.trim() === "") {
      if (validationSpan) {
        validationSpan.textContent = '❌ El puesto es obligatorio para empleados';
        validationSpan.style.color = '#ff0000';
      }
      return;
    }
  }
  
  // 🔥 VALIDAR QUE EL USERNAME NO EXISTA (última verificación antes de enviar)
  try {
    const checkResponse = await fetch(`/check-username?username=${encodeURIComponent(cleanUsername)}`);
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      
      if (checkData.exists) {
        if (validationSpan) {
          validationSpan.textContent = '❌ Nombre de usuario ya registrado';
          validationSpan.style.color = '#ff0000';
        }
        return;
      }
    }
  } catch (error) {
    console.error("Error al verificar username:", error);
    // Continuar con el envío aunque falle la verificación (el backend validará)
  }
  
  // 🔥 VALIDAR QUE EL PIN NO EXISTA (última verificación antes de enviar)
  try {
    const checkPinResponse = await fetch(`/check-pin?pin=${encodeURIComponent(pin.trim())}`);
    if (checkPinResponse.ok) {
      const checkPinData = await checkPinResponse.json();
      
      if (checkPinData.exists) {
        if (validationSpan) {
          validationSpan.textContent = '❌ Este PIN ya está registrado';
          validationSpan.style.color = '#ff0000';
        }
        return;
      }
    }
  } catch (error) {
    console.error("Error al verificar PIN:", error);
    // Continuar con el envío aunque falle la verificación (el backend validará)
  }

  // 🔥 Activar bandera de envío
  isSubmitting = true;
  
  // 🔥 Deshabilitar botón de submit
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Creando...";
    submitBtn.style.backgroundColor = "#999";
  }

  try {
    const response = await fetch("/empleados", {
      method: "POST",
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      
      // 🔥 ÉXITO: Botón verde y mensaje
      if (submitBtn) {
        submitBtn.style.backgroundColor = "#4caf50";
        submitBtn.style.color = "white";
        submitBtn.textContent = "✓ Empleado Creado";
      }
      
      if (validationSpan) {
        validationSpan.textContent = '✅ ' + (data.message || 'Empleado creado exitosamente');
        validationSpan.style.color = '#4caf50';
      }
      
      form.reset();
      
      // 🔥 Recargar la página después de 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      const error = await response.json();
      
      // 🔥 ERROR: Mostrar mensaje debajo del username
      if (validationSpan) {
        validationSpan.textContent = '❌ ' + (error.error || error.detail || 'Error al crear empleado');
        validationSpan.style.color = '#ff0000';
      }
      
      // Restaurar botón
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Crear Empleado";
        submitBtn.style.backgroundColor = "";
      }
    }
  } catch (error) {
    console.error("Error al enviar formulario:", error);
    
    if (validationSpan) {
      validationSpan.textContent = '❌ Error de conexión al crear empleado';
      validationSpan.style.color = '#ff0000';
    }
    
    // Restaurar botón
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Crear Empleado";
      submitBtn.style.backgroundColor = "";
    }
  } finally {
    // 🔥 Restaurar bandera
    isSubmitting = false;
  }
}

/**
 * cargarRegistrarEquipo()
 * Carga las tarjetas de relojes en su contenedor
 */
async function cargarRegistrarEquipo() {
  const container = document.getElementById('contenedor-relojes');
  if (!container) {
    console.warn('No se encontró el contenedor contenedor-relojes');
    return;
  }
  
  // Hacer ping a los relojes y cargar la lista inicial
  try {
    await fetch('/ping_relojes');
  } catch (error) {
    console.error('Error al hacer ping a relojes:', error);
  }
  
  // Cargar y mostrar tarjetas
  await actualizarTarjetasRelojes();
  
  // Configurar polling cada 10 segundos
  setInterval(actualizarTarjetasRelojes, 10000);
  
  console.log('✅ Sección Registrar Equipo cargada');
}

/**
 * actualizarTarjetasRelojes()
 * Obtiene relojes sin asignar y actualiza las tarjetas
 */
async function actualizarTarjetasRelojes() {
  const container = document.getElementById('contenedor-relojes');
  if (!container) {
    console.warn('⚠️ Contenedor de relojes no encontrado');
    return;
  }
  
  try {
    console.log('🔄 Obteniendo lista de relojes...');
    const response = await fetch('/relojes_conectados.json'); // 👈 Ruta correcta
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const datos = await response.json();
    console.log('📦 Relojes recibidos:', datos);
    
    // Filtrar solo relojes sin empleado asignado
    const relojesSinAsignar = (Array.isArray(datos) ? datos : []).filter(
      r => !r.empleado_id || r.empleado_id.trim() === ''
    );
    
    console.log(`✅ Relojes sin asignar: ${relojesSinAsignar.length}`);
    
    if (relojesSinAsignar.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">📱 No hay relojes disponibles para asignar</p>';
      return;
    }
    
    // Generar HTML de las tarjetas
    container.innerHTML = relojesSinAsignar.map((r, i) => `
      <div class="reloj ${r.estatus === 'conectado' ? 'conectado' : 'desconectado'}"
           data-reloj-id="${r.reloj_id}"
           data-idx="${i}">
        <strong>ID:</strong> ${r.reloj_id}<br>
        <strong>Empleado:</strong> ${r.empleado_id || 'Sin asignar'}<br>
        <strong>IP:</strong> ${r.ip}<br>
        <strong>UUID:</strong> ${r.uuid || 'N/A'}<br>
        <strong>Estado:</strong> ${r.estatus}
      </div>
    `).join('');
    
    // Agregar evento click a las tarjetas
    container.querySelectorAll('.reloj').forEach(card => {
      card.addEventListener('click', () => {
        const relojId = card.dataset.relojId;
        console.log('🖱️ Click en reloj:', relojId);
        abrirModalAsignarReloj(relojId);
      });
    });
    
  } catch (error) {
    console.error('❌ Error al actualizar tarjetas de relojes:', error);
    container.innerHTML = `
      <p style="text-align: center; color: #e74c3c; padding: 40px;">
        ❌ Error al cargar relojes<br>
        <small style="color: #999;">${error.message}</small>
      </p>
    `;
  }
}

/**
 * abrirModalAsignarReloj(relojId)
 * Abre modal para asignar un reloj a un empleado
 */
async function abrirModalAsignarReloj(relojId) {
  const modal = document.getElementById('modal-reloj');
  const formId = document.getElementById('modal-id');
  
  if (!modal || !formId) {
    console.error('❌ Modal o input no encontrado');
    return;
  }
  
  console.log('📱 Abriendo modal para reloj:', relojId);
  
  // Establecer el ID del reloj
  formId.value = relojId;
  
  // 🔥 FORZAR ESTILOS PARA CENTRADO PERFECTO
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.right = '0';
  modal.style.bottom = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.zIndex = '99999';
  modal.style.transform = 'none';
  
  // Mostrar modal agregando clase 'active'
  modal.classList.add('active');
  
  // Prevenir scroll del body
  document.body.style.overflow = 'hidden';
  
  // Cargar lista de empleados
  await cargarEmpleadosEnModal();
}

/**
 * cerrarModalAsignarReloj()
 * Cierra el modal
 */
function cerrarModalAsignarReloj() {
  const modal = document.getElementById('modal-reloj');
  
  if (modal) {
    modal.classList.remove('active');
  }
  
  // Restaurar scroll del body
  document.body.style.overflow = '';
  
  console.log('✅ Modal cerrado');
}

/**
 * cargarEmpleadosEnModal()
 * Carga la lista de empleados en el select del modal
 */
async function cargarEmpleadosEnModal() {
  const select = document.getElementById('modal-empleado');
  if (!select) return;
  
  try {
    const response = await fetch('/empleados');
    const empleados = await response.json();
    
    select.innerHTML = '<option value="">Seleccionar empleado</option>' + 
      empleados.map(emp => 
        `<option value="${emp.id}">${emp.nombre}</option>`
      ).join('');
      
  } catch (error) {
    console.error('Error al cargar empleados:', error);
  }
}

// ==================== CÓDIGO ANTIGUO (deshabilitado) ====================
// El siguiente código está comentado porque ahora usamos secciones inline
// En lugar de navegación con botones, mostramos todo el contenido simultáneamente
/*
  const menuPrincipal   = document.getElementById("menu-principal");
  const seccionEditar   = document.getElementById("seccion-editar");
  const listaEmpleados  = document.getElementById("lista-empleados");
  const opcionesEdicion = document.getElementById("opciones-edicion");

  const btnVolverEditar   = document.getElementById("btn-volver-editar");
  const btnEditarEmpleado = document.getElementById("editar-empleado");

  console.log("🔍 gestion.js - Elementos encontrados:", {
    menuPrincipal: !!menuPrincipal,
    seccionEditar: !!seccionEditar,
    listaEmpleados: !!listaEmpleados,
    opcionesEdicion: !!opcionesEdicion,
    btnVolverEditar: !!btnVolverEditar,
    btnEditarEmpleado: !!btnEditarEmpleado
  });

  window.empleadoSeleccionadoID = null;

  if (seccionEditar) seccionEditar.style.display = "none";
  if (opcionesEdicion) opcionesEdicion.style.display = "none";

  if (btnEditarEmpleado) {
    btnEditarEmpleado.addEventListener("click", () => {
      menuPrincipal.style.display = "none";
      seccionEditar.style.display = "block";
      seccionEditar.classList.remove("fade-in", "show");
      void seccionEditar.offsetWidth;
      seccionEditar.classList.add("fade-in");
      requestAnimationFrame(() => seccionEditar.classList.add("show"));

      listaEmpleados.innerHTML = "";
      opcionesEdicion.style.display = "none";

      fetch("/empleados")
        .then(res => res.json())
        .then(data => {
          listaEmpleados.innerHTML = "";

          data.forEach((emp, index) => {
            const card = document.createElement("div");
            card.classList.add("empleado-card", `card-color-${index % 6}`);
            card.dataset.id     = emp.id;
            card.dataset.nombre = emp.nombre;
            card.dataset.puesto = emp.puesto ?? "— sin puesto —";

            const img = document.createElement("img");
            img.src = `/web/Images/${emp.imagen || "default.jpg"}`;
            img.alt = `${emp.nombre} Foto`;
            img.classList.add("empleado-img");

            const info = document.createElement("div");
            info.classList.add("empleado-info");

            const nombre = document.createElement("p");
            nombre.textContent = emp.nombre;
            nombre.classList.add("empleado-nombre");

            const puesto = document.createElement("p");
            puesto.textContent = emp.puesto ?? "— sin puesto —";
            puesto.classList.add("empleado-puesto");

            info.append(nombre, puesto);
            card.append(img, info);

            card.addEventListener("click", () => {
              window.empleadoSeleccionadoID = emp.id;
              document.querySelectorAll(".empleado-card.selected")
                      .forEach(c => c.classList.remove("selected"));
              card.classList.add("selected");
              document.querySelectorAll(".modal.active")
                      .forEach(m => m.classList.remove("active"));
              opcionesEdicion.style.display = "block";
            });

            listaEmpleados.appendChild(card);
          });
        })
        .catch(err => console.error("Error al obtener empleados:", err));
    });
  } else {
    console.warn("⚠️ Botón 'editar-empleado' no encontrado (está comentado en el HTML)");
  }

  listaEmpleados.addEventListener("click", e => {
    const card = e.target.closest(".empleado-card");
    if (!card) return;

    window.empleadoSeleccionadoID = card.dataset.id;
    document.querySelectorAll(".empleado-card.selected")
            .forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");

    document.querySelectorAll(".modal.active")
            .forEach(m => m.classList.remove("active"));
    opcionesEdicion.style.display = "block";
  });

  btnVolverEditar.addEventListener("click", () => {
    seccionEditar.style.display = "none";
    menuPrincipal.style.display = "flex";
  });

  function cerrarModal(id) {
    const m = document.getElementById(id);
    m && m.classList.remove("active");
  }
*/
// ==================== FIN CÓDIGO ANTIGUO ====================
// ==================== FIN CÓDIGO ANTIGUO ====================
