import { STATUS_LABELS } from "../services/panelAdapter.js";
import { showEmployeeMenu } from "./employeeMenu.js";
import { showVerEditarTareaModal } from "./modals/verEditarTareaModal.js";
import { showToast } from "./toast.js";

const headEl = document.getElementById("panel-head");
const bodyEl = document.getElementById("panel-body");
const legendEl = document.getElementById("legend");
const emptyEl = document.getElementById("empty-state");
const dateEl = document.getElementById("selected-date");

const initials = (name = "") => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
};

const avatar = (employee) => {
  const wrapper = document.createElement("div");
  // console.log("employee avatar", employee)
  wrapper.className = "avatar";
  if (employee.imagen) {
    const img = document.createElement("img");
    img.src = "/web/Images/" +employee.imagen;
    img.alt = employee.nombre;
    wrapper.appendChild(img);
  } else {
    wrapper.textContent = initials(employee.nombre);
  }
  return wrapper;
};

// Variable global para almacenar los datos actuales del panel
let currentPanelData = null;

// Función para calcular el porcentaje de completación de tareas del empleado
const calculateCompletionPercentage = (employeeId) => {
  if (!currentPanelData || !currentPanelData.rows) return 0;

  let totalTasks = 0;
  let completedTasks = 0;

  currentPanelData.rows.forEach(row => {
    // Solo contar tareas asignadas a este empleado (no extras)
    if (row.empleadoId === employeeId && row.estatus!=='sin_iniciar') {
      totalTasks += row.puntos;
      if (row.estatus === 'completada') {
        completedTasks += row.puntos;
      }
    }
  });

  return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
};

// Función para calcular puntos extras del empleado
const calculateExtraPoints = (employeeId) => {
  if (!currentPanelData || !currentPanelData.rows) return 0;

  let extraPoints = 0;

  currentPanelData.rows.forEach(row => {
    // Verificar si es una tarea extra completada por este empleado
    if (row.estatus === 'extra' && row.completadaPor === employeeId) {
      extraPoints += row.puntos || 0;
    }
  });

  return extraPoints;
};

