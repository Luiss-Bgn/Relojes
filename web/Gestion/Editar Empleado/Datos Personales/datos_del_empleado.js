// Función helper para obtener el nombre del usuario logueado
function obtenerNombreUsuarioLogueado() {
  const loggedUserString = localStorage.getItem('loggedUser');
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : null;
  return loggedUser ? (loggedUser.nombre || loggedUser.name || loggedUser.username || 'Usuario') : 'Usuario';
}

// Función para mostrar los datos personales del empleado
export async function mostrarDatosPersonales() {
    if (!window.empleadoSeleccionadoID) {
        alert("Selecciona un empleado primero.");
        return;
    }

    // Crear o mostrar el modal de datos personales
    let modal = document.getElementById('modal-edit-personal-data');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-edit-personal-data';
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        document.body.appendChild(modal);
        
        // Cerrar modal al hacer click fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        });
    }

    // Usar la lógica existente del módulo datos_empleado.js
    const { default: datosEmpleadoModule } = await import('./datos_empleado.js');
    
    // Obtener el nombre del empleado seleccionado desde el backend
    let nombreEmpleado = "Empleado";
    try {
        const empleadoResp = await fetch(`/empleados/${window.empleadoSeleccionadoID}`);
        if (empleadoResp.ok) {
            const empleadoData = await empleadoResp.json();
            nombreEmpleado = empleadoData.nombre || "Empleado";
        }
    } catch (err) {
        console.error("Error al obtener nombre del empleado:", err);
    }
    
    modal.innerHTML = `
        <div class="form-modal-container" style="
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        ">
            <div style="text-align: center; padding: 10px 0; margin-bottom: 15px; border-bottom: 1px solid #e0e0e0;">
                <span style="font-size: 0.95rem; color: #666; font-weight: 500;">
                    Editando a: <strong style="color: #333;">${nombreEmpleado}</strong>
                </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #333;">Datos del Empleado</h2>
                <button class="close" id="close-datos-modal" style="
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: #aaa;
                ">&times;</button>
            </div>
            <div id="datos-content">Cargando información...</div>
        </div>
    `;

    // Agregar evento al botón cerrar
    const closeBtn = modal.querySelector('#close-datos-modal');
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        modal.style.display = 'none';
    });

    modal.classList.add('active');
    modal.style.display = 'flex';

    // Cargar y mostrar los datos del empleado
    await cargarDatosEmpleado();
}

