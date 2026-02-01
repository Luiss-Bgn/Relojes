/* editar_tarea.js */
import { update } from "./editar_tarea_send.js";
import { deleteTarea } from "./editar_tarea_send.js";

// Función helper para obtener el nombre del usuario logueado
function obtenerNombreUsuarioLogueado() {
  const loggedUserString = localStorage.getItem('loggedUser');
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : null;
  return loggedUser ? (loggedUser.nombre || loggedUser.name || loggedUser.username || 'Usuario') : 'Usuario';
}

document.addEventListener("DOMContentLoaded", () => {
  const btnEditTarea = document.getElementById("btn-editar-tarea");
  if (!btnEditTarea) return;

  const closeActiveModals = () => {
    document.querySelectorAll(".modal.active")
      .forEach(m => m.classList.remove("active"));
  };

  btnEditTarea.addEventListener("click", () => {
    if (!window.empleadoSeleccionadoID) {
      alert("Selecciona un empleado primero.");
      return;
    }
    closeActiveModals();
    const modal = document.getElementById("modal-edit-task");
    if (!modal) {
      console.warn("No existe #modal-edit-task en el DOM.");
      return;
    }
    modal.classList.add("active");
    mostrar_edit();
  });
});

function esc(str = "") {
  const map = { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

// Función para obtener el lunes de una semana
function getWeekStartForDate(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export function mostrar_edit() {
  const id = window.empleadoSeleccionadoID;
  if (!id) {
    console.warn("No hay empleado seleccionado");
    return;
  }

  const modal = document.getElementById("modal-edit-task");
  if (!modal) {
    console.error("No se encontró el modal-edit-task");
    return;
  }

  // Hacer el fetch para cargar tareas (SOLO semana actual)
  (async () => {
    try {
      // Cargar datos del empleado (solo semana actual)
      const response = await fetch(`/empleados/${id}`);
      const data = await response.json();

      const nombreEmpleado = data.nombre || "Empleado";
      console.log("Editando empleado:", nombreEmpleado);

      // Las tareas vienen del backend
      console.log("📅 Tareas recibidas:", data.tareas_asignadas);
      console.log("🔍 Claves encontradas:", Object.keys(data.tareas_asignadas || {}));
      
      // Convertir fechas a días de la semana si es necesario
      const claves = Object.keys(data.tareas_asignadas || {});
      let tareasPorDia = {};
      
      if (claves.length > 0 && claves[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.log("📆 Detectadas fechas, convirtiendo a días de semana...");
        
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const firmasUnicas = new Set();
        
        for (const clave in data.tareas_asignadas) {
          const tareas = data.tareas_asignadas[clave];
          const fecha = new Date(clave + 'T00:00:00');
          const diaSemana = diasSemana[fecha.getDay()];
          
          if (!tareasPorDia[diaSemana]) {
            tareasPorDia[diaSemana] = [];
          }
          
          // Deduplicar por firma: nombre + día + hora inicio + hora fin
          tareas.forEach(t => {
            const firma = `${t.nombre}|${diaSemana}|${t.hora_inicio}|${t.hora_fin}`;
            if (!firmasUnicas.has(firma)) {
              t.fecha_visual = clave;
              tareasPorDia[diaSemana].push(t);
              firmasUnicas.add(firma);
              console.log(`  ✅ ${diaSemana}: ${t.nombre} (ID: ${t.id}, hora: "${t.hora}", hora_inicio: "${t.hora_inicio}", hora_fin: "${t.hora_fin}")`);
            } else {
              console.log(`  ⏭️ Duplicado omitido: ${t.nombre} (${firma})`);
            }
          });
        }
        
        console.log("📊 Total tareas únicas:", firmasUnicas.size);
        data.tareas_asignadas = tareasPorDia;
      }

      // Estructura base del modal
      modal.innerHTML = `
        <div class="form-scope-container" style="position: relative; padding: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 98%; max-width: 1600px;">
          <!-- Header con gradiente -->
          <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 18px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <div>
              <h2 style="margin: 0 0 4px 0; color: white; font-size: 1.2rem; font-weight: 600;">✏️ Editar Tareas</h2>
              <span style="font-size: 0.85rem; color: rgba(255,255,255,0.85);">
                Empleado: <strong>${esc(data.nombre || "Empleado")}</strong>
              </span>
            </div>
            <button type="button" id="close-edit-modal" style="
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
          
          <!-- Contenido con scroll horizontal -->
          <div class="modal-body" style="padding: 16px 20px; max-height: calc(85vh - 80px); overflow-y: auto; overflow-x: auto;"></div>
        </div>
      `;

      const cont = modal.querySelector(".form-scope-container");
      const modalBody = modal.querySelector(".modal-body");

      // Función para cerrar el modal
      const cerrarModal = () => {
        console.log("🔴 Cerrando modal de editar tarea");
        modal.classList.remove("active");
        modal.style.display = 'none';
      };

      // Cerrar modal con botón X
      const closeBtn = modal.querySelector("#close-edit-modal");
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          cerrarModal();
        });
        console.log("✅ Event listener de cierre registrado");
      } else {
        console.warn("⚠️ No se encontró el botón de cerrar");
      }

      // Cerrar al hacer click fuera del modal
      const handleOutsideClick = (e) => {
        if (e.target === modal) {
          console.log("🔴 Cerrando modal por click fuera");
          cerrarModal();
        }
      };
      
      // Remover listener anterior si existe para evitar duplicados
      modal.removeEventListener("click", handleOutsideClick);
      // Agregar nuevo listener
      modal.addEventListener("click", handleOutsideClick);

      if (!data.tareas_asignadas) return;

      // Crear contenedor de columnas para los días (layout horizontal)
      const diasContainer = document.createElement("div");
      diasContainer.className = "days-grid-container";
      diasContainer.style.cssText = `
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        gap: 12px !important;
        align-items: stretch !important;
        min-width: max-content !important;
        padding-bottom: 10px;
      `;

      // Orden de los días
      const ordenDias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
      
      ordenDias.forEach((dia) => {
        const tareas = data.tareas_asignadas[dia];
        if (!Array.isArray(tareas) || tareas.length === 0) return;

        // Columna del día
        const dayColumn = document.createElement("div");
        dayColumn.className = "day-column";
        dayColumn.style.cssText = `
          background: linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%) !important;
          border: 2px solid #e8eaed !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          width: 180px !important;
          min-width: 180px !important;
          max-width: 180px !important;
          flex: 0 0 180px !important;
        `;

        // Header del día
        const dayHeader = document.createElement("div");
        dayHeader.style.cssText = `
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 10px 14px;
          font-weight: 600;
          font-size: 14px;
          text-align: center;
          text-transform: capitalize;
        `;
        dayHeader.textContent = dia.charAt(0).toUpperCase() + dia.slice(1);
        dayColumn.appendChild(dayHeader);

        // Contenedor de tareas del día
        const tasksContainer = document.createElement("div");
        tasksContainer.style.cssText = "padding: 12px;";

        tareas.forEach((tarea) => {
          const form = document.createElement("form");
          form.className = "task-form";
          form.setAttribute("data-dia", dia);
          if (tarea.id != null) form.setAttribute("data-tarea-id", String(tarea.id));
          form.style.cssText = `
            background: #ffffff;
            border: 1px solid #e8eaed;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 10px;
          `;

          form.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div class="field">
                <label style="display: block; margin-bottom: 2px; font-weight: 600; color: #555; font-size: 10px; text-transform: uppercase;">Nombre</label>
                <input type="text" name="nombre" value="${esc(tarea.nombre || "")}" 
                       style="width: 100%; padding: 6px; border: 1px solid #e0e0e0; border-radius: 5px; font-size: 12px; box-sizing: border-box;"
                       onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 2px rgba(102,126,234,0.15)'" 
                       onblur="this.style.borderColor='#e0e0e0'; this.style.boxShadow='none'" />
              </div>
              <div class="field">
                <label style="display: block; margin-bottom: 2px; font-weight: 600; color: #555; font-size: 10px; text-transform: uppercase;">Descripción</label>
                <input type="text" name="descripcion" value="${esc(tarea.descripcion || "")}" 
                       style="width: 100%; padding: 6px; border: 1px solid #e0e0e0; border-radius: 5px; font-size: 12px; box-sizing: border-box;"
                       onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 2px rgba(102,126,234,0.15)'" 
                       onblur="this.style.borderColor='#e0e0e0'; this.style.boxShadow='none'" />
              </div>
              <div class="field">
                <label style="display: block; margin-bottom: 2px; font-weight: 600; color: #555; font-size: 10px; text-transform: uppercase;">Hora Inicio</label>
                <input type="time" name="hora" value="${esc(tarea.hora_inicio || tarea.hora || "")}" 
                       style="width: 100%; padding: 6px; border: 1px solid #e0e0e0; border-radius: 5px; font-size: 12px; box-sizing: border-box;"
                       onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e0e0e0'" />
              </div>
              <div class="field">
                <label style="display: block; margin-bottom: 2px; font-weight: 600; color: #555; font-size: 10px; text-transform: uppercase;">Hora Fin</label>
                <input type="time" name="hora_fin" value="${esc(tarea.hora_fin || "")}" 
                       style="width: 100%; padding: 6px; border: 1px solid #e0e0e0; border-radius: 5px; font-size: 12px; box-sizing: border-box;"
                       onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e0e0e0'" />
              </div>
              <div class="field">
                <label style="display: block; margin-bottom: 2px; font-weight: 600; color: #555; font-size: 10px; text-transform: uppercase;">Puntos</label>
                <input type="number" name="puntaje" min="0" value="${esc(tarea.puntaje || "0")}" 
                       style="width: 100%; padding: 6px; border: 1px solid #e0e0e0; border-radius: 5px; font-size: 12px; box-sizing: border-box;"
                       onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e0e0e0'" />
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
                <button type="submit" class="btn-save" style="
                  width: 100%;
                  padding: 10px 16px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  border: none;
                  border-radius: 8px;
                  font-size: 13px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                " onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)'" 
                   onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)'">
                   Guardar Cambios
                </button>
                <button type="button" class="btn-delete" style="
                  width: 100%;
                  padding: 10px 16px;
                  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                  color: white;
                  border: none;
                  border-radius: 8px;
                  font-size: 13px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
                " onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(220, 53, 69, 0.4)'" 
                   onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(220, 53, 69, 0.3)'">
                   Eliminar Tarea
                </button>
              </div>
            </div>
          `;

          form.addEventListener("submit", (e) => {
            e.preventDefault();
            
            // Obtener el botón de submit
            const submitButton = form.querySelector('button[type="submit"]');
            
            const nombre = form.elements["nombre"]?.value ?? "";
            const descripcion = form.elements["descripcion"]?.value ?? "";
            const hora = form.elements["hora"]?.value ?? "";
            const hora_fin = form.elements["hora_fin"]?.value ?? "";
            const puntaje = form.elements["puntaje"]?.value ?? "0";

            // Conserva el ID y el resto de campos que tu backend necesita
            const payload = {
              ...tarea,
              nombre,
              descripcion,
              hora,
              hora_fin: hora_fin || null,
              puntaje: parseInt(puntaje) || 0
            };

            // Pasar el botón como tercer parámetro
            update(payload, dia, submitButton);
          });

          // Evento para el botón de eliminar
          const deleteBtn = form.querySelector('.btn-delete');
          if (deleteBtn) {
            deleteBtn.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              // Confirmación antes de eliminar
              if (confirm(`¿Estás seguro de que quieres eliminar la tarea "${tarea.nombre || "Sin nombre"}"?`)) {
                deleteTarea(tarea.id, dia, deleteBtn, () => {
                  // Callback: recargar las tareas cuando se complete la eliminación
                  mostrar_edit();
                });
              }
            });
          }

          tasksContainer.appendChild(form);
        });

        dayColumn.appendChild(tasksContainer);
        diasContainer.appendChild(dayColumn);
      });

      modalBody.appendChild(diasContainer);
    } catch (err) {
      console.error("Error al obtener tareas:", err);
      alert("No se pudo cargar la información del empleado.");
    }
  })();
}
