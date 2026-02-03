// archivo: crearEmpleado.js

document.addEventListener("DOMContentLoaded", async function () {
  console.log("🔵 Script crear.js cargado");
  
  const formCrear = document.getElementById("form-create-empleado");
  const btnVolverCrear = document.getElementById("btn-volver-crear");
  const btnCrearEmpleado = document.getElementById("crear-empleado");
  const seccionCrear = document.getElementById("seccion-crear");
  const menuPrincipal = document.getElementById("menu-principal");
  let formularioDinamico = null;
  
  console.log("🔍 Elementos encontrados:", {
    formCrear: !!formCrear,
    btnVolverCrear: !!btnVolverCrear,
    btnCrearEmpleado: !!btnCrearEmpleado,
    seccionCrear: !!seccionCrear,
    menuPrincipal: !!menuPrincipal
  });
  
  // 🔹 Obtener rol actual del usuario logueado desde localStorage
  let rolUsuarioActual = null;
  try {
    const loggedUserString = localStorage.getItem('loggedUser');
    const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : null;
    
    if (loggedUser && loggedUser.role) {
      rolUsuarioActual = loggedUser.role;
      console.log("Rol del usuario actual:", rolUsuarioActual);
    } else {
      // Fallback: intentar obtener desde el endpoint
      const resp = await fetch("/auth/usuario");
      if (resp.ok) {
        const data = await resp.json();
        rolUsuarioActual = data.role;
      }
    }
  } catch (err) {
    console.error("No se pudo obtener el rol del usuario:", err);
    // Fallback por defecto
    rolUsuarioActual = "empleado";
  }

  // ========== FUNCIONALIDAD ORIGINAL ==========
  if (formCrear) {
    // 🔥 Remover listeners previos clonando el formulario
    const newFormCrear = formCrear.cloneNode(true);
    formCrear.parentNode.replaceChild(newFormCrear, formCrear);
    
    newFormCrear.addEventListener("submit", async function (event) {
      event.preventDefault();
      event.stopPropagation(); // 🔥 Prevenir propagación
      await enviarFormularioEmpleado();
    });
  }

  if (btnVolverCrear) {
    btnVolverCrear.addEventListener("click", function () {
      if (seccionCrear) seccionCrear.style.display = "none";
      menuPrincipal.style.display = "flex";
      menuPrincipal.style.opacity = "1";
      menuPrincipal.style.pointerEvents = "all";
    });
  }

  if (btnCrearEmpleado) {
    console.log("✅ Botón 'Crear Empleado' encontrado, registrando evento click");
    btnCrearEmpleado.addEventListener("click", function () {
      console.log("🎯 Click en botón 'Crear Empleado'");
      menuPrincipal.style.display = "none";
      menuPrincipal.style.pointerEvents = "none";

      if (seccionCrear) {
        console.log("📝 Mostrando sección existente");
        seccionCrear.style.display = "block";
      } else {
        console.log("🏗️ Creando formulario dinámico");
        crearFormularioDinamico();
      }
    });
  } else {
    // console.log("ℹ️ Botón 'crear-empleado' no encontrado (funcionalidad manejada por gestion.js)");
  }

  // ========== NUEVA FUNCIONALIDAD ==========
  function crearFormularioDinamico() {
    formularioDinamico = document.createElement('div');
    formularioDinamico.id = "seccion-crear-dinamica";
    formularioDinamico.className = "section-form";

    // 🔹 Generar opciones del select según rol del usuario actual
    let opcionesRol = `<option value="" disabled selected></option>`;
    if (rolUsuarioActual === "admin") {
      opcionesRol += `
        <option value="empleado">Empleado</option>
        <option value="supervisor">Supervisor</option>
        <option value="admin">Admin</option>`;
    } else if (rolUsuarioActual === "supervisor") {
      opcionesRol += `<option value="empleado">Empleado</option>`;
    } else {
      opcionesRol += `<option value="empleado" disabled>No autorizado</option>`;
    }

    formularioDinamico.innerHTML = `
      <div class="form-scope">
        <div class="form-scope-container">
          <h2>Crear Cuenta</h2>
          <br><br>
          <form id="form-create-empleado-dinamico" method="POST" enctype="multipart/form-data">
            <div class="inputGroup">
              <input type="text" id="nombre" name="nombre" required>
              <label for="nombre">Nombre:</label>
            </div>
            <div class="inputGroup">
              <input type="text" id="puesto" name="puesto" required>
              <label for="puesto">Puesto:</label>
            </div>
            <div class="inputGroup">
              <input type="text" id="username" name="username" required>
              <label for="username">Nombre de usuario:</label>
              <span id="username-validation" style="font-size: 0.85rem; margin-top: 4px; display: block;"></span>
            </div>
            <div class="inputGroup">
              <input type="password" id="password" name="password" required>
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
            <div class="inputGroup" style="display: flex; flex-direction: column; gap: 8px;">
              <label style="font-size: 0.9rem; color: #666; font-weight: 500;">Foto (opcional):</label>
              <label for="imagen" class="file-upload-label">
                <span class="file-upload-text">Subir imagen</span>
              </label>
              <input type="file" id="imagen" name="imagen" accept="image/*" style="display: none;">
              <span id="file-name-display" style="font-size: 0.85rem; color: #666;"></span>
            </div>
            <button type="submit">Crear Empleado</button>
          </form>
          <button id="btn-volver-crear-dinamico">Volver</button>
        </div>
      </div>
    `;

    document.querySelector('.container').appendChild(formularioDinamico);
    inicializarEventosDinamicos();
  }

  function inicializarEventosDinamicos() {
    const formDinamico = document.getElementById("form-create-empleado-dinamico");
    const btnVolverDinamico = document.getElementById("btn-volver-crear-dinamico");

    if (formDinamico) {
      // 🔥 VALIDACIÓN EN TIEMPO REAL DEL USERNAME
      const usernameInput = formDinamico.querySelector('#username');
      const validationSpan = formDinamico.querySelector('#username-validation');
      const submitBtn = formDinamico.querySelector('button[type="submit"]');
      let debounceTimer;
      
      // 🔥 VALIDACIÓN EN TIEMPO REAL DEL PIN
      const pinInput = formDinamico.querySelector('#pin');
      const pinValidationSpan = formDinamico.querySelector('#pin-validation');
      let pinDebounceTimer;
      
      // 🔥 Mostrar nombre del archivo seleccionado
      const imagenInput = formDinamico.querySelector('#imagen');
      const fileNameDisplay = formDinamico.querySelector('#file-name-display');
      
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
      
      if (pinInput && pinValidationSpan) {
        pinInput.addEventListener('input', function(e) {
          clearTimeout(pinDebounceTimer);
          let pin = this.value.trim();
          
          // Permitir solo números
          pin = pin.replace(/\D/g, '');
          this.value = pin;
          
          if (!pin) {
            pinValidationSpan.textContent = '';
            pinValidationSpan.style.color = '';
            return;
          }
          
          if (pin.length !== 4) {
            pinValidationSpan.textContent = `❌ El PIN debe tener 4 dígitos (${pin.length}/4)`;
            pinValidationSpan.style.color = '#ff9800';
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
          }, 500);
        });
      }
      
      formDinamico.addEventListener("submit", async function (event) {
        event.preventDefault();
        event.stopPropagation(); // 🔥 Prevenir propagación
        await enviarFormularioEmpleado();
      }, { once: false });
    }

    if (btnVolverDinamico) {
      btnVolverDinamico.addEventListener("click", function () {
        if (formularioDinamico) formularioDinamico.remove();
        menuPrincipal.style.display = "flex";
        menuPrincipal.style.opacity = "1";
        menuPrincipal.style.pointerEvents = "all";
      });
    }
  }
});

