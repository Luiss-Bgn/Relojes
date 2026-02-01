/**
 * PromedioEmpleados.js
 * Componente que muestra AMBAS gráficas de progreso de todos los empleados
 * - Gráfica de progreso quincenal (donut chart morado)
 * - Gráfica de tareas completadas de la quincena actual (donut con leyenda)
 */

import { getAllTasks, normalizeDay } from "../utils/index.js";

let empleadosGlobales = [];
let tareasRealizadasMap = {}; // 🔥 NUEVO: Para sincronizar con TareasPanel
let modoActual = 'quincena'; // 🔥 NUEVO: 'quincena' o 'todo'

export function setEmpleadosPromedioData(data) {
  empleadosGlobales = data || [];
}

// 🔥 NUEVO: Setter para el mapa de tareas realizadas
export function setTareasRealizadasMap(map) {
  tareasRealizadasMap = map || {};
}

// 🔥 NUEVO: Setter para el modo (quincena o todo)
export function setModoGrafica(modo) {
  modoActual = modo; // 'quincena' o 'todo'
}

/**
 * Devuelve el número de semana ISO de una fecha
 */
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

/**
 * Convierte hora "HH:MM" a minutos
 */
function hourToMinutes(hourStr) {
  if (!hourStr || typeof hourStr !== 'string') return NaN;
  const parts = hourStr.split(':');
  if (parts.length !== 2) return NaN;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return NaN;
  return h * 60 + m;
}

/**
 * 🔥 Obtiene las fechas de inicio y fin de la quincena actual
 * Quincena 1: del 28 del mes anterior al 12 del mes actual
 * Quincena 2: del 13 al 27 del mes actual
 */
function obtenerQuincenaActual() {
  const hoy = new Date();
  const diaHoy = hoy.getDate();
  const mesHoy = hoy.getMonth();
  const anoHoy = hoy.getFullYear();
  
  let fechaInicio, fechaFin, nombreQuincena;
  
  if (diaHoy <= 12) {
    // Quincena 1: 28 del mes anterior al 12 del mes actual
    fechaInicio = new Date(anoHoy, mesHoy - 1, 28);
    fechaFin = new Date(anoHoy, mesHoy, 12);
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    nombreQuincena = `Quincena 1 - ${monthNames[mesHoy]} ${anoHoy}`;
  } else if (diaHoy >= 13 && diaHoy <= 27) {
    // Quincena 2: 13 al 27 del mes actual
    fechaInicio = new Date(anoHoy, mesHoy, 13);
    fechaFin = new Date(anoHoy, mesHoy, 27);
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    nombreQuincena = `Quincena 2 - ${monthNames[mesHoy]} ${anoHoy}`;
  } else {
    // Días 28-31: Quincena 1 del próximo mes (28-12)
    fechaInicio = new Date(anoHoy, mesHoy, 28);
    const mesProximo = mesHoy === 11 ? 0 : mesHoy + 1;
    const anoProximo = mesHoy === 11 ? anoHoy + 1 : anoHoy;
    fechaFin = new Date(anoProximo, mesProximo, 12);
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    nombreQuincena = `Quincena 1 - ${monthNames[mesProximo]} ${anoProximo}`;
  }
  
  // Asegurar que las fechas estén a las 00:00:00
  fechaInicio.setHours(0, 0, 0, 0);
  fechaFin.setHours(23, 59, 59, 999);
  
  console.log(`📅 Quincena actual: ${nombreQuincena} (${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()})`);
  
  return { fechaInicio, fechaFin, nombreQuincena };
}

/**
 * Verifica si una fecha está dentro de la quincena actual
 */
function estaEnQuincenaActual(fecha, quincena) {
  if (!fecha) return false;
  const fechaObj = typeof fecha === 'string' ? new Date(fecha + 'T00:00:00') : fecha;
  fechaObj.setHours(0, 0, 0, 0);
  return fechaObj >= quincena.fechaInicio && fechaObj <= quincena.fechaFin;
}

/**
 * Calcula los datos para la gráfica quincenal
 * Cuenta PUNTOS de la quincena actual (28-12 o 13-27)
 */
