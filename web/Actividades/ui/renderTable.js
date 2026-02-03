import { STATUS_LABELS } from "../services/panelAdapter.js";
import { showEmployeeMenu } from "./employeeMenu.js";
import { showVerEditarTareaModal } from "./modals/verEditarTareaModal.js";
import { showToast } from "./toast.js";

const headEl = document.getElementById("panel-head");
const bodyEl = document.getElementById("panel-body");
const legendEl = document.getElementById("legend");
const emptyEl = document.getElementById("empty-state");
const completionEl = document.getElementById("completion-rate");
const extraEl = document.getElementById("extra-count");
const pendingEl = document.getElementById("pending-count");
const dateEl = document.getElementById("selected-date");

const initials = (name = "") => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
};

const avatar = (employee) => {
  const wrapper = document.createElement("div");
  wrapper.className = "avatar";
  if (employee.imagen) {
    const img = document.createElement("img");
    img.src = employee.imagen;
    img.alt = employee.nombre;
    wrapper.appendChild(img);
  } else {
    wrapper.textContent = initials(employee.nombre);
  }
  return wrapper;
};

const renderLegend = () => {
  const items = [
    { key: "en_progreso", color: "var(--en-progreso)" },
    { key: "sin_iniciar", color: "var(--sin-iniciar)" },
    { key: "completada", color: "var(--completada)" },
    { key: "vencida", color: "var(--vencida)" },
    { key: "extra", color: "var(--extra)" }
  ];
  legendEl.innerHTML = "";
  items.forEach((item) => {
    const node = document.createElement("div");
    node.className = "legend-item";
    node.innerHTML = `<span class="legend-swatch" style="background:${item.color}"></span>${STATUS_LABELS[item.key]}`;
    legendEl.appendChild(node);
  });
};

const renderHead = (employees) => {
  const base = ["Horario", "Actividad", "Puntos"];
  const tr = document.createElement("tr");
  base.forEach((title) => {
    const th = document.createElement("th");
    th.textContent = title;
    tr.appendChild(th);
  });

  employees.forEach((emp) => {
    const th = document.createElement("th");
    const wrapper = document.createElement("div");
    wrapper.className = "employee-header";
    wrapper.style.cursor = "pointer";

    // Agregar event listener para mostrar menú
    wrapper.addEventListener("click", (e) => {
      showEmployeeMenu(emp, e);
    });

    const avatarNode = avatar(emp);
    wrapper.appendChild(avatarNode);

    const textWrapper = document.createElement("div");
    const nameDiv = document.createElement("div");
    nameDiv.className = "emp-name";
    nameDiv.textContent = emp.nombre;

    const roleDiv = document.createElement("div");
    roleDiv.className = "emp-role";
    roleDiv.textContent = emp.puesto || "Empleado";

    textWrapper.appendChild(nameDiv);
    textWrapper.appendChild(roleDiv);
    wrapper.appendChild(textWrapper);

    th.appendChild(wrapper);
    tr.appendChild(th);
  });

  headEl.innerHTML = "";
  headEl.appendChild(tr);
};

const makeStatusCell = (row, employeeId) => {
  const td = document.createElement("td");

  // Si es una tarea extra completada por este empleado específico (pintar en azul)
  if (row.estatus === 'extra' && row.completadaPor === employeeId) {
    td.className = `employee-cell`;
    td.style.background = '#7ca8ff';
    td.style.color = '#fff';
    td.style.fontWeight = '700';
    td.textContent = 'Extra';
    return td;
  }

  // Si es una tarea extra completada y este es el dueño original que no la completó (pintar en rojo)
  if (row.estatus === 'extra' && row.completadaPor && row.empleadoId === employeeId) {
    td.className = `employee-cell`;
    td.style.background = '#ef6c73';
    td.style.color = '#fff';
    td.style.fontWeight = '700';
    td.textContent = 'Vencida';
    return td;
  }

  // Si es una tarea extra NO completada y este es el dueño original (pintar en rojo)
  if (row.estatus === 'extra' && !row.completadaPor && row.empleadoId === employeeId) {
    td.className = `employee-cell`;
    td.style.background = '#ef6c73';
    td.style.color = '#fff';
    td.style.fontWeight = '700';
    td.textContent = 'Vencida';
    return td;
  }

  // Si no es la tarea de este empleado
  if (row.empleadoId !== employeeId) {
    td.className = "empty-cell";
    td.textContent = "-";
    return td;
  }

  td.className = `employee-cell cell-${row.estatus}`;
  td.textContent = STATUS_LABELS[row.estatus] || row.estatus;
  return td;
};

