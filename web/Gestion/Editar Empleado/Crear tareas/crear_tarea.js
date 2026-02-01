// web/gestion/Editar Empleado/Crear tareas/crear_tarea.js
import { enviarTarea } from "./crear_tarea_enviar.js";

// Función helper para obtener el nombre del usuario logueado
function obtenerNombreUsuarioLogueado() {
  const loggedUserString = localStorage.getItem('loggedUser');
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : null;
  return loggedUser ? (loggedUser.nombre || loggedUser.name || loggedUser.username || 'Usuario') : 'Usuario';
}

export function abrirFormularioCrearTarea(empId, empName) {
  // Cierra cualquier modal activo
  document.querySelectorAll(".modal.active").forEach(m => m.classList.remove("active"));

  const modal = document.getElementById("modal-create-task");
  const nombreEmpleado = empName || "Empleado";

  modal.innerHTML = `
    <div class="form-scope-container" style="position: relative; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 95%; max-width: 950px;">
      <!-- Header con gradiente -->
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 18px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div>
          <h3 style="margin: 0 0 4px 0; color: white; font-size: 1.2rem; font-weight: 600;">➕ Crear Nueva Tarea</h3>
          <span style="font-size: 0.85rem; color: rgba(255,255,255,0.85);">
            Para: <strong>${nombreEmpleado}</strong>
          </span>
        </div>
        <button type="button" id="close-create-task-x" style="
          background: rgba(255, 255, 255, 0.15);
          border: none;
          font-size: 22px;
          cursor: pointer;
          color: white;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='rgba(255,255,255,0.25)'" 
           onmouseout="this.style.background='rgba(255,255,255,0.15)'">
          &times;
        </button>
      </div>
      
      <!-- Contenido del formulario -->
      <div style="padding: 16px 24px;">
      <form id="tareaForm">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
          <div class="inputGroup">
            <label for="nombreTarea" style="display: block; margin-bottom: 6px; font-weight: 600; color: #444; font-size: 13px;">Nombre de la tarea *</label>
            <input type="text" id="nombreTarea" required style="width: 100%; padding: 12px; border: 2px solid #e8eaed; border-radius: 10px; font-size: 14px; box-sizing: border-box; transition: border-color 0.2s;" 
                   onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e8eaed'">
          </div>
          <div class="inputGroup">
            <label for="descripcionTarea" style="display: block; margin-bottom: 6px; font-weight: 600; color: #444; font-size: 13px;">Descripción *</label>
            <input type="text" id="descripcionTarea" required style="width: 100%; padding: 12px; border: 2px solid #e8eaed; border-radius: 10px; font-size: 14px; box-sizing: border-box; transition: border-color 0.2s;"
                   onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e8eaed'">
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 12px;">
          <div class="inputGroup">
            <label for="horaInicio" style="display: block; margin-bottom: 6px; font-weight: 600; color: #444; font-size: 13px;">Hora de inicio *</label>
            <input type="time" id="horaInicio" required style="width: 100%; padding: 12px; border: 2px solid #e8eaed; border-radius: 10px; font-size: 14px; box-sizing: border-box; transition: border-color 0.2s;"
                   onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e8eaed'">
          </div>
          <div class="inputGroup">
            <label for="horaFin" style="display: block; margin-bottom: 6px; font-weight: 600; color: #444; font-size: 13px;">Hora fin (opcional)</label>
            <input type="time" id="horaFin" style="width: 100%; padding: 12px; border: 2px solid #e8eaed; border-radius: 10px; font-size: 14px; box-sizing: border-box; transition: border-color 0.2s;"
                   onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e8eaed'">
          </div>
          <div class="inputGroup">
            <label for="puntajeTarea" style="display: block; margin-bottom: 6px; font-weight: 600; color: #444; font-size: 13px;">Puntaje (1-10) *</label>
            <input type="number" id="puntajeTarea" min="1" max="10" required style="width: 100%; padding: 12px; border: 2px solid #e8eaed; border-radius: 10px; font-size: 14px; box-sizing: border-box; transition: border-color 0.2s;"
                   onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e8eaed'">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 12px; margin-top: 16px;">
          <div class="inputGroup">
            <label for="disponibleParaRol" style="display: block; margin-bottom: 6px; font-weight: 600; color: #444; font-size: 13px;">🔒 Disponible para *</label>
            <select id="disponibleParaRol" required style="width: 100%; padding: 12px; border: 2px solid #e8eaed; border-radius: 10px; font-size: 14px; box-sizing: border-box; transition: border-color 0.2s; background: white; cursor: pointer;"
                   onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e8eaed'">
              <option value="todos">👥 Todos los empleados</option>
              <option value="mismo_rol">🔐 Solo mi rol</option>
            </select>
            <span style="font-size: 11px; color: #999; margin-top: 4px; display: block;">Si la tarea expira, aparecerá como 'extra' solo a quienes selecciones</span>
          </div>
        </div>

        <div style="margin-top: 8px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #444; font-size: 13px;">📅 Días de la Semana *</label>
          <div class="checkbox-container" id="diasContainer" style="display: flex; flex-wrap: wrap; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: #f8f9fa; border: 2px solid #e8eaed; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                   onmouseover="this.style.borderColor='#667eea'; this.style.background='#f0f4ff'" onmouseout="if(!this.querySelector('input').checked){this.style.borderColor='#e8eaed'; this.style.background='#f8f9fa'}">
              <input type="checkbox" value="domingo" name="dias" class="dia-checkbox" style="width: 16px; height: 16px; accent-color: #667eea;"> <span style="font-size: 13px; font-weight: 500;">Dom</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: #f8f9fa; border: 2px solid #e8eaed; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                   onmouseover="this.style.borderColor='#667eea'; this.style.background='#f0f4ff'" onmouseout="if(!this.querySelector('input').checked){this.style.borderColor='#e8eaed'; this.style.background='#f8f9fa'}">
              <input type="checkbox" value="lunes" name="dias" class="dia-checkbox" style="width: 16px; height: 16px; accent-color: #667eea;"> <span style="font-size: 13px; font-weight: 500;">Lun</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: #f8f9fa; border: 2px solid #e8eaed; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                   onmouseover="this.style.borderColor='#667eea'; this.style.background='#f0f4ff'" onmouseout="if(!this.querySelector('input').checked){this.style.borderColor='#e8eaed'; this.style.background='#f8f9fa'}">
              <input type="checkbox" value="martes" name="dias" class="dia-checkbox" style="width: 16px; height: 16px; accent-color: #667eea;"> <span style="font-size: 13px; font-weight: 500;">Mar</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: #f8f9fa; border: 2px solid #e8eaed; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                   onmouseover="this.style.borderColor='#667eea'; this.style.background='#f0f4ff'" onmouseout="if(!this.querySelector('input').checked){this.style.borderColor='#e8eaed'; this.style.background='#f8f9fa'}">
              <input type="checkbox" value="miercoles" name="dias" class="dia-checkbox" style="width: 16px; height: 16px; accent-color: #667eea;"> <span style="font-size: 13px; font-weight: 500;">Mié</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: #f8f9fa; border: 2px solid #e8eaed; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                   onmouseover="this.style.borderColor='#667eea'; this.style.background='#f0f4ff'" onmouseout="if(!this.querySelector('input').checked){this.style.borderColor='#e8eaed'; this.style.background='#f8f9fa'}">
              <input type="checkbox" value="jueves" name="dias" class="dia-checkbox" style="width: 16px; height: 16px; accent-color: #667eea;"> <span style="font-size: 13px; font-weight: 500;">Jue</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: #f8f9fa; border: 2px solid #e8eaed; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                   onmouseover="this.style.borderColor='#667eea'; this.style.background='#f0f4ff'" onmouseout="if(!this.querySelector('input').checked){this.style.borderColor='#e8eaed'; this.style.background='#f8f9fa'}">
              <input type="checkbox" value="viernes" name="dias" class="dia-checkbox" style="width: 16px; height: 16px; accent-color: #667eea;"> <span style="font-size: 13px; font-weight: 500;">Vie</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: #f8f9fa; border: 2px solid #e8eaed; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                   onmouseover="this.style.borderColor='#667eea'; this.style.background='#f0f4ff'" onmouseout="if(!this.querySelector('input').checked){this.style.borderColor='#e8eaed'; this.style.background='#f8f9fa'}">
              <input type="checkbox" value="sabado" name="dias" class="dia-checkbox" style="width: 16px; height: 16px; accent-color: #667eea;"> <span style="font-size: 13px; font-weight: 500;">Sáb</span>
            </label>
          </div>
        </div>
        <div style="background: #fef3c7; border-radius: 6px; padding: 8px 12px; margin: 10px 0; border-left: 3px solid #f59e0b; display: inline-block;">
          <span style="color: #92400e; font-size: 12px;">* Campos obligatorios</span>
        </div>

        <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 2px solid #e8eaed;">
          <button type="button" id="cancelarBtn" style="
            padding: 12px 24px;
            background: #f1f3f4;
            color: #5f6368;
            border: 2px solid #dadce0;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='#e8eaed'; this.style.color='#333'" onmouseout="this.style.background='#f1f3f4'; this.style.color='#5f6368'">
            Cancelar
          </button>
          <button type="submit" id="asignarTareaBtn" style="
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102,126,234,0.45)'" 
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102,126,234,0.35)'">
            ✅ Asignar Tarea
          </button>
        </div>
        
        <!-- 🔥 NUEVO: Contenedor para mensajes de resultado -->
        <div id="mensaje-resultado" style="display: none; margin-top: 12px; padding: 12px 14px; border-radius: 8px; animation: slideIn 0.3s ease-out; word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap; max-width: 100%; box-sizing: border-box;"></div>
        
        <style>
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
        </style>
      </form>
      </div>
    </div>
  `;

  modal.classList.add("active");
  modal.classList.remove("hidden");

  // Obtener referencias
  const form = document.getElementById("tareaForm");
  const cancelarBtn = document.getElementById("cancelarBtn");
  const closeXBtn = document.getElementById("close-create-task-x");

  // Función para cerrar el modal
  const cerrarModal = () => {
    console.log('🔴 Cerrando modal de crear tarea');
    modal.classList.remove("active");
    modal.classList.add("hidden");
  };

  // Cerrar con botón X
  if (closeXBtn) {
    closeXBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cerrarModal();
    });
  }

  // Cerrar al hacer click fuera del modal
  const handleOutsideClick = (e) => {
    if (e.target === modal) {
      console.log('🔴 Cerrando modal por click fuera');
      cerrarModal();
    }
  };
  // Remover listener anterior si existe
  modal.removeEventListener('click', handleOutsideClick);
  // Agregar nuevo listener
  modal.addEventListener('click', handleOutsideClick);

  // Cancelar
  cancelarBtn.addEventListener("click", cerrarModal);

  // Submit del formulario con validación de días
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    
    // Validar que al menos un día esté seleccionado
    const diasSeleccionados = document.querySelectorAll(".dia-checkbox:checked");
    if (diasSeleccionados.length === 0) {
      // Mostrar mensaje compacto en vez de alert
      const contenedor = document.getElementById('mensaje-resultado');
      if (contenedor) {
        contenedor.style.cssText = `
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          padding: 10px 14px;
          border-radius: 8px;
          background: #fef2f2;
          border: 1px solid #ef444422;
          border-left: 3px solid #ef4444;
          animation: slideIn 0.25s ease-out;
        `;
        contenedor.innerHTML = `
          <span style="
            width: 20px; height: 20px; 
            background: #ef4444; 
            color: white; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 11px; 
            font-weight: bold;
            flex-shrink: 0;
          ">!</span>
          <span style="font-size: 13px; color: #991b1b; line-height: 1.3;">
            <strong>Selecciona un día</strong> — Elige al menos un día de la semana
          </span>
        `;
      }
      return;
    }
    
    // Limpiar mensaje anterior si existe
    const contenedor = document.getElementById('mensaje-resultado');
    if (contenedor) {
      contenedor.style.display = 'none';
    }
    
    // Si todo está bien, enviar la tarea
    enviarTarea(empId);
  });
} export default(abrirFormularioCrearTarea)
