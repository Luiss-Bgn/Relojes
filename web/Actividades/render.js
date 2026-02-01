// Render y acciones de UI principales para Actividades
// Dependencias inyectadas para mantener bajo ac acoplamiento

import {compareHour, hourToMinutes, calculateIsFutureDay, getStatusClass} from "./utils/time.js";
import {showToast} from "./ui/toast.js";
import {tareasExtraActivas, tareasExtrasCompletadas} from "./state.js";

export function initRender({state, DOM, diasSemana, pinModal, validarSiPuedeCompletarse, calcularEstatusCompletado, showToast: injectedToast}) {
  const toast = injectedToast || showToast;
  if (state.daysOffset === undefined) state.daysOffset = 0;

  function formatFechaCompleta(date) {
    const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    const dayName = diasSemana[date.getDay()].toUpperCase();
    const diaNumero = date.getDate();
    const mesNombre = meses[date.getMonth()];
    return `${dayName} ${diaNumero} DE ${mesNombre}`;
  }

  function dateKeyFrom(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function getDisplayedDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const displayedDate = new Date(today);
    displayedDate.setDate(today.getDate() + (state.daysOffset || 0));
    return displayedDate;
  }

  function mergeCells(columnIndex) {
    const rows = Array.from(DOM.tbody?.rows || []);
    if (!rows.length) return;
    let prevCell = null;
    let spanCount = 1;
    for (let i = 0; i < rows.length; i++) {
      const cell = rows[i].cells[columnIndex];
      if (!cell) continue;
      const text = cell.textContent;
      if (prevCell && prevCell.textContent === text) {
        spanCount++;
        prevCell.rowSpan = spanCount;
        cell.remove();
      } else {
        prevCell = cell;
        spanCount = 1;
      }
    }
  }

  function buildActivitiesCache() {
    state.activitiesByDay.clear();
    const temp = new Map();
    diasSemana.forEach((d) => temp.set(d, new Map()));
    const idToRow = new Map();
    const pendingExtras = [];

    state.trabajadores.forEach((emp) => {
      const tareasAsignadas = emp?.tareas_asignadas || {};
      Object.entries(tareasAsignadas).forEach(([fechaKey, lista]) => {
        if (!Array.isArray(lista)) return;

        let dayName = fechaKey.toLowerCase();
        if (/^\d{4}-\d{2}-\d{2}$/.test(fechaKey)) {
          const [y, m, d] = fechaKey.split("-").map(Number);
          dayName = diasSemana[new Date(y, m - 1, d).getDay()];
        }

        if (!temp.has(dayName)) return;
        const map = temp.get(dayName);

        lista.forEach((tarea) => {
          const taskInfo = {...tarea, empId: emp.id, empNombre: emp.nombre, fechaKey};
          const isLinkedExtra = (tarea.estatus === 5 || tarea.esExtra === true || tarea.es_extra === true) && (tarea.tareaOriginalId || tarea.tarea_original_id);
          if (isLinkedExtra) {
            pendingExtras.push({task: taskInfo, dayName});
            return;
          }

          const key = `${tarea.hora || "--:--"}__${tarea.nombre || "(Sin nombre)"}`;
          const row = map.get(key) || {
            hora: tarea.hora || "",
            hora_fin: tarea.hora_fin || "",
            nombre: tarea.nombre || "(Sin nombre)",
            descripcion: tarea.descripcion || "",
            puntaje: tarea.puntaje || 0,
            estatus: tarea.estatus,
            tareasOriginales: [],
            extrasCompletadas: [],
            fecha_asignacion: fechaKey
          };
          row.tareasOriginales.push(taskInfo);
          if (taskInfo.id !== undefined && taskInfo.id !== null) {
            idToRow.set(String(taskInfo.id), row);
          }
          map.set(key, row);
        });
      });
    });

    const pushExtra = (row, extraInfo) => {
      if (!row) return;
      const exists = (row.extrasCompletadas || []).some((e) =>
        String(e.empId) === String(extraInfo.empId) &&
        String(e.originalTaskId || "") === String(extraInfo.originalTaskId || "") &&
        (!extraInfo.nombre || e.nombre === extraInfo.nombre)
      );
      if (!exists) {
        row.extrasCompletadas.push(extraInfo);
      }
    };

    pendingExtras.forEach(({task}) => {
      const originalId = task.tareaOriginalId || task.tarea_original_id;
      const row = idToRow.get(String(originalId));
      pushExtra(row, {
        empId: task.empId,
        empNombre: task.empNombre,
        originalTaskId: originalId,
        puntaje: task.puntaje,
        hora_completado: task.hora || task.hora_inicio,
        nombre: task.nombre
      });
    });

    (tareasExtrasCompletadas || []).forEach((extra) => {
      const row = idToRow.get(String(extra.tarea_original_id));
      pushExtra(row, {
        empId: Number(extra.id_usuario_asignada),
        empNombre: extra.empleado || `Usuario ${extra.id_usuario_asignada}`,
        originalTaskId: extra.tarea_original_id,
        puntaje: extra.puntaje,
        hora_completado: extra.hora_origen,
        nombre: extra.nombre
      });
    });

    diasSemana.forEach((d) => {
      const map = temp.get(d) || new Map();
      const arr = Array.from(map.values());
      arr.sort((a, b) => compareHour(a.hora, b.hora) || a.nombre.localeCompare(b.nombre));
      state.activitiesByDay.set(d, arr);
    });
  }

  function collectActivitiesForDay(dayName) {
    return state.activitiesByDay.get(dayName) || [];
  }

  function debeMostrarseTarea(tarea, displayedDate) {
    if (!tarea || !tarea.fecha_inicio) return true;
    try {
      const ref = new Date(displayedDate);
      ref.setHours(0, 0, 0, 0);
      const start = new Date(tarea.fecha_inicio);
      start.setHours(0, 0, 0, 0);
      return start <= ref;
    } catch (err) {
      console.warn("Error validando fecha_inicio", err);
      return true;
    }
  }

  function calculateEmployeePoints(empleado, displayedDate, now) {
    const fechaKey = dateKeyFrom(displayedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFuture = displayedDate > today;
    const isPast = displayedDate < today;
    const isToday = displayedDate.getTime() === today.getTime();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const tareasDia = empleado?.tareas_asignadas?.[fechaKey] || [];

    let completados = 0;
    let totales = 0;
    let extras = 0;

    tareasDia.forEach((t) => {
      const puntaje = parseInt(t.puntaje) || 0;
      if (!puntaje) return;
      const esExtra = t.estatus === 5 || t.esExtra === true || t.es_extra === true;
      if (esExtra) {
        extras += puntaje;
        return;
      }
      if (isFuture) return;
      const mins = hourToMinutes(t.hora);
      if (isPast || (isToday && !isNaN(mins) && nowMinutes >= mins)) {
        totales += puntaje;
        if (t.estatus === 3) completados += puntaje;
      }
    });

    return {completados, totales, extras};
  }

  function buildHeader(visible) {
    if (!DOM.theadRow) return;
    DOM.theadRow.textContent = "";
    const frag = document.createDocumentFragment();

    ["Horario", "Actividad", "Puntos"].forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      th.setAttribute("scope", "col");
      frag.appendChild(th);
    });

    const displayedDate = getDisplayedDate();
    const now = new Date();

    visible.forEach((trab) => {
      const th = document.createElement("th");
      th.setAttribute("scope", "col");

      const container = document.createElement("div");
      container.className = "worker-header";

      const img = document.createElement("img");
      img.src = `/web/images/${trab.imagen || ""}`;
      img.alt = trab.nombre || "";
      img.onerror = function () {
        this.onerror = null;
        this.src = "/web/images/placeholder-user.png";
      };
      container.appendChild(img);

      const text = document.createElement("div");
      text.className = "worker-text";
      const name = document.createElement("span");
      name.className = "worker-name";
      name.textContent = trab.nombre || "";
      const role = document.createElement("span");
      role.className = "worker-role";
      role.textContent = trab.puesto || "";

      const puntos = calculateEmployeePoints(trab, displayedDate, now);
      const porcentaje = puntos.totales > 0 ? (puntos.completados / puntos.totales) * 100 : 0;
      const graficaWrapper = document.createElement("div");
      graficaWrapper.className = "worker-graphics-container";
      graficaWrapper.style.cssText = "display:flex;gap:10px;align-items:flex-start;justify-content:center;margin:8px 0;";

      const graficaCircularWrapper = document.createElement("div");
      graficaCircularWrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;";
      const asignadasLabel = document.createElement("span");
      asignadasLabel.style.cssText = "font-size:9px;color:#666;font-weight:600;text-transform:uppercase;";
      asignadasLabel.textContent = "Asignadas";
      const graficaCircular = document.createElement("div");
      graficaCircular.className = "worker-progress-chart";
      graficaCircular.style.cssText = "position:relative;width:50px;height:50px;";

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "50");
      svg.setAttribute("height", "50");
      svg.setAttribute("viewBox", "0 0 50 50");

      const circleBg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circleBg.setAttribute("cx", "25");
      circleBg.setAttribute("cy", "25");
      circleBg.setAttribute("r", "20");
      circleBg.setAttribute("fill", "none");
      circleBg.setAttribute("stroke", "#eeeeee");
      circleBg.setAttribute("stroke-width", "5");

      const circleProgress = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circleProgress.setAttribute("cx", "25");
      circleProgress.setAttribute("cy", "25");
      circleProgress.setAttribute("r", "20");
      circleProgress.setAttribute("fill", "none");
      circleProgress.setAttribute("stroke-width", "5");
      circleProgress.setAttribute("stroke-linecap", "round");
      circleProgress.setAttribute("transform", "rotate(-90 25 25)");

      let strokeColor = "#dc3545";
      if (porcentaje >= 91) strokeColor = "#28a745";
      else if (porcentaje >= 81) strokeColor = "#ffc107";
      circleProgress.setAttribute("stroke", strokeColor);

      const circumference = 2 * Math.PI * 20;
      const offset = circumference - (Math.min(porcentaje, 100) / 100) * circumference;
      circleProgress.setAttribute("stroke-dasharray", `${circumference}`);
      circleProgress.setAttribute("stroke-dashoffset", `${offset}`);

      svg.appendChild(circleBg);
      svg.appendChild(circleProgress);
      graficaCircular.appendChild(svg);

      const porcentajeText = document.createElement("div");
      porcentajeText.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:11px;font-weight:700;white-space:nowrap;line-height:1;";
      porcentajeText.style.color = strokeColor;
      porcentajeText.textContent = `${Math.round(porcentaje)}%`;
      graficaCircular.appendChild(porcentajeText);

      graficaCircularWrapper.appendChild(asignadasLabel);
      graficaCircularWrapper.appendChild(graficaCircular);
      graficaWrapper.appendChild(graficaCircularWrapper);

      const badgeExtras = document.createElement("div");
      badgeExtras.className = "worker-extras-badge";
      badgeExtras.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;";
      const extrasLabel = document.createElement("span");
      extrasLabel.style.cssText = "font-size:9px;color:#666;font-weight:600;text-transform:uppercase;";
      extrasLabel.textContent = "Extras";
      const extrasValue = document.createElement("span");
      extrasValue.style.cssText = "font-size:16px;font-weight:700;color:#1565c0;padding:12px 8px;background:#e3f2fd;border-radius:6px;min-width:35px;text-align:center;height:50px;display:flex;align-items:center;justify-content:center;";
      extrasValue.textContent = puntos.extras || "0";
      badgeExtras.appendChild(extrasLabel);
      badgeExtras.appendChild(extrasValue);

      graficaWrapper.appendChild(badgeExtras);

      text.appendChild(name);
      text.appendChild(graficaWrapper);
      text.appendChild(role);
      container.appendChild(text);

      th.appendChild(container);
      frag.appendChild(th);
    });

    DOM.theadRow.appendChild(frag);
  }

  function buildRows(rowsData, visibleTrabajadores, isToday, now) {
    if (!DOM.tbody) return;
    const frag = document.createDocumentFragment();
    const displayedDate = getDisplayedDate();
    const dayName = diasSemana[displayedDate.getDay()];
    const isFutureDay = calculateIsFutureDay(displayedDate.getDay(), now);

    rowsData.forEach((rowData, index) => {
      const tr = document.createElement("tr");
      tr.dataset.horaInicio = rowData.hora || "";
      tr.dataset.horaFin = rowData.hora_fin || "";
      tr.dataset.nombre = rowData.nombre || "";
      tr.dataset.descripcion = rowData.descripcion || "";
      tr.dataset.puntaje = rowData.puntaje || "0";

      let horaFin = rowData.hora_fin;
      const esExtra = rowData.estatus === 5 || rowData.estatus === "5" || rowData.es_extra === true;
      if (esExtra) {
        horaFin = rowData.hora;
      } else if (!horaFin && index < rowsData.length - 1) {
        horaFin = rowsData[index + 1].hora;
      } else if (!horaFin && index === rowsData.length - 1) {
        horaFin = "21:00";
      }
      tr.dataset.horaFin = horaFin || "";

      const horarioCell = document.createElement("td");
      horarioCell.textContent = horaFin ? `${rowData.hora} - ${horaFin}` : rowData.hora ? `${rowData.hora} hrs` : "-";
      tr.appendChild(horarioCell);

      const actividadCell = document.createElement("td");
      actividadCell.style.verticalAlign = "top";
      actividadCell.style.textAlign = "left";
      const nombreDiv = document.createElement("div");
      nombreDiv.className = "activity-name";
      nombreDiv.textContent = rowData.nombre;
      const descDiv = document.createElement("div");
      descDiv.className = "activity-desc";
      descDiv.textContent = rowData.descripcion || "";
      actividadCell.appendChild(nombreDiv);
      actividadCell.appendChild(descDiv);
      tr.appendChild(actividadCell);

      const puntosCell = document.createElement("td");
      let totalPuntosActividad = 0;
      (rowData.tareasOriginales || []).forEach((tarea) => {
        if (!debeMostrarseTarea(tarea, displayedDate)) return;
        if (tarea.puntaje) totalPuntosActividad += parseInt(tarea.puntaje) || 0;
      });
      puntosCell.textContent = totalPuntosActividad > 0 ? totalPuntosActividad : "-";
      puntosCell.style.textAlign = "center";
      puntosCell.style.fontWeight = "bold";
      tr.appendChild(puntosCell);

      visibleTrabajadores.forEach((trab) => {
        const td = document.createElement("td");
        td.dataset.empId = String(trab.id ?? "");
        td.dataset.empName = trab.nombre || "";
        td.dataset.hora = rowData.hora || "";
        td.dataset.horaFin = horaFin || "";
        td.dataset.puntaje = rowData.puntaje || 0;
        td.dataset.nombre = rowData.nombre || "";

        const tarea = (rowData.tareasOriginales || []).find((t) => t.empId === trab.id);
        if (tarea) {
          const statusClass = getStatusClass(tarea.estatus, tarea.hora, isToday, now, isFutureDay);
          td.className = statusClass;
          td.textContent = "-";
          td.dataset.hasTask = "true";
          td.dataset.desc = tarea.descripcion || "";
          td.dataset.estatus = String(tarea.estatus ?? "");
          td.dataset.originalEmpId = String(trab.id ?? "");
          if (tarea.id !== undefined && tarea.id !== null) td.dataset.tareaId = String(tarea.id);
          td.onclick = () => openModal({
            ...tarea,
            empId: trab.id,
            tareaId: tarea.id,
            allowComplete: tarea.estatus !== 3 && tarea.estatus !== 5
          });
        } else {
          const extraCompletada = isToday ? (rowData.extrasCompletadas || []).find((e) => Number(e.empId) === Number(trab.id)) : null;
          if (extraCompletada) {
            td.className = "status-extra";
            td.textContent = "-";
            td.dataset.hasTask = "true";
            td.dataset.estatus = "5";
            td.dataset.desc = rowData.descripcion || "";
            td.dataset.originalEmpId = String(trab.id ?? "");
          } else if (isToday) {
            let tareaVencida = null;
            let empleadoOriginal = null;
            for (const tareaOrig of (rowData.tareasOriginales || [])) {
              if (Number(tareaOrig.estatus) === 4) {
                tareaVencida = tareaOrig;
                empleadoOriginal = state.trabajadores.find((e) => e.id === tareaOrig.empId);
                break;
              }
            }
            const yaCompletadaComoExtra = (rowData.extrasCompletadas || []).length > 0;
            const tareaExtraActiva = tareaVencida ? tareasExtraActivas.some((te) => String(te.TaskID) === String(tareaVencida.id)) : false;
            const esEmpleadoOriginal = empleadoOriginal && trab.id === empleadoOriginal.id;

            if (tareaVencida && empleadoOriginal && !yaCompletadaComoExtra && tareaExtraActiva && !esEmpleadoOriginal) {
              td.className = "status-available";
              td.textContent = "-";
              td.dataset.hasTask = "true";
              td.dataset.desc = tareaVencida.descripcion || "";
              td.dataset.estatus = "4";
              td.dataset.isAvailable = "true";
              td.dataset.originalEmpId = String(empleadoOriginal.id ?? "");
              td.dataset.puntaje = String(tareaVencida.puntaje || 0);
              if (tareaVencida.id !== undefined && tareaVencida.id !== null) {
                td.dataset.originalTaskId = String(tareaVencida.id);
              }
              td.onclick = () => openModal({
                ...tareaVencida,
                empId: trab.id,
                isAvailableExtra: true,
                originalEmpId: tareaVencida.empId,
                originalTaskId: tareaVencida.id,
                taskDesc: tareaVencida.descripcion,
                hour: tareaVencida.hora,
                puntaje: tareaVencida.puntaje
              });
            } else {
              td.textContent = "-";
            }
          } else {
            td.textContent = "-";
          }
        }

        tr.appendChild(td);
      });

      frag.appendChild(tr);
    });

    DOM.tbody.textContent = "";
    DOM.tbody.appendChild(frag);
  }

  function updateTaskProgressWidget() {
    if (!DOM.taskProgress) return;
    const countEl = document.getElementById("chartCountG");
    const percentEl = document.getElementById("chartPercentG");
    const extrasEl = document.getElementById("extrasCountG");

    const empleados = state.trabajadores || [];
    if (!empleados.length) {
      if (countEl) {
        countEl.textContent = "0%";
        countEl.style.color = "#dc3545";
        countEl.style.fontWeight = "700";
      }
      if (percentEl) percentEl.style.display = "none";
      if (extrasEl) extrasEl.textContent = "0";
      return;
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const todayKey = dateKeyFrom(now);

    let totalPuntosVencidos = 0;
    let totalPuntosCompletados = 0;
    let totalPuntosExtrasGanados = 0;

    empleados.forEach((emp) => {
      const tareasDia = emp?.tareas_asignadas?.[todayKey] || [];
      tareasDia.forEach((t) => {
        const puntaje = parseInt(t.puntaje) || 0;
        const mins = hourToMinutes(t.hora);
        if (t.estatus === 5) return;
        if (!isNaN(mins) && nowMinutes >= mins && puntaje > 0) {
          totalPuntosVencidos += puntaje;
          if (t.estatus === 3) totalPuntosCompletados += puntaje;
        }
      });
    });

    (tareasExtrasCompletadas || []).forEach((extra) => {
      const puntaje = parseInt(extra.puntaje) || 0;
      if (puntaje > 0) totalPuntosExtrasGanados += puntaje;
    });

    const C = 314;
    const pct = totalPuntosVencidos > 0 ? (totalPuntosCompletados / totalPuntosVencidos) * 100 : 0;
    const seg = Math.max(0, Math.min(C, (pct / 100) * C));

    let displayText = `${Math.round(pct)}%`;
    let textColor = "#dc3545";
    if (pct > 100) {
      displayText = "+100%";
      textColor = "#2d79f3";
    } else if (pct >= 91) {
      textColor = "#28a745";
    } else if (pct >= 81) {
      textColor = "#ffc107";
    }

    if (countEl) {
      countEl.textContent = displayText;
      countEl.style.color = textColor;
      countEl.style.fontWeight = "700";
    }
    if (percentEl) percentEl.style.display = "none";
    if (extrasEl) extrasEl.textContent = String(totalPuntosExtrasGanados);

    const circleCompleted = DOM.taskProgress.querySelector(".progress-ring__circle.completed");
    const circleNot = DOM.taskProgress.querySelector(".progress-ring__circle.not-completed");
    if (circleNot) {
      circleNot.style.strokeDasharray = `${C} 0`;
      circleNot.style.strokeDashoffset = "0";
    }
    if (circleCompleted) {
      circleCompleted.style.strokeDasharray = `${seg.toFixed(3)} ${(C - seg).toFixed(3)}`;
      circleCompleted.style.strokeDashoffset = "0";
    }
  }

  function scrollRowToCenter(rowEl) {
    if (!DOM.tableWrapper || !rowEl) return;
    const headerHeight = DOM.workerTable?.tHead ? DOM.workerTable.tHead.offsetHeight : 0;
    const rowTop = rowEl.offsetTop - headerHeight;
    const rowHeight = rowEl.offsetHeight;
    const wrapperHeight = DOM.tableWrapper.clientHeight;
    const desired = Math.max(0, rowTop - ((wrapperHeight / 2) - (rowHeight / 2)));
    DOM.tableWrapper.scrollTo({top: desired, behavior: "smooth"});
  }

  function centerOnCurrentTime({forceScroll = false, now = new Date()} = {}) {
    const isToday = state.currentDayIndex === now.getDay();
    const rows = Array.from(DOM.tbody?.rows || []);
    if (!rows.length) return;

    rows.forEach((r) => {
      r.classList.remove("current-row");
      r.querySelectorAll('td[data-has-task="true"]').forEach((cell) => {
        cell.textContent = "";
      });
    });

    let targetIndex = 0;
    if (isToday) {
      const nowMin = now.getHours() * 60 + now.getMinutes();
      let currentIdx = -1;
      state.lastRowsData.forEach((row, idx) => {
        const mins = hourToMinutes(row.hora);
        if (!isNaN(mins) && mins <= nowMin) currentIdx = idx;
      });
      targetIndex = currentIdx >= 0 ? currentIdx : 0;
      if (!forceScroll && state.lastMinuteScrolled === now.getMinutes()) {
        rows[targetIndex]?.classList.add("current-row");
        state.lastTargetIndex = targetIndex;
        return;
      }
      state.lastMinuteScrolled = now.getMinutes();
    }

    const targetRow = rows[targetIndex];
    if (!targetRow) return;
    targetRow.classList.add("current-row");
    targetRow.querySelectorAll('td[data-has-task="true"]').forEach((cell) => {
      cell.textContent = "";
    });
    state.lastTargetIndex = targetIndex;
    scrollRowToCenter(targetRow);
  }

  function adjustCenterBandHeight() {
    if (!DOM.centerBand) return;
    const rows = Array.from(DOM.tbody?.rows || []);
    const target = rows[state.lastTargetIndex] || rows[0];
    const h = target ? target.offsetHeight : 48;
    DOM.centerBand.style.setProperty("--row-height", `${h}px`);
  }

  function updateClockVisibility() {
    const isToday = state.daysOffset === 0;
    (DOM.realClockCols || []).forEach((col) => col.classList.toggle("hidden", !isToday));
    if (DOM.todayBtn) DOM.todayBtn.classList.toggle("hidden", isToday);
  }

  function updateCellStates(now) {
    if (!DOM.tbody) return;
    const dayName = diasSemana[state.currentDayIndex];
    const isToday = state.currentDayIndex === now.getDay();
    const isFutureDay = calculateIsFutureDay(state.currentDayIndex, now);
    const rows = DOM.tbody.querySelectorAll("tr");

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      for (let i = 3; i < cells.length; i++) {
        const td = cells[i];
        if (td.dataset.hasTask !== "true") continue;
        const empId = td.dataset.empId;
        const hora = td.dataset.hora;
        const nombreTarea = td.dataset.nombre;
        const empleado = state.trabajadores.find((t) => String(t.id) === String(empId));
        if (!empleado) continue;
        const tareas = (empleado.tareas_asignadas && empleado.tareas_asignadas[dayName]) || [];
        let tarea;
        if (td.dataset.tareaId) {
          tarea = tareas.find((t) => String(t.id) === String(td.dataset.tareaId));
        } else {
          tarea = tareas.find((t) => (t.nombre || "") === nombreTarea && (t.hora || "") === hora);
        }
        if (!tarea) continue;
        const newClassName = getStatusClass(tarea.estatus, tarea.hora, isToday, now, isFutureDay);
        if (td.className !== newClassName) td.className = newClassName;
      }
    });
  }

  function renderForCurrentState() {
    const displayedDate = getDisplayedDate();
    state.currentDayIndex = displayedDate.getDay();
    if (state.trabajadores.length) buildActivitiesCache();

    const dayName = diasSemana[displayedDate.getDay()];
    if (DOM.tasksDayLabel) DOM.tasksDayLabel.textContent = formatFechaCompleta(displayedDate);
    if (!DOM.theadRow || !DOM.tbody) return;
    DOM.theadRow.textContent = "";
    DOM.tbody.textContent = "";

    const visibleTrabajadores = state.trabajadores || [];
    buildHeader(visibleTrabajadores);
    if (!visibleTrabajadores.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.style.textAlign = "center";
      td.style.padding = "40px 20px";
      td.textContent = "Sin empleados ni tareas disponibles";
      tr.appendChild(td);
      DOM.tbody.appendChild(tr);
      return;
    }

    const rowsData = collectActivitiesForDay(dayName).sort((a, b) => compareHour(a.hora, b.hora) || a.nombre.localeCompare(b.nombre));
    state.lastRowsData = rowsData;
    const now = new Date();
    const isToday = state.daysOffset === 0;

    if (rowsData.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = visibleTrabajadores.length + 3;
      td.style.textAlign = "center";
      td.style.padding = "60px 20px";
      td.style.fontSize = "1.2rem";
      td.style.color = "#999";
      td.textContent = `No hay tareas programadas para ${dayName}`;
      tr.appendChild(td);
      DOM.tbody.appendChild(tr);
    } else {
      buildRows(rowsData, visibleTrabajadores, isToday, now);
      mergeCells(0);
    }

    // Mostrar contenedores con animación ligera
    if (DOM.tableWrapper) DOM.tableWrapper.style.opacity = "1";
    const fadeIns = document.querySelectorAll(".fade-in");
    fadeIns.forEach((el) => el.classList.add("show"));
    if (DOM.titulo) DOM.titulo.classList.add("show");

    updateClockVisibility();
    centerOnCurrentTime({forceScroll: true, now});
    adjustCenterBandHeight();
    updateTaskProgressWidget();

    if (DOM.prevEmpBtn) DOM.prevEmpBtn.disabled = state.currentEmpPage <= 0;
    if (DOM.nextEmpBtn) DOM.nextEmpBtn.disabled = state.currentEmpPage >= 0;
    if (DOM.prevDayBtn) DOM.prevDayBtn.classList.toggle("hidden", state.daysOffset <= 0);
  }

  function openModal(tarea) {
    if (!DOM.modal) return;
    const isAvailableExtra = tarea.isAvailableExtra === true || tarea.isAvailable === true;
    DOM.modalTaskName.textContent = tarea.nombre || "Tarea";
    DOM.modalTaskDesc.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div><strong>Descripción:</strong> ${tarea.descripcion || ""}</div>
        <div><strong>Hora:</strong> ${tarea.hora || ""}</div>
        <div><strong>Puntos:</strong> ${tarea.puntaje || 0}</div>
      </div>`;

    if (DOM.modalCompleteBtn) {
      if (isAvailableExtra) {
        DOM.modalCompleteBtn.style.display = "inline-flex";
        DOM.modalCompleteBtn.innerHTML = "✓ Completar como Extra";
        DOM.modalCompleteBtn.onclick = () => {
          DOM.modal.classList.add("hidden");
          pinModal?.openPinModal?.({
            ...tarea,
            isAvailableExtra: true,
            originalEmpId: tarea.originalEmpId,
            originalTaskId: tarea.originalTaskId,
            taskDesc: tarea.descripcion,
            hour: tarea.hora
          });
        };
      } else {
        const dayName = diasSemana[new Date().getDay()];
        const validacion = validarSiPuedeCompletarse(tarea, tarea.empId, dayName);
        const puede = validacion.puedeCompletar && tarea.allowComplete;
        DOM.modalCompleteBtn.style.display = puede ? "inline-flex" : "none";
        DOM.modalCompleteBtn.innerHTML = "✓ Completar Tarea";
        DOM.modalCompleteBtn.onclick = () => {
          DOM.modal.classList.add("hidden");
          pinModal?.openPinModal?.(tarea);
        };
      }
    }

    if (DOM.modalCloseBtn) {
      DOM.modalCloseBtn.onclick = () => DOM.modal.classList.add("hidden");
    }

    DOM.modal.classList.remove("hidden");
  }

  async function deleteEmployee(empId, empName) {
    if (!empId) {
      toast("Error: No se pudo identificar el empleado para eliminar", "error");
      return;
    }
    const ok = confirm(`¿Eliminar a "${empName}" y todos sus datos?`);
    if (!ok) return;
    try {
      const resp = await fetch(`/empleados/${empId}`, {method: "DELETE"});
      if (!resp.ok) throw new Error(`Error del servidor: ${resp.status}`);
      toast(`Empleado "${empName}" eliminado`, "success", 3000);
      renderForCurrentState();
    } catch (err) {
      console.error(err);
      toast(`No se pudo eliminar: ${err.message}`);
    }
  }

  return {renderForCurrentState, openModal, deleteEmployee, buildActivitiesCache, updateCellStates, centerOnCurrentTime};
}
