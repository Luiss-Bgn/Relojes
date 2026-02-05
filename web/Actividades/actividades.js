import { adaptPanel } from "./services/panelAdapter.js";
import { createSocketClient } from "./services/socketClient.js";
import { renderPanel } from "./ui/renderTable.js";
import { loadPanelData } from "./services/dataLoader.js";

const connectionDot = document.getElementById("connection-dot");
const connectionLabel = document.getElementById("connection-label");
const refreshBtn = document.getElementById("refresh-btn");
const prevDayBtn = document.getElementById("prev-day-btn");
const nextDayBtn = document.getElementById("next-day-btn");
const timeEl = document.getElementById("current-time");

let viewState = null;
let socketRef;
let panelDataCache = null;

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
let currentDayIndex = 0;

// Función para crear gráfica circular de promedio general
const createAverageProgressChart = (percentage) => {
  const container = document.getElementById("average-progress-chart");
  if (!container) {
    console.error("❌ Elemento average-progress-chart no encontrado en el DOM");
    return;
  }

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Crear SVG circular
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "120");
  svg.setAttribute("height", "120");
  svg.setAttribute("viewBox", "0 0 120 120");

  // Círculo de fondo (rojo - puntos no ganados)
  const backgroundCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  backgroundCircle.setAttribute("cx", "60");
  backgroundCircle.setAttribute("cy", "60");
  backgroundCircle.setAttribute("r", "45");
  backgroundCircle.setAttribute("fill", "none");
  backgroundCircle.setAttribute("stroke", "#ef4444");
  backgroundCircle.setAttribute("stroke-width", "12");

  // Círculo de progreso (verde - puntos ganados)
  const progressCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  progressCircle.setAttribute("cx", "60");
  progressCircle.setAttribute("cy", "60");
  progressCircle.setAttribute("r", "45");
  progressCircle.setAttribute("fill", "none");
  progressCircle.setAttribute("stroke", "#22c55e");
  progressCircle.setAttribute("stroke-width", "12");
  progressCircle.setAttribute("stroke-linecap", "round");

  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  progressCircle.setAttribute("stroke-dasharray", strokeDasharray);
  progressCircle.setAttribute("stroke-dashoffset", strokeDashoffset);
  progressCircle.setAttribute("transform", "rotate(-90 60 60)");

  svg.appendChild(backgroundCircle);
  svg.appendChild(progressCircle);

  // Texto del porcentaje
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", "60");
  text.setAttribute("y", "68");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "24");
  text.setAttribute("font-weight", "700");
  text.setAttribute("fill", "#374151");
  text.textContent = `${percentage}%`;

  svg.appendChild(text);
  wrapper.appendChild(svg);
  container.appendChild(wrapper);
};

// Función para calcular promedio de completación de todos los empleados
const calculateAverageCompletion = (viewData) => {
  if (!viewData || !viewData.employees || !viewData.rows) return 0;

  let totalEmployees = viewData.employees.length;
  let totalCompletion = 0;
  let totalTasks = 0;
  viewData.employees.forEach(emp => {
    let employeeTasks = 0;
    let employeeCompleted = 0;
    viewData.rows.forEach(row => {
      if (row.empleadoId === emp.id && row.estatus!=='sin_iniciar') {
        employeeTasks += row.puntos;
        totalTasks += row.puntos;
        if (row.estatus === 'completada') {
          employeeCompleted += row.puntos;
        }
      }
    });

    totalCompletion += employeeCompleted;
  });

  return totalTasks > 0 ? Math.round((totalCompletion / totalTasks) * 100) : 0;
};

// Función para calcular total de puntos extras de todos los empleados
const calculateTotalExtraPoints = (viewData) => {
  if (!viewData || !viewData.rows) return 0;

  let totalExtra = 0;
  viewData.rows.forEach(row => {
    if (row.estatus === 'extra' && row.completadaPor) {
      totalExtra += row.puntos || 0;
    }
  });

  return totalExtra;
};

// Función para actualizar los stats generales
const updateGeneralStats = (viewData) => {
  const averageCompletion = calculateAverageCompletion(viewData);
  const totalExtraPoints = calculateTotalExtraPoints(viewData);

  // Actualizar gráfica circular
  createAverageProgressChart(averageCompletion);

  // Actualizar contador de puntos extras
  const extraPointsEl = document.getElementById("total-extra-points");
  if (extraPointsEl) {
    extraPointsEl.textContent = totalExtraPoints;
    // console.log("✅ Actualizado total-extra-points:", totalExtraPoints);
  } else {
    console.error("❌ Elemento total-extra-points no encontrado");
  }
};


const updateClock = () => {
  const now = new Date();
  const time = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  timeEl.textContent = time;
};

