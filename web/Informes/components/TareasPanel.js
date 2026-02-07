import { getAllTasks, normalizeDay } from "../utils/index.js";
import { ocultarPanelTareasVencidas, mostrarPanelTareasVencidas } from "./TareasVencidas.js";

let tareasRealizadasMap = {};
let empleadosGlobales = []; // 🔥 Nuevo: almacenar todos los empleados para detectar tareas extras

export function setTareasRealizadasMap(map) {
  tareasRealizadasMap = map;
}

// 🔥 Nuevo: función para actualizar la lista global de empleados
export function setEmpleadosGlobales(empleados) {
  empleadosGlobales = empleados || [];
}

export async function mostrarTareasEmpleado(empleado) {
  // 🔥 Ocultar panel de tareas vencidas + gráfica al seleccionar empleado
  ocultarPanelTareasVencidas();

  // 🔥 Ocultar la fecha del encabezado principal cuando se selecciona un empleado
  const fechaDiv = document.getElementById('fecha-actual-informes');
  if (fechaDiv) {
    fechaDiv.style.display = 'none';
  }

  // 🔥 Obtener rol del usuario actual
  const usuario = JSON.parse(localStorage.getItem("loggedUser") || '{}');
  const esAdmin = usuario.role === 'admin' || usuario.role === 'supervisor';

  // Actualizar el nombre en el título de informes si existe
  const tituloInformes = document.getElementById("titulo-informes");
  let nombreSpan = document.getElementById("nombre-usuario-titulo");
  if (tituloInformes && nombreSpan) {
    nombreSpan.textContent = empleado.nombre;
    nombreSpan.style.display = "inline";
  }
  const calendarioContainer = document.getElementById("calendario-container");
  if (!calendarioContainer) return;

  // Mostrar calendario con display flex y quitar is-hidden
  calendarioContainer.classList.remove("is-hidden");
  calendarioContainer.removeAttribute('style'); // Remover cualquier display: none
  calendarioContainer.style.display = "flex";
  calendarioContainer.innerHTML = "";
  calendarioContainer.classList.add("tasks-card");

  // Obtener mes y año actual
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Calcular días del mes
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  // Datos en vivo para el día actual (se usa para evitar el historial)
  const weekdayBackend = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diaHoyNombre = weekdayBackend[today.getDay()];
  let tareasTiempoRealHoy = null;

  try {
    const response = await fetch(`http://localhost:8001/tareas/panel/obtener`, { cache: 'no-store' });
    if (response.ok) {
      const panelData = await response.json();
      console.log("🔥 Panel en vivo cargado:", panelData);
      console.log("empleado a buscar en panel:", empleado);
      console.log("diaHoyNombre:", diaHoyNombre);

      const empleadoPanel = panelData.panel.find(p => Number(p.id) === Number(empleado.id));
      if (empleadoPanel?.tareas_asignadas && empleadoPanel.tareas_asignadas[diaHoyNombre]) {
        const tareasHoy = empleadoPanel.tareas_asignadas[diaHoyNombre] || [];
        tareasTiempoRealHoy = tareasHoy.filter(t => t.estatus !== 'sin_iniciar');
      }

    } else {
      console.warn(`[TareasPanel] No se pudo obtener panel en vivo: ${response.status}`);
    }
  } catch (error) {
    console.error('[TareasPanel] Error al obtener panel en vivo:', error);
  }

  // Actualizar solo la parte derecha del título principal con nombre, fecha y botón volver
  // Crear o actualizar el header derecho al dar clic en un empleado
  const tituloInformesEl = document.getElementById('titulo-informes');
  let rightInfo = document.getElementById('titulo-informes-right');
  if (!rightInfo && tituloInformesEl) {
    rightInfo = document.createElement('span');
    rightInfo.id = 'titulo-informes-right';
    rightInfo.style.display = 'flex';
    rightInfo.style.flexDirection = 'column';
    rightInfo.style.alignItems = 'flex-end';
    rightInfo.style.gap = '8px';
    rightInfo.style.fontWeight = '500';
    rightInfo.style.fontSize = '18px';
    rightInfo.style.marginLeft = 'auto'; // Empujar a la derecha
    tituloInformesEl.appendChild(rightInfo);
  }
  if (rightInfo) {
    rightInfo.innerHTML = `
      <div style='display:flex;align-items:center;gap:12px;'>
        <div style='display:flex;flex-direction:column;align-items:flex-end;'>
          <span style='color:#333;font-size:18px;font-weight:500;'>${empleado.nombre}</span>
          <span style='color:#666;font-size:16px;font-weight:500;margin-bottom:6px;display:block;'>${monthNames[month]} ${year}</span>
        </div>
      </div>
    `;
  }

  // Crear contenedor del cuerpo con scroll
  const bodyDiv = document.createElement("div");
  bodyDiv.classList.add("tasks-card-body");
  // El overflow se maneja por CSS

  // Obtener todas las tareas del empleado
  const allTasks = getAllTasks(empleado);
  const realizadasBackup = tareasRealizadasMap[empleado.id] || [];

  // 🔥 NUEVO: Detectar tareas que fueron completadas como extras por otros empleados
  // Para evitar contarlas dos veces (una en el empleado original como vencida, otra como extra en otro empleado)
  const tareasCompletadasComoExtras = new Set();

  // Recorrer todos los empleados para encontrar tareas extras
  for (const emp of empleadosGlobales) {
    if (emp && emp.id !== empleado.id) {
      for (const dia in emp.tareas_asignadas || {}) {
        const tareas = emp.tareas_asignadas[dia] || [];
        for (const tarea of tareas) {
          // Si es una tarea extra con referencia a una tarea original, marcar el ID original
          if (tarea.estatus === 'extra' && tarea.tareaOriginalId) {
            tareasCompletadasComoExtras.add(Number(tarea.tareaOriginalId));
          }
        }
      }
    }
  }

  // Combinar tareas - deduplicar pero MANTENER todas las tareas
  // (incluso vencidas, aunque hayan sido completadas como extras por otros)
  // La exclusión se hará durante el cálculo de puntos, no aquí
  const merged = [
    ...allTasks.filter(t => t.estatus === 'completada'),
    ...realizadasBackup,
    ...allTasks.filter(t => t.estatus !== 'completada')
  ].filter((t, i, arr) => {
    // Deduplicar por ID - pero PERMITIR vencidas incluso si fueron completadas como extras
    if (arr.findIndex(x => x.id === t.id) !== i) return false;
    return true;
  });

  // 🔥 Función auxiliar para obtener puntos del historial guardado
  function obtenerPuntosHistorial(fechaBuscada) {
    const historial = empleado.historial_puntos || {};
    // console.log(`🔍 [${empleado.nombre}] Buscando historial para ${fechaBuscada}:`, historial[fechaBuscada] || 'NO ENCONTRADO');
    // console.log(`   Fechas disponibles en historial:`, Object.keys(historial));
    if (historial[fechaBuscada]) {
      // Usar snapshot guardado (historial no cambia)
      return {
        puntosAsignados: historial[fechaBuscada].asignados || 0,
        puntosRealizados: historial[fechaBuscada].completados || 0,
        puntosPerdidos: historial[fechaBuscada].perdidos || 0,
        puntosExtras: historial[fechaBuscada].extras || 0,
        totalPuntos: (historial[fechaBuscada].completados || 0) + (historial[fechaBuscada].extras || 0),
        fecha: fechaBuscada,
        esHistorial: true // Flag para saber que vino del historial
      };
    }
    return null; // No hay historial para esta fecha
  }

  // Función para calcular puntos por FECHA ESPECÍFICA (acepta Date object)
  function calcularPuntosPorDiaFecha(dayDate) {
    const fechaBuscada = dayDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD

    // Determinar si esta fecha ya pasó o es futura
    const hoy = new Date();
    const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()); // Hora 00:00:00
    const fechaEvaluada = new Date(dayDate);
    fechaEvaluada.setHours(0, 0, 0, 0);
    const esFuturo = fechaEvaluada > hoyInicio;
    const esHoy = fechaEvaluada.getTime() === hoyInicio.getTime();
    const esPasado = fechaEvaluada < hoyInicio;

    // console.log(`🔍 [${empleado.nombre}] calcularPuntosPorDiaFecha(${fechaBuscada}): esPasado=${esPasado}, esHoy=${esHoy}, esFuturo=${esFuturo}`);

    // 🔥 USAR HISTORIAL GUARDADO solo para días pasados
    if (esPasado) {
      // console.log(`   ✅ Buscando en historial porque esPasado`);
      const historial = obtenerPuntosHistorial(fechaBuscada);
      if (historial) {
        // console.log(`   ✅ ENCONTRADO EN HISTORIAL:`, historial);
        return historial; // Usar snapshot guardado
      }
      // console.log(`   ⚠️ NO encontrado en historial, calculando fallback`);
      // Si no hay historial, calcular (fallback)
    }

    // Para día actual o si no hay historial: CALCULAR en tiempo real
    const weekdayFull = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayName = normalizeDay(weekdayFull[dayDate.getDay()]);

    // Usar datos en vivo para el día actual si están disponibles
    const tareasDelDia = (esHoy && tareasTiempoRealHoy)
      ? tareasTiempoRealHoy
      : merged.filter(t => {
        if (t.fecha) {
          return t.fecha === fechaBuscada;
        }
        return normalizeDay(t.dia) === dayName;
      });
    // console.log("fue hoy",esHoy && tareasTiempoRealHoy)
    // console.log("es hoy?", esHoy, "tareasDelDia:", tareasDelDia);
    let puntosAsignados = 0;
    let puntosRealizados = 0;
    let puntosPerdidos = 0;
    let puntosExtras = 0;

    tareasDelDia.forEach(tarea => {
      const puntos = parseInt(tarea.puntaje ?? tarea.puntos) || 0;

      // Puntos asignados: SIEMPRE se muestran (son las tareas que debe hacer)
      // Estado extra no se cuenta como asignado
      if (tarea.estatus !== 'extra') {
        puntosAsignados += puntos;
      }

      // Si es un día FUTURO, NO contar puntos realizados ni perdidos
      if (esFuturo) {
        return; // Siguiente tarea
      }

      // Estados: sin_iniciar, en_progreso, completada, vencida, extra
      if (tarea.estatus === 'completada') {
        puntosRealizados += puntos;
      }
      // 🔥 PUNTOS NO GANADOS: Estatus en_progreso y vencida
      if (tarea.estatus === 'en_progreso' || tarea.estatus === 'vencida') {
        puntosPerdidos += puntos;
      }
      if (tarea.estatus === 'extra') {
        puntosExtras += puntos;
      }
    });

    const totalPuntos = puntosRealizados + puntosExtras;

    return {
      puntosAsignados,
      puntosRealizados,
      puntosPerdidos,
      puntosExtras,
      totalPuntos,
      fecha: fechaBuscada,
      esFuturo, // Útil para debug
      esHistorial: false
    };
  }

  // Función wrapper para compatibilidad con código existente
  function calcularPuntosPorDia(dayNumber) {
    const dayDate = new Date(year, month, dayNumber);
    return calcularPuntosPorDiaFecha(dayDate);
  }

  /** =========================
   *  🎨 CELDAS PINTADAS (unidas)
   * ========================= */
  function ensurePaintFillStyles() {
    if (document.getElementById('paintfill-styles')) return;
    const style = document.createElement('style');
    style.id = 'paintfill-styles';
    style.textContent = `
      /* Celda pintada de arriba hacia abajo con el % */
      .pfill-cell {
        position: relative;
        min-height: 20px;
        padding: 2px 4px;
        text-align: center;
        vertical-align: middle;
        font-weight: 700;
        border-left: 1px solid #eee;
        border-right: 1px solid #eee;
        background: #f3f4f6; /* fondo base */
      }
      /* Usamos variables CSS para porcentaje y colores */
      .pfill-cell[data-p] {
        background:
          linear-gradient(
            to bottom,
            var(--pfill-color, #6d28d9) 0%,
            var(--pfill-color, #6d28d9) calc(var(--p, 0) * 1%),
            var(--pfill-bg, #f3f4f6) calc(var(--p, 0) * 1%),
            var(--pfill-bg, #f3f4f6) 100%
          );
        color: #111;
      }
      /* Más de 100% → texto en verde (el fill queda al 100) */
      .pfill-gt100 { color: #0e9f6e; }

      /* N/D (sin denominador) */
      .pfill-nd {
        background: repeating-linear-gradient(
          45deg,
          #f3f4f6,
          #f3f4f6 8px,
          #e5e7eb 8px,
          #e5e7eb 16px
        );
        color: #9ca3af;
        font-weight: 600;
      }

      /* Integración con tabla - solo celdas diarias */
      .puntos-table td.pfill-cell:not(.pfill-quincenal-empty):not(.pfill-quincenal-percent) {
        border-bottom: 1px solid #e8e8e8;
      }
      
      /* Celdas quincenales con porcentaje - el color se define inline */
      .puntos-table td.pfill-quincenal-percent {
        /* El border se define inline según el color */
      }
      
      /* Celdas quincenales vacías (huella) - el color se define inline según el % */
      .pfill-quincenal-empty {
        color: #ffffff !important;
        font-weight: 600;
        text-align: center;
        /* Background y borders se definen inline según el porcentaje */
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Determina el color según el porcentaje para gráfica diaria
   * 0-79: Rojo, 80-89: Amarillo, 90-100: Verde
   */
  function getColorByPercent(percent) {
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;

    if (percent < 80) return '#ef4444'; // Rojo: 0-79
    if (percent < 90) return '#f59e0b'; // Amarillo: 80-89
    return '#10b981'; // Verde: 90-100
  }

  /**
   * Crea un <td> con fondo de color COMPLETO según el %
   * @param {number|null} rawPercent  // puede ser >100; puede ser null (N/D)
   * @param {object} opts
   *   - nd: bool  → marcar N/D (sin denominador)
   *   - color: string → color de relleno (opcional)
   *   - bg: string → color del fondo (opcional)
   *   - title: string → tooltip (opcional)
   *   - showPlus: bool → mostrar "+100%" solo si es true (para controlar cuándo aparece)
   *   - useColorScale: bool → usar escala de colores automática (rojo/amarillo/verde)
   */
  function createPaintPercentTd(rawPercent, { nd = false, color = '#6d28d9', bg = '#f3f4f6', title = null, showPlus = true, useColorScale = false } = {}) {
    const td = document.createElement('td');
    td.className = 'pfill-cell-full'; // Nueva clase para fondo completo
    td.title = title || '';
    td.style.cssText = `
      text-align: center;
      padding: 8px 6px;
      font-size: 11px;
      font-weight: 700;
      border-left: 1px solid #eee;
      border-right: 1px solid #eee;
      height: 100%;
      display: table-cell;
      vertical-align: middle;
    `;

    if (nd || rawPercent === null || Number.isNaN(rawPercent)) {
      td.style.background = 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 8px, #e5e7eb 8px, #e5e7eb 16px)';
      td.style.color = '#9ca3af';
      td.textContent = 'N/D';
      return td;
    }

    // Si se solicita escala de colores, calcular el color automáticamente
    const finalColor = useColorScale ? getColorByPercent(rawPercent) : color;

    // Aplicar color completo de fondo
    td.style.backgroundColor = finalColor;
    td.style.color = '#ffffff'; // Texto blanco sobre fondo de color

    // 🔥 Limitar el porcentaje a máximo 100%
    const displayPercent = Math.min(Math.round(rawPercent), 100);

    if (rawPercent > 100 && showPlus) {
      td.textContent = '+100%';
    } else {
      td.textContent = `${displayPercent}%`;
    }
    return td;
  }

  // ==========================
  //   TABLAS QUINCENALES
  // ==========================
  /**
   * @param {string} titulo - Título de la quincena
   * @param {Date} fechaInicio - Fecha de inicio de la quincena
   * @param {Date} fechaFin - Fecha de fin de la quincena
   */
  function crearTablaQuincena(titulo, fechaInicio, fechaFin) {
    ensurePaintFillStyles(); // estilos para las celdas pintadas

    const section = document.createElement("div");
    section.classList.add("quincena-section");
    section.style.display = "flex";
    section.style.gap = "30px";
    section.style.alignItems = "flex-start";

    const tableContainer = document.createElement("div");
    tableContainer.style.flex = "1";

    const h3 = document.createElement("h3");
    h3.textContent = titulo;
    h3.style.marginBottom = "20px";
    h3.style.color = "#333";
    h3.style.fontSize = "20px";
    h3.style.fontWeight = "700";
    h3.style.letterSpacing = "0.5px";
    tableContainer.appendChild(h3);

    const table = document.createElement("table");
    table.classList.add("puntos-table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.backgroundColor = "#fff";
    table.style.boxShadow = "0 4px 8px rgba(0,0,0,0.12)";
    table.style.borderRadius = "10px";
    table.style.overflow = "hidden";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <th style="padding: 2px 4px; text-align: center; font-weight: 600; font-size:   15px;">Día</th>
        <th style="padding: 2px 4px; text-align: center; font-weight: 600; font-size: 15px;">Puntos Asignados</th>
        <th style="padding: 2px 4px; text-align: center; font-weight: 600; font-size: 15px;">Puntos Ganados</th>
        <th style="padding: 2px 4px; text-align: center; font-weight: 600; font-size: 15px;">Puntos no Ganados</th>
        <th style="padding: 2px 4px; text-align: center; font-weight: 600; font-size: 15px;">Puntos Extra Ganados</th>
        <th style="padding: 2px 4px; text-align: center; font-weight: 600; font-size: 15px;">Puntos Totales Ganados</th>
        <th style="padding: 2px 4px; text-align: center; font-weight: 600; font-size: 15px;">% Diario</th>
        <th style="padding: 2px 4px; text-align: center; font-weight: 600; font-size: 15px;">% Quincenal</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    // 🔥 INICIALIZAR TODOS LOS ACUMULADORES - CRÍTICO para independencia de quincenas
    let totalesQuincena = { asignados: 0, realizados: 0, perdidos: 0, extras: 0, total: 0 };
    let acumAsignados = 0;
    let acumRealizadosExtras = 0;
    const celdásQuincenales = [];
    let ultimoPorcentajeQuincenal = null;

    const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date();

    // Función para determinar el color según el porcentaje quincenal
    // 🔥 NUEVO: Escala de colores según porcentajes
    // 0-79: Rojo, 80-89: Amarillo, 90-100: Verde
    function getColorQuincenal(percent, nd = false, sinTareas = false) {
      if (sinTareas) return '#d1d5db'; // Gris claro si sin tareas asignadas
      if (nd) return '#9ca3af'; // Gris N/A
      if (percent < 0) percent = 0;
      if (percent > 100) percent = 100;

      if (percent < 80) return '#ef4444'; // Rojo: 0-79
      if (percent < 90) return '#f59e0b'; // Amarillo: 80-89
      return '#10b981'; // Verde: 90-100
    }

    // 🔥 CALCULAR COLOR DE TODA LA COLUMNA primero
    // Recorrer todos los días hasta el final de la quincena O el día actual (lo que sea menor)
    let tempDate = new Date(fechaInicio);
    let tempAcumAsignados = 0;
    let tempAcumRealizadosSinExtras = 0; // 🔥 Solo realizados, SIN extras
    let colorColumnaQuincenal = '#d1d5db'; // Color por defecto (gris para sin tareas)

    const hoyInicio = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    hoyInicio.setHours(0, 0, 0, 0);

    // 🔥 Determinar hasta qué fecha calcular: si la quincena ya terminó, usar fechaFin; si no, usar hoyInicio
    const fechaLimite = fechaFin <= hoyInicio ? fechaFin : hoyInicio;

    // 🔥 NUEVO: Flag para saber si hay tareas asignadas en toda la quincena hasta hoy
    let sinTareasAsignadas = true;

    while (tempDate <= fechaLimite) {
      const tempDayDate = new Date(tempDate);
      tempDayDate.setHours(0, 0, 0, 0);

      const puntosDia = calcularPuntosPorDiaFecha(tempDayDate);
      tempAcumAsignados += puntosDia.puntosAsignados;
      tempAcumRealizadosSinExtras += puntosDia.puntosRealizados; // 🔥 Solo realizados

      // 🔥 NUEVO: Si hay al menos una tarea asignada, marcar que sí hay tareas
      if (puntosDia.puntosAsignados > 0) {
        sinTareasAsignadas = false;
      }

      // Calcular porcentaje actual
      if (tempAcumAsignados > 0) {
        const porcentajeActual = (tempAcumRealizadosSinExtras / tempAcumAsignados) * 100;
        colorColumnaQuincenal = getColorQuincenal(porcentajeActual, false, false);
        ultimoPorcentajeQuincenal = {
          raw: porcentajeActual,
          nd: false
        };
      } else if (sinTareasAsignadas) {
        // 🔥 NUEVO: Si no hay tareas asignadas hasta ahora, mantener gris
        colorColumnaQuincenal = getColorQuincenal(0, false, true);
        ultimoPorcentajeQuincenal = {
          raw: null,
          nd: false,
          sinTareas: true
        };
      }

      tempDate.setDate(tempDate.getDate() + 1);
    }

    // Iterar por cada día en el rango de fechas
    let currentDate = new Date(fechaInicio);
    while (currentDate <= fechaFin) {
      const dayDate = new Date(currentDate);
      const day = dayDate.getDate();
      const monthOfDay = dayDate.getMonth();
      const yearOfDay = dayDate.getFullYear();
      const weekday = weekdayNames[dayDate.getDay()];

      // Calcular puntos usando la fecha específica
      const puntos = calcularPuntosPorDiaFecha(dayDate);

      // Totales "clásicos"
      totalesQuincena.asignados += puntos.puntosAsignados;
      totalesQuincena.realizados += puntos.puntosRealizados;
      totalesQuincena.perdidos += puntos.puntosPerdidos;
      totalesQuincena.extras += puntos.puntosExtras;
      totalesQuincena.total += puntos.totalPuntos;

      // Acumulados hasta este día
      acumAsignados += puntos.puntosAsignados;

      // 🔥 CORREGIDO: Acumular realizados y extras por separado
      const acumRealizadosSinExtras = acumRealizadosExtras; // El acumulado anterior (sin extras del día actual aún)
      acumRealizadosExtras += puntos.puntosRealizados; // Solo sumar realizados al acumulado (SIN extras)

      // % diario (SOLO realizados, SIN extras) / asignados del día
      const denDiario = puntos.puntosAsignados;
      const rawDiario = denDiario > 0 ? (puntos.puntosRealizados / denDiario) * 100 : null;

      // % quincenal acumulado hasta este día (SOLO realizados, SIN extras / asignados acumulados)
      const denQuincenal = acumAsignados;
      const rawQuincenal = denQuincenal > 0 ? ((acumRealizadosSinExtras + puntos.puntosRealizados) / denQuincenal) * 100 : null;

      // Fila base
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #e8e8e8";
      tr.style.transition = "background-color 0.2s";
      tr.onmouseenter = () => tr.style.backgroundColor = "#f8f9fa";
      tr.onmouseleave = () => tr.style.backgroundColor = "transparent";

      const todayDate = new Date();
      const isToday = dayDate.getDate() === todayDate.getDate() &&
        dayDate.getMonth() === todayDate.getMonth() &&
        dayDate.getFullYear() === todayDate.getFullYear();
      const isDiaCorte = day === 12 || day === 27;

      if (isToday) {
        tr.style.backgroundColor = "#e8f4f8";
        tr.onmouseenter = () => tr.style.backgroundColor = "#d1e7f0";
        tr.onmouseleave = () => tr.style.backgroundColor = "#e8f4f8";
      } else if (isDiaCorte) {
        tr.style.backgroundColor = "#fff9e6";
        tr.onmouseenter = () => tr.style.backgroundColor = "#fff3cc";
        tr.onmouseleave = () => tr.style.backgroundColor = "#fff9e6";
      }

      // Formatear mes para mostrar siempre
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const mesDisplay = ` <span style="color: #888; font-size: 10px;">(${monthNames[monthOfDay]})</span>`;

      // Celdas "clásicas"
      tr.innerHTML = `
        <td style="padding: 4px 6px; text-align: center; font-weight: ${isToday ? '700' : '500'}; font-size: 11px; line-height: 1.2;">
          ${weekday} ${day}${mesDisplay}
          ${isToday ? '<span style="color: #667eea; margin-left: 4px; font-size: 9px;">●</span>' : ''}
          ${isDiaCorte ? '<span style="color: #ff9800; margin-left: 4px; font-size: 9px; font-weight: 600;">CORTE</span>' : ''}
        </td>
        <td style="padding: 4px 6px; text-align: center; color: #555; font-size: 11px;">${puntos.puntosAsignados}</td>
        <td style="padding: 4px 6px; text-align: center; color: #28a745; font-weight: 600; font-size: 11px;">${puntos.puntosRealizados}</td>
        <td style="padding: 4px 6px; text-align: center; color: #dc3545; font-weight: 600; font-size: 11px;">${puntos.puntosPerdidos}</td>
        <td style="padding: 4px 6px; text-align: center; color: #2d79f3; font-weight: 600; font-size: 11px;">${puntos.puntosExtras}</td>
        <td style="padding: 4px 6px; text-align: center; color: #000; font-weight: 700; font-size: 12px;">${puntos.totalPuntos}</td>
      `;

      // ➕ Agregamos las 2 celdas PINTADAS (unidas)
      // 🔥 Ya NO mostrar +100% porque solo contamos tareas asignadas (máximo 100%)
      let rawDiarioFinal = rawDiario;
      let ndDiario = denDiario === 0;

      const tdDiario = createPaintPercentTd(rawDiarioFinal, {
        nd: ndDiario,
        title: '', // 🔥 Sin tooltip
        useColorScale: true, // 🎨 Activar escala de colores rojo/amarillo/verde
        bg: '#f3f4f6',
        showPlus: false // 🔥 NO mostrar +100% porque solo contamos asignadas
      });

      // 🔥 QUINCENAL: Pintar morado días pasados (huella) + mostrar % solo en día actual/corte
      const hoyInicio = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const fechaEvaluada = new Date(yearOfDay, monthOfDay, day);
      fechaEvaluada.setHours(0, 0, 0, 0);
      hoyInicio.setHours(0, 0, 0, 0);

      const esDiaActual = fechaEvaluada.getTime() === hoyInicio.getTime();
      const esPasado = fechaEvaluada < hoyInicio;
      const esFuturo = fechaEvaluada > hoyInicio;

      // Determinar si es el último día de la quincena
      const esUltimoDiaQuincena = currentDate.getTime() === fechaFin.getTime();

      // Calcular porcentaje para todos los días (para guardar el último)
      // 🔥 Ya NO hay casos de +100% porque solo contamos tareas asignadas
      let rawQuincenalFinal = rawQuincenal;
      let ndQuincenal = denQuincenal === 0;

      // Si es día pasado o actual, guardar el porcentaje
      if (esPasado || esDiaActual) {
        ultimoPorcentajeQuincenal = {
          raw: rawQuincenalFinal,
          nd: ndQuincenal,
          dia: day
        };
      }

      // 🔥 NUEVO: Crear celda de porcentaje quincenal SIEMPRE (guardarla para pintar después)
      const tdQuincenalTemp = document.createElement('td');
      tdQuincenalTemp.className = esDiaActual ? 'pfill-quincenal-percent' : 'pfill-quincenal-empty';
      tdQuincenalTemp.style.cssText = `
        text-align: center;
        padding: 8px 6px;
        font-size: 11px;
        height: 100%;
        display: table-cell;
        vertical-align: middle;
        border: none;
      `;

      // Guardar en array si es día pasado o actual
      if (esPasado || esDiaActual) {
        celdásQuincenales.push({
          td: tdQuincenalTemp,
          esDiaActual,
          rawQuincenalFinal,
          ndQuincenal
        });
      }

      // 🔥 Mostrar texto en día actual O en el último día de la quincena
      const mostrarTexto = (esDiaActual || esUltimoDiaQuincena) && !esFuturo;

      if (mostrarTexto) {
        if (ndQuincenal) {
          tdQuincenalTemp.textContent = 'N/D';
        } else {
          // 🔥 Limitar porcentaje quincenal a máximo 100%
          const displayPercent = Math.min(Math.round(rawQuincenalFinal), 100);
          tdQuincenalTemp.textContent = `${displayPercent}%`;
        }
      } else if (esFuturo) {
        // Días futuros: vacío transparente
        tdQuincenalTemp.style.cssText += `
          background: transparent !important;
        `;
        tdQuincenalTemp.textContent = '';
      }

      let tdQuincenal = tdQuincenalTemp;

      tr.appendChild(tdDiario);
      tr.appendChild(tdQuincenal);
      tbody.appendChild(tr);

      // 🔥 MARCAR LA FILA ACTUAL USANDO CLASE (no ID) para evitar conflictos entre quincenas
      if (isToday) {
        tr.classList.add('dia-actual-row-marker');
      }

      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 🔥 PINTAR TODAS LAS CELDAS DE PORCENTAJE QUINCENAL CON EL COLOR FINAL
    // 🔥 NUEVO: También pintar si hay sin tareas asignadas (gris)
    if (ultimoPorcentajeQuincenal !== null) {
      const colorFinal = ultimoPorcentajeQuincenal.sinTareas
        ? getColorQuincenal(0, false, true)  // Gris si sin tareas
        : getColorQuincenal(ultimoPorcentajeQuincenal.raw, ultimoPorcentajeQuincenal.nd);

      celdásQuincenales.forEach(celda => {
        celda.td.style.cssText = `
          background: ${colorFinal} !important;
          color: ${ultimoPorcentajeQuincenal.sinTareas ? '#666' : '#ffffff'} !important;
          font-weight: 700;
          text-align: center;
          padding: 8px 6px;
          font-size: 11px;
          height: 100%;
          display: table-cell;
          vertical-align: middle;
          border: none !important;
        `;
      });
    }

    // Fila de totales (sin %)
    const trTotal = document.createElement("tr");
    trTotal.style.backgroundColor = "#f8f9fa";
    trTotal.style.fontWeight = "700";
    trTotal.style.borderTop = "2px solid #667eea";
    trTotal.innerHTML = `
      <td style="padding: 6px 8px; font-size: 11px; letter-spacing: 0.3px;">TOTAL ${titulo.toUpperCase()}</td>
      <td style="padding: 6px 8px; text-align: center; color: #555; font-size: 11px;">${totalesQuincena.asignados}</td>
      <td style="padding: 6px 8px; text-align: center; color: #28a745; font-size: 11px;">${totalesQuincena.realizados}</td>
      <td style="padding: 6px 8px; text-align: center; color: #dc3545; font-size: 11px;">${totalesQuincena.perdidos}</td>
      <td style="padding: 6px 8px; text-align: center; color: #2d79f3; font-size: 11px;">${totalesQuincena.extras}</td>
      <td style="padding: 6px 8px; text-align: center; color: #000; font-size: 12px;">${totalesQuincena.total}</td>
      <td></td>
      <td></td>
    `;
    tbody.appendChild(trTotal);

    table.appendChild(tbody);
    tableContainer.appendChild(table);
    section.appendChild(tableContainer);
    return section;
  }

  // 🔥 GENERAR TODAS LAS QUINCENAS DESDE LA PRIMERA CON DATOS HASTA HOY
  // Mostrar TODAS las quincenas (sin saltar ninguna) desde que hay historial
  // Ordenadas de más reciente a más antigua (la actual arriba)

  const monthNamesLargo = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // 🔥 FECHA MÍNIMA: Mostrar desde Q1 Enero 2026 (28 Dic - 12 Ene)
  // para mostrar datos consistentes al cliente
  const FECHA_MINIMA_HISTORIAL = new Date(2025, 11, 28); // Dic 28, 2025 (inicio Q1 Enero)

  // Función para obtener la fecha más antigua del historial del empleado
  function obtenerFechaInicioHistorial() {
    const historial = empleado.historial_puntos || {};
    const fechas = Object.keys(historial).sort(); // Ordenar fechas ascendente

    if (fechas.length === 0) {
      // Si no hay historial, retornar null (solo mostrar quincena actual)
      return null;
    }

    // Obtener la fecha más antigua del historial
    const fechaMasAntigua = new Date(fechas[0] + 'T00:00:00');

    // 🔥 Usar la fecha mayor entre la más antigua y la mínima permitida
    if (fechaMasAntigua < FECHA_MINIMA_HISTORIAL) {
      return FECHA_MINIMA_HISTORIAL;
    }

    return fechaMasAntigua;
  }

  // Función para generar TODAS las quincenas desde la primera con datos hasta hoy
  function generarQuincenasConHistorial() {
    const quincenas = [];
    const hoy = new Date();
    const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    // Obtener fecha de inicio basada en el historial real
    const fechaInicioHistorial = obtenerFechaInicioHistorial();

    // Si no hay historial, solo generar la quincena actual
    if (!fechaInicioHistorial) {
      return generarSoloQuincenaActual(hoyInicio);
    }

    // 🔥 Determinar la quincena inicial basada en la fecha más antigua del historial
    const fechaInicio = new Date(fechaInicioHistorial);

    // Generar TODAS las quincenas desde la fecha inicial hasta hoy
    // Empezamos desde el mes de la fecha inicial
    let yearActual = fechaInicio.getFullYear();
    let mesActual = fechaInicio.getMonth();

    // Determinar en qué quincena empezar según el día de la fecha inicial
    const diaInicio = fechaInicio.getDate();
    let empezarEnQ2 = diaInicio >= 13 && diaInicio <= 27;

    // Iterar mes por mes hasta llegar al mes actual
    while (yearActual < hoyInicio.getFullYear() ||
      (yearActual === hoyInicio.getFullYear() && mesActual <= hoyInicio.getMonth())) {

      // Quincena 1: del 28 del mes anterior al 12 del mes actual
      if (!empezarEnQ2) {
        const fechaInicioQ1 = new Date(yearActual, mesActual - 1, 28);
        const fechaFinQ1 = new Date(yearActual, mesActual, 12);

        // Solo agregar si la quincena ya empezó (fechaInicio <= hoy)
        if (fechaInicioQ1 <= hoyInicio) {
          const yaExiste = quincenas.some(q =>
            q.fechaInicio.getTime() === fechaInicioQ1.getTime()
          );

          if (!yaExiste) {
            // 🔥 Quincenas pasadas: usar fechaFin original, quincena actual: limitar a hoy
            const quincenaYaTermino = fechaFinQ1 < hoyInicio;
            quincenas.push({
              titulo: `Quincena 1 - ${monthNamesLargo[mesActual]} ${yearActual}`,
              fechaInicio: fechaInicioQ1,
              fechaFin: quincenaYaTermino ? fechaFinQ1 : new Date(Math.min(fechaFinQ1.getTime(), hoyInicio.getTime())),
              fechaFinOriginal: fechaFinQ1,
              tipo: 1,
              mes: mesActual,
              ano: yearActual
            });
          }
        }
      }

      // Quincena 2: del 13 al 27 del mes actual
      const fechaInicioQ2 = new Date(yearActual, mesActual, 13);
      const fechaFinQ2 = new Date(yearActual, mesActual, 27);

      // Solo agregar si la quincena ya empezó (fechaInicio <= hoy)
      if (fechaInicioQ2 <= hoyInicio) {
        const yaExiste = quincenas.some(q =>
          q.fechaInicio.getTime() === fechaInicioQ2.getTime()
        );

        if (!yaExiste) {
          // 🔥 Quincenas pasadas: usar fechaFin original, quincena actual: limitar a hoy
          const quincenaYaTermino = fechaFinQ2 < hoyInicio;
          quincenas.push({
            titulo: `Quincena 2 - ${monthNamesLargo[mesActual]} ${yearActual}`,
            fechaInicio: fechaInicioQ2,
            fechaFin: quincenaYaTermino ? fechaFinQ2 : new Date(Math.min(fechaFinQ2.getTime(), hoyInicio.getTime())),
            fechaFinOriginal: fechaFinQ2,
            tipo: 2,
            mes: mesActual,
            ano: yearActual
          });
        }
      }

      // Avanzar al siguiente mes
      mesActual++;
      if (mesActual > 11) {
        mesActual = 0;
        yearActual++;
      }
      empezarEnQ2 = false; // Solo aplica para el primer mes
    }

    // Asegurar que la quincena actual siempre esté incluida
    agregarQuincenaActual(quincenas, hoyInicio);

    // 🔥 FILTRAR quincenas anteriores a la fecha mínima
    const quincenasFiltradas = quincenas.filter(q => q.fechaInicio >= FECHA_MINIMA_HISTORIAL);

    // Ordenar por fecha: más reciente primero (descendente)
    quincenasFiltradas.sort((a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime());

    return quincenasFiltradas;
  }

  // Generar solo la quincena actual (cuando no hay historial)
  function generarSoloQuincenaActual(hoyInicio) {
    const quincenas = [];
    agregarQuincenaActual(quincenas, hoyInicio);
    return quincenas;
  }

  // Agregar la quincena actual a la lista
  function agregarQuincenaActual(quincenas, hoyInicio) {
    const diaHoy = hoyInicio.getDate();
    const mesHoy = hoyInicio.getMonth();
    const anoHoy = hoyInicio.getFullYear();

    if (diaHoy <= 12) {
      // Quincena 1 actual
      const fechaInicioQ1 = new Date(anoHoy, mesHoy - 1, 28);
      const fechaFinQ1 = new Date(anoHoy, mesHoy, 12);

      const yaExiste = quincenas.some(q =>
        q.fechaInicio.getTime() === fechaInicioQ1.getTime()
      );

      if (!yaExiste) {
        quincenas.push({
          titulo: `Quincena 1 - ${monthNamesLargo[mesHoy]} ${anoHoy}`,
          fechaInicio: fechaInicioQ1,
          fechaFin: hoyInicio,
          fechaFinOriginal: fechaFinQ1,
          tipo: 1,
          mes: mesHoy,
          ano: anoHoy
        });
      }
    } else if (diaHoy >= 13 && diaHoy <= 27) {
      // Quincena 2 actual
      const fechaInicioQ2 = new Date(anoHoy, mesHoy, 13);
      const fechaFinQ2 = new Date(anoHoy, mesHoy, 27);

      const yaExiste = quincenas.some(q =>
        q.fechaInicio.getTime() === fechaInicioQ2.getTime()
      );

      if (!yaExiste) {
        quincenas.push({
          titulo: `Quincena 2 - ${monthNamesLargo[mesHoy]} ${anoHoy}`,
          fechaInicio: fechaInicioQ2,
          fechaFin: hoyInicio,
          fechaFinOriginal: fechaFinQ2,
          tipo: 2,
          mes: mesHoy,
          ano: anoHoy
        });
      }
    } else if (diaHoy >= 28) {
      // Quincena 1 del próximo mes (28-12)
      const fechaInicioQ1 = new Date(anoHoy, mesHoy, 28);
      const mesProximo = mesHoy === 11 ? 0 : mesHoy + 1;
      const anoProximo = mesHoy === 11 ? anoHoy + 1 : anoHoy;
      const fechaFinQ1 = new Date(anoProximo, mesProximo, 12);

      const yaExiste = quincenas.some(q =>
        q.fechaInicio.getTime() === fechaInicioQ1.getTime()
      );

      if (!yaExiste) {
        quincenas.push({
          titulo: `Quincena 1 - ${monthNamesLargo[mesProximo]} ${anoProximo}`,
          fechaInicio: fechaInicioQ1,
          fechaFin: hoyInicio,
          fechaFinOriginal: fechaFinQ1,
          tipo: 1,
          mes: mesProximo,
          ano: anoProximo
        });
      }
    }
  }

  // Obtener quincenas basadas en datos reales
  const todasLasQuincenas = generarQuincenasConHistorial();

  // 🔥 Si es empleado, solo mostrar la quincena actual (toda la quincena, no solo la semana)
  // Si es admin/supervisor, mostrar todas las quincenas con datos
  if (!esAdmin) {
    // Para empleados: solo la quincena actual (toda la quincena completa)
    if (todasLasQuincenas.length > 0) {
      const quincenaActual = todasLasQuincenas[0];
      // Mostrar toda la quincena desde su inicio hasta hoy (o su fin si ya terminó)
      const quincenaDiv = crearTablaQuincena(
        quincenaActual.titulo,
        quincenaActual.fechaInicio,
        quincenaActual.fechaFinOriginal // Usar fechaFinOriginal para mostrar toda la quincena
      );
      bodyDiv.appendChild(quincenaDiv);
    }
  } else {
    // Para admin/supervisor: mostrar todas las quincenas con datos históricos
    // 🔥 MOSTRAR TODOS LOS DÍAS DE CADA QUINCENA (usar fechaFinOriginal siempre)
    todasLasQuincenas.forEach(quincena => {
      // Siempre usar fechaFinOriginal para mostrar la quincena completa
      const fechaFinMostrar = quincena.fechaFinOriginal;

      if (quincena.fechaInicio <= fechaFinMostrar) {
        const quincenaDiv = crearTablaQuincena(quincena.titulo, quincena.fechaInicio, fechaFinMostrar);
        bodyDiv.appendChild(quincenaDiv);
      }
    });
  }

  // (header eliminado, solo body)
  calendarioContainer.appendChild(bodyDiv);

  // Scroll automático al día actual después de renderizar - SOLO dentro del contenedor
  setTimeout(() => {
    // 🔥 Buscar la fila del día actual dentro de ESTE bodyDiv (no en todo el documento)
    const diaActualRow = bodyDiv.querySelector('.dia-actual-row-marker');
    if (diaActualRow && bodyDiv) {
      // Calcular la posición del elemento dentro de su contenedor
      const rowTop = diaActualRow.offsetTop;
      const containerHeight = bodyDiv.clientHeight;
      const rowHeight = diaActualRow.clientHeight;

      // Centrar el elemento en el contenedor
      const scrollPosition = rowTop - (containerHeight / 2) + (rowHeight / 2);

      // Hacer scroll SOLO en el contenedor, no en toda la página
      bodyDiv.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, 100);
}
// 🔥 NUEVA FUNCIÓN: Mostrar tabla resumen agregado de TODOS los empleados
export async function mostrarResumenAgregado() {
  // 🔥 ASEGURAR que el panel izquierdo sea visible
  const leftPanel = document.querySelector('.left-panel');
  if (leftPanel) {
    leftPanel.style.display = 'flex';
  }

  // 🔥 CAMBIO: Mostrar panel de tareas vencidas (en lugar de ocultarlo)
  mostrarPanelTareasVencidas();

  // Mostrar la fecha del encabezado principal
  const fechaDiv = document.getElementById('fecha-actual-informes');
  if (fechaDiv) {
    fechaDiv.style.display = 'block';
  }

  // Actualizar el nombre en el título
  const tituloInformes = document.getElementById("titulo-informes");
  let rightInfo = document.getElementById('titulo-informes-right');
  if (rightInfo) {
    rightInfo.innerHTML = '';
  }

  const calendarioContainer = document.getElementById("calendario-container");
  if (!calendarioContainer) return;

  // 🔥 No ocultar, solo mostrar el calendario debajo del panel de vencidas
  calendarioContainer.classList.remove("is-hidden");
  calendarioContainer.removeAttribute('style');
  calendarioContainer.style.display = "block";  // Cambié de "flex" a "block"
  calendarioContainer.style.marginTop = "30px"; // Espacio entre el panel de vencidas y la tabla
  calendarioContainer.innerHTML = "";
  calendarioContainer.classList.add("tasks-card");

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Datos en vivo del panel para el día actual (por empleado)
  const weekdayBackendResumen = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diaHoyNombreResumen = weekdayBackendResumen[today.getDay()];
  let tareasTiempoRealPorEmpleado = null;

  try {
    const response = await fetch('http://localhost:8001/tareas/panel/obtener', { cache: 'no-store' });
    if (response.ok) {
      const panelData = await response.json();
      if (panelData?.status === 'success' && Array.isArray(panelData.panel)) {
        tareasTiempoRealPorEmpleado = {};
        for (const emp of panelData.panel) {
          const tareasHoy = (emp.tareas_asignadas?.[diaHoyNombreResumen] || []).filter(t => t.estatus !== 'sin_iniciar');
          if (tareasHoy.length) {
            tareasTiempoRealPorEmpleado[emp.id] = tareasHoy;
          }
        }
      }
    } else {
      console.warn(`[ResumenAgregado] No se pudo obtener panel en vivo: ${response.status}`);
    }
  } catch (error) {
    console.error('[ResumenAgregado] Error al obtener panel en vivo:', error);
  }

  const bodyDiv = document.createElement("div");
  bodyDiv.classList.add("tasks-card-body");

  // 🔥 CORREGIDO: Usar la misma lógica de quincenas que las tablas individuales
  // Calcular rango de quincena usando la misma lógica que agregarQuincenaActual()
  const day = today.getDate();
  let fechaInicio, fechaFin, tituloQuincena;

  if (day <= 12) {
    // Quincena 1: desde el 28 del mes anterior hasta el 12 del mes actual
    fechaInicio = new Date(year, month - 1, 28);
    fechaFin = new Date(year, month, 12);
    tituloQuincena = `Quincena 1 - ${monthNames[month]} ${year}`;
  } else if (day >= 13 && day <= 27) {
    // Quincena 2: desde el 13 hasta el 27 del mes actual
    fechaInicio = new Date(year, month, 13);
    fechaFin = new Date(year, month, 27);
    tituloQuincena = `Quincena 2 - ${monthNames[month]} ${year}`;
  } else {
    // Días 28-31: Quincena 1 del próximo mes (28 del mes actual al 12 del siguiente)
    fechaInicio = new Date(year, month, 28);
    const mesProximo = month === 11 ? 0 : month + 1;
    const anoProximo = month === 11 ? year + 1 : year;
    fechaFin = new Date(anoProximo, mesProximo, 12);
    tituloQuincena = `Quincena 1 - ${monthNames[mesProximo]} ${anoProximo}`;
  }

  // Crear tabla
  const tableContainer = document.createElement("div");
  tableContainer.style.padding = "20px";
  tableContainer.style.overflow = "auto";
  tableContainer.style.flex = "1";

  // 🔥 CORREGIDO: Mostrar el título de la quincena calculado
  const h3 = document.createElement("h3");
  h3.textContent = `${tituloQuincena} - Resumen de Todos los Empleados`;
  h3.style.textAlign = "center";
  h3.style.color = "#333";
  h3.style.fontSize = "18px";
  h3.style.fontWeight = "700";
  h3.style.letterSpacing = "0.5px";
  h3.style.marginBottom = "20px";
  tableContainer.appendChild(h3);

  const table = document.createElement("table");
  table.classList.add("puntos-table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.backgroundColor = "#fff";
  table.style.boxShadow = "0 4px 8px rgba(0,0,0,0.12)";
  table.style.borderRadius = "10px";
  table.style.overflow = "hidden";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
      <th style="padding: 12px 8px; text-align: center; font-weight: 600; font-size: 15px;">Día</th>
      <th style="padding: 12px 8px; text-align: center; font-weight: 600; font-size: 15px;">Puntos Asignados</th>
      <th style="padding: 12px 8px; text-align: center; font-weight: 600; font-size: 15px;">Puntos Ganados</th>
      <th style="padding: 12px 8px; text-align: center; font-weight: 600; font-size: 15px;">Puntos no Ganados</th>
      <th style="padding: 12px 8px; text-align: center; font-weight: 600; font-size: 15px;">Puntos Extra Ganados</th>
      <th style="padding: 12px 8px; text-align: center; font-weight: 600; font-size: 15px;">Puntos Totales Ganados</th>
      <th style="padding: 12px 8px; text-align: center; font-weight: 600; font-size: 15px;">% Diario</th>
      <th style="padding: 12px 8px; text-align: center; font-weight: 600; font-size: 15px;">% Quincenal</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  // Función para calcular puntos agregados de TODOS los empleados para un día específico
  // 🔥 CORREGIDO: Ahora usa historial_puntos para días pasados (igual que las tablas individuales)
  function calcularPuntosAgregadosPorDia(dayDate) {
    const fechaBuscada = dayDate.toISOString().split('T')[0];

    let totalAsignados = 0;
    let totalRealizados = 0;
    let totalPerdidos = 0;
    let totalExtras = 0;

    const hoy = new Date();
    const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    hoyInicio.setHours(0, 0, 0, 0);
    const fechaEvaluada = new Date(dayDate);
    fechaEvaluada.setHours(0, 0, 0, 0);
    const esFuturo = fechaEvaluada > hoyInicio;
    const esPasado = fechaEvaluada < hoyInicio;
    const esHoy = fechaEvaluada.getTime() === hoyInicio.getTime();

    // console.log(`🔍 [Resumen] calcularPuntosAgregadosPorDia(${fechaBuscada}): esPasado=${esPasado}, esHoy=${esHoy}, esFuturo=${esFuturo}`);

    // console.log("tareasTiempoRealPorEmpleado:", tareasTiempoRealPorEmpleado);
    // Recorrer todos los empleados
    for (const empleado of empleadosGlobales) {
      // 🔥 PRIMERO: Intentar obtener del historial si es día pasado O día actual
      if ((esPasado || esHoy) && empleado.historial_puntos && empleado.historial_puntos[fechaBuscada]) {
        const hist = empleado.historial_puntos[fechaBuscada];
        // console.log(`   ✅ [${empleado.nombre}] Historial encontrado: asig=${hist.asignados}, real=${hist.completados}, extras=${hist.extras}`);
        totalAsignados += hist.asignados || 0;
        totalRealizados += hist.completados || 0;
        totalPerdidos += hist.perdidos || 0;
        totalExtras += hist.extras || 0;
        continue; // Ya tenemos los datos del historial, siguiente empleado
      }

      // 🔥 Si no hay historial o es día actual/futuro, calcular dinámicamente
      const weekdayFull = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const dayName = normalizeDay(weekdayFull[dayDate.getDay()]);
      const dayNamePanel = weekdayBackendResumen[dayDate.getDay()];

      const allTasks = getAllTasks(empleado);
      const realizadasBackup = tareasRealizadasMap[empleado.id] || [];

      const merged = [
        ...allTasks.filter(t => t.estatus === 'completada'),
        ...realizadasBackup,
        ...allTasks.filter(t => t.estatus !== 'completada')
      ].filter((t, i, arr) => {
        if (arr.findIndex(x => x.id === t.id) !== i) return false;
        return true;
      });

      // Si es hoy y tenemos datos en vivo del panel para este empleado, usarlos (excluyendo sin_iniciar ya filtrado)
      const tareasDelDia = (esHoy && tareasTiempoRealPorEmpleado && tareasTiempoRealPorEmpleado[empleado.id])
        ? tareasTiempoRealPorEmpleado[empleado.id]
        : merged.filter(t => {
            if (t.fecha) {
              return t.fecha === fechaBuscada;
            }
            // Compatibilidad con claves de día y nombres normalizados
            return normalizeDay(t.dia) === dayName || t.fecha === dayNamePanel;
          });


      tareasDelDia.forEach(tarea => {
        const puntos = parseInt(tarea.puntaje ?? tarea.puntos) || 0;

        if (tarea.estatus !== 'sin_iniciar') {
          totalAsignados += puntos;
        }


        if (esFuturo) return;

        if (tarea.estatus === 'completada') {
          totalRealizados += puntos;
        } else if (tarea.estatus === 'vencida') {
          totalPerdidos += puntos;
        } else if (tarea.estatus === 'extra' && tarea.completadaPor !==null) {
          totalExtras += puntos;
        }
      });
    }

    return {
      asignados: totalAsignados,
      realizados: totalRealizados,
      perdidos: totalPerdidos,
      extras: totalExtras,
      total: totalRealizados + totalExtras
    };
  }

  const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  function getColorQuincenal(percent) {
    // 🔥 NUEVO: Escala de colores 0-79=rojo, 80-89=amarillo, 90-100=verde
    if (percent >= 90) return '#10b981'; // Verde: 90-100
    if (percent >= 80 && percent < 90) return '#f59e0b'; // Amarillo: 80-89
    if (percent >= 0) return '#ef4444'; // Rojo: 0-79
    return '#9ca3af';
  }

  // Calcular totales de la quincena HASTA HOY (no incluir días futuros)
  let totalAsignadosQuincena = 0;
  let totalRealizadosQuincena = 0;
  let totalPerdidosQuincena = 0;
  let totalExtrasQuincena = 0;

  const hoy = new Date();
  const hoyDate = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  // Recorrer solo los días hasta hoy
  let currentDate = new Date(fechaInicio);
  while (currentDate <= fechaFin && currentDate <= hoyDate) {
    const puntos = calcularPuntosAgregadosPorDia(currentDate);
    totalAsignadosQuincena += puntos.asignados;
    totalRealizadosQuincena += puntos.realizados;
    totalPerdidosQuincena += puntos.perdidos;
    totalExtrasQuincena += puntos.extras;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calcular color final de la quincena
  const porcentajeFinalQuincena = totalAsignadosQuincena > 0
    ? (totalRealizadosQuincena / totalAsignadosQuincena) * 100
    : 0;
  const colorFinal = getColorQuincenal(porcentajeFinalQuincena);

  // Encontrar el primer y último día con datos (hasta hoy)
  let primerDiaActual = null;
  let ultimoDiaActual = null;
  let tempDate = new Date(fechaInicio);
  while (tempDate <= fechaFin && tempDate <= hoyDate) {
    if (primerDiaActual === null) {
      primerDiaActual = new Date(tempDate);
    }
    ultimoDiaActual = new Date(tempDate);
    tempDate.setDate(tempDate.getDate() + 1);
  }

  // Agregar filas para CADA DÍA de la quincena
  const weekdayNamesLargo = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  currentDate = new Date(fechaInicio);  // Reasignar, no redeclarar

  while (currentDate <= fechaFin) {
    const day = currentDate.getDate();
    const weekday = weekdayNamesLargo[currentDate.getDay()];
    const puntos = calcularPuntosAgregadosPorDia(currentDate);

    const tr = document.createElement("tr");
    const esHoyFila = currentDate.getTime() === hoyDate.getTime();
    tr.style.borderBottom = "1px solid #e5e7eb";
    if (esHoyFila) {
      tr.style.backgroundColor = "#e8f4ff"; // Azul claro para destacar el día actual
    }

    const tdDia = document.createElement("td");
    tdDia.style.cssText = "padding: 12px 8px; text-align: center; font-weight: 500; font-size: 14px;";
    tdDia.textContent = `${weekday.substring(0, 3)} ${day}`;
    tr.appendChild(tdDia);

    const tdAsignados = document.createElement("td");
    tdAsignados.style.cssText = "padding: 12px 8px; text-align: center; font-weight: 600; font-size: 14px; color: #4b5563;";
    tdAsignados.textContent = puntos.asignados;
    tr.appendChild(tdAsignados);

    const tdGanados = document.createElement("td");
    tdGanados.style.cssText = "padding: 12px 8px; text-align: center; font-weight: 600; font-size: 14px; color: #10b981;";
    tdGanados.textContent = puntos.realizados;
    tr.appendChild(tdGanados);

    const tdNoGanados = document.createElement("td");
    tdNoGanados.style.cssText = "padding: 12px 8px; text-align: center; font-weight: 600; font-size: 14px; color: #ef4444;";
    tdNoGanados.textContent = puntos.perdidos;
    tr.appendChild(tdNoGanados);

    const tdExtras = document.createElement("td");
    tdExtras.style.cssText = "padding: 12px 8px; text-align: center; font-weight: 600; font-size: 14px; color: #667eea;";
    tdExtras.textContent = puntos.extras;
    tr.appendChild(tdExtras);

    const tdTotal = document.createElement("td");
    tdTotal.style.cssText = "padding: 12px 8px; text-align: center; font-weight: 600; font-size: 14px; color: #764ba2;";
    tdTotal.textContent = puntos.total;
    tr.appendChild(tdTotal);

    const porcentajeDiario = puntos.asignados > 0
      ? ((puntos.realizados / puntos.asignados) * 100).toFixed(1)
      : 'N/D';

    const tdDiario = document.createElement("td");
    // 🔥 Colorear la celda según el porcentaje diario
    let diarioColor = '#fff'; // Fondo blanco por defecto
    let diarioTextColor = '#333'; // Texto oscuro por defecto

    if (porcentajeDiario !== 'N/D') {
      const pctDiario = parseFloat(porcentajeDiario);
      if (pctDiario >= 90) {
        diarioColor = '#10b981'; // Verde: 90-100
        diarioTextColor = '#fff'; // Texto blanco
      } else if (pctDiario >= 80) {
        diarioColor = '#f59e0b'; // Amarillo: 80-89
        diarioTextColor = '#fff'; // Texto blanco
      } else if (pctDiario >= 0) {
        diarioColor = '#ef4444'; // Rojo: 0-79
        diarioTextColor = '#fff'; // Texto blanco
      }
    }

    if (porcentajeDiario === 'N/D') {
      tdDiario.style.cssText = `
        text-align: center;
        padding: 8px 6px;
        font-size: 11px;
        font-weight: 700;
        border-left: 1px solid #eee;
        border-right: 1px solid #eee;
        height: 100%;
        display: table-cell;
        vertical-align: middle;
        background: repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 8px, #e5e7eb 8px, #e5e7eb 16px);
        color: #9ca3af;
      `;
      tdDiario.textContent = 'N/D';
    } else {
      tdDiario.style.cssText = `padding: 12px 8px; text-align: center; font-weight: 600; font-size: 14px; background: ${diarioColor}; color: ${diarioTextColor};`;
      tdDiario.textContent = porcentajeDiario + '%';
    }
    tr.appendChild(tdDiario);

    const tdQuincenal = document.createElement("td");

    // 🔥 TODA LA COLUMNA se pinta con el color del porcentaje final de la quincena
    const esDiaActual = currentDate.getTime() <= hoyDate.getTime();
    const esHoy = currentDate.getTime() === hoyDate.getTime();
    const esPrimerDia = primerDiaActual && currentDate.getTime() === primerDiaActual.getTime();
    const esUltimoDia = ultimoDiaActual && currentDate.getTime() === ultimoDiaActual.getTime();

    if (esDiaActual) {
      // Determinar border-radius
      let borderRadius = '0px';
      if (esPrimerDia && esUltimoDia) {
        borderRadius = '4px'; // Ambas esquinas si es único día
      } else if (esPrimerDia) {
        borderRadius = '4px 4px 0px 0px'; // Solo arriba
      } else if (esUltimoDia) {
        borderRadius = '0px 0px 4px 4px'; // Solo abajo
      }

      // 🔥 Asignar color según el porcentaje FINAL de la quincena
      let columnColor = '#9ca3af'; // Gris por defecto
      if (porcentajeFinalQuincena >= 90) columnColor = '#10b981'; // Verde: 90-100
      else if (porcentajeFinalQuincena >= 80) columnColor = '#f59e0b'; // Amarillo: 80-89
      else if (porcentajeFinalQuincena > 0) columnColor = '#ef4444'; // Rojo: 0-79

      tdQuincenal.style.cssText = `
        padding: 12px 8px; 
        text-align: center; 
        font-weight: 600; 
        font-size: 14px;
        background: ${columnColor};
        color: white;
        border-radius: ${borderRadius};
        border-top: 1px solid ${columnColor};
        border-bottom: 1px solid ${columnColor};

      `;
      // Mostrar % solo en HOY
      tdQuincenal.textContent = esHoy ? porcentajeFinalQuincena.toFixed(1) + '%' : '';
    } else {
      // Día futuro: sin color
      tdQuincenal.style.cssText = "padding: 12px 8px; text-align: center; font-weight: 600; font-size: 14px; color: #9ca3af; border: none;";
      tdQuincenal.textContent = '';
    }

    tr.appendChild(tdQuincenal);

    tbody.appendChild(tr);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 🔥 CORREGIDO: Calcular número de quincena basándose en el día de inicio
  // Si la quincena inicia el 28, es Quincena 1; si inicia el 13, es Quincena 2
  const diaInicio = fechaInicio.getDate();
  const quincenaNum = diaInicio === 28 ? 1 : 2;

  // Agregar fila de TOTALES QUINCENALES
  const trTotal = document.createElement("tr");
  trTotal.style.cssText = "background: #f3f4f6; font-weight: 700; border-top: 2px solid #667eea;";

  const tdTotalLabel = document.createElement("td");
  tdTotalLabel.style.cssText = "padding: 12px 8px; text-align: center; font-weight: 700; font-size: 15px;";
  tdTotalLabel.textContent = `TOTAL QUINCENA ${quincenaNum}`;
  trTotal.appendChild(tdTotalLabel);

  const tdTotalAsignados = document.createElement("td");
  tdTotalAsignados.style.cssText = "padding: 12px 8px; text-align: center; font-weight: 700; font-size: 15px; color: #4b5563;";
  tdTotalAsignados.textContent = totalAsignadosQuincena;
  trTotal.appendChild(tdTotalAsignados);

  const tdTotalGanados = document.createElement("td");
  tdTotalGanados.style.cssText = "padding: 12px 8px; text-align: center; font-weight: 700; font-size: 15px; color: #10b981;";
  tdTotalGanados.textContent = totalRealizadosQuincena;
  trTotal.appendChild(tdTotalGanados);

  const tdTotalNoGanados = document.createElement("td");
  tdTotalNoGanados.style.cssText = "padding: 12px 8px; text-align: center; font-weight: 700; font-size: 15px; color: #ef4444;";
  tdTotalNoGanados.textContent = totalPerdidosQuincena;
  trTotal.appendChild(tdTotalNoGanados);

  const tdTotalExtras = document.createElement("td");
  tdTotalExtras.style.cssText = "padding: 12px 8px; text-align: center; font-weight: 700; font-size: 15px; color: #667eea;";
  tdTotalExtras.textContent = totalExtrasQuincena;
  trTotal.appendChild(tdTotalExtras);

  const tdTotalTotal = document.createElement("td");
  tdTotalTotal.style.cssText = "padding: 12px 8px; text-align: center; font-weight: 700; font-size: 15px; color: #764ba2;";
  tdTotalTotal.textContent = totalRealizadosQuincena + totalExtrasQuincena;
  trTotal.appendChild(tdTotalTotal);

  const tdTotalDiario = document.createElement("td");
  const pctTotalDiario = totalAsignadosQuincena > 0
    ? ((totalRealizadosQuincena / totalAsignadosQuincena) * 100).toFixed(1)
    : null;

  // 🔥 Colorear la celda según el porcentaje total diario
  let totalDiarioColor = '#f3f4f6';
  let totalDiarioTextColor = '#333';

  if (pctTotalDiario !== null) {
    const pct = parseFloat(pctTotalDiario);
    if (pct >= 90) {
      totalDiarioColor = '#10b981'; // Verde: 90-100
      totalDiarioTextColor = '#fff';
    } else if (pct >= 80) {
      totalDiarioColor = '#f59e0b'; // Amarillo: 80-89
      totalDiarioTextColor = '#fff';
    } else if (pct >= 0) {
      totalDiarioColor = '#ef4444'; // Rojo: 0-79
      totalDiarioTextColor = '#fff';
    }
  }

  tdTotalDiario.style.cssText = `padding: 12px 8px; text-align: center; font-weight: 700; font-size: 15px; background: ${totalDiarioColor}; color: ${totalDiarioTextColor};`;
  tdTotalDiario.textContent = totalAsignadosQuincena > 0
    ? pctTotalDiario + '%'
    : 'N/A';
  trTotal.appendChild(tdTotalDiario);

  const tdTotalQuincenal = document.createElement("td");

  // 🔥 BARRA PROGRESIVA CON ACUMULADO HASTA HOY
  let barColorTotal = '#9ca3af';
  if (porcentajeFinalQuincena >= 90) barColorTotal = '#10b981'; // Verde: 90-100
  else if (porcentajeFinalQuincena >= 80) barColorTotal = '#f59e0b'; // Amarillo: 80-89
  else if (porcentajeFinalQuincena > 0) barColorTotal = '#ef4444'; // Rojo: 0-79

  tdTotalQuincenal.style.cssText = `
    padding: 12px 8px; 
    text-align: center; 
    font-weight: 700; 
    font-size: 15px;
    background: ${barColorTotal};
    color: white;
    border-radius: 4px;
  `;
  tdTotalQuincenal.textContent = porcentajeFinalQuincena.toFixed(1) + '%';
  trTotal.appendChild(tdTotalQuincenal);

  tbody.appendChild(trTotal);
  table.appendChild(tbody);
  tableContainer.appendChild(table);
  bodyDiv.appendChild(tableContainer);

  calendarioContainer.appendChild(bodyDiv);
}