const renderRows = (rows, employees) => {
  bodyEl.innerHTML = "";
  emptyEl.hidden = rows.length > 0;

  // Obtener hora actual
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Función para convertir "HH:MM" a minutos totales
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(/[-\s:]+/).map(Number);
    return h * 60 + (m || 0);
  };

  // Agrupar tareas por horario
  const groupedByTime = {};
  rows.forEach((row, index) => {
    if (!groupedByTime[row.hora]) {
      groupedByTime[row.hora] = [];
    }
    groupedByTime[row.hora].push({ ...row, originalIndex: index });
  });

  // Encontrar qué grupo de horarios está activo
  let currentTimeGroup = null;
  let latestStart = -1;

  for (const [hora] of Object.entries(groupedByTime)) {
    const horaInicio = hora.split(" - ")[0];
    const inicioMinutes = timeToMinutes(horaInicio);

    if (inicioMinutes <= currentTimeInMinutes && inicioMinutes > latestStart) {
      latestStart = inicioMinutes;
      currentTimeGroup = hora;
    }
  }


  console.log("Grupo de horario actual:", currentTimeGroup);
  // Si no encontramos ningún grupo activo, buscar el más cercano que ya debería haber iniciado
  if (!currentTimeGroup) {
    let maxInitTime = -1;
    for (const [hora] of Object.entries(groupedByTime)) {
      const horaInicio = hora.split(" - ")[0];
      const inicioMinutes = timeToMinutes(horaInicio);

      if (currentTimeInMinutes >= inicioMinutes && inicioMinutes) {
        maxInitTime = inicioMinutes;
        currentTimeGroup = hora;
      }
    }
  }

  // Renderizar por grupos de horario
  Object.entries(groupedByTime).forEach(([hora, grupo]) => {
    const isCurrentGroup = hora === currentTimeGroup;

    grupo.forEach((row, groupIndex) => {
      const tr = document.createElement("tr");

      // Verificar si el horario de esta tarea ya pasó
      const horaFin = hora.split(" - ")[1];
      const finMinutes = timeToMinutes(horaFin);
      const taskHasPassed = currentTimeInMinutes > finMinutes;

      // console.log("Renderizando fila", row);
      // Determinar si es una tarea extra disponible (azul) - solo si no tiene completadaPor
      const isExtraAvailable = row.estatus === 'extra' && !row.completadaPor;
      // Determinar si es una tarea extra completada por alguien
      const isExtraCompleted = row.estatus === 'extra' && row.completadaPor;
      // Determinar si es una tarea extra completada que ya pasó su horario (no pintar)
      const isExtraCompletedPastDue = isExtraCompleted && taskHasPassed;

      // Aplicar color azul a toda la fila solo si es extra disponible (sin completar)
      if (isExtraAvailable) {
        tr.style.backgroundColor = "rgba(96, 165, 250, 0.15)";
      }

      // Determinar el cursor según el rol y tipo de tarea
      const loggedUserString = localStorage.getItem("loggedUser");
      const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : null;
      const userRole = loggedUser ? loggedUser.role : 'empleado';

      if (!isExtraAvailable || userRole === 'empleado') {
        tr.style.cursor = "pointer";
      } else {
        tr.style.cursor = "default";
      }

      // console.log("rol usuario", userRole);
      // Solo agregar celda de horario en la primera fila del grupo (con rowspan)
      if (groupIndex === 0) {
        const time = document.createElement("td");
        time.textContent = hora;
        time.rowSpan = grupo.length;
        time.style.width = "130px";
        time.style.minWidth = "130px";
        time.style.maxWidth = "130px";
        if (isCurrentGroup && !isExtraAvailable && !isExtraCompleted) time.style.backgroundColor = "rgba(255, 213, 79, 0.2)";
        if (isExtraAvailable) time.style.backgroundColor = "rgba(96, 165, 250, 0.15)";
        if (isExtraCompleted && !isExtraCompletedPastDue) time.style.backgroundColor = "rgba(255, 213, 79, 0.2)";

        // Agregar click listener solo si no es extra disponible o si es empleado
        if (!isExtraAvailable || userRole === 'empleado') {
          time.style.cursor = "pointer";
          time.addEventListener("click", (e) => {
            e.stopPropagation();
            handleTaskClick(row, null);
          });
        }

        tr.appendChild(time);
      }

      const activity = document.createElement("td");
      activity.innerHTML = `<div class="activity-title">${row.titulo}</div>${row.descripcion ? `<div class="activity-desc">${row.descripcion}</div>` : ""}`;
      activity.style.textAlign = "left";
      
      // Aplicar colores según el estado de la tarea
      if (isExtraCompleted && !isExtraCompletedPastDue) {
        activity.style.backgroundColor = "rgba(255, 213, 79, 0.2)";
      } else if (isCurrentGroup && !isExtraAvailable) {
        activity.style.backgroundColor = "rgba(255, 213, 79, 0.2)";
      } else if (isExtraAvailable) {
        activity.style.backgroundColor = "rgba(96, 165, 250, 0.15)";
      }

      // Agregar click listener solo si no es extra disponible o si es empleado
      if (!isExtraAvailable || userRole === 'empleado') {
        activity.style.cursor = "pointer";
        activity.addEventListener("click", (e) => {
          e.stopPropagation();
          handleTaskClick(row, null);
        });
      }

      tr.appendChild(activity);

      const points = document.createElement("td");
      points.textContent = row.puntos ?? 0;
      points.style.width = "90px";
      points.style.minWidth = "90px";
      points.style.maxWidth = "90px";
      points.style.textAlign = "center";
      

      if (isExtraCompleted && !isExtraCompletedPastDue) {
        points.style.backgroundColor = "rgba(255, 213, 79, 0.2)";
      } else if (isCurrentGroup && !isExtraAvailable && !isExtraCompleted) {
        points.style.backgroundColor = "rgba(255, 213, 79, 0.2)";
      } else if (isExtraAvailable) {
        points.style.backgroundColor = "rgba(96, 165, 250, 0.15)";
      }

      // Agregar click listener solo si no es extra disponible o si es empleado
      if (!isExtraAvailable || userRole === 'empleado') {
        points.style.cursor = "pointer";
        points.addEventListener("click", (e) => {
          e.stopPropagation();
          handleTaskClick(row, null);
        });
      }

      tr.appendChild(points);

      employees.forEach((emp) => {
        const td = makeStatusCell(row, emp.id);
        // Aplicar ancho uniforme para todas las columnas de empleados
        td.style.width = `${100 / employees.length}%`;
        td.style.minWidth = "180px";

        // Agregar click listener a celdas de tareas o extras disponibles
        if (row.empleadoId === emp.id || isExtraAvailable || (row.estatus === 'extra' && row.completadaPor === emp.id)) {
          td.style.cursor = "pointer";
          td.addEventListener("click", (e) => {
            e.stopPropagation();
            handleTaskClick(row, emp.id);
          });
        }

        // Aplicar resaltado
        if (isCurrentGroup && td.className.includes('empty-cell') && !isExtraAvailable && !isExtraCompleted) {
          td.style.backgroundColor = "rgba(255, 213, 79, 0.2)";
        }
        // Solo pintar de azul las celdas vacías si es una tarea extra disponible (sin completar)
        if (isExtraAvailable && td.className.includes('empty-cell')) {
          td.style.backgroundColor = "rgba(96, 165, 250, 0.15)";
        }
        // Si es una tarea extra completada y esta es una celda vacía, aplicar el color normal del grupo actual
        if (isExtraCompleted && td.className.includes('empty-cell') && isCurrentGroup) {
          td.style.backgroundColor = "rgba(255, 213, 79, 0.2)";
        }

        tr.appendChild(td);
      });

      bodyEl.appendChild(tr);
    });
  });
};