// Función para crear gráfica circular de progreso
const createProgressChart = (percentage) => {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  `;

  // Texto "asignadas"
  const label = document.createElement("div");
  label.style.cssText = `
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;
  label.textContent = "asignadas";

  const container = document.createElement("div");
  container.className = "progress-chart";
  container.style.cssText = `
    position: relative;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Determinar color basado en porcentaje
  let color;
  if (percentage <= 80) {
    color = '#ef4444'; // rojo
  } else if (percentage <= 90) {
    color = '#f97316'; // naranja
  } else {
    color = '#22c55e'; // verde
  }

  // Crear SVG circular
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "64");
  svg.setAttribute("height", "64");
  svg.setAttribute("viewBox", "0 0 64 64");

  // Círculo de fondo
  const backgroundCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  backgroundCircle.setAttribute("cx", "32");
  backgroundCircle.setAttribute("cy", "32");
  backgroundCircle.setAttribute("r", "24");
  backgroundCircle.setAttribute("fill", "none");
  backgroundCircle.setAttribute("stroke", "#e5e7eb");
  backgroundCircle.setAttribute("stroke-width", "6");

  // Círculo de progreso
  const progressCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  progressCircle.setAttribute("cx", "32");
  progressCircle.setAttribute("cy", "32");
  progressCircle.setAttribute("r", "24");
  progressCircle.setAttribute("fill", "none");
  progressCircle.setAttribute("stroke", color);
  progressCircle.setAttribute("stroke-width", "6");
  progressCircle.setAttribute("stroke-linecap", "round");
  
  const circumference = 2 * Math.PI * 24;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  progressCircle.setAttribute("stroke-dasharray", strokeDasharray);
  progressCircle.setAttribute("stroke-dashoffset", strokeDashoffset);
  progressCircle.setAttribute("transform", "rotate(-90 32 32)");

  svg.appendChild(backgroundCircle);
  svg.appendChild(progressCircle);

  // Texto del porcentaje
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", "32");
  text.setAttribute("y", "36");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "14");
  text.setAttribute("font-weight", "600");
  text.setAttribute("fill", color);
  text.textContent = `${percentage}%`;

  svg.appendChild(text);
  container.appendChild(svg);

  wrapper.appendChild(label);
  wrapper.appendChild(container);

  return wrapper;
};

// Función para crear contador de puntos extras
const createExtraCounter = (extraPoints) => {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  `;

  // Texto "extras"
  const label = document.createElement("div");
  label.style.cssText = `
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;
  label.textContent = "extras";

  const container = document.createElement("div");
  container.className = "extra-counter";
  container.style.cssText = `
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
    border-radius: 6px;
    padding: 1px;
    font-size: 14px;
    font-weight: 800;
    min-width: 64px;
    min-height: 64px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  container.textContent = `${extraPoints}`;
  container.title = `${extraPoints} puntos extras completados`;

  wrapper.appendChild(label);
  wrapper.appendChild(container);

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

const renderHead = (employees, rows = []) => {
  const base = ["Horario", "Actividad", "Puntos"];
  const tr = document.createElement("tr");
  base.forEach((title, index) => {
    const th = document.createElement("th");
    th.textContent = title;

    if (index === 0) th.classList.add("col-hora");
    if (index === 1) th.classList.add("col-actividad");
    if (index === 2) th.classList.add("col-puntos");

    tr.appendChild(th);
  });

  // console.log("Renderizando encabezado para empleados:", employees);
  employees.forEach((emp) => {
    const th = document.createElement("th");
    th.classList.add("col-emp");
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

    // Crear contenedor para estadísticas
    const statsWrapper = document.createElement("div");
    statsWrapper.className = "emp-stats";
    statsWrapper.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 8px;
      gap: 10px;
    `;

    // Calcular estadísticas del empleado
    const completionPercentage = calculateCompletionPercentage(emp.id);
    const extraPoints = calculateExtraPoints(emp.id);

    // Crear gráfica circular de progreso
    const progressChart = createProgressChart(completionPercentage);
    statsWrapper.appendChild(progressChart);

    // Crear contador de puntos extras
    const extraCounter = createExtraCounter(extraPoints);
    statsWrapper.appendChild(extraCounter);

    textWrapper.appendChild(statsWrapper);
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

const ROW_COLORS = Object.freeze({
  highlightCurrentGroup: "rgba(255, 213, 79, 0.2)", // amarillo
  highlightExtraAvailable: "rgba(96, 165, 250, 0.15)", // azul
});

const renderRows = (rows, employees) => {
  bodyEl.innerHTML = "";
  emptyEl.hidden = rows.length > 0;

  // console.log("Renderizando filas:", rows);
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


  // console.log("Grupo de horario actual:", currentTimeGroup);
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
        tr.style.backgroundColor = ROW_COLORS.highlightExtraAvailable; // azul
      }

      // Determinar el cursor según el rol y tipo de tarea
      const loggedUserString = localStorage.getItem("loggedUser");
      const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : null;
      const userRole = loggedUser ? loggedUser.role : null; // No asumir rol si no hay sesión

      // Permitir click en tareas extra si hay sesión activa (empleado/supervisor/admin)
      const canInteractWithExtra = loggedUser && (userRole === 'empleado' || userRole === 'supervisor' || userRole === 'admin');

      if (!isExtraAvailable || canInteractWithExtra) {
        tr.style.cursor = "pointer";
      } else {
        tr.style.cursor = "default";
      }

      // console.log("rol usuario", userRole);
      // Solo agregar celda de horario en la primera fila del grupo (con rowspan)
      if (groupIndex === 0) {
        const time = document.createElement("td");
        time.classList.add("col-hora");
        time.textContent = hora;
        time.rowSpan = grupo.length;
        time.style.width = "130px";
        time.style.minWidth = "130px";
        time.style.maxWidth = "130px";

        // Aplicar colores según el estado de la tarea (sticky, usando CSS var para que no se vea nada por debajo)
        if (isExtraCompleted && !isExtraCompletedPastDue) {
          time.style.setProperty("--sticky-highlight", ROW_COLORS.highlightCurrentGroup);
        } else if (isCurrentGroup && !isExtraAvailable) {
          time.style.setProperty("--sticky-highlight", ROW_COLORS.highlightCurrentGroup);
        } else if (isExtraAvailable) {
          time.style.setProperty("--sticky-highlight", ROW_COLORS.highlightExtraAvailable);
        }

        // Agregar click listener para tareas normales o extra (si hay sesión activa)
        if (!isExtraAvailable || canInteractWithExtra) {
          time.style.cursor = "pointer";
          time.addEventListener("click", (e) => {
            e.stopPropagation();
            handleTaskClick(row, null);
          });
        }

        tr.appendChild(time);
      }

      const activity = document.createElement("td");
      activity.classList.add("col-actividad");
      activity.innerHTML = `<div class="activity-title">${row.titulo}</div>${row.descripcion ? `<div class="activity-desc">${row.descripcion}</div>` : ""}`;
      activity.style.textAlign = "left";
      
      // Aplicar colores según el estado de la tarea
      if (isExtraCompleted && !isExtraCompletedPastDue) {
        activity.style.setProperty("--sticky-highlight", ROW_COLORS.highlightCurrentGroup);
      } else if (isCurrentGroup && !isExtraAvailable) {
        activity.style.setProperty("--sticky-highlight", ROW_COLORS.highlightCurrentGroup);
      } else if (isExtraAvailable) {
        activity.style.setProperty("--sticky-highlight", ROW_COLORS.highlightExtraAvailable);
      }

      // Agregar click listener (permitir tanto visitantes como usuarios autenticados)
      activity.style.cursor = "pointer";
      activity.addEventListener("click", (e) => {
        e.stopPropagation();
        handleTaskClick(row, null);
        });
      

      tr.appendChild(activity);

      const points = document.createElement("td");
      points.classList.add("col-puntos");
      points.textContent = row.puntos ?? 0;
      points.style.width = "90px";
      points.style.minWidth = "90px";
      points.style.maxWidth = "90px";
      points.style.textAlign = "center";
      

      // Aplicar colores según el estado de la tarea
      if (isExtraCompleted && !isExtraCompletedPastDue) {
        points.style.setProperty("--sticky-highlight", ROW_COLORS.highlightCurrentGroup);
      } else if (isCurrentGroup && !isExtraAvailable) {
        points.style.setProperty("--sticky-highlight", ROW_COLORS.highlightCurrentGroup);
      } else if (isExtraAvailable) {
        points.style.setProperty("--sticky-highlight", ROW_COLORS.highlightExtraAvailable);
      }

      // Agregar click listener (permitir tanto visitantes como usuarios autenticados)
      points.style.cursor = "pointer";
      points.addEventListener("click", (e) => {
        e.stopPropagation();
        handleTaskClick(row, null);
      });

      tr.appendChild(points);

      employees.forEach((emp) => {
        const td = makeStatusCell(row, emp.id);
        td.classList.add("col-emp");
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
          td.style.backgroundColor = ROW_COLORS.highlightCurrentGroup;
        }
        // Solo pintar de azul las celdas vacías si es una tarea extra disponible (sin completar)
        if (isExtraAvailable && td.className.includes('empty-cell')) {
          td.style.backgroundColor = ROW_COLORS.highlightExtraAvailable;
        }
        // Si es una tarea extra completada y esta es una celda vacía, aplicar el color normal del grupo actual
        if (isExtraCompleted && td.className.includes('empty-cell') && isCurrentGroup) {
          td.style.backgroundColor = ROW_COLORS.highlightCurrentGroup;
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
  const userRole = loggedUser ? loggedUser.role : null; // No asumir rol si no hay sesión
  const userId = parseInt(localStorage.getItem('userId')) || null;

  // Si es una tarea extra disponible
  if (row.estatus === 'extra' && !row.completadaPor) {
    // Si hay sesión activa y no se especificó empleado, usar el usuario actual
    if (loggedUser && !clickedEmployeeId) {
      clickedEmployeeId = userId;
    }
    // Si no hay sesión activa y no se especificó empleado, mostrar mensaje
    else if (!loggedUser && !clickedEmployeeId) {
      showToast('Haz click en la columna de un empleado para completar esta tarea extra', 'info', 4000);
      return;
    }
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
  const userRole = loggedUser ? loggedUser.role : null;

  // console.log('Abriendo modal para tarea:', row, 'Rol usuario:', userRole, 'Empleado clickeado:', clickedEmployeeId);
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
    empleadoId: row.empleadoId,
    disponible_para_rol: row.disponible_para_rol || 'todos'
  };

  showVerEditarTareaModal(tarea, userRole, clickedEmployeeId);
}

export const renderPanel = (view) => {
  // Almacenar datos actuales para cálculos de estadísticas
  currentPanelData = view;
  
  dateEl.textContent = view.dateLabel;
  renderLegend();
  renderHead(view.employees, view.rows);
  renderRows(view.rows, view.employees);
};