function calcularDatosQuincenal() {
  const hoy = new Date();
  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  
  // 🔥 Obtener la quincena actual basada en días del mes (28-12 o 13-27)
  const quincena = obtenerQuincenaActual();
  
  let puntosAsignados = 0;
  let puntosGanados = 0;
  let empleadosConTareas = 0;
  
  empleadosGlobales.forEach(emp => {
    let tieneTareasEnQuincena = false;
    
    // Procesar cada día de la semana
    diasSemana.forEach((dia) => {
      const tareasDia = emp.tareas_asignadas?.[dia] || [];
      
      tareasDia.forEach(tarea => {
        const puntos = parseInt(tarea.puntaje) || 0;
        if (puntos === 0) return;
        
        // 🔥 Verificar si la tarea está en la quincena actual usando su fecha
        let estaEnQuincena = false;
        
        if (tarea.fecha) {
          // Usar el campo fecha si existe
          estaEnQuincena = estaEnQuincenaActual(tarea.fecha, quincena);
        } else {
          // Fallback: calcular la fecha basada en el día de la semana
          const indiceDia = diasSemana.indexOf(dia);
          const hoyIndex = hoy.getDay();
          const diferenciaDias = indiceDia - hoyIndex;
          const fechaTarea = new Date(hoy);
          fechaTarea.setDate(hoy.getDate() + diferenciaDias);
          estaEnQuincena = estaEnQuincenaActual(fechaTarea, quincena);
        }
        
        // Solo procesar tareas de la quincena actual
        if (estaEnQuincena) {
          tieneTareasEnQuincena = true;
          
          // Puntos asignados: todas las tareas excepto extras (estatus 5)
          if (tarea.estatus !== 5) {
            puntosAsignados += puntos;
            
            // Puntos ganados: solo tareas completadas (estatus 3)
            if (tarea.estatus === 3) {
              puntosGanados += puntos;
            }
          }
        }
      });
    });
    
    if (tieneTareasEnQuincena) {
      empleadosConTareas++;
    }
  });
  
  const porcentajeCompletado = puntosAsignados > 0 
    ? Math.round((puntosGanados / puntosAsignados) * 100) 
    : 0;
  
  console.log(`📊 Quincenal: ${puntosGanados}/${puntosAsignados} pts (${porcentajeCompletado}%) - ${empleadosConTareas} empleados`);
  
  return {
    porcentajeCompletado,
    puntosGanados,
    puntosAsignados,
    empleadosConTareas
  };
}

/**
 * Calcula los datos para la gráfica de progreso
 * 🔥 CORREGIDO: Calcula según el modo (Quincena o Todo el historial)
 * - Modo Quincena: Solo días de la quincena actual hasta HOY
 * - Modo Todo: Desde FECHA_MINIMA_HISTORIAL hasta HOY
 */
