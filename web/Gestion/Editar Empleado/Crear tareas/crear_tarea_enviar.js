// web/gestion/Editar Empleado/Crear tareas/crear_tarea_enviar.js

/**
 * 🔥 NUEVO: Función para mostrar mensajes elegantes en el formulario
 * @param {string} tipo - 'success', 'warning', 'error'
 * @param {string} titulo - Título del mensaje
 * @param {string} mensaje - Contenido del mensaje
 * @param {boolean} autoClose - Si debe cerrar el modal automáticamente
 */
function mostrarMensajeResultado(tipo, titulo, mensaje, autoClose = false) {
  const contenedor = document.getElementById('mensaje-resultado');
  if (!contenedor) return;
  
  const estilos = {
    success: {
      bg: '#f0fdf4',
      border: '#22c55e',
      icon: '✓',
      iconBg: '#22c55e',
      textColor: '#166534'
    },
    warning: {
      bg: '#fffbeb',
      border: '#f59e0b',
      icon: '📅',
      iconBg: '#f59e0b',
      textColor: '#92400e'
    },
    error: {
      bg: '#fef2f2',
      border: '#ef4444',
      icon: '✕',
      iconBg: '#ef4444',
      textColor: '#991b1b'
    }
  };
  
  const estilo = estilos[tipo] || estilos.success;
  
  contenedor.style.cssText = `
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 0;
    padding: 8px 12px;
    border-radius: 8px;
    background: ${estilo.bg};
    border: 1px solid ${estilo.border}22;
    border-left: 3px solid ${estilo.border};
    animation: slideIn 0.25s ease-out;
  `;
  
  contenedor.innerHTML = `
    <span style="
      width: 20px; height: 20px; 
      background: ${estilo.iconBg}; 
      color: white; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 11px; 
      font-weight: bold;
      flex-shrink: 0;
    ">${estilo.icon}</span>
    <span style="font-size: 13px; color: ${estilo.textColor}; line-height: 1.3; word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap; flex: 1;">
      <strong>${titulo}</strong>${mensaje ? '\n' + mensaje : ''}
    </span>
  `;
  
  // Si es éxito y autoClose, cerrar después de 2 segundos
  if (autoClose && (tipo === 'success' || tipo === 'warning')) {
    setTimeout(() => {
      const modal = document.getElementById("modal-create-task");
      modal.classList.add("hidden");
      modal.classList.remove("active");
      
      // Refrescar datos
      if (window.checkForUpdates) {
        window.checkForUpdates();
      } else {
        location.reload(true);
      }
    }, 2000);
  }
}