// Función de envío
let isSubmittingCrear = false; // 🔥 Bandera para prevenir envíos duplicados

export async function enviarFormularioEmpleado() {
  // 🔥 Prevenir envíos duplicados
  if (isSubmittingCrear) {
    console.warn("⚠️ Ya se está enviando un formulario");
    return;
  }
  
  const form = document.getElementById("form-create-empleado") ||
               document.getElementById("form-create-empleado-dinamico");

  const formData = new FormData(form);
  const validationSpan = form.querySelector('#username-validation');
  
  // 🔥 VALIDAR QUE NO HAYA CAMPOS VACÍOS
  const username = formData.get("username");
  const password = formData.get("password");
  const pin = formData.get("pin");
  const role = formData.get("role");
  const nombre = formData.get("nombre");
  const puesto = formData.get("puesto");
  
  // 🔥 Limpiar username (eliminar espacios)
  const cleanUsername = username ? username.trim() : "";
  const cleanPin = pin ? pin.trim() : "";
  
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
  
  // 🔥 VALIDAR PIN
  if (!cleanPin) {
    if (validationSpan) {
      validationSpan.textContent = '❌ El código PIN es obligatorio';
      validationSpan.style.color = '#ff0000';
    }
    return;
  }
  
  if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
    if (validationSpan) {
      validationSpan.textContent = '❌ El PIN debe ser de 4 dígitos numéricos';
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

  // 🔥 Activar bandera de envío
  isSubmittingCrear = true;
  
  // 🔥 Deshabilitar botón de submit
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Creando...";
    submitBtn.style.backgroundColor = "#999";
  }

  try {
    // 🔥 PREPARAR DATOS EN FORMATO JSON (no FormData)
    const datosUsuario = {
      nombre: formData.get("nombre"),
      username: formData.get("username"),
      contraseña: formData.get("password"), // Se envía como "contraseña" en el JSON
      pin: parseInt(formData.get("pin")), // Convertir a número
      rol: formData.get("role"),
      puesto: formData.get("puesto")
    };
    
    // 🔥 Si hay imagen, se captura por separado (no incluirla en el JSON principal si se decide no enviarla)
    const imagenFile = form.querySelector('#imagen')?.files?.[0];
    
    console.log("📤 Enviando datos a /usuarios:", datosUsuario);
    
    const response = await fetch("/usuarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(datosUsuario)
    });

    if (response.ok) {
      const resultado = await response.json();
      console.log("✅ Empleado creado:", resultado);
      
      // 🔥 ÉXITO: Botón verde y mensaje
      if (submitBtn) {
        submitBtn.style.backgroundColor = "#4caf50";
        submitBtn.style.color = "white";
        submitBtn.textContent = "✓ Empleado Creado";
      }
      
      if (validationSpan) {
        validationSpan.textContent = '✅ Empleado creado exitosamente';
        validationSpan.style.color = '#4caf50';
      }
      
      // 🔥 Redirigir después de 2 segundos
      setTimeout(() => {
        window.location.href = "/gestion";
      }, 2000);
    } else {
      const error = await response.json();
      console.error("❌ Error del servidor:", error);
      
      // 🔥 ERROR: Mostrar mensaje debajo del username
      if (validationSpan) {
        validationSpan.textContent = '❌ ' + (error.detail || error.error || 'Error al crear empleado');
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
    console.error("❌ Error al enviar:", error);
    
    if (validationSpan) {
      validationSpan.textContent = '❌ Error de conexión: ' + error.message;
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
    isSubmittingCrear = false;
  }
}
