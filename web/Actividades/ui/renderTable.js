import { STATUS_LABELS } from "../services/panelAdapter.js";
import { showEmployeeMenu } from "./employeeMenu.js";

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
  
  // Encontrar el índice de la tarea actual
  let currentRowIndex = -1;
  
  // Primero: buscar si hay una tarea que contenga la hora actual
  for (let i = 0; i < rows.length; i++) {
    const horaInicio = rows[i].hora.split(" - ")[0];
    const horaFin = rows[i].hora.split(" - ")[1];
    const inicioMinutes = timeToMinutes(horaInicio);
    const finMinutes = timeToMinutes(horaFin);
    
    // Si la hora actual está dentro del rango de esta tarea
    if (currentTimeInMinutes >= inicioMinutes && currentTimeInMinutes < finMinutes) {
      currentRowIndex = i;
      break;
    }
  }
  
  // Si no encontramos ninguna tarea activa, buscar la tarea más cercana que ya debería haber iniciado
  if (currentRowIndex === -1) {
    for (let i = rows.length - 1; i >= 0; i--) {
      const horaInicio = rows[i].hora.split(" - ")[0];
      const inicioMinutes = timeToMinutes(horaInicio);
      
      // Si esta tarea ya debería haber iniciado
      if (currentTimeInMinutes >= inicioMinutes) {
        currentRowIndex = i;
        break;
      }
    }
  }
  
  rows.forEach((row, index) => {
    const tr = document.createElement("tr");
    
    // Agregar clase de resaltado si es la tarea actual
    const isCurrentRow = index === currentRowIndex;

    const time = document.createElement("td");
    time.textContent = row.hora;
    if (isCurrentRow) time.style.backgroundColor = "rgba(255, 213, 79, 0.2)";
    tr.appendChild(time);

    const activity = document.createElement("td");
    activity.innerHTML = `<div class="activity-title">${row.titulo}</div>${row.descripcion ? `<div class="activity-desc">${row.descripcion}</div>` : ""}`;
    if (isCurrentRow) activity.style.backgroundColor = "rgba(255, 213, 79, 0.2)";
    tr.appendChild(activity);

    const points = document.createElement("td");
    points.textContent = row.puntos ?? 0;
    if (isCurrentRow) points.style.backgroundColor = "rgba(255, 213, 79, 0.2)";
    tr.appendChild(points);

    employees.forEach((emp) => {
      const td = makeStatusCell(row, emp.id);
      // Aplicar resaltado solo a celdas vacías
      if (isCurrentRow && td.className.includes('empty-cell')) {
        td.style.backgroundColor = "rgba(255, 213, 79, 0.2)";
      }
      tr.appendChild(td);
    });

    bodyEl.appendChild(tr);
  });
};

export const renderPanel = (view) => {
  dateEl.textContent = view.dateLabel;
  renderLegend();
  renderHead(view.employees);
  renderRows(view.rows, view.employees);
  completionEl.textContent = `${view.stats.completionRate}%`;
  extraEl.textContent = view.stats.extra;
  pendingEl.textContent = view.stats.pending;
};