export function enviarTarea(empId) {
  if (!empId) {
    mostrarMensajeResultado('error', 'Error', 'Selecciona un empleado');
    return;
  }

  const nombre = document.getElementById("nombreTarea").value;
  const descripcion = document.getElementById("descripcionTarea").value;
  const horaInicio = document.getElementById("horaInicio").value;
  const horaFin = document.getElementById("horaFin").value; // 🔥 Nuevo campo opcional
  const puntaje = parseInt(document.getElementById("puntajeTarea").value);

  // 🔥 NUEVO: Obtener la fecha actual en formato YYYY-MM-DD
  const hoy = new Date();
  const fechaHoy = hoy.getFullYear() + '-' + 
                   String(hoy.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(hoy.getDate()).padStart(2, '0');

  let tareasAsignadas = {};

  // Obtener los días seleccionados
  document.querySelectorAll(".checkbox-container input[type='checkbox']:checked").forEach(checkbox => {
    let dia = checkbox.value;
    if (!tareasAsignadas[dia]) {
      tareasAsignadas[dia] = [];
    }
    const nuevaTarea = {
      nombre,
      descripcion,
      hora: horaInicio,
      estatus: 'en_progreso',
      puntaje,
      esExtra: false,  // 🔥 Marcar como tarea normal (no extra) por defecto
      fecha_inicio: fechaHoy,  // 🔥 NUEVO: Agregar fecha actual (cuando se crea)
      disponible_para_rol: document.getElementById("disponibleParaRol")?.value || "todos"  // 🔥 FASE 1: Control de roles
    };
    // 🔥 Solo agregar hora_fin si se proporcionó
    if (horaFin) {
      nuevaTarea.hora_fin = horaFin;
    }
    tareasAsignadas[dia].push(nuevaTarea);
  });

  // Validar que al menos un día esté seleccionado
  if (Object.keys(tareasAsignadas).length === 0) {
    mostrarMensajeResultado('error', 'Campos incompletos', 'Selecciona al menos un día');
    return;
  }

  let data = { tareas_asignadas: tareasAsignadas };
  
  // 🔥 NUEVO: Deshabilitar botón mientras se procesa
  const btnAsignar = document.getElementById('asignarTareaBtn');
  if (btnAsignar) {
    btnAsignar.disabled = true;
    btnAsignar.innerHTML = '⏳ Procesando...';
    btnAsignar.style.opacity = '0.7';
  }

  // Hacer request al backend
  fetch(`/tareas/${empId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })
    .then(response => {
      if (!response.ok) {
        // Si hay error del servidor, obtener el mensaje
        return response.json().then(errorData => {
          throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        });
      }
      return response.json();
    })
    .then(res => {
      // 🔥 Analizar las tareas creadas para construir mensaje compacto
      const tareas = res.tareas || [];
      
      // Verificar si alguna tarea es para la próxima semana
      const tareasProximaSemana = tareas.filter(t => 
        t.cuando && (t.cuando.includes('próxima semana') || t.cuando.includes('proxima semana'))
      );
      
      // Tareas para días próximos pero esta semana
      const tareasSemanaActual = tareas.filter(t => 
        !t.cuando || (!t.cuando.includes('próxima semana') && !t.cuando.includes('proxima semana'))
      );
      
      let titulo, mensaje, tipo;
      
      if (tareasProximaSemana.length > 0) {
        // Hay tareas para la próxima semana (mismo día pero próxima semana)
        tipo = 'warning';
        const t = tareasProximaSemana[0];
        titulo = 'Tarea creada para la siguiente fecha';
        mensaje = `${capitalizarDia(t.dia)} ${t.fecha} a las ${t.hora}`;
      } else if (tareasSemanaActual.length > 0) {
        // Tareas para esta semana o próximos días sin pasar la hora
        tipo = 'success';
        const t = tareasSemanaActual[0];
        titulo = 'Tarea creada con éxito';
        
        if (t.cuando === 'hoy') {
          mensaje = `Hoy a las ${t.hora}`;
        } else if (t.cuando === 'mañana') {
          mensaje = `Mañana a las ${t.hora}`;
        } else if (t.cuando && t.cuando.includes('en ')) {
          // Extraer "en X días"
          const match = t.cuando.match(/en (\d+) días/);
          if (match) {
            mensaje = `${match[0]} a las ${t.hora}`;
          } else {
            mensaje = `${capitalizarDia(t.dia)} a las ${t.hora}`;
          }
        } else {
          mensaje = `${capitalizarDia(t.dia)} a las ${t.hora}`;
        }
      } else {
        tipo = 'success';
        titulo = 'Tarea creada';
        mensaje = '';
      }
      
      // Mostrar mensaje elegante
      mostrarMensajeResultado(tipo, titulo, mensaje, true);
    })
    .catch(error => {
      console.error("Error al asignar tarea:", error);
      
      // Restaurar botón
      if (btnAsignar) {
        btnAsignar.disabled = false;
        btnAsignar.innerHTML = '✅ Asignar Tarea';
        btnAsignar.style.opacity = '1';
      }
      
      // Mostrar mensaje de error completo
      let errorMsg = error.message || "Error desconocido";
      let titulo = 'Error';
      
      if (errorMsg.includes("Conflicto de horario") || errorMsg.includes("CONFLICTO")) {
        titulo = 'Conflicto de horario';
      }
      
      mostrarMensajeResultado('error', titulo, errorMsg, false);
    });
}

/**
 * Helper para capitalizar el nombre del día
 */
function capitalizarDia(dia) {
  if (!dia) return '';
  const dias = {
    'domingo': 'Domingo',
    'lunes': 'Lunes',
    'martes': 'Martes',
    'miercoles': 'Miércoles',
    'miércoles': 'Miércoles',
    'jueves': 'Jueves',
    'viernes': 'Viernes',
    'sabado': 'Sábado',
    'sábado': 'Sábado'
  };
  return dias[dia.toLowerCase()] || dia;
}