// Función auxiliar para cargar y mostrar los datos del empleado
async function cargarDatosEmpleado() {
    const contentDiv = document.getElementById('datos-content');
    
    try {
        const [empleado, user, relojes] = await Promise.all([
            fetch(`/empleados/${window.empleadoSeleccionadoID}`).then(r => r.json()),
            fetch(`/user/${window.empleadoSeleccionadoID}`).then(r => r.json()),
            fetch('/relojes_conectados.json').then(r => r.json())
        ]);

        // Determinar reloj asignado
        const empleadoIdStr = String(empleado.id ?? empleado._id ?? empleado.empleado_id);
        const relojAsignado = relojes.find(r => String(r.empleado_id) === empleadoIdStr);

        contentDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                ${empleado.imagen ? `
                    <div style="text-align: center;">
                        <img src="/web/Images/${empleado.imagen}" 
                             alt="${empleado.nombre}" 
                             style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #ddd;">
                    </div>
                ` : `
                    <div style="text-align: center; padding: 20px; background: #f5f5f5; border-radius: 10px;">
                        <div style="font-size: 48px; color: #ccc;">👤</div>
                        <p style="margin: 10px 0 0 0; color: #666;">Sin imagen</p>
                    </div>
                `}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="info-field">
                        <label>Nombre:</label>
                        <span>${empleado.nombre || 'No especificado'}</span>
                    </div>
                    
                    <div class="info-field">
                        <label>Puesto:</label>
                        <span>${empleado.puesto || 'No especificado'}</span>
                    </div>
                    
                    <div class="info-field">
                        <label>Usuario:</label>
                        <span>${user.username || 'No especificado'}</span>
                    </div>
                    
                    <div class="info-field">
                        <label>Rol:</label>
                        <span style="
                            padding: 4px 8px;
                            border-radius: 12px;
                            font-size: 12px;
                            font-weight: 600;
                            color: white;
                            background: ${(user.role === 'admin' || user.role === 'administrador') ? '#007bff' : user.role === 'supervisor' ? '#ff9800' : user.role === 'empleado' ? '#28a745' : '#6c757d'};
                        ">${user.role || 'No especificado'}</span>
                    </div>
                    
                    <div class="info-field" style="grid-column: 1 / -1;">
                        <label>Reloj asignado:</label>
                        <span style="
                            padding: 4px 8px;
                            border-radius: 6px;
                            background: ${relojAsignado ? '#d4edda' : '#f8d7da'};
                            color: ${relojAsignado ? '#155724' : '#721c24'};
                            font-weight: 600;
                        ">${relojAsignado ? `Reloj ID: ${relojAsignado.reloj_id}` : 'Sin reloj asignado'}</span>
                    </div>
                    
                    <div class="info-field" style="grid-column: 1 / -1;">
                        <label>ID del empleado:</label>
                        <span style="font-family: monospace; background: #f8f9fa; padding: 4px 8px; border-radius: 4px;">${empleado.id}</span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                    <button id="btn-eliminar-empleado" style="
                        flex: 1;
                        padding: 12px 20px;
                        background: #dc3545;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.3s;
                    " onmouseover="this.style.background='#c82333'" onmouseout="this.style.background='#dc3545'">
                        🗑️ Eliminar Empleado
                    </button>
                </div>
            </div>
        `;

        // Agregar evento al botón de eliminar
        setTimeout(() => {
            const btnEliminar = document.getElementById('btn-eliminar-empleado');
            if (btnEliminar) {
                btnEliminar.addEventListener('click', async () => {
                    await eliminarEmpleado(empleado.id, empleado.nombre);
                });
            }
        }, 100);

        // Agregar estilos CSS para los campos de información
        if (!document.getElementById('datos-info-styles')) {
            const style = document.createElement('style');
            style.id = 'datos-info-styles';
            style.textContent = `
                .info-field {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                
                .info-field label {
                    font-weight: 600;
                    color: #495057;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .info-field span {
                    padding: 10px;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 6px;
                    color: #495057;
                }
            `;
            document.head.appendChild(style);
        }

    } catch (error) {
        console.error('Error cargando datos del empleado:', error);
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
                <h3>Error al cargar los datos</h3>
                <p>No se pudo obtener la información del empleado.</p>
            </div>
        `;
    }
}

export async function editarPersonalData() {
    console.log("Cargando datos personales...");

    if (!window.empleadoSeleccionadoID) {
        alert("Selecciona un empleado antes de editar tareas.");
        return;
    }

    const form = document.getElementById("form-edit-personal-data");
    const data = new FormData(form);
    const imagen = form.querySelector('input[name="img_dp"]').files[0];  // Cambié 'imagen' por 'img_dp'
    console.log("🔎 Imagen enviada: ", imagen);

    console.log("Enviando datos:", data);
    if (imagen) {
        console.log("Archivo de imagen: ", imagen.name, imagen.size, imagen.type);
    } else {
        console.log("No se seleccionó ninguna imagen.");
    }

    try {
        const response = await fetch(`/empleados/${window.empleadoSeleccionadoID}`, {
            method: "PATCH",
            body: data
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error en la solicitud:", errorData);
            alert("Error al actualizar datos.");
            return;
        }

        const resultado = await response.json();
        console.log("Empleado actualizado:", resultado);

        alert("Datos actualizados correctamente.");
        window.location.href = "/gestion";  // Redirigir después de la actualización

    } catch (error) {
        console.error("Error en la actualización:", error);
        alert("Ocurrió un error al actualizar los datos.");
    }
}

// Función para eliminar empleado
async function eliminarEmpleado(empleadoId, nombreEmpleado) {
    // Confirmación doble para evitar eliminaciones accidentales
    const confirmacion1 = confirm(
        `⚠️ ¿Estás seguro de que deseas eliminar al empleado "${nombreEmpleado}"?\n\n` +
        `Esta acción NO se puede deshacer y eliminará:\n` +
        `• Todos los datos personales\n` +
        `• Todas las tareas asignadas\n` +
        `• El acceso al sistema\n` +
        `• La cuenta de usuario asociada`
    );
    
    if (!confirmacion1) {
        return; // Usuario canceló
    }
    
    // Segunda confirmación
    const confirmacion2 = confirm(
        `🔴 ÚLTIMA ADVERTENCIA 🔴\n\n` +
        `¿Confirmas que deseas ELIMINAR PERMANENTEMENTE a "${nombreEmpleado}"?\n\n` +
        `Escribe "SI" en el siguiente diálogo para confirmar.`
    );
    
    if (!confirmacion2) {
        return; // Usuario canceló
    }
    
    const confirmacionFinal = prompt(
        `Para confirmar la eliminación de "${nombreEmpleado}", escribe: SI`
    );
    
    if (confirmacionFinal !== 'SI') {
        alert('Eliminación cancelada. El texto ingresado no coincide.');
        return;
    }
    
    try {
        const response = await fetch(`/empleados/${empleadoId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Error ${response.status}`);
        }
        
        const resultado = await response.json();
        console.log('Empleado eliminado:', resultado);
        
        alert(`✅ El empleado "${nombreEmpleado}" ha sido eliminado correctamente.`);
        
        // Cerrar modal y recargar página
        const modal = document.getElementById('modal-edit-personal-data');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        
        // Redirigir a gestión
        window.location.href = '/gestion';
        
    } catch (error) {
        console.error('Error al eliminar empleado:', error);
        alert(`❌ Error al eliminar el empleado: ${error.message}`);
    }
}