// Función para manejar clicks en tareas
function handleTaskClick(row, clickedEmployeeId) {
  const loggedUserString = localStorage.getItem("loggedUser");
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : null;
  const userRole = loggedUser ? loggedUser.role : 'empleado';

  // Si es una tarea extra disponible
  if (row.estatus === 'extra' && !row.completadaPor) {
    // Para admin/supervisor: solo abrir modal si clickearon en columna de empleado
    if ((userRole === 'admin' || userRole === 'supervisor') && !clickedEmployeeId) {
      showToast('Haz click en la columna de un empleado para completar esta tarea extra', 'info', 4000);
      return;
    }
    // Para empleado: abrir modal siempre
    openTaskModal(row, clickedEmployeeId);
  } else {
    // Tarea normal o extra completada - abrir modal sin employeeId
    openTaskModal(row, null);
  }
}

// Función para abrir el modal de ver/editar tarea
function openTaskModal(row, clickedEmployeeId = null) {
  // Obtener rol del usuario desde localStorage o sessionStorage
  const loggedUserString = localStorage.getItem("loggedUser");
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : null;
  const userRole = loggedUser ? loggedUser.role : 'empleado';
  const userId = parseInt(localStorage.getItem('userId')) || null;

  // Construir objeto de tarea con todos los datos necesarios
  const tarea = {
    id: row.tareaId,
    nombre: row.titulo,
    descripcion: row.descripcion || '',
    hora_ini: row.hora.split(' - ')[0],
    hora_fin: row.hora.split(' - ')[1] || '',
    puntos: row.puntos,
    estatus: row.estatus,
    completadaPor: row.completadaPor,
    empleadoId: row.empleadoId
  };

  // Determinar el employeeId para completar la tarea extra
  let targetEmployeeId = null;
  if (row.estatus === 'extra' && row.completadaPor ==null) {
    if (userRole === 'empleado') {
      targetEmployeeId = userId;
    } else if (userRole === 'admin' || userRole === 'supervisor') {
      targetEmployeeId = clickedEmployeeId || null;
    }
  }

  showVerEditarTareaModal(tarea, userRole, targetEmployeeId);
}

// Función para completar una tarea extra
async function completeExtraTask(tareaId, employeeId) {
  try {
    const response = await fetch(`http://localhost:8001/tareas/${tareaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        estatus: 'extra',
        completadaPor: employeeId
      })
    });

    const result = await response.json();

    if (response.ok) {
      showToast('✓ Tarea extra completada exitosamente', 'success');

      // Actualizar panel
      const event = new CustomEvent('refreshPanel');
      window.dispatchEvent(event);
    } else {
      showToast('Error al completar la tarea: ' + (result.message || 'Error desconocido'), 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Error al completar la tarea. Verifica tu conexión.', 'error');
  }
}

export const renderPanel = (view) => {
  dateEl.textContent = view.dateLabel;
  renderLegend();
  renderHead(view.employees);
  renderRows(view.rows, view.employees);
  completionEl.textContent = `${view.stats.completionRate}%`;
  extraEl.textContent = view.stats.extra;
  pendingEl.textContent = view.stats.pending;
};