const updateHighlight = () => {
  if (viewState) {
    renderPanel(viewState);
    updateGeneralStats(viewState);
  }
};

const changeDay = (direction) => {
  if (!panelDataCache) return;

  currentDayIndex = (currentDayIndex + direction + DIAS_SEMANA.length) % DIAS_SEMANA.length;
  const selectedDay = DIAS_SEMANA[currentDayIndex];

  viewState = adaptPanel(panelDataCache, selectedDay);
  renderPanel(viewState);
  updateGeneralStats(viewState);
};

const startMinuteWatcher = () => {
  const scheduleNextUpdate = () => {
    const now = new Date();
    const seconds = now.getSeconds();
    const milliseconds = now.getMilliseconds();

    // Calcular cuánto falta para el próximo minuto completo
    const msUntilNextMinute = (60 - seconds) * 1000 - milliseconds;

    setTimeout(() => {
      updateHighlight();
      scheduleNextUpdate(); // Programar la siguiente actualización
    }, msUntilNextMinute);
  };

  scheduleNextUpdate();
};

const setConnection = (state) => {
  const map = {
    online: { text: "Conectado", color: "#22c55e" },
    connecting: { text: "Conectando...", color: "#f59e0b" },
    offline: { text: "Sin conexión", color: "#e11d48" },
    error: { text: "Error", color: "#ef4444" }
  };
  const cfg = map[state] || map.offline;
  connectionDot.style.background = cfg.color;
  connectionLabel.textContent = cfg.text;
};

// let lastUpdateTime = 0;
// const THROTTLE_MS = 3000;
const handleMessage = async (payload) => {
  console.log(payload)
  if (payload.comando !== "update_tareas") return;

  // const now = Date.now();

  // 🚦 Si aún no han pasado 3s desde la última actualización → ignorar
  // if (now - lastUpdateTime < THROTTLE_MS) {
  //   console.log("⏳ Update ignorado (throttle activo)");
  //   return;
  // }

  // lastUpdateTime = now;

  console.log("🔄 Actualizando tareas desde WS");

  const refreshedData = await loadPanelData();
  panelDataCache = refreshedData;

  const selectedDay = DIAS_SEMANA[currentDayIndex];
  viewState = adaptPanel(refreshedData, selectedDay);

  renderPanel(viewState);
  updateGeneralStats(viewState);
};

const initSocket = () => {
  socketRef = createSocketClient({
    onMessage: handleMessage,
    onStatus: setConnection
  });
};

const init = async () => {
  // Verificar rol del usuario para mostrar/ocultar stats
  const loggedUser = localStorage.getItem("loggedUser");
  const user = loggedUser ? JSON.parse(loggedUser) : null;
  const userRole = user?.role ? user.role.toLowerCase() : "visitante";

  const statsSection = document.getElementById("stats");
  if (statsSection) {
    if (userRole === "admin" || userRole === "supervisor") {
      statsSection.style.display = "flex";
    } else {
      statsSection.style.display = "none";
    }
  }

  // Cargar datos reales del backend
  const panelData = await loadPanelData();
  panelDataCache = panelData;

  // Determinar día actual de la semana
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
  currentDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convertir a índice: 0=Lunes, 6=Domingo

  const selectedDay = DIAS_SEMANA[currentDayIndex];
  viewState = adaptPanel(panelData, selectedDay);
  renderPanel(viewState);
  updateGeneralStats(viewState);

  // console.log("datos view", viewState)
  updateClock();
  setInterval(updateClock, 1000);

  // Iniciar el observador de cambios de minuto
  startMinuteWatcher();

  initSocket();

  // Event listeners para navegación de días
  prevDayBtn.addEventListener("click", () => changeDay(-1));
  nextDayBtn.addEventListener("click", () => changeDay(1));

  refreshBtn.addEventListener("click", async () => {
    setConnection("connecting");
    const refreshedData = await loadPanelData();
    panelDataCache = refreshedData;
    const selectedDay = DIAS_SEMANA[currentDayIndex];
    viewState = adaptPanel(refreshedData, selectedDay);
    renderPanel(viewState);
    updateGeneralStats(viewState);
    socketRef?.reconnect();
  });

  // Listener para actualizar panel cuando se editan tareas desde modales
  window.addEventListener("refreshPanel", async () => {
    const refreshedData = await loadPanelData();
    panelDataCache = refreshedData;
    const selectedDay = DIAS_SEMANA[currentDayIndex];
    viewState = adaptPanel(refreshedData, selectedDay);
    renderPanel(viewState);
    updateGeneralStats(viewState);
  });

};

document.addEventListener("DOMContentLoaded", init);
