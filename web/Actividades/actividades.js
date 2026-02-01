// Orquestador principal de Actividades: inicializa estado, UI y servicios
// Usa módulos desacoplados (ui/menus, ui/pinModal, services/autoRefresh, services/websocket)

import {state, DOM, diasSemana} from "./state.js";
import {compareHour} from "./utils/time.js";
import {initMenus} from "./ui/menus.js";
import {initPinModal} from "./ui/pinModal.js";
import {initRender} from "./render.js";
import {startAutoRefresh, stopAutoRefresh, applyCssText} from "./services/autoRefresh.js";
import {connectToWebSocket} from "./services/websocket.js";
import {showToast} from "./ui/toast.js";

let menusApi = null;
let pinModal = null;
let renderApi = null;

// Cachear referencias mínimas usadas por los módulos UI
function cacheDOM() {
  DOM.cellMenu = document.getElementById("cell-menu");
  DOM.profileMenu = document.getElementById("profile-menu");
  DOM.createTaskModal = document.getElementById("modal-create-task");
  DOM.modal = document.getElementById("task-modal");
  DOM.modalTaskName = document.getElementById("modal-task-name");
  DOM.modalTaskDesc = document.getElementById("modal-task-desc");
  DOM.modalCloseBtn = document.getElementById("modal-close-btn");
  DOM.modalCompleteBtn = document.getElementById("modal-complete-btn");
  DOM.titulo = document.querySelector("h2");
  DOM.clockContainer = document.querySelector(".clock-container");
  DOM.tableWrapper = document.getElementById("table-wrapper");
  DOM.tasksDayLabel = document.getElementById("tasks-day");
  DOM.workerTable = document.getElementById("worker-table");
  DOM.tbody = DOM.workerTable?.querySelector("tbody");
  DOM.theadRow = DOM.workerTable?.querySelector("thead tr");
  DOM.prevDayBtn = document.getElementById("prev-day-btn");
  DOM.nextDayBtn = document.getElementById("next-day-btn");
  DOM.todayBtn = document.getElementById("today-btn");
  DOM.prevEmpBtn = document.getElementById("prev-emp-page");
  DOM.nextEmpBtn = document.getElementById("next-emp-page");
  DOM.centerBand = document.querySelector(".center-band");
  DOM.realClockCols = Array.from(document.querySelectorAll(".real-clock-col"));
  DOM.taskProgress = document.getElementById("task-progress");
}

// Lógica mínima para validar horarios de completado (usado por el modal de PIN)
function validarSiPuedeCompletarse(tarea, empId, diaName) {
  const now = new Date();
  const isToday = state.currentDayIndex === now.getDay();

  if (!isToday) return {puedeCompletar: true, razon: "Tarea de día pasado"};
  if (!tarea.hora) return {puedeCompletar: true, razon: "Sin restricción de hora"};

  const empleado = state.trabajadores.find((t) => t.id === Number(empId));
  if (!empleado) return {puedeCompletar: true, razon: "Empleado no encontrado"};

  const tareasDelDia = (empleado.tareas_asignadas && empleado.tareas_asignadas[diaName]) || [];
  const tareasOrdenadas = tareasDelDia.filter((t) => t.hora).sort((a, b) => compareHour(a.hora, b.hora));
  const indice = tareasOrdenadas.findIndex(
    (t) => (t.hora === tarea.hora && t.nombre === tarea.nombre) || (tarea.tareaId && t.id === tarea.tareaId)
  );
  if (indice === -1) return {puedeCompletar: true, razon: "Tarea no encontrada en lista"};

  const [horas, minutos] = tarea.hora.split(":").map(Number);
  const horaActual = now.getHours() * 60 + now.getMinutes();
  const horaTareaMinutos = horas * 60 + minutos;
  if (horaActual < horaTareaMinutos) {
    return {puedeCompletar: false, razon: "Aún no ha llegado la hora de esta tarea"};
  }

  if (indice + 1 < tareasOrdenadas.length) {
    const siguiente = tareasOrdenadas[indice + 1];
    if (siguiente?.hora) {
      const [h2, m2] = siguiente.hora.split(":").map(Number);
      const siguienteMin = h2 * 60 + m2;
      if (horaActual > siguienteMin) {
        return {puedeCompletar: false, razon: "Se pasó la hora de la siguiente tarea"};
      }
    }
  }

  const limiteMinutos = 30;
  const minutosDesdeTarea = horaActual - horaTareaMinutos;
  if (minutosDesdeTarea > limiteMinutos) {
    return {puedeCompletar: false, razon: "Pasaron más de 30 minutos desde la tarea"};
  }

  return {puedeCompletar: true, razon: "Dentro del horario permitido"};
}

// Determina estatus al completar (normal vs extra)
function calcularEstatusCompletado(tarea, empId, diaName, esAdmin, usuarioActualId) {
  const now = new Date();
  const isToday = state.currentDayIndex === now.getDay();
  if (!isToday) return 3;
  if (!tarea.hora) return 3;

  const tareaEmpId = Number(empId);
  const usuarioId = Number(usuarioActualId);
  const esDueno = tareaEmpId === usuarioId;
  if (!esDueno && !esAdmin) return 5;
  return 3;
}

async function handleDataChange(empleadosData) {
  state.trabajadores = Array.isArray(empleadosData) ? empleadosData : [];
  renderApi?.renderForCurrentState?.();
}

function initModules() {
  pinModal = initPinModal({
    diasSemana,
    state,
    validarSiPuedeCompletarse,
    calcularEstatusCompletado
  });

  renderApi = initRender({
    state,
    DOM,
    diasSemana,
    pinModal,
    validarSiPuedeCompletarse,
    calcularEstatusCompletado,
    showToast
  });

  menusApi = initMenus({
    DOM,
    diasSemana,
    state,
    openModal: renderApi?.openModal,
    deleteEmployee: renderApi?.deleteEmployee
  });
}

function bindGlobalShortcuts() {
  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape") {
      menusApi?.hideCellMenu?.();
      menusApi?.hideProfileMenu?.();
      pinModal?.closePinModal?.();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  cacheDOM();
  initModules();
  bindGlobalShortcuts();

  startAutoRefresh({
    intervalMs: 1500,
    onDataChange: handleDataChange,
    onCssChange: applyCssText
  });

  connectToWebSocket({
    onExtraCompleted: () => {
      renderApi?.renderForCurrentState?.();
    }
  });

  // Exponer helpers para otros scripts (p.ej., botones en HTML)
  window.actividades = {
    state,
    DOM,
    diasSemana,
    menusApi,
    pinModal,
    renderApi,
    validarSiPuedeCompletarse,
    calcularEstatusCompletado,
    renderForCurrentState: renderApi?.renderForCurrentState,
    stopAutoRefresh,
    startAutoRefresh,
    showToast
  };

  renderApi?.renderForCurrentState?.();
});