function calcularDatosProgreso() {
  const modoQuincena = modoActual === 'quincena';
  
  let puntosAsignados = 0;
  let puntosGanados = 0;
  let puntosNoGanados = 0;
  let puntosExtras = 0;

  const hoy = new Date();
  const hoyDate = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  hoyDate.setHours(0, 0, 0, 0);
  
  // 🔥 Determinar fecha de inicio según el modo
  let fechaInicio, fechaFin;
  
  if (modoQuincena) {
    // Modo Quincena: usar quincena actual
    const quincena = obtenerQuincenaActual();
    fechaInicio = quincena.fechaInicio;
    fechaFin = quincena.fechaFin;
  } else {
    // Modo Todo: desde la fecha mínima del historial
    // Usar la misma FECHA_MINIMA_HISTORIAL que usa TareasPanel
    fechaInicio = new Date(2025, 0, 13); // 13 de enero 2025 (fecha mínima hardcoded)
    fechaFin = hoyDate;
  }
  
  let currentDate = new Date(fechaInicio);
  while (currentDate <= fechaFin && currentDate <= hoyDate) {
    const fechaBuscada = currentDate.toISOString().split('T')[0];
    const fechaEvaluada = new Date(currentDate);
    fechaEvaluada.setHours(0, 0, 0, 0);
    const esPasado = fechaEvaluada < hoyDate;
    
    // Para cada empleado (IGUAL QUE LA TABLA)
    for (const empleado of empleadosGlobales) {
      // 🔥 PRIMERO: Intentar obtener del historial si es día pasado
      if (esPasado && empleado.historial_puntos && empleado.historial_puntos[fechaBuscada]) {
        const hist = empleado.historial_puntos[fechaBuscada];
        puntosAsignados += hist.asignados || 0;
        puntosGanados += hist.completados || 0;
        puntosNoGanados += hist.perdidos || 0;
        puntosExtras += hist.extras || 0;
        continue; // Ya tenemos los datos del historial, siguiente empleado
      }
      
      // 🔥 Si no hay historial o es día actual, calcular dinámicamente
      const weekdayFull = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
      const dayName = normalizeDay(weekdayFull[currentDate.getDay()]);
      
      const allTasks = getAllTasks(empleado);
      const realizadasBackup = tareasRealizadasMap[empleado.id] || [];
      
      // Mezclar y deduplicar (IGUAL QUE LA TABLA)
      const merged = [
        ...allTasks.filter(t => t.estatus === 3),
        ...realizadasBackup,
        ...allTasks.filter(t => t.estatus !== 3)
      ].filter((t, i, arr) => {
        if (arr.findIndex(x => x.id === t.id) !== i) return false;
        return true;
      });
      
      // Filtrar tareas de este día (IGUAL QUE LA TABLA)
      const tareasDelDia = merged.filter(t => {
        if (t.fecha) {
          return t.fecha === fechaBuscada;
        }
        return normalizeDay(t.dia) === dayName;
      });
      
      // Procesar puntos (IGUAL QUE LA TABLA)
      tareasDelDia.forEach(tarea => {
        const puntos = parseInt(tarea.puntaje) || 0;
        if (puntos === 0) return;
        
        if (tarea.estatus !== 5) {
          puntosAsignados += puntos;
        }
        
        if (tarea.estatus === 3) {
          puntosGanados += puntos;
        } else if (tarea.estatus === 4) {
          puntosNoGanados += puntos;
        } else if (tarea.estatus === 5) {
          puntosExtras += puntos;
        }
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const pct = puntosAsignados > 0 ? (puntosGanados / puntosAsignados) * 100 : 0;
  
  const modoTexto = modoActual === 'quincena' ? 'QUINCENA' : 'TODO HISTORIAL';
  const fechaInicioStr = fechaInicio.toLocaleDateString('es-ES');
  const fechaFinStr = fechaFin.toLocaleDateString('es-ES');
  
  console.log(`🎯 GRÁFICA (${modoTexto}) - Desde ${fechaInicioStr} hasta ${fechaFinStr}`);
  console.log(`   📊 Asignados: ${puntosAsignados} | Ganados: ${puntosGanados} | No Ganados: ${puntosNoGanados} | Extras: ${puntosExtras}`);
  console.log(`   📈 Porcentaje: ${pct.toFixed(1)}%`);
  
  return {
    puntosAsignados,
    puntosGanados,
    puntosNoGanados,
    puntosExtras,
    porcentaje: pct
  };
}

/**
 * Genera el HTML de la gráfica quincenal
 */
function generarHTMLGraficaQuincenal(datos) {
  const { porcentajeCompletado, puntosGanados, puntosAsignados, empleadosConTareas } = datos;
  
  let strokeColor = '';
  // 🔥 NUEVO: Escala de colores 0-79=rojo, 80-89=amarillo, 90-100=verde
  if (porcentajeCompletado >= 90) {
    strokeColor = '#10b981'; // Verde: 90-100
  } else if (porcentajeCompletado >= 80) {
    strokeColor = '#f59e0b'; // Amarillo: 80-89
  } else {
    strokeColor = '#ef4444'; // Rojo: 0-79
  }
  
  const size = 60;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = puntosAsignados > 0 ? circumference - (porcentajeCompletado / 100) * circumference : circumference;
  
  return `
    <div class="promedio-card" style="max-width: 300px; width: 100%; padding: 10px;">
      <h3 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; opacity: 0.95; text-align: center;">📊 Progreso Quincenal</h3>
      <div class="promedio-stats">
        <div class="promedio-value">
          <span style="font-size: 16px; font-weight: bold; line-height: 1;">${porcentajeCompletado}%</span>
          <span class="promedio-label" style="font-size: 9px;">puntos completados</span>
        </div>
        <div class="promedio-empleados" style="font-size: 8px;">
          ${empleadosConTareas} empleados activos en quincena
        </div>
      </div>
      <div class="promedio-grafica">
        ${puntosAsignados > 0 ? `
          <div style="position: relative; width: 60px; height: 60px; margin: 6px auto;">
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
              <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#eeeeee" stroke-width="${strokeWidth}" />
              <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" style="transition: stroke-dashoffset 0.5s ease;" />
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
              <div style="font-size: 14px; font-weight: 700; color: ${strokeColor}; line-height: 1;">${porcentajeCompletado}%</div>
              <div style="font-size: 6px; color: #666; margin-top: 2px;">${puntosGanados}/${puntosAsignados} pts</div>
            </div>
          </div>
        ` : '<p style="font-size: 9px; opacity: 0.8; margin: 0; text-align: center;">No hay puntos en esta quincena</p>'}
      </div>
    </div>
  `;
}

/**
 * Genera el HTML de la gráfica de progreso (DISEÑO DE ACTIVIDADES DIARIAS)
 */
function generarHTMLGraficaProgreso(datos) {
  const { puntosAsignados, puntosGanados, puntosNoGanados, puntosExtras, porcentaje } = datos;
  
  const C = 314;
  const pct = porcentaje;
  const seg = Math.max(0, Math.min(C, (pct / 100) * C));

  let displayText = '';
  let textColor = '';
  
  // 🔥 NUEVO: Escala de colores 0-79=rojo, 80-89=amarillo, 90-100=verde
  if (pct > 100) {
    displayText = '+100%';
    textColor = '#2d79f3';
  } else if (pct >= 90) {
    displayText = `${Math.round(pct)}%`;
    textColor = '#10b981'; // Verde: 90-100
  } else if (pct >= 80) {
    displayText = `${Math.round(pct)}%`;
    textColor = '#f59e0b'; // Amarillo: 80-89
  } else {
    displayText = `${Math.round(pct)}%`;
    textColor = '#ef4444'; // Rojo: 0-79
  }

  return `
    <section class="task-progress-card compact" style="transform: scale(0.85); transform-origin: center; max-width: 320px; width: 100%; flex-direction: column; gap: 15px;">
      <div class="chart">
        <svg class="progress-ring" width="120" height="120" aria-label="Progreso de tareas quincenal">
          <circle class="progress-ring__track" stroke="#eeeeee" stroke-width="10"
                  fill="transparent" r="50" cx="60" cy="60"
                  stroke-dasharray="314" stroke-dashoffset="0" />
          <circle class="progress-ring__circle not-completed"
                  fill="transparent" r="50" cx="60" cy="60"
                  stroke-dasharray="314" stroke-dashoffset="0" />
          <circle class="progress-ring__circle completed"
                  fill="transparent" r="50" cx="60" cy="60"
                  stroke-dasharray="314" stroke-dashoffset="${C - seg}" />
        </svg>
        <div class="chart-text">
          <div class="count" style="color: ${textColor}; font-weight: 700; font-size: 1.8rem; line-height: 1;">${displayText}</div>
        </div>
      </div>
      <div class="side-panel" style="flex-direction: column; gap: 12px;">
        <div class="legend" style="width: 100%;">
          <div class="legend-item" style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="legend-color completed"></span>
              <span class="legend-text">Puntos ganados</span>
            </div>
            <span style="font-weight: 700; color: #28a745; margin-left: 12px;">${puntosGanados}</span>
          </div>
          <div class="legend-item" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="legend-color not-completed"></span>
              <span class="legend-text">Puntos no ganados</span>
            </div>
            <span style="font-weight: 700; color: #dc3545; margin-left: 12px;">${puntosNoGanados}</span>
          </div>
        </div>
        <div class="extras-panel" title="Puntos extras obtenidos completando tareas fuera de su horario asignado" style="display: flex; flex-direction: row; align-items: center; justify-content: space-between; width: 100%; padding-top: 10px; border-top: 1px solid #eee;">
          <div class="legend-item extras-item" style="margin: 0;">
            <span class="legend-text">Puntos extras</span>
          </div>
          <div class="extras-count" style="font-size: 1.2rem; font-weight: 700; color: #2d79f3;">${puntosExtras}</div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Genera el HTML de la gráfica MINI para al lado de los botones
 * 🔥 MODIFICADO: Siempre usa el mismo diseño (donut + leyenda + extras)
 * Solo cambian los datos según el modo (Quincena o Todo el historial)
 */
function generarHTMLGraficaMini(datos) {
  const { puntosGanados, puntosNoGanados, puntosExtras, porcentaje } = datos;
  
  const C = 314; // 2 * PI * 50
  const pct = porcentaje;
  const seg = Math.max(0, Math.min(C, (pct / 100) * C));

  let textColor = '';
  // 🔥 Escala de colores 0-79=rojo, 80-89=amarillo, 90-100=verde
  if (pct > 100) {
    textColor = '#2d79f3';
  } else if (pct >= 90) {
    textColor = '#10b981'; // Verde: 90-100
  } else if (pct >= 80) {
    textColor = '#f59e0b'; // Amarillo: 80-89
  } else {
    textColor = '#ef4444'; // Rojo: 0-79
  }

  const displayPct = pct > 100 ? '+100%' : Math.round(pct) + '%';

  return `
    <div style="display: flex; align-items: center; gap: 20px;">
      <!-- Gráfica circular -->
      <div style="position: relative; width: 80px; height: 80px; flex-shrink: 0;">
        <svg width="80" height="80" style="transform: rotate(-90deg);">
          <circle cx="40" cy="40" r="35" fill="none" stroke="#eee" stroke-width="8"/>
          <circle cx="40" cy="40" r="35" fill="none" stroke="#dc3545" stroke-width="8" stroke-dasharray="220" stroke-dashoffset="0"/>
          <circle cx="40" cy="40" r="35" fill="none" stroke="#28a745" stroke-width="8" stroke-dasharray="220" stroke-dashoffset="${220 - (pct / 100) * 220}" stroke-linecap="round"/>
        </svg>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
          <div style="font-size: 16px; font-weight: 700; color: ${textColor}; line-height: 1;">${displayPct}</div>
        </div>
      </div>
      
      <!-- Leyenda igual que la original -->
      <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 10px; height: 10px; background: #28a745; border-radius: 2px; flex-shrink: 0;"></span>
          <span style="color: #333;">Total puntos ganados</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 10px; height: 10px; background: #dc3545; border-radius: 2px; flex-shrink: 0;"></span>
          <span style="color: #333;">Puntos no ganados</span>
        </div>
      </div>
      
      <!-- Separador vertical -->
      <div style="width: 1px; height: 50px; background: #ddd;"></div>
      
      <!-- Puntos extras -->
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <span style="font-size: 12px; color: #666;">Puntos extras ganados</span>
        <span style="font-size: 20px; font-weight: 700; color: #2d79f3;">${puntosExtras}</span>
      </div>
    </div>
  `;
}

/**
 * Renderiza la gráfica en el contenedor #grafica-promedio-content
 * Esta gráfica se muestra junto con tareas vencidas
 */
export function renderizarGraficaPromedio() {
  const container = document.getElementById('grafica-promedio-content');
  if (!container) return;

  const datosProgreso = calcularDatosProgreso();

  console.log('🔄 [GraficaPromedio] Actualizado -', new Date().toLocaleTimeString(), {
    progreso: datosProgreso,
    empleados: empleadosGlobales.length
  });

  container.innerHTML = generarHTMLGraficaMini(datosProgreso);
}
