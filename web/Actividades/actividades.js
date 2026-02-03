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

const updateClock = () => {
  const now = new Date();
  const time = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  timeEl.textContent = time;
};

const updateHighlight = () => {
  if (viewState) {
    renderPanel(viewState);
  }
};

const changeDay = (direction) => {
  if (!panelDataCache) return;
  
  currentDayIndex = (currentDayIndex + direction + DIAS_SEMANA.length) % DIAS_SEMANA.length;
  const selectedDay = DIAS_SEMANA[currentDayIndex];
  
  viewState = adaptPanel(panelDataCache, selectedDay);
  renderPanel(viewState);
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

const handleMessage = (payload) => {
  console.log("📨 Actualización WebSocket:", payload);
  // Aquí se procesarán actualizaciones en tiempo real de tareas
  // Por ahora solo logueamos para debug
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
  
  console.log("datos view", viewState)
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
    socketRef?.reconnect();
  });

  // Listener para actualizar panel cuando se editan tareas desde modales
  window.addEventListener("refreshPanel", async () => {
    const refreshedData = await loadPanelData();
    panelDataCache = refreshedData;
    const selectedDay = DIAS_SEMANA[currentDayIndex];
    viewState = adaptPanel(refreshedData, selectedDay);
    renderPanel(viewState);
  });
  
};

document.addEventListener("DOMContentLoaded", init);
