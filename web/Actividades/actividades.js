// =====================================================
// 🚨🚨🚨 VERSIÓN: 27-ENE-2026 15:40 - SI NO VES ESTO EN CONSOLA, TIENES CACHE 🚨🚨🚨
// =====================================================
// console.log('🚨🚨🚨 ACTIVIDADES.JS VERSIÓN 27-ENE-2026 15:40 CARGADO 🚨🚨🚨');

// General - Tabla de actividades por día/empleado + KPI + menú contextual por celda
import {abrirFormularioCrearTarea} from "../Gestion/Editar Empleado/Crear tareas/crear_tarea.js"

const diasSemana = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const state = {
  currentDayIndex: new Date().getDay(),
  trabajadores: [],
  currentEmpPage: 0,
  // pageSize ahora será dinámico = número de empleados cargados
  lastRowsData: [],
  lastMinuteScrolled: null,
  lastTargetIndex: 0,
  activitiesByDay: new Map() // memo de actividades únicas por día
};

// 🔥 NUEVO: Variable global para tareas extra activas (con TTL válido)
let tareasExtraActivas = [];
// 🔥 NUEVO: Rastrear IDs de extras anteriores para detectar cambios (expiración de TTL)
let _lastExtrasTaskIds = new Set();
// 🔥 NUEVO: Control de frecuencia para chequeo de TTL (evitar demasiadas llamadas)
let _lastExtraCheckTime = 0;
const EXTRA_CHECK_INTERVAL_MS = 5000; // Verificar extras cada 5 segundos
// 🔥 NUEVO: Tareas extras completadas cargadas desde el histórico (para pintar celdas azul fuerte)
let tareasExtrasCompletadas = [];


const DOM = {};
let clockIntervalId = null;
let autoRefreshIntervalId = null;
let _lastEmpleadosJsonString = null;
let _lastCssText = null;

// Contexto del menú contextual
let menuContext = null;

/* =========================================================
  Inicialización
  - Punto de entrada: espera DOMContentLoaded y llama a `init()`
  - `init` carga datos, prepara selectores y arranca relojes/auto-refresh
  ========================================================= */
document.addEventListener('DOMContentLoaded', init);

/**
 * init()
 * Inicializa la vista de Actividades:
 * - cachea selectores DOM
 * - carga empleados CON tareas desde /empleados-con-tareas API
 * - construye cache de actividades por día
 * - renderiza la UI, inicia el reloj y auto-refresh
 */
async function init() {
  cacheSelectors();
  setupInitialAnimations();
  bindUIEvents();

  try {
    const resp = await fetch('/empleados-con-tareas');
    if (!resp.ok) throw new Error('Error al obtener los empleados');
    let allEmpleados = await resp.json();
    
    // 🔥 Filtrar empleados según el rol del usuario logueado
    const loggedUserString = localStorage.getItem('loggedUser');
    const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };
    const userRole = loggedUser.role ? loggedUser.role.toLowerCase() : 'visitante';
    
    // console.log(`🔍 [Frontend] Usuario logueado: ${userRole}`);
    // console.log(`📊 [Frontend] Total empleados desde API: ${allEmpleados.length}`);
    
    // 🔥 FILTRAR SEGÚN ROL DEL USUARIO
    state.trabajadores = allEmpleados.filter(emp => {
      const empRole = emp.role ? emp.role.toLowerCase() : (emp.role_dp ? emp.role_dp.toLowerCase() : 'empleado');
      
      // NUNCA mostrar admin
      if (empRole === 'admin') {
        // console.log(`   ❌ ${emp.nombre} (rol=${empRole}) → Admin nunca aparece`);
        return false;
      }
      
      // Lógica de visibilidad por rol de usuario
      if (userRole === 'visitante' || userRole === 'empleado') {
        // Solo ver empleados
        const mostrar = empRole === 'empleado';
        // console.log(`   ${mostrar ? '✅' : '❌'} ${emp.nombre} (rol=${empRole}) → ${userRole} solo ve empleados`);
        return mostrar;
      } else if (userRole === 'supervisor' || userRole === 'admin') {
        // Ver empleados + supervisores
        const mostrar = empRole === 'empleado' || empRole === 'supervisor';
        // console.log(`   ${mostrar ? '✅' : '❌'} ${emp.nombre} (rol=${empRole}) → ${userRole} ve empleados + supervisores`);
        return mostrar;
      }
      
      return true; // Por defecto, mostrar
    });
    
    // console.log(`📊 [Frontend] Empleados a mostrar después de filtrar: ${state.trabajadores.length}`);
    state.trabajadores.forEach(emp => {
      const empRole = emp.role ? emp.role.toLowerCase() : (emp.role_dp ? emp.role_dp.toLowerCase() : 'empleado');
      // console.log(`   ✓ ${emp.nombre} (${empRole})`);
    });
    
    // 🔥 NUEVO: Cargar tareas extras completadas desde el histórico ANTES de buildActivitiesCache
    await cargarTareasExtrasCompletadas();
    
    buildActivitiesCache();
    // 🔥 Ejecutar inmediatamente al cargar para que las celdas azul claro aparezcan sin esperar
    await refreshAvailableExtraTasks(true); // forceCheck=true en carga inicial
  } catch (err) {
    console.error('Error al cargar empleados:', err);
    state.trabajadores = [];
    state.activitiesByDay.clear();
  }
  // 🔥 Mostrar nombre del usuario logueado en esquina superior izquierda (TODOS LOS ROLES)
  const loggedUserString = localStorage.getItem('loggedUser');
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };
  
  // Obtener nombre del usuario
  const name = loggedUser.nombre || loggedUser.name || loggedUser.username || 'Usuario';
  
  // Crear/actualizar tarjeta de usuario para TODOS los roles
  let userNameDisplay = document.getElementById('user-name-display');
  if (!userNameDisplay) {
    userNameDisplay = document.createElement('div');
    userNameDisplay.id = 'user-name-display';
    userNameDisplay.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    document.body.appendChild(userNameDisplay);
  }
  
  // Actualizar contenido según el rol
  const rolDisplay = loggedUser.role === 'admin' ? 'Administrador' : 
                     loggedUser.role === 'supervisor' ? 'Supervisor' : 
                     loggedUser.role === 'empleado' ? 'Empleado' :
                     'Visitante';
  userNameDisplay.innerHTML = `
    <span style="font-size: 16px;">👤</span>
    <span>${name} (${rolDisplay})</span>
  `;
  
  // Ocultar gráfica de puntos para empleados (solo admin/supervisor la ven)
  if (DOM.taskProgress && loggedUser.role !== 'admin' && loggedUser.role !== 'supervisor') {
    DOM.taskProgress.classList.add('hidden');
    if (DOM.taskProgressTitle) DOM.taskProgressTitle.classList.add('hidden');
    
    // Eliminar placeholder antiguo si existe
    if (DOM.taskProgressPlaceholder) {
      DOM.taskProgressPlaceholder.remove();
      DOM.taskProgressPlaceholder = null;
    }
  } else {
    // Mostrar gráfica para admin/supervisor
    if (DOM.taskProgress) DOM.taskProgress.classList.remove('hidden');
    if (DOM.taskProgressTitle) DOM.taskProgressTitle.classList.remove('hidden');
    if (DOM.taskProgressPlaceholder) {
      DOM.taskProgressPlaceholder.remove();
      DOM.taskProgressPlaceholder = null;
    }
  }

  renderForCurrentState();
  startClock();

  // Iniciar auto-refresh para detectar cambios en datos y estilos sin recargar la página
  startAutoRefresh();

  // 🔥 NUEVO: Refrescar tareas extra cada 30 segundos para asegurar que las celdas azul claro se actualicen
  // Este intervalo es un respaldo adicional - el checkForUpdates() cada 1 segundo también verifica (cada 5 seg)
  setInterval(async () => {
    await refreshAvailableExtraTasks(true); // forceCheck=true para garantizar verificación
    renderForCurrentState(); // Redibujar tabla para actualizar colores
  }, 30000); // 30 segundos

  // 🔥 NUEVO: Conectarse al WebSocket para recibir notificaciones en tiempo real
  connectToWebSocket();
  
  // 🔥 NUEVO: Verificar si hay notificaciones de tarea después del login
  const taskNotification = sessionStorage.getItem('taskNotification');
  if (taskNotification) {
    const notification = JSON.parse(taskNotification);
    showToast(notification.message, notification.type, 5000);
    sessionStorage.removeItem('taskNotification');
  }

  // resize throttled
  window.addEventListener('resize', rafThrottle(adjustCenterBandHeight));
}

/* ========== WebSocket para notificaciones en tiempo real ========== */
let webSocketConnection = null;
let webSocketReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function connectToWebSocket() {
  if (webSocketConnection && webSocketConnection.readyState === WebSocket.OPEN) {
    // console.log('✅ WebSocket ya está conectado');
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws-web`;

  try {
    webSocketConnection = new WebSocket(wsUrl);

    webSocketConnection.onopen = () => {
      // console.log('🌐 WebSocket conectado al servidor');
      webSocketReconnectAttempts = 0;
    };

    webSocketConnection.onmessage = async (event) => {
      try {
        const mensaje = JSON.parse(event.data);
        // console.log('📨 Mensaje del servidor:', mensaje);

        if (mensaje.accion === 'tarea_extra_completada') {
          // console.log(`✅ Tarea extra completada por ${mensaje.empleado}`);
          await recargarDatosDelServidor();
          showToast(`Tarea completada por ${mensaje.empleado}`, 'success', 3000);
          // 🔥 Recargar página después de completar tarea extra desde reloj
          setTimeout(() => { location.reload(); }, 1000);
        }
      } catch (err) {
        console.warn('Error procesando mensaje WebSocket:', err);
      }
    };

    webSocketConnection.onerror = (error) => {
      console.error('❌ Error en WebSocket:', error);
    };

    webSocketConnection.onclose = () => {
      // console.log('❌ WebSocket desconectado');
      if (webSocketReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        webSocketReconnectAttempts++;
        // console.log(`🔄 Intentando reconectar... (${webSocketReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(connectToWebSocket, 3000 * webSocketReconnectAttempts);
      }
    };
  } catch (err) {
    console.error('Error al conectar WebSocket:', err);
  }
}

async function recargarDatosDelServidor() {
  try {
    const now = new Date();
    const resp = await fetch('/empleados-con-tareas', { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    
    const empleados = await resp.json();
    const text = JSON.stringify(empleados);
    _lastEmpleadosJsonString = text;
    state.trabajadores = empleados;
    
    buildActivitiesCache();
    renderForCurrentState();
    updateCellStates(now);
    updateTaskProgressWidget();
    refreshAvailableExtraTasks(true); // 🔥 Refrescar tareas disponibles cada vez que se recarguen datos (forzar)
    
    // console.log('✅ Datos recargados del servidor');
  } catch (err) {
    console.error('Error recargando datos:', err);
  }
}

/**
 * 🔥 NUEVO: cargarTareasExtrasCompletadas()
 * Carga las tareas extras completadas desde el histórico de la base de datos.
 * Esto se usa para pintar las celdas azul fuerte en la misma fila de la tarea original.
 */
async function cargarTareasExtrasCompletadas() {
  try {
    // Obtener fecha de hoy en formato YYYY-MM-DD
    const hoy = new Date();
    const fechaHoy = hoy.getFullYear() + '-' + 
                     String(hoy.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(hoy.getDate()).padStart(2, '0');
    
    const resp = await fetch(`/tareas-extras/completadas?fecha=${fechaHoy}`);
    if (!resp.ok) {
      console.warn('⚠️ Error cargando tareas extras completadas:', resp.status);
      tareasExtrasCompletadas = [];
      return;
    }
    
    const data = await resp.json();
    if (data.success && Array.isArray(data.tareas_extras)) {
      tareasExtrasCompletadas = data.tareas_extras;
      // console.log(`🔵 [cargarTareasExtrasCompletadas] Cargadas ${tareasExtrasCompletadas.length} tareas extras completadas para ${fechaHoy}`);
      tareasExtrasCompletadas.forEach(te => {
        // console.log(`   → Tarea original ID: ${te.tarea_original_id}, completada por usuario: ${te.id_usuario_asignada}`);
      });
    } else {
      tareasExtrasCompletadas = [];
    }
  } catch (err) {
    console.error('⚠️ Error en cargarTareasExtrasCompletadas:', err);
    tareasExtrasCompletadas = [];
  }
}

/**
 * 🔥 NUEVO: refreshAvailableExtraTasks()
 * Busca y actualiza las tareas extra disponibles (azules) en la interfaz.
 * Se llama cada vez que se recarga la página o se actualizan los datos del servidor.
 * 
 * IMPORTANTE: Esta función redibuja la tabla completa para asegurarse de que
 * las tareas que fueron completadas como extra O que expiraron por TTL desaparecen del estado "disponible".
 */
async function refreshAvailableExtraTasks(forceCheck = false) {
  const dayName = diasSemana[state.currentDayIndex];
  
  // 🔥 FIX: Calcular fechaKey para el día actual visible (formato YYYY-MM-DD)
  // Las tareas_asignadas están indexadas por fecha, no por nombre del día
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDayIndex = today.getDay();
  let dayDiff = state.currentDayIndex - todayDayIndex;
  if (state.currentDayIndex < todayDayIndex) {
    dayDiff += 7;
  }
  const displayedDate = new Date(today);
  displayedDate.setDate(today.getDate() + dayDiff);
  const fechaKey = displayedDate.getFullYear() + '-' + 
                   String(displayedDate.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(displayedDate.getDate()).padStart(2, '0');
  
  // 🔥 Validar que state.activitiesByDay esté inicializado
  if (!state.activitiesByDay || !state.activitiesByDay.has(dayName)) {
    console.warn('⚠️ state.activitiesByDay aún no inicializado, saltando refreshAvailableExtraTasks');
    return;
  }

  // 🔥 Control de frecuencia: solo verificar cada EXTRA_CHECK_INTERVAL_MS (5 segundos)
  const now = Date.now();
  if (!forceCheck && (now - _lastExtraCheckTime) < EXTRA_CHECK_INTERVAL_MS) {
    return; // Aún no es tiempo de verificar
  }
  _lastExtraCheckTime = now;

  // 🔥 PASO 1: Consultar tareas extra activas del servidor (con TTL válido)
  let huboCambioEnExtras = false;
  try {
    const response = await fetch('/extras/', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      tareasExtraActivas = data.tareas_extra || []; // Guardar en variable global
      
      // 🔥 Detectar si hubo cambios comparando con el estado anterior
      const currentExtrasIds = new Set(tareasExtraActivas.map(te => String(te.TaskID)));
      
      // Verificar si alguna extra anterior ya no está (expiró por TTL)
      for (const prevId of _lastExtrasTaskIds) {
        if (!currentExtrasIds.has(prevId)) {
          huboCambioEnExtras = true;
          // console.log(`⏱️ Tarea extra ${prevId} expiró (ya no está en servidor)`);
          break;
        }
      }
      
      // Verificar si hay nuevas extras
      for (const currId of currentExtrasIds) {
        if (!_lastExtrasTaskIds.has(currId)) {
          huboCambioEnExtras = true;
          // console.log(`🆕 Nueva tarea extra detectada: ${currId}`);
          break;
        }
      }
      
      // Actualizar el tracking de extras anteriores
      _lastExtrasTaskIds = currentExtrasIds;
      
      // console.log(`🔵 Tareas extra activas del servidor (con TTL válido): ${tareasExtraActivas.length}`);
    }
  } catch (err) {
    console.error('⚠️ Error al consultar tareas extra activas:', err);
    tareasExtraActivas = []; // Limpiar en caso de error
  }
  
  // 🔥 Si hubo cambios en las extras (alguna expiró o se creó una nueva), forzar redibujado inmediato
  if (huboCambioEnExtras && DOM.tbody && state.lastRowsData && state.lastRowsData.length > 0) {
    // console.log('🔄 Cambio en tareas extra detectado → Forzando redibujado de tabla');
    DOM.tbody.textContent = '';
    const visibleTrabajadores = state.trabajadores;
    const now = new Date();
    const isToday = state.currentDayIndex === now.getDay();
    buildRows(state.lastRowsData, visibleTrabajadores, isToday, now);
    // mergeCells(0); // 🔥 DESHABILITADO: No fusionar para que cada tarea tenga su propia celda de horario
    centerOnCurrentTime({ forceScroll: false, now }); // 🔥 FIX: Restaurar línea amarilla
    // console.log('✨ Tabla redibujada por cambio en TTL de extras');
    return; // Ya redibujamos, no hace falta continuar
  }
  
  // Obtener todas las tareas del día desde el caché
  const tareas = state.activitiesByDay.get(dayName) || [];
  let tareasDisponiblesConteo = 0;
  let tareasCompletadasComoExtra = [];
  let tareasExpiradas = [];
  
  tareas.forEach(tarea => {
    // Buscar la tarea vencida del empleado original
    let tareaVencida = null;
    let empleadoOriginal = null;
    
    for (const trab of state.trabajadores) {
      // 🔥 FIX: Usar fechaKey (YYYY-MM-DD) en lugar de dayName para buscar en tareas_asignadas
      const tareasDelTrab = (trab.tareas_asignadas && trab.tareas_asignadas[fechaKey]) || [];
      const tarea_encontrada = tareasDelTrab.find(t => 
        (t.nombre || '') === tarea.nombre && 
        (t.hora || '') === (tarea.hora || '')
      );
      
      if (tarea_encontrada && tarea_encontrada.estatus === 4) {
        tareaVencida = tarea_encontrada;
        empleadoOriginal = trab;
        break;
      }
    }
    
    if (!tareaVencida || !empleadoOriginal) return;
    
    // 🔥 PASO 2: Verificar si la tarea aún está en tareas_extra (no expiró por TTL)
    const tareaExtraActiva = tareasExtraActivas.find(te => 
      String(te.TaskID) === String(tareaVencida.id)
    );
    
    if (!tareaExtraActiva) {
      // La tarea expiró (TTL cumplido) → no mostrar azul
      tareasExpiradas.push({
        tarea: tarea.nombre,
        hora: tarea.hora
      });
      return;
    }
    
    // Verificar si alguien ya completó esta tarea como extra
    let yaCompletadaComoExtra = false;
    let empleadoQueComplet = null;
    yaCompletadaComoExtra = state.trabajadores.some(emp => {
      // 🔥 FIX: Usar fechaKey (YYYY-MM-DD) en lugar de dayName
      const tareasEmp = (emp.tareas_asignadas && emp.tareas_asignadas[fechaKey]) || [];
      const tareaExtra = tareasEmp.find(t => 
        t.esExtra === true && 
        Number(t.tareaOriginalId) === Number(tareaVencida.id)
      );
      if (tareaExtra) {
        empleadoQueComplet = emp;
        return true;
      }
      return false;
    });
    
    // Si hay tarea vencida, está activa (TTL válido) y NO fue completada como extra → es disponible
    if (!yaCompletadaComoExtra) {
      tareasDisponiblesConteo++;
    } else if (empleadoQueComplet) {
      // Registrar que esta tarea fue completada por alguien
      tareasCompletadasComoExtra.push({
        tarea: tarea.nombre,
        hora: tarea.hora,
        completadaPor: empleadoQueComplet.nombre
      });
    }
  });
  
  // console.log(`🔵 Tareas extra disponibles actualizadas: ${tareasDisponiblesConteo} tarea(s) disponible(s) en ${dayName}`);
  
  if (tareasExpiradas.length > 0) {
    // console.log(`⏱️ Tareas expiradas (TTL cumplido):`);
    tareasExpiradas.forEach(t => {
      // console.log(`   • ${t.tarea} (${t.hora}) ya no disponible`);
    });
  }
  
  if (tareasCompletadasComoExtra.length > 0) {
    // console.log(`✅ Tareas completadas como extra:`);
    tareasCompletadasComoExtra.forEach(t => {
      // console.log(`   • ${t.tarea} (${t.hora}) completada por ${t.completadaPor}`);
    });
  }
  
  // 🔥 IMPORTANTE: Forzar redibujado de la tabla cuando hay cambios
  // Esto asegura que las tareas que fueron completadas como extra O expiraron por TTL
  // desaparezcan del azul claro automáticamente
  if ((tareasCompletadasComoExtra.length > 0 || tareasExpiradas.length > 0) && DOM.tbody) {
    DOM.tbody.textContent = '';
    
    // 🔥 Mostrar TODOS los trabajadores (sin paginación)
    const visibleTrabajadores = state.trabajadores;
    const now = new Date();
    const isToday = state.currentDayIndex === now.getDay();
    
    buildRows(state.lastRowsData || [], visibleTrabajadores, isToday, now);
    // mergeCells(0); // 🔥 DESHABILITADO: No fusionar para que cada tarea tenga su propia celda de horario
    centerOnCurrentTime({ forceScroll: false, now }); // 🔥 FIX: Restaurar línea amarilla
    // console.log('✨ Tabla redibujada - tareas expiradas/completadas actualizadas');
  }
}

/* ========== Auto-refresh (polling ligero) ========== */
/**
 * fetchEmpleadosIfChanged()
 * Poll ligero: obtiene /empleados-con-tareas y devuelve datos solo si cambiaron
 * Retorna `null` si no hubo cambios o si hubo error.
 */
async function fetchEmpleadosIfChanged() {
  try {
    const resp = await fetch('/empleados-con-tareas', { cache: 'no-store' });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = JSON.stringify(data);
    if (_lastEmpleadosJsonString === text) return null; // sin cambios
    _lastEmpleadosJsonString = text;
    return data;
  } catch (err) {
    console.warn('fetchEmpleadosIfChanged error', err);
    return null;
  }
}

/**
 * fetchCssIfChanged()
 * Similar a fetchEmpleadosIfChanged pero para el archivo de estilos
 * Devuelve el texto del CSS si cambió, o null si no hubo cambio.
 */
async function fetchCssIfChanged() {
  try {
    const resp = await fetch('/web/Actividades/actividades.css', { cache: 'no-store' });
    if (!resp.ok) return null;
    const text = await resp.text();
    if (_lastCssText === text) return null;
    _lastCssText = text;
    return text;
  } catch (err) {
    console.warn('fetchCssIfChanged error', err);
    return null;
  }
}

/**
 * applyCssText(cssText)
 * Inserta/actualiza un <style id="live-actividades-css"> con el contenido
 * recibido para forzar refresh de estilos sin recargar la página.
 */
function applyCssText(cssText) {
  // Preferir actualizar la hoja existente vinculada en head si existe
  const link = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .find(l => l.href && l.href.includes('/web/Actividades/actividades.css'));
  if (link) {
    // reemplazar por estilo en línea para forzar actualización sin recarga
    let style = document.getElementById('live-actividades-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'live-actividades-css';
      document.head.appendChild(style);
    }
    style.textContent = cssText;
  } else {
    // fallback: crear o actualizar style#live-actividades-css
    let style = document.getElementById('live-actividades-css');
    if (!style) { style = document.createElement('style'); style.id = 'live-actividades-css'; document.head.appendChild(style); }
    style.textContent = cssText;
  }
}

/**
 * checkForUpdates()
 * Ejecutado periódicamente por startAutoRefresh():
 * - pregunta por cambios en empleados y CSS
 * - si hay cambios, actualiza el estado y vuelve a renderizar
 * - SIEMPRE verifica TTL de tareas extra (cada 1 segundo)
 */
async function checkForUpdates() {
  // Datos
  const empleadosData = await fetchEmpleadosIfChanged();
  if (empleadosData) {
    // 🔥 Filtrar empleados según el rol del usuario logueado
    const loggedUserString = localStorage.getItem('loggedUser');
    const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };
    const userRole = loggedUser.role ? loggedUser.role.toLowerCase() : 'visitante';
    
    state.trabajadores = empleadosData.filter(emp => {
      const empRole = emp.role ? emp.role.toLowerCase() : (emp.role_dp ? emp.role_dp.toLowerCase() : 'empleado');
      
      // NUNCA mostrar admin
      if (empRole === 'admin' || empRole === 'administrador') {
        return false;
      }
      
      // Lógica de visibilidad por rol
      if (userRole === 'empleado' || userRole === 'visitante') {
        // Solo ver empleados
        return empRole === 'empleado';
      } else if (userRole === 'supervisor' || userRole === 'admin') {
        // Ver empleados + supervisores
        return empRole === 'empleado' || empRole === 'supervisor';
      }
      
      return true;
    });
    
    // 🔥 NUEVO: Recargar tareas extras completadas cuando hay cambios
    await cargarTareasExtrasCompletadas();
    
    buildActivitiesCache();
    renderForCurrentState();
    console.info('✅ Actividades: empleados con tareas cargados desde BD y UI renderizada');
    
    // Actualizar estados visuales inmediatamente después de renderizar
    const now = new Date();
    updateCellStates(now);
  }

  // 🔥 SIEMPRE verificar TTL de tareas extra (independiente de si hay cambios en empleados)
  // Esto asegura que las celdas azul claro se despinten automáticamente cuando expira el TTL
  // Nota: la función internamente controla la frecuencia (cada 5 segundos)
  await refreshAvailableExtraTasks();

  // CSS
  const cssText = await fetchCssIfChanged();
  if (cssText) {
    applyCssText(cssText);
    console.info('Actividades: estilos actualizados en vivo');
  }
}

/**
 * startAutoRefresh(intervalMs)
 * Inicia polling periódico para detectar cambios en empleados/estilos.
 * Intervalo reducido a 1 segundo para actualizaciones más rápidas.
 */
function startAutoRefresh(intervalMs = 1000) {
  stopAutoRefresh();
  // Inicializar valores para comparar
  (async () => { _lastCssText = await (await fetch('/web/Actividades/actividades.css', { cache: 'no-store' })).text(); _lastEmpleadosJsonString = JSON.stringify(await (await fetch('/empleados-con-tareas', { cache: 'no-store' })).json()); })().catch(()=>{});
  autoRefreshIntervalId = setInterval(checkForUpdates, intervalMs);
  window.startAutoRefresh = () => startAutoRefresh(intervalMs);
  window.stopAutoRefresh = stopAutoRefresh;
}

/**
 * stopAutoRefresh()
 * Detiene el auto-refresh si está corriendo.
 */
function stopAutoRefresh() {
  if (autoRefreshIntervalId) {
    clearInterval(autoRefreshIntervalId);
    autoRefreshIntervalId = null;
  }
}

/* Cacheo de selectores */
/**
 * cacheSelectors()
 * Localiza y guarda referencias a elementos DOM usados por el módulo
 * (modal, tabla, botones, etc.). Ejecutada durante init().
 */
function cacheSelectors() {
  DOM.titulo = document.querySelector('h2');
  DOM.clockContainer = document.querySelector('.clock-container');
  DOM.tableWrapper = document.getElementById('table-wrapper');
  DOM.centerBand = document.querySelector('.sticky-center-band'); // puede no existir
  DOM.nextDayBtn = document.getElementById('next-day-btn');
  DOM.todayBtn = document.getElementById('today-btn');
  DOM.prevEmpBtn = document.getElementById('prev-emp-page');
  DOM.nextEmpBtn = document.getElementById('next-emp-page');
  DOM.tasksDayLabel = document.getElementById('tasks-day');
  DOM.workerTable = document.getElementById('worker-table');
  DOM.tbody = DOM.workerTable?.querySelector('tbody');
  DOM.theadRow = DOM.workerTable?.querySelector('thead tr');
  DOM.realClockCols = document.querySelectorAll('.clock-col-real');

  // Widget KPI (si está presente)
  DOM.taskProgress = document.getElementById('task-progress');
  DOM.taskProgressTitle = document.querySelector('.task-progress-title');
  DOM.taskProgressPlaceholder = null;

  // Modal info
  DOM.modal = document.getElementById('task-modal');
  DOM.modalTaskName = document.getElementById('modal-task-name');
  DOM.modalTaskDesc = document.getElementById('modal-task-desc');
  DOM.modalClose = document.getElementById('modal-close');
  DOM.modalCloseBtn = document.getElementById('modal-close-btn');
  DOM.modalCompleteBtn = document.getElementById('modal-complete-btn');

  // Modal para acciones sobre trabajador (crear/editar/info)
  DOM.createTaskModal = document.getElementById('modal-create-task');

  // Menú contextual
  DOM.cellMenu = document.getElementById('cell-menu');
    // Menú contextual (empleado)
  DOM.profileMenu = document.getElementById('profile-menu');

}

/* Animaciones iniciales */
/**
 * setupInitialAnimations()
 * Aplica clases CSS para animar la entrada de elementos (título, reloj, tabla)
 */
function setupInitialAnimations() {
  if (DOM.titulo) {
    DOM.titulo.classList.add('fade-in');
    setTimeout(() => DOM.titulo.classList.add('show'), 100);
  }
  if (DOM.clockContainer) setTimeout(() => DOM.clockContainer.classList.add('show'), 500);
  if (DOM.taskProgress) setTimeout(() => DOM.taskProgress.classList.add('show'), 700);
  if (DOM.taskProgressTitle) setTimeout(() => DOM.taskProgressTitle.classList.add('show'), 700);
  if (DOM.tableWrapper) setTimeout(() => DOM.tableWrapper.classList.add('show'), 1000);
}

/* Eventos UI */
/**
 * bindUIEvents()
 * Registra todos los manejadores de eventos UI:
 * - navegación de días y páginas de empleados
 * - clicks en celdas y encabezados
 * - menús contextuales, modal, y otros controles
 */
function bindUIEvents() {
  // 👉 Botón siguiente día
  DOM.nextDayBtn?.addEventListener('click', () => {
    animateDayChange('left', () => {
      state.currentDayIndex = (state.currentDayIndex + 1) % 7;
      renderForCurrentState();
      DOM.tableWrapper.scrollTop = 0;
    });
  });

  // 👉 Botón ir a hoy
  DOM.todayBtn?.addEventListener('click', () => {
    animateDayChange('right', () => {
      state.currentDayIndex = new Date().getDay();
      renderForCurrentState();
      DOM.tableWrapper.scrollTop = 0;
    });
  });

  // 👉 Botón empleados previos
  DOM.prevEmpBtn?.addEventListener('click', () => {
    if (state.currentEmpPage > 0) {
      animateEmpPageChange('right', () => {
        state.currentEmpPage--;
        renderForCurrentState();
        DOM.tableWrapper.scrollTop = 0;
      });
    }
  });

  // 👉 Botón empleados siguientes
  DOM.nextEmpBtn?.addEventListener('click', () => {
    if (state.currentEmpPage < getMaxPage()) {
      animateEmpPageChange('left', () => {
        state.currentEmpPage++;
        renderForCurrentState();
        DOM.tableWrapper.scrollTop = 0;
      });
    }
  });

  // 👉 Click en celdas → cell-menu
  DOM.tbody?.addEventListener('click', (e) => {
    const td = e.target.closest('td');
    if (!td) return;
    
    // 🔥 NUEVO: Edición de columnas Horario (0), Actividad (1), Puntos (2)
    if (td.cellIndex === 0 || td.cellIndex === 1 || td.cellIndex === 2) {
      // console.log('🖱️ Click en columna editableeeeeee:', td.cellIndex);
      
      // Verificar que el usuario sea admin o supervisor
      const loggedUserString = localStorage.getItem('loggedUser');
      const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };
      const isAdmin = loggedUser.role === 'admin' || loggedUser.role === 'supervisor';
      
      if (!isAdmin) {
        // console.log('❌ Usuario no es admin/supervisor');
        return;
      }
      
      e.stopPropagation();
      
      const row = td.parentElement;
      
      // 🔥 NUEVO ENFOQUE: Buscar la primera celda de empleado (columna >= 3) que tenga la tarea ORIGINAL
      // Las celdas tienen data-* attributes con toda la información
      let tareaInfo = null;
      
      // console.log('🔍 Buscando tarea en fila. Total celdas:', row.cells.length);
      
      for (let i = 3; i < row.cells.length; i++) {
        const celda = row.cells[i];
        const hasTask = celda.dataset.hasTask === 'true';
        const estatus = celda.dataset.estatus ? Number(celda.dataset.estatus) : null;
        
        // console.log(`  - Columna ${i}: hasTask=${hasTask}, estatus=${estatus}, nombre=${celda.dataset.nombre}`);
        
        // Buscar celda con tarea que NO sea extra (estatus !== 5)
        if (hasTask && estatus !== null && estatus !== 5) {
          // console.log('✅ Celda con tarea original encontrada en columna', i, '- estatus:', estatus);
          
          tareaInfo = {
            empId: celda.dataset.empId ? Number(celda.dataset.empId) : null,
            tareaId: celda.dataset.tareaId ? Number(celda.dataset.tareaId) : null,
            nombre: celda.dataset.nombre || '',
            descripcion: celda.dataset.desc || '',
            hora: celda.dataset.hora || '',
            hora_fin: celda.dataset.horaFin || '',
            puntaje: celda.dataset.puntaje ? Number(celda.dataset.puntaje) : 0,
            estatus: estatus,
            allowComplete: estatus !== 4 && estatus !== 3, // No permitir completar si ya está completada o vencida
            editarTodos: true // Para indicar que es edición global
          };
          break;
        }
      }
      
      if (tareaInfo) {
        // console.log('📋 Abriendo modal con:', tareaInfo);
        openModal(tareaInfo);
      } else {
        console.error('❌ No se encontró ninguna celda con tarea original en esta fila');
        showToast('No se pudo encontrar información de la tarea.', 'error', 4000);
      }
      return;
    }
    
    // Continuar con la lógica original para columnas >= 3
    if (td.cellIndex < 3) return;
    e.stopPropagation();
    // Obtener usuario logueado
    const loggedUserString = localStorage.getItem('loggedUser');
    const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };

    // Sólo las celdas que tienen tarea deben reaccionar al click
    const tieneTarea = td.dataset.hasTask === 'true';
    if (!tieneTarea) return; // no hacer nada si no hay tarea

    // 🔵 CASO ESPECIAL: Tarea disponible (vencida de otro empleado)
    const isAvailable = td.dataset.isAvailable === 'true';
    if (isAvailable) {
      // 🔥 Si es visitante, abrir modal de PIN
      if (!loggedUser.role || loggedUser.role === 'visitante') {
        const actividad = td.dataset.nombre || '';
        const hora = td.dataset.hora || '';
        const hora_fin = td.dataset.horaFin || '';
        const descripcion = td.dataset.desc || '';
        const originalEmpId = td.dataset.originalEmpId ? Number(td.dataset.originalEmpId) : null;
        const originalTaskId = td.dataset.originalTaskId ? Number(td.dataset.originalTaskId) : null;
        const currentEmpId = td.dataset.empId ? Number(td.dataset.empId) : null;
        
        openPinModal({
          nombre: actividad,
          descripcion,
          hora,
          hora_fin,
          estatus: 4,
          empId: currentEmpId,
          tareaId: originalTaskId,
          isAvailableExtra: true,
          originalEmpId,
          originalTaskId
        });
        return;
      }
      
      // 🔥 VALIDACIÓN: Solo admin, supervisor, o el empleado dueño de esta COLUMNA pueden completarla
      const currentEmpId = td.dataset.empId ? Number(td.dataset.empId) : null;
      const esAdminOSupervisor = loggedUser.role === 'admin' || loggedUser.role === 'supervisor';
      
      if (!esAdminOSupervisor) {
        // Si es empleado, verificar que sea SU columna
        const empleadoIdLogueado = Number(loggedUser.empleado_id);
        if (empleadoIdLogueado !== currentEmpId) {
          showToast('Solo puedes completar tareas extras en tu propia columna', 'warning', 3000);
          return;
        }
      }
      
      // Esta es una tarea vencida que puede ser completada como "extra" por este empleado
      const actividad = td.dataset.nombre || '';
      const hora = td.dataset.hora || '';
      const descripcion = td.dataset.desc || '';
      const originalEmpId = td.dataset.originalEmpId ? Number(td.dataset.originalEmpId) : null;
      const originalTaskId = td.dataset.originalTaskId ? Number(td.dataset.originalTaskId) : null;
      const puntaje = td.dataset.puntaje ? Number(td.dataset.puntaje) : 0; // 🔥 Obtener puntaje
      
      // Abrir modal especial para tarea disponible
      openModalForAvailableTask({
        nombre: actividad,
        descripcion,
        hora,
        originalEmpId,
        originalTaskId,
        currentEmpId, // El empleado que puede completarla
        puntaje, // 🔥 Agregar puntaje al objeto
        estatus: 4 // Estado vencida
      });
      return;
    }

    // Roles:
    // - admin/supervisor: puede finalizar cualquier tarea
    // - empleado: puede finalizar solo sus propias tareas
    // - visitante (u otro): solo ver información
    if (loggedUser && loggedUser.role && (loggedUser.role === 'admin' || loggedUser.role === 'supervisor')) {
      // Admin/Supervisor puede finalizar cualquier tarea
      const actividad = td.dataset.nombre || '';
      const hora = td.dataset.hora || '';
      const hora_fin = td.dataset.horaFin || ''; // 🔥 Obtener hora_fin
      const descripcion = td.dataset.desc || '';
      const puntaje = td.dataset.puntaje ? Number(td.dataset.puntaje) : 0; // 🔥 Obtener puntaje
      const empId = td.dataset.empId ? Number(td.dataset.empId) : null;
      // 🔥 FIX: No convertir a Number si es un ID de tarea extra (empieza con "extra_")
      const tareaIdRaw = td.dataset.tareaId || null;
      const tareaId = tareaIdRaw && !tareaIdRaw.startsWith('extra_') ? Number(tareaIdRaw) : tareaIdRaw;
      const estatus = td.dataset.estatus ? Number(td.dataset.estatus) : 0;
      
      // No permitir completar tareas vencidas (estado 4)
      const allowComplete = estatus !== 4;
      
      openModal({ nombre: actividad, descripcion, hora, hora_fin, puntaje, estatus, empId, tareaId, allowComplete });
      return;
    }

    // Si es empleado (no admin/supervisor/visitante) y la tarea es suya -> abrir modal directo con opción de completar
    if (tieneTarea && loggedUser && loggedUser.role && loggedUser.role !== 'admin' && loggedUser.role !== 'supervisor' && loggedUser.role !== 'visitante') {
      const empleadoId = Number(loggedUser.empleado_id);
      const celEmpId = td.dataset.empId ? Number(td.dataset.empId) : null;
      const actividad = td.dataset.nombre || '';
      const hora = td.dataset.hora || '';
      const hora_fin = td.dataset.horaFin || ''; // 🔥 Obtener hora_fin
      const puntaje = td.dataset.puntaje ? Number(td.dataset.puntaje) : 0; // 🔥 Obtener puntaje
      const descripcion = td.dataset.desc || '';
      const estatus = td.dataset.estatus ? Number(td.dataset.estatus) : null;
      // 🔥 FIX: No convertir a Number si es un ID de tarea extra (empieza con "extra_")
      const tareaIdRaw = td.dataset.tareaId || null;
      const tareaId = tareaIdRaw && !tareaIdRaw.startsWith('extra_') ? Number(tareaIdRaw) : tareaIdRaw;
      if (empleadoId && celEmpId && empleadoId === celEmpId) {
        // No permitir completar tareas vencidas (estado 4)
        const allowComplete = estatus !== 4;
        
        // Abrir modal directamente para su propia tarea (permitir completar si no está vencida)
        openModal({ nombre: actividad, descripcion, hora, hora_fin, puntaje, estatus, empId: empleadoId, tareaId, allowComplete });
        return;
      } else {
        // Tarea de compañero: abrir modal informativo sin botón completar
        openModal({ nombre: actividad, descripcion, hora, hora_fin, puntaje, estatus, empId: celEmpId, tareaId, allowComplete: false });
        return;
      }
    }
    // Visitante u otros roles que pasaron el filtro anterior
    // (si llega aquí significa que loggedUser es visitante o rol desconocido)
    const actividad = td.dataset.nombre || '';
    const hora = td.dataset.hora || '';
    const hora_fin = td.dataset.horaFin || ''; // 🔥 Obtener hora_fin
    const puntaje = td.dataset.puntaje ? Number(td.dataset.puntaje) : 0; // 🔥 Obtener puntaje
    const descripcion = td.dataset.desc || '';
    const empId = td.dataset.empId ? Number(td.dataset.empId) : null;
    // 🔥 FIX: No convertir a Number si es un ID de tarea extra (empieza con "extra_")
    const tareaIdRaw = td.dataset.tareaId || null;
    const tareaId = tareaIdRaw && !tareaIdRaw.startsWith('extra_') ? Number(tareaIdRaw) : tareaIdRaw;
    const estatus = td.dataset.estatus ? Number(td.dataset.estatus) : 0;
    
    // 🔥 NUEVO: Si es visitante y tiene tarea, mostrar modal de información con opción de completar
    if (!loggedUser.role || loggedUser.role === 'visitante') {
      // Solo mostrar opción de completar si la tarea NO está vencida (estatus 4), NO completada (estatus 3), y NO completada como extra (estatus 5)
      const puedeCompletarVisitante = tieneTarea && estatus !== 4 && estatus !== 3 && estatus !== 5;
      
      // Abrir modal de información con botón de completar (que luego pedirá PIN)
      openModalVisitante({
        nombre: actividad,
        descripcion,
        hora,
        hora_fin,
        puntaje,
        estatus,
        empId,
        tareaId,
        isAvailableExtra: false,
        allowComplete: puedeCompletarVisitante
      });
      return;
    }
    
    openModal({ nombre: actividad, descripcion, hora, hora_fin, puntaje, estatus, empId, tareaId, allowComplete: false });
  });

  // 👉 Click en encabezados → profile-menu (solo para administradores)
  DOM.theadRow?.addEventListener('click', (e) => {
    const th = e.target.closest('th');
    if (!th || th.cellIndex < 3) return;

    // 🔥 Sin paginación, el índice es directo: cellIndex - 3
    const idx = th.cellIndex - 3;
    const trabajador = state.trabajadores[idx];
    if (!trabajador) return;

    // Verificar si el usuario es administrador o supervisor
    const loggedUserString = localStorage.getItem('loggedUser');
    const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };
    
    // Solo los administradores y supervisores pueden abrir el modal de opciones
    if (!loggedUser || (loggedUser.role !== 'admin' && loggedUser.role !== 'supervisor')) {
      // Mostrar mensaje informativo para no administradores
      showToast(`Información: ${trabajador.nombre} - ${trabajador.puesto || 'Sin puesto'}`, 'info', 3000);
      return;
    }

    // Evitar que el click burbujee al document y cierre el modal inmediatamente
    e.stopPropagation();
    // Guardar contexto y abrir modal centrado con opciones (crear/editar/info)
    menuContext = { empId: trabajador.id, empName: trabajador.nombre };
    showWorkerModal(trabajador);
  });

  // 👉 Clicks fuera / scroll / resize / ESC → cerrar menús
  document.addEventListener('click', (e) => {
    if (DOM.cellMenu && !DOM.cellMenu.classList.contains('hidden') && !DOM.cellMenu.contains(e.target)) hideCellMenu();
    if (DOM.profileMenu && !DOM.profileMenu.classList.contains('pm-hidden') && !DOM.profileMenu.contains(e.target)) hideProfileMenu();
    // Cerrar modal de trabajador si se hace click fuera
    if (DOM.createTaskModal && !DOM.createTaskModal.classList.contains('hidden') && !DOM.createTaskModal.contains(e.target)) hideWorkerModal();
  });
  DOM.tableWrapper?.addEventListener('scroll', () => { hideCellMenu(); hideProfileMenu(); });
  window.addEventListener('resize', () => { hideCellMenu(); hideProfileMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hideCellMenu(); hideProfileMenu(); } });

  // Cerrar worker modal con Escape
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideWorkerModal(); });

  // 👉 Acciones cell-menu
  DOM.cellMenu?.addEventListener('click', (e) => {
    const btn = e.target.closest('.menu-item');
    if (btn) handleCellMenuAction(btn.dataset.action);
  });

  // 👉 Acciones profile-menu
  document.querySelectorAll('#profile-menu .menu-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!menuContext) return;
      switch (btn.dataset.action) {
        case 'emp-info':
          // console.log(`ℹ️ Info: ${menuContext.empName} (ID: ${menuContext.empId})`);
          break;
        case 'emp-create':
          abrirFormularioCrearTarea(menuContext.empId, menuContext.empName);
          break;
        case 'emp-edit':
          // console.log(`✏️ Editar: ${menuContext.empName}`);
          break;
        case 'emp-delete':
          deleteEmployee(menuContext.empId, menuContext.empName);
          break;
        case 'close':
          // Simplemente cerrar el menú
          break;
      }
      hideProfileMenu();
    });
  });

  // 👉 Modal de tarea
  DOM.modalClose?.addEventListener('click', closeModal);
  DOM.modalCloseBtn?.addEventListener('click', closeModal);
  // 🔥 COMENTADO: El onclick se asigna dinámicamente en openTaskModal (línea 3565+)
  // DOM.modalCompleteBtn?.addEventListener('click', () => { console.log('✅ Completada'); closeModal(); });
  
  // 👉 Modal de PIN
  const pinModalClose = document.getElementById('pin-modal-close');
  pinModalClose?.addEventListener('click', closePinModal);
}

/* Helpers profile-menu */
function showProfileMenu(x, y) {
  if (!DOM.profileMenu) return;
  
  // Verificar rol del usuario
  const loggedUserString = localStorage.getItem('loggedUser');
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };
  const isAdmin = loggedUser.role === 'admin' || loggedUser.role === 'supervisor';
  
  // Mostrar/ocultar botón de eliminar según el rol
  const deleteBtn = DOM.profileMenu.querySelector('[data-action="emp-delete"]');
  if (deleteBtn) {
    deleteBtn.style.display = isAdmin ? 'block' : 'none';
  }
  
  DOM.profileMenu.style.left = `${x}px`;
  DOM.profileMenu.style.top = `${y}px`;
  DOM.profileMenu.classList.remove('pm-hidden');
  DOM.profileMenu.classList.add('show');
}
function hideProfileMenu() {
  if (!DOM.profileMenu) return;
  DOM.profileMenu.classList.add('pm-hidden');
  DOM.profileMenu.classList.remove('show');
}

// Mostrar modal con opciones al hacer click en el header del trabajador
/**
 * showWorkerModal(trabajador)
 * Muestra un modal con opciones para el trabajador (Crear tarea, Editar, Info)
 * Utilizado al hacer click en el encabezado del trabajador.
 */
function showWorkerModal(trabajador) {
  const modal = DOM.createTaskModal;
  if (!modal) {
    // fallback a profile menu si el modal no existe
    // console.log(`Opciones para ${trabajador.nombre}: Crear / Editar / Info`);
    return;
  }

  // Vaciar y construir contenido simple dentro del modal
  modal.innerHTML = '';
  modal.classList.remove('hidden');
  modal.classList.add('worker-options-modal');

  const wrapper = document.createElement('div');
  wrapper.className = 'modal-content';
  
  // Evitar que clicks dentro del modal cierren el modal por el listener global
  wrapper.addEventListener('click', (ev) => ev.stopPropagation());

  // Header del modal
  const header = document.createElement('div');
  header.className = 'worker-options-header';
  
  const title = document.createElement('h3');
  title.className = 'worker-options-title';
  title.textContent = `Opciones: ${trabajador.nombre}`;
  header.appendChild(title);

  // Botón X para cerrar
  const closeXBtn = document.createElement('button');
  closeXBtn.type = 'button';
  closeXBtn.innerHTML = '&times;';
  closeXBtn.className = 'worker-options-close';
  closeXBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // console.log('🔴 Cerrando modal de opciones del trabajador');
    hideWorkerModal();
  });
  header.appendChild(closeXBtn);
  wrapper.appendChild(header);

  // Body con los botones
  const body = document.createElement('div');
  body.className = 'worker-options-body';

  const btnCrear = document.createElement('button');
  btnCrear.type = 'button';
  btnCrear.innerHTML = '<span class="option-icon">➕</span> Crear Tarea';
  btnCrear.className = 'worker-option-btn';
  btnCrear.addEventListener('click', () => {
    // Reusar handler existente para crear tarea. Si la referencia no existe
    // tratamos de cargar el módulo dinámicamente (más tolerante a rutas)
    (async () => {
      // console.log('Crear Tarea clicked. abrirFormularioCrearTarea typeof =', typeof abrirFormularioCrearTarea);
      try {
        if (typeof abrirFormularioCrearTarea === 'function') {
          abrirFormularioCrearTarea(trabajador.id, trabajador.nombre);
          return;
        }
        // Intentar import dinámico como fallback
        const mod = await import('../Gestion/Editar Empleado/Crear tareas/crear_tarea.js');
        const fn = mod.abrirFormularioCrearTarea || mod.default;
        if (typeof fn === 'function') {
          fn(trabajador.id, trabajador.nombre);
        } else {
          console.error('Módulo cargado pero no contiene abrirFormularioCrearTarea', mod);
          // console.log('No se encontró la función abrirFormularioCrearTarea en el módulo importado.');
        }
      } catch (err) {
        console.error('Error al invocar abrirFormularioCrearTarea:', err);
        // console.log('Error al abrir el formulario de creación de tarea:\n' + (err && err.message ? err.message : String(err)));
      }
    })();
  });
  body.appendChild(btnCrear);

  const btnEditarTareas = document.createElement('button');
  btnEditarTareas.type = 'button';
  btnEditarTareas.innerHTML = '<span class="option-icon">✏️</span> Editar Tareas';
  btnEditarTareas.className = 'worker-option-btn';
  btnEditarTareas.addEventListener('click', () => {
    // Establecer el contexto del empleado para el módulo de edición
    window.empleadoSeleccionadoID = trabajador.id;
    
    (async () => {
      try {
        // Importar y ejecutar la lógica de edición de tareas (con cache bust)
        const mod = await import('../Gestion/Editar Empleado/Editar Tarea/editar_tarea.js?v=' + Date.now());
        if (typeof mod.mostrar_edit === 'function') {
          hideWorkerModal(); // Cerrar el modal de opciones
          
          // Crear o mostrar el modal de edición de tareas
          let editModal = document.getElementById('modal-edit-task');
          if (!editModal) {
            editModal = document.createElement('div');
            editModal.id = 'modal-edit-task';
            editModal.className = 'modal';
            editModal.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0, 0, 0, 0.5);
              backdrop-filter: blur(4px);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 1000;
            `;
            document.body.appendChild(editModal);
            
            // Cerrar modal al hacer click fuera
            editModal.addEventListener('click', (e) => {
              if (e.target === editModal) {
                editModal.classList.remove('active');
                editModal.style.display = 'none';
              }
            });
          }
          
          editModal.classList.add('active');
          editModal.style.display = 'flex';
          
          // Llamar a la función de mostrar edición
          mod.mostrar_edit();
        } else {
          console.error('Función mostrar_edit no encontrada en el módulo');
          // console.log('Error: No se pudo cargar el editor de tareas');
        }
      } catch (err) {
        console.error('Error al cargar el módulo de edición de tareas:', err);
        // console.log('Error al abrir el editor de tareas:\n' + (err?.message || String(err)));
      }
    })();
  });
  body.appendChild(btnEditarTareas);

  const btnInfo = document.createElement('button');
  btnInfo.type = 'button';
  btnInfo.innerHTML = '<span class="option-icon">👤</span> Ver/Editar Información';
  btnInfo.className = 'worker-option-btn';
  btnInfo.addEventListener('click', () => {
    // Establecer el contexto del empleado para el módulo unificado
    window.empleadoSeleccionadoID = trabajador.id;
    
    (async () => {
      try {
        hideWorkerModal(); // Cerrar el modal de opciones
        
        // Mostrar el modal unificado de información/edición
        await mostrarInfoEditarEmpleado(trabajador);
      } catch (err) {
        console.error('Error al abrir la información del empleado:', err);
        // console.log('Error al abrir la información del empleado:\n' + (err?.message || String(err)));
      }
    })();
  });
  body.appendChild(btnInfo);

  // 🔥 Botón eliminar (solo para admin/supervisor)
  const loggedUserString = localStorage.getItem('loggedUser');
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };
  const isAdmin = loggedUser.role === 'admin' || loggedUser.role === 'supervisor';
  
  if (isAdmin) {
    const btnEliminar = document.createElement('button');
    btnEliminar.type = 'button';
    btnEliminar.innerHTML = '<span class="option-icon">🗑️</span> Eliminar Empleado';
    btnEliminar.className = 'worker-option-btn btn-delete';
    btnEliminar.addEventListener('click', () => {
      hideWorkerModal();
      deleteEmployee(trabajador.id, trabajador.nombre);
    });
    body.appendChild(btnEliminar);
  }

  // Botón cerrar
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.innerHTML = 'Cerrar';
  closeBtn.className = 'worker-option-btn btn-close';
  closeBtn.addEventListener('click', hideWorkerModal);
  body.appendChild(closeBtn);

  wrapper.appendChild(body);
  modal.appendChild(wrapper);
  
  // Cerrar modal al hacer click fuera del wrapper
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      // console.log('🔴 Cerrando modal por click fuera');
      hideWorkerModal();
    }
  });
}

/**
 * hideWorkerModal()
 * Cierra y limpia el modal de opciones del trabajador.
 */
function hideWorkerModal() {
  const modal = DOM.createTaskModal;
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('worker-options-modal');
  modal.innerHTML = '';
}

/**
 * mostrarInfoEditarEmpleado(trabajador)
 * Muestra un modal unificado que permite ver y editar la información del empleado inline
 */
async function mostrarInfoEditarEmpleado(trabajador) {
  // Crear o mostrar el modal unificado de información/edición
  let modal = document.getElementById('modal-info-edit-employee');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-info-edit-employee';
    modal.className = 'modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;
    document.body.appendChild(modal);
    
    // Cerrar modal al hacer click fuera
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  // Cargar datos actuales del empleado y reloj asignado
  let empleadoData, userData, relojesData;
  try {
    const [empResp, relojesResp] = await Promise.all([
      fetch(`/empleados/${trabajador.id}`),
      fetch('/relojes_conectados.json')
    ]);
    
     console.log('Respuestas obtenidas:', { 
      empOk: empResp.ok, 
      empStatus: empResp.status,
      relojesOk: relojesResp.ok 
    });
    
    empleadoData = empResp.ok ? await empResp.json() : trabajador;
    
    // 🔥 Obtener datos de usuario desde empleadoData (ya tiene username, role, pin, password)
    userData = {
      username: empleadoData.username || trabajador.username,
      role: empleadoData.role_dp || empleadoData.role || trabajador.role_dp
    };
    
    // Para relojesData, manejar errores de JSON malformado
    if (relojesResp.ok) {
      try {
        const relojesText = await relojesResp.text();
        try {
          relojesData = JSON.parse(relojesText);
          // console.log('✅ Relojes JSON parseado correctamente');
        } catch (parseErr) {
          console.error('❌ Error parseando relojes_conectados.json:', parseErr.message);
          console.error('Texto del JSON:', relojesText.substring(0, 300));
          relojesData = [];
        }
      } catch (textErr) {
        console.error('Error obteniendo texto de relojes:', textErr);
        relojesData = [];
      }
    } else {
      console.warn('Error al obtener relojes_conectados.json:', relojesResp.status);
      relojesData = [];
    }
    
     console.log('Datos cargados:', { 
      empleadoData, 
      userData, 
      trabajadorOriginal: trabajador 
    });
  } catch (err) {
    console.error('Error cargando datos del empleado:', err);
    empleadoData = trabajador;
    userData = {};
    relojesData = [];
  }

  // Determinar reloj asignado
  const empleadoIdStr = String(empleadoData.id ?? empleadoData._id ?? empleadoData.empleado_id);
  const relojAsignado = relojesData.find(r => String(r.empleado_id) === empleadoIdStr);

  modal.innerHTML = `
    <div class="info-edit-modal-container" style="
      background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
      padding: 0;
      border-radius: 16px;
      width: 95%;
      max-width: 950px;
      max-height: 85vh;
      overflow: hidden;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      animation: modalSlideIn 0.3s ease-out;
    ">
      <!-- Header con gradiente -->
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h2 style="margin: 0; color: #ffffff; font-size: 1.25rem; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
          Información del Empleado
        </h2>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button class="toggle-edit-btn" style="
            padding: 10px 18px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            backdrop-filter: blur(4px);
          " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
            ✏️ Editar
          </button>
          <button class="close-modal" style="
            background: rgba(255, 255, 255, 0.15);
            border: none;
            font-size: 22px;
            cursor: pointer;
            color: white;
            width: 34px;
            height: 34px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">&times;</button>
        </div>
      </div>
      
      <!-- Contenido con scroll -->
      <div style="padding: 16px 24px; max-height: calc(85vh - 70px); overflow-y: auto;">
        <!-- Layout horizontal: Imagen a la izquierda, datos a la derecha -->
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: start;">
          <!-- Imagen del empleado -->
          <div style="text-align: center;">
            ${empleadoData.imagen ? `
              <img src="/web/Images/${empleadoData.imagen}" alt="${empleadoData.nombre}" 
                   style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #e8eaed; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            ` : `
              <div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #f5f7fa 0%, #e8eaed 100%); border: 3px solid #e8eaed; 
                          display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                👤
              </div>
            `}
            <div class="edit-image-section" style="display: none; margin-top: 10px;">
              <label for="edit-imagen-input" class="file-upload-label" style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); text-align: center; width: 100%; box-sizing: border-box;">
                <span class="file-upload-text" style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <span style="font-size: 1rem;">📷</span>
                  <span>Subir imagen</span>
                </span>
              </label>
              <input type="file" id="edit-imagen-input" class="edit-imagen" accept="image/*" style="display: none;">
              <span id="edit-file-name-display" style="font-size: 0.75rem; color: #666; margin-top: 6px; display: block; text-align: center;"></span>
            </div>
          </div>

          <!-- Formulario de datos -->
          <div>
            <form id="info-edit-form">
              ${!userData.username && !userData.role ? `
              <div style="background: linear-gradient(135deg, #fff3cd 0%, #fffaeb 100%); border: 2px solid #ffc107; border-radius: 10px; padding: 12px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 22px;">⚠️</span>
                  <div>
                    <strong style="color: #856404; font-size: 13px;">Usuario no encontrado</strong>
                    <p style="margin: 4px 0 0 0; color: #856404; font-size: 12px;">
                      Este empleado no tiene un usuario asociado en el sistema.
                    </p>
                  </div>
                </div>
              </div>
              ` : ''}
              
              <!-- Primera fila: Nombre, Puesto, Usuario, Rol -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 14px;">
                <!-- Nombre -->
                <div class="info-field">
                  <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444444; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Nombre:
                  </label>
                  <div class="field-display" style="padding: 10px 12px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border: 2px solid #e8eaed; border-radius: 8px; color: #333333; min-height: 18px; font-size: 14px;">
                    ${empleadoData.nombre || 'No especificado'}
                  </div>
                  <input type="text" class="field-edit" name="nombre" value="${empleadoData.nombre || ''}" 
                         style="display: none; width: 100%; padding: 10px; border: 2px solid #667eea; border-radius: 8px; font-size: 14px; box-sizing: border-box;" required>
                </div>
                
                <!-- Puesto -->
                <div class="info-field">
                  <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444444; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Puesto:
                  </label>
                  <div class="field-display" style="padding: 10px 12px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border: 2px solid #e8eaed; border-radius: 8px; color: #333333; min-height: 18px; font-size: 14px;">
                    ${empleadoData.puesto || 'No especificado'}
                  </div>
                  <input type="text" class="field-edit" name="puesto" value="${empleadoData.puesto || ''}" 
                         style="display: none; width: 100%; padding: 10px; border: 2px solid #667eea; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
                </div>

                <!-- Usuario -->
                <div class="info-field">
                  <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444444; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Usuario:
                  </label>
                  <div class="field-display" style="padding: 10px 12px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border: 2px solid #e8eaed; border-radius: 8px; color: #333333; min-height: 18px; font-size: 14px;">
                    ${userData.username || '<span style="color: #dc3545; font-size: 12px;">⚠️ No encontrado</span>'}
                  </div>
                  <input type="text" class="field-edit" name="username" value="${userData.username || ''}" 
                         style="display: none; width: 100%; padding: 10px; border: 2px solid #667eea; border-radius: 8px; font-size: 14px; box-sizing: border-box;" required>
                </div>
                
                <!-- Rol -->
                <div class="info-field">
                  <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444444; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Rol:
                  </label>
                  <div class="field-display" style="padding: 6px 10px; border-radius: 8px; min-height: 18px;">
                    <span style="
                      padding: 6px 12px;
                      border-radius: 6px;
                      font-size: 12px;
                      font-weight: 600;
                      color: white;
                      background: ${userData.role ? (userData.role === 'admin' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : userData.role === 'supervisor' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : userData.role === 'empleado' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#6c757d') : '#dc3545'};
                    ">${userData.role || '⚠️ N/A'}</span>
                  </div>
                  <select class="field-edit field-edit-role" name="role" 
                          style="display: none; width: 100%; padding: 10px; border: 2px solid #667eea; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
                  </select>
                </div>
              </div>

              <!-- Segunda fila: Reloj, ID, Contraseña -->
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 14px;">
                <!-- Reloj asignado -->
                <div class="info-field">
                  <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444444; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Reloj asignado:
                  </label>
                  <div class="field-display reloj-status-container" data-empleado-id="${empleadoData.id}" style="padding: 8px 10px; border-radius: 8px; min-height: 18px;">
                    <span class="reloj-status-badge" style="
                      padding: 6px 10px;
                      border-radius: 6px;
                      background: ${relojAsignado ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'};
                      color: ${relojAsignado ? '#065f46' : '#991b1b'};
                      font-weight: 600;
                      font-size: 12px;
                      display: inline-block;
                      transition: all 0.3s ease;
                    ">${relojAsignado ? `📱 ID: ${relojAsignado.reloj_id}` : '⚠️ Sin reloj'}</span>
                  </div>
                </div>

                <!-- ID del empleado -->
                <div class="info-field">
                  <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444444; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    ID empleado:
                  </label>
                  <div class="field-display" style="padding: 10px 12px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border: 2px solid #e8eaed; border-radius: 8px; color: #333333; min-height: 18px;">
                    <span style="font-family: monospace; background: linear-gradient(135deg, #e8eaed 0%, #d1d5db 100%); padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 13px;">
                      ${empleadoData.id}
                    </span>
                  </div>
                </div>

                <!-- Nueva contraseña (solo en modo edición) -->
                <div class="password-field" style="display: none;">
                  <div class="info-field">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444444; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Nueva contraseña:
                    </label>
                    <input type="password" class="field-edit" name="password" placeholder="Opcional" 
                           style="width: 100%; padding: 10px; border: 2px solid #667eea; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
                  </div>
                </div>

                <!-- PIN y Contraseña actual (solo para admin) -->
                <div class="admin-credentials-section" style="display: none; border-top: 2px solid #e8eaed; padding-top: 14px; margin-top: 14px;">
                  <h3 style="margin: 0 0 14px 0; color: #444444; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    🔐 Credenciales (Admin)
                  </h3>
                  
                  <!-- PIN -->
                  <div class="info-field" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
                    <label style="display: block; font-weight: 600; color: #444444; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0;">
                      PIN:
                    </label>
                    <div style="display: flex; align-items: stretch; gap: 8px;">
                      <div style="flex: 1; padding: 12px 14px; background: linear-gradient(135deg, #fef3c7 0%, #fef08a 100%); border: 2px solid #fcd34d; border-radius: 8px; color: #92400e; font-weight: 700; font-family: monospace; font-size: 18px; display: flex; align-items: center; justify-content: center; min-height: 44px;">
                        <span class="admin-pin-display">****</span>
                      </div>
                      <button type="button" class="toggle-pin-btn" style="
                        padding: 0 12px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 18px;
                        font-weight: 600;
                        transition: all 0.2s ease;
                        min-width: 44px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                      " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(102,126,234,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(102,126,234,0.3)'" title="Mostrar/Ocultar PIN">👁️</button>
                    </div>
                  </div>

                  <!-- Contraseña actual -->
                  <div class="info-field" style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="display: block; font-weight: 600; color: #444444; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0;">
                      Contraseña:
                    </label>
                    <div style="display: flex; align-items: stretch; gap: 8px;">
                      <div style="flex: 1; padding: 12px 14px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #93c5fd; border-radius: 8px; color: #1e40af; font-weight: 600; font-family: monospace; font-size: 14px; display: flex; align-items: center; justify-content: flex-start; min-height: 44px; overflow-x: auto; overflow-y: hidden; white-space: nowrap;">
                        <span class="admin-password-display">••••••••</span>
                      </div>
                      <button type="button" class="toggle-password-btn" style="
                        padding: 0 12px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 18px;
                        font-weight: 600;
                        transition: all 0.2s ease;
                        min-width: 44px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                        flex-shrink: 0;
                      " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(102,126,234,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(102,126,234,0.3)'" title="Mostrar/Ocultar Contraseña">👁️</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Botones de acción (solo en modo edición) -->
              <div class="action-buttons" style="display: none; justify-content: space-between; gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 2px solid #e8eaed;">
                <button type="button" class="delete-employee-btn" style="
                  padding: 10px 18px;
                  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                  color: white;
                  border: none;
                  border-radius: 8px;
                  font-size: 13px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  box-shadow: 0 3px 10px rgba(220, 53, 69, 0.35);
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 16px rgba(220,53,69,0.45)'" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 10px rgba(220,53,69,0.35)'">
                  🗑️ Eliminar
                </button>
                <div style="display: flex; gap: 10px;">
                  <button type="button" class="cancel-btn" style="
                    padding: 10px 18px;
                    background: #f1f3f4;
                    color: #5f6368;
                    border: 2px solid #dadce0;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                  " onmouseover="this.style.background='#e8eaed'; this.style.color='#333'" onmouseout="this.style.background='#f1f3f4'; this.style.color='#5f6368'">
                    Cancelar
                  </button>
                  <button type="submit" class="save-btn" style="
                    padding: 10px 18px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 3px 10px rgba(102, 126, 234, 0.35);
                  " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 16px rgba(102,126,234,0.45)'" 
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 10px rgba(102,126,234,0.35)'">
                    💾 Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  // Agregar eventos para la funcionalidad de edición inline
  const closeBtn = modal.querySelector('.close-modal');
  const toggleEditBtn = modal.querySelector('.toggle-edit-btn');
  const cancelBtn = modal.querySelector('.cancel-btn');
  const form = modal.querySelector('#info-edit-form');
  const fieldDisplays = modal.querySelectorAll('.field-display');
  const fieldEdits = modal.querySelectorAll('.field-edit');
  const passwordField = modal.querySelector('.password-field');
  const actionButtons = modal.querySelector('.action-buttons');
  const editImageSection = modal.querySelector('.edit-image-section');
  const roleSelect = modal.querySelector('.field-edit-role');

  // 🔥 Evento para mostrar nombre del archivo seleccionado
  const editImagenInput = modal.querySelector('.edit-imagen');
  const editFileNameDisplay = modal.querySelector('#edit-file-name-display');
  
  if (editImagenInput && editFileNameDisplay) {
    editImagenInput.addEventListener('change', function(e) {
      if (this.files && this.files[0]) {
        editFileNameDisplay.textContent = `📷 ${this.files[0].name}`;
        editFileNameDisplay.style.color = '#667eea';
      } else {
        editFileNameDisplay.textContent = '';
      }
    });
  }

  // 🔥 Configurar dinámicamente las opciones del rol según el usuario logueado
  const loggedUserString = localStorage.getItem('loggedUser');
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };
  
  if (roleSelect) {
    roleSelect.innerHTML = ''; // Limpiar opciones anteriores
    
    if (loggedUser.role === 'admin') {
      // Admin puede cambiar a cualquier rol
      const optEmpleado = document.createElement('option');
      optEmpleado.value = 'empleado';
      optEmpleado.textContent = 'Empleado';
      optEmpleado.selected = userData.role === 'empleado';
      roleSelect.appendChild(optEmpleado);
      
      const optSupervisor = document.createElement('option');
      optSupervisor.value = 'supervisor';
      optSupervisor.textContent = 'Supervisor';
      optSupervisor.selected = userData.role === 'supervisor';
      roleSelect.appendChild(optSupervisor);
      
      const optAdmin = document.createElement('option');
      optAdmin.value = 'admin';
      optAdmin.textContent = 'Administrador';
      optAdmin.selected = userData.role === 'admin';
      roleSelect.appendChild(optAdmin);
    } else if (loggedUser.role === 'supervisor') {
      // Supervisor solo puede tener empleados (campo fijo)
      const optEmpleado = document.createElement('option');
      optEmpleado.value = 'empleado';
      optEmpleado.textContent = 'Empleado';
      optEmpleado.selected = true;
      optEmpleado.disabled = true; // Campo fijo, no puede cambiar
      roleSelect.appendChild(optEmpleado);
      roleSelect.disabled = true; // Deshabilitar todo el select
    } else {
      // Otros roles (fallback)
      const optEmpleado = document.createElement('option');
      optEmpleado.value = 'empleado';
      optEmpleado.textContent = 'Empleado';
      optEmpleado.selected = true;
      roleSelect.appendChild(optEmpleado);
    }
  }

  // 🔐 Configurar sección de credenciales (PIN y Contraseña) - Solo para admin
  const adminCredentialsSection = modal.querySelector('.admin-credentials-section');
  const togglePinBtn = modal.querySelector('.toggle-pin-btn');
  const togglePasswordBtn = modal.querySelector('.toggle-password-btn');
  const adminPinDisplay = modal.querySelector('.admin-pin-display');
  const adminPasswordDisplay = modal.querySelector('.admin-password-display');
  
  if (loggedUser.role === 'admin' && adminCredentialsSection) {
    // Mostrar sección para admin
    adminCredentialsSection.style.display = 'block';
    
    // 🔥 Obtener PIN y contraseña desde empleadoData (BD) en lugar de userData
    const pin = empleadoData.pin || 'N/A';
    const password = empleadoData.password || 'N/A';
    
    // console.log('🔐 Datos obtenidos - PIN:', pin, 'Password:', password);
    
    // Guardar en el elemento para poder mostrar/ocultar
    adminPinDisplay.dataset.pin = pin;
    adminPasswordDisplay.dataset.password = password;
    
    // Mostrar PIN por defecto oculto
    adminPinDisplay.textContent = '****';
    
    // Mostrar contraseña por defecto encriptada (puntos iguales a la longitud)
    if (password && password !== 'N/A') {
      adminPasswordDisplay.textContent = '•'.repeat(password.length);
    } else {
      adminPasswordDisplay.textContent = 'N/A';
    }
    
    // Evento para toggle del PIN
    if (togglePinBtn && adminPinDisplay) {
      let pinVisible = false;
      togglePinBtn.addEventListener('click', () => {
        pinVisible = !pinVisible;
        adminPinDisplay.textContent = pinVisible ? adminPinDisplay.dataset.pin : '****';
        togglePinBtn.style.background = pinVisible ? '#10b981' : '#667eea';
      });
    }
    
    // Evento para toggle de la contraseña - MOSTRAR/OCULTAR LA VERDADERA CONTRASEÑA
    if (togglePasswordBtn && adminPasswordDisplay) {
      let passwordVisible = false;
      
      // Obtener la contraseña hasheada del BD (empleadoData.password)
      const passwordHashFromBD = password; // Ya declarada como const en línea 1701
      const passwordLength = passwordHashFromBD && passwordHashFromBD !== 'N/A' ? passwordHashFromBD.length : 3;
      
      togglePasswordBtn.addEventListener('click', () => {
        passwordVisible = !passwordVisible;
        
        if (passwordVisible) {
          // Mostrar la contraseña hasheada (del BD)
          adminPasswordDisplay.textContent = passwordHashFromBD;
          adminPasswordDisplay.style.letterSpacing = '0px';
          adminPasswordDisplay.style.fontFamily = 'monospace';
          adminPasswordDisplay.style.wordBreak = 'break-all';
          togglePasswordBtn.style.background = '#10b981';
          togglePasswordBtn.title = 'Contraseña visible';
        } else {
          // Ocultar - mostrar puntos encriptados (mismo tamaño que el hash)
          adminPasswordDisplay.textContent = '•'.repeat(passwordLength);
          adminPasswordDisplay.style.letterSpacing = '0px';
          togglePasswordBtn.style.background = '#667eea';
          togglePasswordBtn.title = 'Contraseña oculta';
        }
      });
    }
  }

  let isEditing = false;

  const cerrarModal = () => {
    modal.style.display = 'none';
  };

  const toggleEditMode = () => {
    isEditing = !isEditing;
    
    if (isEditing) {
      // Entrar en modo edición
      toggleEditBtn.textContent = '👁️ Ver';
      toggleEditBtn.style.background = '#dc3545';
      toggleEditBtn.onmouseover = () => toggleEditBtn.style.background = '#c82333';
      toggleEditBtn.onmouseout = () => toggleEditBtn.style.background = '#dc3545';
      
      fieldDisplays.forEach(display => display.style.display = 'none');
      fieldEdits.forEach(edit => edit.style.display = 'block');
      passwordField.style.display = 'block';
      actionButtons.style.display = 'flex';
      editImageSection.style.display = 'block';
    } else {
      // Volver a modo visualización
      toggleEditBtn.textContent = '✏️ Editar';
      toggleEditBtn.style.background = '#28a745';
      toggleEditBtn.onmouseover = () => toggleEditBtn.style.background = '#218838';
      toggleEditBtn.onmouseout = () => toggleEditBtn.style.background = '#28a745';
      
      fieldDisplays.forEach(display => display.style.display = 'block');
      fieldEdits.forEach(edit => edit.style.display = 'none');
      passwordField.style.display = 'none';
      actionButtons.style.display = 'none';
      editImageSection.style.display = 'none';
      
      // Limpiar contraseña
      const passwordInput = form.querySelector('input[name="password"]');
      if (passwordInput) passwordInput.value = '';
    }
  };

  closeBtn.addEventListener('click', cerrarModal);
  toggleEditBtn.addEventListener('click', toggleEditMode);
  cancelBtn.addEventListener('click', () => {
    toggleEditMode(); // Volver a modo visualización
    // Restaurar valores originales
    form.querySelector('input[name="nombre"]').value = empleadoData.nombre || '';
    form.querySelector('input[name="puesto"]').value = empleadoData.puesto || '';
    form.querySelector('input[name="username"]').value = userData.username || '';
    if (loggedUser.role === 'admin') {
      roleSelect.disabled = false;
      roleSelect.value = userData.role || 'empleado';
    } else if (loggedUser.role === 'supervisor') {
      roleSelect.value = 'empleado';
      roleSelect.disabled = true;
    }
  });

  // 🔥 NUEVO: Botón de eliminar empleado
  const deleteEmployeeBtn = modal.querySelector('.delete-employee-btn');
  deleteEmployeeBtn.addEventListener('click', async () => {
    const confirmacion = confirm(
      `⚠️ ¿Estás SEGURO de que deseas eliminar al empleado "${empleadoData.nombre}"?\n\n` +
      `Esto eliminará:\n` +
      `- El empleado y todas sus tareas\n` +
      `- Su usuario del sistema\n` +
      `- Su asignación de reloj (si tiene)\n\n` +
      `Esta acción NO se puede deshacer.`
    );
    
    if (!confirmacion) return;

    // Doble confirmación
    const confirmacionFinal = confirm(
      `🚨 ÚLTIMA CONFIRMACIÓN\n\n` +
      `Escribirás "ELIMINAR" para confirmar que deseas borrar permanentemente a "${empleadoData.nombre}".\n\n` +
      `¿Continuar con la eliminación?`
    );

    if (!confirmacionFinal) return;

    try {
      deleteEmployeeBtn.disabled = true;
      deleteEmployeeBtn.textContent = 'Eliminando...';
      deleteEmployeeBtn.style.background = '#6c757d';

      // Llamar al endpoint de eliminación
      const response = await fetch(`/empleados/${trabajador.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error del servidor: ${errorData}`);
      }

      showToast(`Empleado "${empleadoData.nombre}" eliminado correctamente`, 'success', 4000);
      cerrarModal();

      // 🔥 NUEVO: Auto-reload después de eliminar empleado para refrescar toda la interfaz
      setTimeout(() => {
        location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error al eliminar empleado:', error);
      showToast('Error al eliminar el empleado: ' + error.message, 'error', 5000);
      
      // Restaurar botón
      deleteEmployeeBtn.disabled = false;
      deleteEmployeeBtn.textContent = '🗑️ Eliminar Empleado';
      deleteEmployeeBtn.style.background = '#dc3545';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isEditing) return; // Solo procesar si estamos en modo edición
    
    const submitBtn = form.querySelector('.save-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '💾 Guardando...';
    submitBtn.disabled = true;
    
    try {
      const formData = new FormData(form);
      
      // Preparar datos del empleado (incluyendo username, role y password)
      const empleadoData = {
        nombre: formData.get('nombre'),
        puesto: formData.get('puesto'),
        username: formData.get('username'),
        role: formData.get('role')
      };

      // 🔥 VALIDACIÓN: Supervisor no puede cambiar roles
      if (loggedUser.role === 'supervisor' && empleadoData.role !== 'empleado') {
        showToast('❌ Los supervisores solo pueden crear empleados. El rol será fijado como "empleado"', 'error', 4000);
        empleadoData.role = 'empleado'; // Forzar a empleado
      }
      
      // Agregar contraseña si se proporciona una nueva
      const password = formData.get('password');
      if (password && password.trim()) {
        empleadoData.password = password.trim();
      }
      
      // Actualizar datos del empleado EN UN SOLO ENDPOINT
      const empResponse = await fetch(`/empleados/${trabajador.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(empleadoData)
      });
      
      if (!empResponse.ok) {
        const errorData = await empResponse.text();
        throw new Error(`Error al actualizar empleado: ${errorData}`);
      }
      
      // 🔥 La actualización de usuario (username, role, password) se hace directamente en /empleados/{id}
      // No necesitamos un segundo endpoint /users/update/{id}
      // El empleadoData ya incluye los campos actualizados
      
      // Si hay imagen nueva, manejarla
      const imageFile = modal.querySelector('.edit-imagen').files[0];
      if (imageFile) {
        // Por ahora, mostrar una advertencia ya que necesitamos implementar la actualización de imágenes
        console.warn('Actualización de imagen pendiente de implementar en el backend');
      }
      
      showToast('Información del empleado actualizada correctamente', 'success', 3000);
      
      // Actualizar los valores mostrados en la vista
      modal.querySelector('.field-display').textContent = empleadoData.nombre;
      const displays = modal.querySelectorAll('.field-display');
      displays[0].textContent = empleadoData.nombre;
      displays[1].textContent = empleadoData.puesto;
      displays[2].textContent = userData.username;
      
      // Actualizar el badge del rol
      const roleBadge = displays[3].querySelector('span');
      if (roleBadge) {
        roleBadge.textContent = userData.role;
        roleBadge.style.background = userData.role === 'admin' ? '#007bff' : userData.role === 'supervisor' ? '#ff9800' : '#28a745';
      }
      
      // Volver a modo visualización
      toggleEditMode();
      
    } catch (err) {
      console.error('Error al actualizar empleado:', err);
      showToast('Error al actualizar la información: ' + err.message, 'error', 5000);
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  modal.style.display = 'flex';

  // 🔥 NUEVO: Polling dinámico del estado del reloj conectado
  const relojStatusContainer = modal.querySelector('.reloj-status-container');
  const relojStatusBadge = modal.querySelector('.reloj-status-badge');
  
  if (relojStatusContainer) {
    let pollingInterval = null;
    
    const actualizarEstadoReloj = async () => {
      try {
        const response = await fetch(`/api/reloj/empleado/${empleadoData.id}`);
        if (!response.ok) return;
        
        const data = await response.json();
        
        // Determinar el nuevo estado
        const relojConectado = data.conectado;
        const relojId = data.reloj_id;
        
        if (relojConectado && relojId) {
          // Reloj CONECTADO - Verde
          relojStatusBadge.style.background = 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)';
          relojStatusBadge.style.color = '#065f46';
          relojStatusBadge.textContent = `✅ Conectado a: ${relojId}`;
        } else if (relojId && !relojConectado) {
          // Reloj ASIGNADO pero DESCONECTADO - Amarillo
          relojStatusBadge.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fef08a 100%)';
          relojStatusBadge.style.color = '#92400e';
          relojStatusBadge.textContent = `⚠️ Asignado: ${relojId} (desconectado)`;
        } else {
          // SIN RELOJ - Rojo
          relojStatusBadge.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
          relojStatusBadge.style.color = '#991b1b';
          relojStatusBadge.textContent = '⚠️ Sin reloj asignado';
        }
      } catch (err) {
        console.error('Error actualizando estado del reloj:', err);
      }
    };
    
    // Ejecutar inmediatamente y luego cada 3 segundos
    actualizarEstadoReloj();
    pollingInterval = setInterval(actualizarEstadoReloj, 3000);
    
    // Limpiar el intervalo cuando se cierra el modal
    const originalCerrarModal = cerrarModal;
    cerrarModal = () => {
      if (pollingInterval) clearInterval(pollingInterval);
      originalCerrarModal();
    };
  }
}




/* Render principal */
/**
 * renderForCurrentState()
 * Orquesta el renderizado completo basado en `state`:
 * - construye encabezado y filas visibles
 * - centra en la hora actual si corresponde
 * - actualiza KPI y controles de paginación
 */
function renderForCurrentState() {
  const dayName = diasSemana[state.currentDayIndex];
  
  // 🔥 CALCULAR FECHA COMPLETA DEL DÍA MOSTRADO
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDayIndex = today.getDay();
  
  let dayDiff = state.currentDayIndex - todayDayIndex;
  if (state.currentDayIndex < todayDayIndex) {
    dayDiff += 7;
  }
  
  const displayedDate = new Date(today);
  displayedDate.setDate(today.getDate() + dayDiff);
  
  // Formatear fecha completa: "JUEVES 11 DE DICIEMBRE"
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const diaNumero = displayedDate.getDate();
  const mesNombre = meses[displayedDate.getMonth()];
  const fechaCompleta = `${dayName.toUpperCase()} ${diaNumero} DE ${mesNombre}`;
  
  if (DOM.tasksDayLabel) DOM.tasksDayLabel.textContent = fechaCompleta;

  if (!DOM.theadRow || !DOM.tbody) return;
  DOM.theadRow.textContent = '';
  DOM.tbody.textContent = '';

  // 🔥 Mostrar TODOS los trabajadores (sin paginación)
  const visibleTrabajadores = state.trabajadores;
  buildHeader(visibleTrabajadores);

  const actividades = collectActivitiesForDay(dayName);
  const rowsData = actividades.sort((a, b) => compareHour(a.hora, b.hora) || a.nombre.localeCompare(b.nombre));
  state.lastRowsData = rowsData;

  // Reutilizamos un solo "now"
  const now = new Date();
  const isToday = state.currentDayIndex === now.getDay();
  
  // 🔥 NUEVO: Mostrar mensaje si no hay tareas
  if (rowsData.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = visibleTrabajadores.length + 3; // Horario + Actividad + Puntos + Empleados
    td.style.textAlign = 'center';
    td.style.padding = '60px 20px';
    td.style.fontSize = '1.2rem';
    td.style.color = '#999';
    td.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 11l3 3L22 4"></path>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
        </svg>
        <div style="font-weight: 600; color: #666;">No hay tareas programadas para ${dayName}</div>
        <div style="font-size: 0.9rem; color: #aaa;">Este día está libre de actividades</div>
      </div>
    `;
    tr.appendChild(td);
    DOM.tbody.appendChild(tr);
  } else {
    buildRows(rowsData, visibleTrabajadores, isToday, now);
    // mergeCells(0); // 🔥 DESHABILITADO: No fusionar para que cada tarea tenga su propia celda de horario
  }
  
  updateClockVisibility();

  centerOnCurrentTime({ forceScroll: true, now });
  adjustCenterBandHeight();

  // KPI
  updateTaskProgressWidget();

  // Paginación
  if (DOM.prevEmpBtn) DOM.prevEmpBtn.disabled = (state.currentEmpPage <= 0);
  if (DOM.nextEmpBtn) DOM.nextEmpBtn.disabled = (state.currentEmpPage >= getMaxPage());
}

/* Encabezado */
/**
 * calculateEmployeePoints(empleado, dayName, now)
 * Calcula los puntos individuales de un empleado para el día mostrado
 * Similar a la lógica de updateTaskProgressWidget pero para un solo empleado
 * 
 * Retorna:
 * - completados: Puntos de tareas normales completadas (estatus 3) SIN incluir extras
 * - totales: Puntos totales de tareas normales (sin extras)
 * - extras: Puntos de tareas extras completadas (estatus 5)
 */
function calculateEmployeePoints(empleado, dayName, now) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Calcular si el día mostrado es futuro o pasado
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDayIndex = today.getDay();
  
  let dayDiff = state.currentDayIndex - todayDayIndex;
  if (state.currentDayIndex < todayDayIndex) {
    dayDiff += 7;
  }
  
  const displayedDate = new Date(today);
  displayedDate.setDate(today.getDate() + dayDiff);
  
  // 🔥 NUEVO: Convertir displayedDate a fecha string para buscar en tareas_asignadas
  const fechaKey = displayedDate.getFullYear() + '-' + 
                   String(displayedDate.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(displayedDate.getDate()).padStart(2, '0');
  
  const isFutureDate = displayedDate > today;
  const isPastDate = displayedDate < today;
  const isToday = displayedDate.getTime() === today.getTime();

  const tareasDelDia = empleado?.tareas_asignadas?.[fechaKey] || [];
  const esExtra = (t) => t && t.estatus === 5;

  let puntosCompletadosNormales = 0; // Solo tareas normales completadas (estatus 3)
  let puntosTotalesNormales = 0;     // Total de tareas normales (sin incluir extras)
  let puntosExtras = 0;              // Solo puntos de tareas extras (estatus 5)

  // Si es día futuro, retornar 0/0
  if (isFutureDate) {
    return { completados: 0, totales: 0, extras: 0 };
  }

  // 🔥 NUEVO: Detectar tareas vencidas que fueron completadas como extras por otros empleados
  // También guardar los puntos de esas tareas completadas como extras
  const tareasCompletadasComoExtras = new Map(); // ID de tarea original -> puntos completados como extra
  if (state.trabajadores && state.trabajadores.length > 0) {
    state.trabajadores.forEach(emp => {
      // Solo mirar tareas de OTROS empleados
      if (emp.id !== empleado.id) {
        const tareasDelEmpleado = emp?.tareas_asignadas?.[fechaKey] || [];
        tareasDelEmpleado.forEach(tarea => {
          if (tarea.estatus === 5 && tarea.tareaOriginalId) {
            // Esta tarea extra fue completada por otro empleado
            // Guardar que la tarea original fue completada
            tareasCompletadasComoExtras.set(Number(tarea.tareaOriginalId), {
              puntaje: parseInt(tarea.puntaje) || 0,
              completadoPor: emp.id
            });
          }
        });
      }
    });
  }

  tareasDelDia.forEach(t => {
    
    const mins = hourToMinutes(t.hora);
    const puntaje = parseInt(t.puntaje) || 0;

    if (puntaje === 0) return;

    const esTareaExtra = esExtra(t);

    // 🔥 Si esta tarea vencida fue completada como extra por otro, NO contar aquí (se contará después)
    if (t.estatus === 4 && tareasCompletadasComoExtras.has(Number(t.id))) {
      return; // No contar la vencida, pues será contada como extra completada por otro
    }

    // 🔥 SEPARAR: Tareas extras (estatus 5) van aparte
    if (esTareaExtra) {
      puntosExtras += puntaje;
      return; // No contar extras en totales/completados normales
    }

    // Si es día pasado, contar SOLO tareas normales (NO extras)
    if (isPastDate) {
      puntosTotalesNormales += puntaje;
      if (t.estatus === 3) { // Solo completadas (NO extras)
        puntosCompletadosNormales += puntaje;
      }
      return;
    }

    // Si es hoy, contar tareas normales cuya hora ya llegó (NO extras)
    if (isToday && !isNaN(mins) && nowMinutes >= mins) {
      puntosTotalesNormales += puntaje;
      if (t.estatus === 3) { // Solo completadas (NO extras)
        puntosCompletadosNormales += puntaje;
      }
    }
  });

  // 🔥 NUEVO: Agregar también los puntos de las tareas vencidas que fueron completadas como extras por otros
  // Estas tareas NO SE CUENTAN como completadas, pero SÍ se cuentan en el TOTAL
  tareasCompletadasComoExtras.forEach((info, tareaOriginalId) => {
    // Solo agregar si la tarea original está en este empleado y NO fue contada ya
    const tareaOriginal = tareasDelDia.find(t => Number(t.id) === tareaOriginalId);
    if (tareaOriginal) {
      // La tarea original de este empleado fue completada por otro como extra
      // Contar los puntos en el TOTAL pero NO en completados
      puntosTotalesNormales += info.puntaje;
    }
  });

  return { completados: puntosCompletadosNormales, totales: puntosTotalesNormales, extras: puntosExtras };
}

/**
 * buildHeader(visible)
 * Construye el <thead> con las columnas fijas (Horario, Actividad, Puntos)
 * y las columnas para los trabajadores visibles.
 */
function buildHeader(visible) {
  const frag = document.createDocumentFragment();

  const thHorario = document.createElement('th');
  thHorario.textContent = 'Horario';
  thHorario.setAttribute('scope', 'col');
  frag.appendChild(thHorario);

  const thActividad = document.createElement('th');
  thActividad.textContent = 'Actividad';
  thActividad.setAttribute('scope', 'col');
  frag.appendChild(thActividad);

  const thPuntos = document.createElement('th');
  thPuntos.textContent = 'Puntos';
  thPuntos.setAttribute('scope', 'col');
  frag.appendChild(thPuntos);

  const now = new Date();
  const dayName = diasSemana[state.currentDayIndex];

  visible.forEach(trab => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');

    const container = document.createElement('div');
    container.className = 'worker-header';

    const img = document.createElement('img');
    img.src = `/web/images/${trab.imagen || ''}`;
    img.alt = trab.nombre || '';
    img.onerror = function () {
      this.onerror = null;
      this.src = '/web/images/placeholder-user.png';
    };
    container.appendChild(img);

    const text = document.createElement('div');
    text.className = 'worker-text';
    const name = document.createElement('span'); name.className = 'worker-name'; name.textContent = trab.nombre || '';
    const role = document.createElement('span'); role.className = 'worker-role'; role.textContent = trab.puesto || '';
    
    // 🔥 Calcular puntos individuales (separados: normales vs extras)
    const puntos = calculateEmployeePoints(trab, dayName, now);
    
    // 🔥 NUEVO: Contenedor para las dos gráficas lado a lado
    const graficasContainer = document.createElement('div');
    graficasContainer.className = 'worker-graphics-container';
    graficasContainer.style.cssText = 'display: flex; gap: 10px; align-items: flex-start; justify-content: center; margin: 8px 0;';
    
    // ========== GRÁFICA 1: Porcentaje de tareas normales (circular) ==========
    const porcentaje = puntos.totales > 0 ? (puntos.completados / puntos.totales) * 100 : 0;
    
    // Contenedor con título para gráfica circular
    const graficaCircularWrapper = document.createElement('div');
    graficaCircularWrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 4px;';
    
    const asignadasLabel = document.createElement('span');
    asignadasLabel.style.cssText = 'font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase;';
    asignadasLabel.textContent = 'Asignadas';
    graficaCircularWrapper.appendChild(asignadasLabel);
    
    const graficaCircular = document.createElement('div');
    graficaCircular.className = 'worker-progress-chart';
    graficaCircular.style.cssText = 'position: relative; width: 50px; height: 50px;';
    
    // Crear SVG para la gráfica circular
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '50');
    svg.setAttribute('height', '50');
    svg.setAttribute('viewBox', '0 0 50 50');
    
    // Círculo de fondo
    const circleBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circleBg.setAttribute('cx', '25');
    circleBg.setAttribute('cy', '25');
    circleBg.setAttribute('r', '20');
    circleBg.setAttribute('fill', 'none');
    circleBg.setAttribute('stroke', '#eeeeee');
    circleBg.setAttribute('stroke-width', '5');
    
    // Círculo de progreso
    const circleProgress = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circleProgress.setAttribute('cx', '25');
    circleProgress.setAttribute('cy', '25');
    circleProgress.setAttribute('r', '20');
    circleProgress.setAttribute('fill', 'none');
    circleProgress.setAttribute('stroke-width', '5');
    circleProgress.setAttribute('stroke-linecap', 'round');
    circleProgress.setAttribute('transform', 'rotate(-90 25 25)');
    
    // Determinar color según porcentaje
    let strokeColor = '';
    if (porcentaje >= 91) {
      strokeColor = '#28a745'; // Verde
    } else if (porcentaje >= 81) {
      strokeColor = '#ffc107'; // Amarillo
    } else {
      strokeColor = '#dc3545'; // Rojo
    }
    circleProgress.setAttribute('stroke', strokeColor);
    
    // Calcular stroke-dasharray y stroke-dashoffset para el progreso
    const circumference = 2 * Math.PI * 20;
    const offset = circumference - (Math.min(porcentaje, 100) / 100) * circumference;
    circleProgress.setAttribute('stroke-dasharray', `${circumference}`);
    circleProgress.setAttribute('stroke-dashoffset', `${offset}`);
    
    svg.appendChild(circleBg);
    svg.appendChild(circleProgress);
    graficaCircular.appendChild(svg);
    
    // Texto del porcentaje en el centro
    const porcentajeText = document.createElement('div');
    porcentajeText.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 11px;
      font-weight: 700;
      color: ${strokeColor};
      white-space: nowrap;
      line-height: 1;
    `;
    porcentajeText.textContent = `${Math.round(porcentaje)}%`;
    graficaCircular.appendChild(porcentajeText);
    
    graficaCircularWrapper.appendChild(graficaCircular);
    graficasContainer.appendChild(graficaCircularWrapper);
    
    // ========== GRÁFICA 2: Puntos extras (badge numérico) ==========
    const badgeExtras = document.createElement('div');
    badgeExtras.className = 'worker-extras-badge';
    badgeExtras.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    `;
    
    const extrasLabel = document.createElement('span');
    extrasLabel.style.cssText = 'font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase;';
    extrasLabel.textContent = 'Extras';
    
    const extrasValue = document.createElement('span');
    extrasValue.style.cssText = `
      font-size: 16px;
      font-weight: 700;
      color: #1565c0;
      padding: 12px 8px;
      background: #e3f2fd;
      border-radius: 6px;
      min-width: 35px;
      text-align: center;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    extrasValue.textContent = puntos.extras || '0';
    
    badgeExtras.appendChild(extrasLabel);
    badgeExtras.appendChild(extrasValue);
    graficasContainer.appendChild(badgeExtras);
    
    text.appendChild(name);
    text.appendChild(graficasContainer); // Agregar las dos gráficas
    text.appendChild(role);
    container.appendChild(text);

    th.appendChild(container);
    frag.appendChild(th);
  });

  DOM.theadRow.appendChild(frag);
}

/* Memo: actividades únicas por día (precalculo) */
/**
 * buildActivitiesCache()
 * Pre-calcula una lista única de actividades por día para acelerar el render.
 * Llena `state.activitiesByDay`.
 * 
 * 🔥 CAMBIO CRÍTICO: tareas_asignadas ahora tiene FECHAS como claves
 * Se itera sobre fechas, se extrae el día de semana, y se agrupa correctamente
 */
function buildActivitiesCache() {
  state.activitiesByDay.clear();
  
   console.log('🔧 [buildActivitiesCache] Iniciando...', {
    totalTrabajadores: state.trabajadores.length,
    diasSemana: diasSemana,
    primerTrabajador: state.trabajadores[0]
  });
  
  // Inicializar mapa vacío para cada día
  const activitiesByDayTemp = {};
  for (const d of diasSemana) {
    activitiesByDayTemp[d] = new Map(); // Key -> { baseData, empIds }
  }

  // Iterar sobre todos los empleados
  for (const trab of state.trabajadores) {
    const tareas_asignadas = trab.tareas_asignadas || {};
    
    // console.log(`🔧 [buildActivitiesCache] Procesando ${trab.nombre}:`, {
      // tieneTraeasAsignadas: Object.keys(tareas_asignadas).length > 0,
      // keys: Object.keys(tareas_asignadas)
    // });
    
    // 🔥 tareas_asignadas ahora tiene FECHAS como claves (2026-01-11, 2026-01-10, etc)
    for (const [fechaKey, tareasDeEstaFecha] of Object.entries(tareas_asignadas)) {
      if (!Array.isArray(tareasDeEstaFecha)) continue;
      
      let nombreDia = null;
      
      // Detectar si la clave es una fecha (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(fechaKey)) {
        // Es una fecha, convertir a día de semana
        try {
          const [year, month, day] = fechaKey.split('-').map(Number);
          const fecha = new Date(year, month - 1, day); // mes es 0-indexed
          nombreDia = diasSemana[fecha.getDay()]; // 0=domingo, 1=lunes, etc.
          // console.log(`🔧 [buildActivitiesCache] ${trab.nombre}: fecha ${fechaKey} -> día ${nombreDia} (getDay=${fecha.getDay()}, tareas=${tareasDeEstaFecha.length})`);
        } catch (e) {
          console.warn(`Error parsing fecha ${fechaKey}:`, e);
          continue;
        }
      } else {
        // Fallback: la clave ya es un día de semana (compatibilidad)
        nombreDia = fechaKey.toLowerCase();
        // console.log(`🔧 [buildActivitiesCache] ${trab.nombre}: usando fallback, nombreDia=${nombreDia}`);
      }
      
      if (!nombreDia || !activitiesByDayTemp[nombreDia]) {
        console.warn(`⚠️  Día no válido para ${trab.nombre}: nombreDia=${nombreDia}, activitiesByDayTemp keys=${Object.keys(activitiesByDayTemp)}`);
        continue;
      }
      
      // Procesar las tareas de este día
      const activityMap = activitiesByDayTemp[nombreDia];
      
      for (const tarea of tareasDeEstaFecha) {
        // 🔥 CRÍTICO: Si es una tarea extra completada (es_extra=true O esExtra=true O estatus=5 con es_extra),
        // NO crear fila nueva - buscar la tarea original y marcar para pintar
        const esExtraCompletada = tarea.es_extra === true || tarea.es_extra === 1 || 
                                   (tarea.esExtra === true && tarea.estatus === 5);
        
        if (esExtraCompletada) {
          // Esta es una tarea completada como extra - buscar la original
          const nombreExtra = tarea.nombre || '';
          const tareaOriginalId = tarea.tarea_original_id || tarea.tareaOriginalId || null;
          
          // Buscar la tarea original en el mapa (por ID primero, luego por nombre)
          let encontrada = false;
          for (const [key, entry] of activityMap) {
            // Primero intentar por ID de tarea original
            let esLaOriginal = false;
            if (tareaOriginalId && entry.tareasOriginales) {
              esLaOriginal = entry.tareasOriginales.some(t => Number(t.id) === Number(tareaOriginalId));
            }
            // Fallback: buscar por nombre
            if (!esLaOriginal) {
              const nombreBase = entry.baseData.nombre || '';
              esLaOriginal = (nombreBase === nombreExtra);
            }
            
            if (esLaOriginal) {
              // Encontrada - agregar información de quién completó como extra
              if (!entry.extrasCompletadas) {
                entry.extrasCompletadas = [];
              }
              
              // Evitar duplicados
              const yaExiste = entry.extrasCompletadas.some(e => 
                Number(e.empId) === Number(trab.id) && e.nombre === nombreExtra
              );
              
              if (!yaExiste) {
                entry.extrasCompletadas.push({
                  empId: trab.id,
                  empNombre: trab.nombre,
                  puntaje: tarea.puntaje,
                  hora_completado: tarea.hora || tarea.hora_inicio,
                  tareaId: tarea.id,  // 🔥 ID real de la tarea extra en tareas_semanales
                  originalTaskId: tarea.tarea_original_id || tarea.tareaOriginalId,
                  nombre: nombreExtra
                });
                // console.log(`🔵 [buildActivitiesCache] Extra completada: ${trab.nombre} completó "${nombreExtra}" como extra (tareaId=${tarea.id})`);
              }
              encontrada = true;
              break;
            }
          }
          
          if (!encontrada) {
            // console.log(`⚠️ [buildActivitiesCache] No se encontró tarea original para extra "${nombreExtra}" de ${trab.nombre}`);
          }
          
          continue; // 🔥 NO crear fila nueva para tareas extras completadas
        }
        
        // 🔥 LEGACY: Manejo de extras con tareaOriginalId (para compatibilidad)
        const tieneOriginal = tarea.tareaOriginalId || tarea.tarea_original_id;
        const esExtraConId = (tarea.esExtra === true || tarea.estatus === 5) && tieneOriginal;
        
        if (esExtraConId) {
          // Esta es una tarea completada como extra - guardar para pintar después
          const originalId = tarea.tareaOriginalId || tarea.tarea_original_id;
          
          // Buscar la tarea original en el mapa
          let encontrada = false;
          for (const [key, entry] of activityMap) {
            // Buscar si alguna tarea en tareasOriginales tiene el ID original
            const tieneOriginal = entry.tareasOriginales && entry.tareasOriginales.some(t => 
              Number(t.id) === Number(originalId)
            );
            
            if (tieneOriginal) {
              // Agregar información de quién completó esta tarea como extra
              if (!entry.extrasCompletadas) {
                entry.extrasCompletadas = [];
              }
              entry.extrasCompletadas.push({
                empId: trab.id,
                empNombre: trab.nombre,
                puntaje: tarea.puntaje,
                hora_completado: tarea.hora || tarea.hora_inicio,
                tareaId: tarea.id,  // 🔥 ID real de la tarea extra en tareas_semanales
                originalTaskId: originalId
              });
              // console.log(`🔵 [buildActivitiesCache] Tarea extra de ${trab.nombre} vinculada a original ${originalId} (tareaId=${tarea.id})`);
              encontrada = true;
              break;
            }
          }
          
          if (!encontrada) {
            // console.log(`⚠️ [buildActivitiesCache] No se encontró tarea original ${originalId} para extra de ${trab.nombre}`);
          }
          
          continue; // 🔥 NO crear fila nueva para tareas extras
        }
        
        // Flujo normal para tareas no-extra
        const horaKey = tarea.hora || '--:--';
        const nombreKey = tarea.nombre || '(Sin nombre)';
        const key = `${horaKey}__${nombreKey}`;
        
        // Si no existe esta actividad, crearla
        if (!activityMap.has(key)) {
          activityMap.set(key, {
            baseData: {
              id: tarea.id || null,
              nombre: nombreKey,
              descripcion: tarea.descripcion || '',
              hora: tarea.hora || '',
              hora_fin: tarea.hora_fin || '',
              puntaje: tarea.puntaje || 0,
              estatus: tarea.estatus || 'pendiente',
              completada_en: tarea.completada_en || null,
              fecha_asignacion: fechaKey  // 🔥 Guardar la fecha para referencia
            },
            tareasOriginales: [],  // 🔥 Array de tareas originales con su empleado
            empIds: new Set(),
            extrasCompletadas: []  // 🔥 NUEVO: Para tareas extras completadas
          });
        }
        
        // 🔥 Agregar la tarea con información del empleado
        activityMap.get(key).tareasOriginales.push({
          ...tarea,
          empId: trab.id,
          empNombre: trab.nombre
        });
        
        // Agregar el empleado a esta actividad
        activityMap.get(key).empIds.add(trab.id);
      }
    }
  }
  
  // 🔥 NUEVO: Procesar tareasExtrasCompletadas del histórico y vincularlas a sus tareas originales
  // Estas vienen del endpoint /tareas-extras/completadas
  for (const extraHistorico of tareasExtrasCompletadas) {
    const originalId = extraHistorico.tarea_original_id;
    const idUsuarioQuePinto = extraHistorico.id_usuario_asignada;
    const nombreExtra = extraHistorico.nombre || '';
    
    // console.log(`🔍 [buildActivitiesCache] Procesando extra del histórico: ID=${originalId}, nombre="${nombreExtra}", usuario=${idUsuarioQuePinto}`);
    
    // Buscar en todos los días la tarea original
    let encontrada = false;
    for (const d of diasSemana) {
      if (encontrada) break;
      const activityMap = activitiesByDayTemp[d];
      for (const [key, entry] of activityMap) {
        // Buscar si alguna tarea en tareasOriginales tiene este ID O el mismo nombre
        const tieneOriginal = entry.tareasOriginales && entry.tareasOriginales.some(t => 
          Number(t.id) === Number(originalId) || 
          (nombreExtra && t.nombre === nombreExtra)  // 🔥 Fallback por nombre
        );
        
        if (tieneOriginal) {
          // Encontrar el nombre del usuario que completó
          const usuario = state.trabajadores.find(emp => Number(emp.id) === Number(idUsuarioQuePinto));
          
          if (!entry.extrasCompletadas) {
            entry.extrasCompletadas = [];
          }
          
          // Evitar duplicados (por usuario y nombre, ya que IDs pueden no coincidir)
          const yaExiste = entry.extrasCompletadas.some(e => 
            Number(e.empId) === Number(idUsuarioQuePinto) && 
            (Number(e.originalTaskId) === Number(originalId) || e.nombre === nombreExtra)
          );
          
          if (!yaExiste) {
            entry.extrasCompletadas.push({
              empId: Number(idUsuarioQuePinto),
              empNombre: usuario ? usuario.nombre : `Usuario ${idUsuarioQuePinto}`,
              puntaje: extraHistorico.puntaje || 0,
              hora_completado: extraHistorico.hora_origen || '',
              tareaId: extraHistorico.tareaId || extraHistorico.id,  // 🔥 ID real de la tarea extra
              originalTaskId: originalId,
              nombre: nombreExtra  // 🔥 Guardar nombre para referencia
            });
            // console.log(`🔵 [buildActivitiesCache] Extra del histórico: usuario ${usuario ? usuario.nombre : idUsuarioQuePinto} completó tarea "${nombreExtra}" (ID original ${originalId}, tareaId=${extraHistorico.tareaId || extraHistorico.id})`);
            encontrada = true;
          }
          break;
        }
      }
    }
    
    if (!encontrada) {
      console.warn(`⚠️ [buildActivitiesCache] No se encontró tarea original para extra: ID=${originalId}, nombre="${nombreExtra}"`);
    }
  }
  
  // 🔥 Ahora construir los arrays finales para cada día
  for (const d of diasSemana) {
    const activityMap = activitiesByDayTemp[d];
    const arr = [];
    
    // 🔥 FIX: Convertir el mapa a array SIN duplicar filas
    // Cada entrada única (hora+nombre) es UNA fila, con todos los empleados que tienen esa tarea
    for (const [key, entry] of activityMap) {
      arr.push({
        ...entry.baseData,
        tareasOriginales: entry.tareasOriginales,  // 🔥 Incluir tareas originales con sus empleados
        extrasCompletadas: entry.extrasCompletadas || []  // 🔥 NUEVO: Incluir extras completadas
      });
    }
    
    // Ordenar por hora
    arr.sort((a, b) => compareHour(a.hora, b.hora));
    state.activitiesByDay.set(d, arr);
    
    // console.log(`🔧 [buildActivitiesCache] ${d}: ${arr.length} actividades`);
  }
  
  // console.log('🔧 [buildActivitiesCache] FINALIZADO. state.activitiesByDay:', {
    // domingo: state.activitiesByDay.get('domingo'),
    // tamanio: state.activitiesByDay.size
  // });
}

/* 🔥 NUEVO: Función para validar si una tarea debe mostrarse */
/**
 * debeMostrarseTarea(tarea, displayedDate)
 * Valida si una tarea debe mostrarse basándose en su fecha_inicio
 * Solo muestra tareas que tienen fecha_inicio <= displayedDate
 * @param {Object} tarea - La tarea a validar
 * @param {Date} displayedDate - La fecha que se está mostrando en la UI (ej: martes 16 o martes 23)
 */
function debeMostrarseTarea(tarea, displayedDate = null) {
  if (!tarea) return false;
  
  // Si no tiene fecha_inicio, asumir que es válida (compatibilidad)
  if (!tarea.fecha_inicio) {
    return true;
  }
  
  try {
    // Si no se proporciona displayedDate, usar hoy
    const referenceDate = displayedDate || new Date();
    const fechaTarea = new Date(tarea.fecha_inicio);
    
    // Comparar solo las fechas (sin hora)
    const refDateOnly = new Date(referenceDate);
    refDateOnly.setHours(0, 0, 0, 0);
    
    const tareaDateOnly = new Date(fechaTarea);
    tareaDateOnly.setHours(0, 0, 0, 0);
    
    // 🔥 RESTRICCIÓN: Solo mostrar si la tarea se creó el mismo día o después
    // Si la tarea es de una fecha anterior a la que se está mostrando, ocultarla
    if (tareaDateOnly > refDateOnly) {
      // Tarea futura, no mostrar aún
      // console.log(`[debeMostrarseTarea] OCULTA: ${tarea.nombre} (${tareaDateOnly.toDateString()} > ${refDateOnly.toDateString()})`);
      return false;
    }
    
    // console.log(`[debeMostrarseTarea] MOSTRADA: ${tarea.nombre} (${tareaDateOnly.toDateString()} <= ${refDateOnly.toDateString()})`);
    return true; // Mostrar si la tarea es de hoy o anterior
  } catch (e) {
    console.warn('Error validando fecha_inicio:', e);
    return true; // Si hay error, mostrar por defecto
  }
}

/* Recolecta actividades con memo */
/**
 * collectActivitiesForDay(dayName)
 * Devuelve el arreglo memoizado de actividades únicas para `dayName`.
 * 🔥 NUEVO: Filtra tareas que no corresponden a la semana actual
 */
function collectActivitiesForDay(dayName) {
  // 🔥 PRIMERO: Intentar obtener del cache que preparó buildActivitiesCache()
  if (state.activitiesByDay.has(dayName)) {
    const cached = state.activitiesByDay.get(dayName) || [];
    // console.log(`[collectActivitiesForDay] USANDO CACHE para ${dayName}: ${cached.length} actividades`);
    return cached;
  }
  
  // console.log(`[collectActivitiesForDay] ⚠️  NO HAY CACHE para ${dayName}, retornando vacío`);
  return [];
}

/**
 * getWeekNumber(date)
 * Calcula el número de semana ISO de una fecha
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/* Construye filas */
/**
 * buildRows(rowsData, visibleTrabajadores, isToday, now)
 * Construye las filas de la tabla (una por actividad) y las celdas por trabajador.
 * Aplica clases de estado a cada celda y añade metadatos en data-attributes.
 */
function buildRows(rowsData, visibleTrabajadores, isToday, now) {
  const frag = document.createDocumentFragment();
  const dayName = diasSemana[state.currentDayIndex];

  // Calcular si el día mostrado es futuro comparando con la semana actual
  const isFutureDay = calculateIsFutureDay(state.currentDayIndex, now);

  // 🔥 CALCULAR FECHA COMPLETA DEL DÍA MOSTRADO
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDayIndex = today.getDay();
  
  let dayDiff = state.currentDayIndex - todayDayIndex;
  if (state.currentDayIndex < todayDayIndex) {
    dayDiff += 7;
  }
  
  const displayedDate = new Date(today);
  displayedDate.setDate(today.getDate() + dayDiff);
  
  // Formatear fecha: "Lun 8 (Dic)"
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const diaNumero = displayedDate.getDate();
  const mesNombre = meses[displayedDate.getMonth()];
  const fechaFormateada = `${dayName} ${diaNumero} (${mesNombre})`;

  rowsData.forEach((rowData, index) => {
    const tr = document.createElement('tr');
    
    // 🔥 Guardar datos originales en la fila para edición inline
    tr.dataset.horaInicio = rowData.hora || '';
    tr.dataset.horaFin = rowData.hora_fin || '';
    tr.dataset.nombre = rowData.nombre || '';
    tr.dataset.descripcion = rowData.descripcion || '';
    tr.dataset.puntaje = rowData.puntaje || '0';

    // Columna: horario (SOLO HORA, sin fecha)
    const horarioCell = document.createElement('td');
    // 🔥 Calcular hora_fin automáticamente si no existe
    let horaFin = rowData.hora_fin;
    
    // 🔥 ESPECIAL PARA EXTRAS (estatus=5): hora_fin = hora_inicio (son tareas instantáneas)
    const esExtra = rowData.estatus === 5 || rowData.estatus === '5' || rowData.es_extra === true;
    if (esExtra) {
      // Las extras no tienen hora_fin, usar la misma hora de inicio
      horaFin = rowData.hora;
    } else if (!horaFin && index < rowsData.length - 1) {
      // Si no tiene hora_fin, usar la hora de inicio de la siguiente tarea
      horaFin = rowsData[index + 1].hora;
    } else if (!horaFin && index === rowsData.length - 1) {
      // Si es la última tarea del día y no tiene hora_fin, usar 21:00 (9 PM)
      horaFin = '21:00';
    }
    
    // 🔥 Actualizar tr.dataset.horaFin con el valor calculado
    tr.dataset.horaFin = horaFin || '';
    
    // Mostrar solo hora (la fecha está en el encabezado superior)
    if (horaFin) {
      horarioCell.textContent = `${rowData.hora} - ${horaFin}`;
    } else {
      horarioCell.textContent = rowData.hora ? `${rowData.hora} hrs` : '-';
    }
    tr.appendChild(horarioCell);

    // Columna: actividad
    const actividadCell = document.createElement('td');
    actividadCell.style.verticalAlign = 'top';
    actividadCell.style.textAlign = 'left';
    const nombreDiv = document.createElement('div'); nombreDiv.className = 'activity-name'; nombreDiv.textContent = rowData.nombre;
    const descDiv   = document.createElement('div'); descDiv.className   = 'activity-desc';  descDiv.textContent   = rowData.descripcion || '';
    actividadCell.appendChild(nombreDiv); actividadCell.appendChild(descDiv);
    tr.appendChild(actividadCell);

    // Columna puntos - calcular suma de puntajes para esta actividad
    // 🔥 NUEVO: Detectar tareas vencidas que fueron completadas como extras
    const tareasCompletadasComoExtrasEnFilas = new Set();
    
    (rowData.tareasOriginales || []).forEach(tarea => {
      if (tarea.estatus === 5 && tarea.tareaOriginalId) {
        tareasCompletadasComoExtrasEnFilas.add(Number(tarea.tareaOriginalId));
      }
    });

    const puntosCell = document.createElement('td');
    let totalPuntosActividad = 0;
    (rowData.tareasOriginales || []).forEach(tarea => {
      // 🔥 NUEVO: Filtrar por período válido también aquí
      if (!debeMostrarseTarea(tarea, displayedDate)) {
        return;
      }
      
      // 🔥 Excluir si fue completada como extra por otro empleado
      if (tarea.puntaje && !(tarea.estatus === 4 && tareasCompletadasComoExtrasEnFilas.has(Number(tarea.id)))) {
        totalPuntosActividad += parseInt(tarea.puntaje) || 0;
      }
    });
    puntosCell.textContent = totalPuntosActividad > 0 ? totalPuntosActividad : '-';
    puntosCell.style.textAlign = 'center';
    puntosCell.style.fontWeight = 'bold';
    tr.appendChild(puntosCell);

    // Columnas empleados
    visibleTrabajadores.forEach(trab => {
      const td = document.createElement('td');

      // Datos de contexto SIEMPRE (aunque no haya tarea)
      td.dataset.empId   = String(trab.id ?? '');
      td.dataset.empName = trab.nombre || '';
      td.dataset.hora    = rowData.hora || '';
      td.dataset.horaFin = rowData.hora_fin || ''; // 🔥 Agregar hora_fin
      td.dataset.puntaje = rowData.puntaje || 0; // 🔥 Agregar puntaje
      td.dataset.nombre  = rowData.nombre || '';

      // 🔥 NUEVO: Buscar la tarea de este empleado en tareasOriginales
      const tarea = (rowData.tareasOriginales || []).find(t => t.empId === trab.id);
      
      if (tarea) {
        // ============ EMPLEADO TIENE ESTA TAREA ASIGNADA ============
        
        // 🔥 FILTRO CRÍTICO: No mostrar tareas extras (estatus 5) EXCEPTO en el día actual
        // Las extras completadas en días pasados o futuros se ocultan de la tabla
        // PERO se cuentan en las estadísticas (los contadores y tops usan rowData completo)
        if (tarea.estatus === 5) {
          // Verificar si el día mostrado es TODAY (hoy)
          const isDisplayedDateToday = (state.currentDayIndex === now.getDay());
          
          if (!isDisplayedDateToday) {
            // El día mostrado NO es hoy → no mostrar extras
            td.textContent = '-';
            tr.appendChild(td);
            return;
          }
          // Si isDisplayedDateToday === true, permitir que se muestre la extra
        }
        
        // Determinar clase de estado basada SOLO en el estatus guardado
        const statusClass = getStatusClass(tarea.estatus, tarea.hora, isToday, now, isFutureDay);
        
        td.className = statusClass;
        td.textContent = '-';
        td.dataset.hasTask = 'true';
        td.dataset.desc = tarea.descripcion || '';
        td.dataset.estatus = String(tarea.estatus ?? '');
        td.dataset.originalEmpId = String(trab.id ?? ''); // Empleado original asignado
        if (tarea.id !== undefined && tarea.id !== null) td.dataset.tareaId = String(tarea.id);
        
      } else {
        // ============ EMPLEADO NO TIENE ESTA TAREA ASIGNADA ============
        
        // 🔥 NUEVO: Verificar si este empleado completó esta tarea como extra (desde extrasCompletadas)
        const extraCompletadaPorEste = (rowData.extrasCompletadas || []).find(e => 
          Number(e.empId) === Number(trab.id)
        );
        
        if (extraCompletadaPorEste) {
          // 🔥 Este empleado completó la tarea como extra - pintar azul fuerte
          td.className = 'status-extra';
          td.textContent = '-';
          td.dataset.hasTask = 'true';
          td.dataset.estatus = '5'; // Completada como extra
          td.dataset.desc = rowData.descripcion || '';
          td.dataset.originalEmpId = String(trab.id ?? '');
          // 🔥 FIX: Agregar tareaId, empId, nombre y hora para que el modal funcione
          if (extraCompletadaPorEste.tareaId) td.dataset.tareaId = String(extraCompletadaPorEste.tareaId);
          td.dataset.empId = String(trab.id ?? '');
          td.dataset.nombre = extraCompletadaPorEste.nombre || rowData.nombre || '';
          td.dataset.hora = extraCompletadaPorEste.hora_completado || rowData.hora || '';
          td.dataset.puntaje = String(extraCompletadaPorEste.puntaje || rowData.puntaje || 0);
          // console.log(`🔵 [buildRows] Celda azul fuerte para ${trab.nombre} - completó extra (tareaId=${extraCompletadaPorEste.tareaId})`);
        } else {
          // Buscar si ALGÚN otro empleado tiene esta tarea como vencida (estado 4)
          let tareaVencida = null;
          let empleadoOriginal = null;
          
          for (const tareaOrig of (rowData.tareasOriginales || [])) {
            if (tareaOrig.estatus === 4) {
              tareaVencida = tareaOrig;
              empleadoOriginal = state.trabajadores.find(e => e.id === tareaOrig.empId);
              break;
            }
          }
          
          // 🔥 Verificar si alguien YA completó esta tarea como extra (usando extrasCompletadas)
          let yaCompletadaComoExtra = (rowData.extrasCompletadas || []).length > 0;
          
          // 🔥 FIX: Verificar si ALGUNA tarea vencida de esta fila está activa como extra
          // No solo la primera, sino CUALQUIERA de las tareas vencidas
          let tareaExtraActiva = false;
          let tareaVencidaConExtraActiva = null;
          let empleadoOriginalDeExtraActiva = null;
          
          for (const tareaOrig of (rowData.tareasOriginales || [])) {
            if (tareaOrig.estatus === 4) {
              const estaActiva = tareasExtraActivas.some(te => 
                String(te.TaskID) === String(tareaOrig.id)
              );
              if (estaActiva) {
                tareaExtraActiva = true;
                tareaVencidaConExtraActiva = tareaOrig;
                empleadoOriginalDeExtraActiva = state.trabajadores.find(e => e.id === tareaOrig.empId);
                break;
              }
            }
          }
          
          // Usar la tarea vencida que tiene extra activa si existe
          if (tareaVencidaConExtraActiva) {
            tareaVencida = tareaVencidaConExtraActiva;
            empleadoOriginal = empleadoOriginalDeExtraActiva;
          }
          
          // 🔥 FILTRO CRÍTICO: NO mostrar la tarea vencida al empleado original
          const esEmpleadoOriginal = empleadoOriginal && trab.id === empleadoOriginal.id;
          
          // 🔥 FIX: Verificar si ESTE empleado (trab) tiene ALGUNA tarea vencida en esta fila
          // Esto es importante cuando hay múltiples tareas en el mismo horario
          const esteEmpleadoTieneTareaVencida = (rowData.tareasOriginales || []).some(
            t => t.empId === trab.id && t.estatus === 4
          );
          
          // Si encontramos una tarea vencida, está ACTIVA (TTL válido), NADIE la completó como extra 
          // Y NO es el empleado original Y este empleado no tiene su propia tarea vencida → mostrar disponible
          if (tareaVencida && empleadoOriginal && !yaCompletadaComoExtra && tareaExtraActiva && !esEmpleadoOriginal && !esteEmpleadoTieneTareaVencida) {
            td.className = 'status-available';
            td.textContent = '-';
            td.dataset.hasTask = 'true'; // Permitir click
            td.dataset.desc = tareaVencida.descripcion || '';
            td.dataset.estatus = '4'; // Estado vencida
            td.dataset.isAvailable = 'true'; // Marca que es una tarea disponible
            td.dataset.originalEmpId = String(empleadoOriginal.id ?? ''); // Empleado original
            td.dataset.puntaje = String(tareaVencida.puntaje || 0); // 🔥 Agregar puntaje
            if (tareaVencida.id !== undefined && tareaVencida.id !== null) {
              td.dataset.originalTaskId = String(tareaVencida.id);
            }
          } else {
            // No hay tarea para este empleado O ya fue completada como extra
            td.textContent = '-';
          }
        }
      }
      tr.appendChild(td);
    });

    frag.appendChild(tr);
  });

  DOM.tbody.appendChild(frag);
}

/* ===== Menú contextual ===== */
/**
 * showCellMenu(evt, td)
 * Muestra el menú contextual de la celda en la posición del click.
 * Construye `menuContext` con la información de la celda.
 */
function showCellMenu(evt, td) {
  if (!DOM.cellMenu) return;
  // Construir contexto de la celda
  menuContext = {
    empId: td.dataset.empId ? parseInt(td.dataset.empId, 10) : null,
    empName: td.dataset.empName || '',
    dia: diasSemana[state.currentDayIndex],
    hora: td.dataset.hora || '',
    hora_fin: td.dataset.horaFin || '', // 🔥 Agregar hora_fin
    actividad: td.dataset.nombre || '',
    tieneTarea: !!td.dataset.hasTask,
    estatus: td.dataset.estatus ? Number(td.dataset.estatus) : null,
    descripcion: td.dataset.desc || ''
  };
  // 🔥 FIX: No convertir a Number si es un ID de tarea extra (empieza con "extra_")
  if (td.dataset.tareaId) {
    const tareaIdRaw = td.dataset.tareaId;
    menuContext.tareaId = tareaIdRaw.startsWith('extra_') ? tareaIdRaw : Number(tareaIdRaw);
  }

  // Posicionar cerca del click y dentro del viewport
  const margin = 8;
  let x = evt.clientX + margin;
  let y = evt.clientY + margin;

  DOM.cellMenu.style.left = `${x}px`;
  DOM.cellMenu.style.top  = `${y}px`;
  DOM.cellMenu.classList.remove('hidden');
  DOM.cellMenu.setAttribute('aria-hidden', 'false');
}

/**
 * hideCellMenu()
 * Oculta el menú contextual de la celda y limpia el contexto.
 */
function hideCellMenu() {
  if (!DOM.cellMenu) return;
  DOM.cellMenu.classList.add('hidden');
  DOM.cellMenu.setAttribute('aria-hidden', 'true');
  menuContext = null;
}

/**
 * handleCellMenuAction(action)
 * Maneja las acciones del menú contextual (info, create, edit)
 */
function handleCellMenuAction(action) {
  if (!menuContext) return;

  if (action === 'info') {
    if (menuContext.tieneTarea) {
      openModal({
        nombre: menuContext.actividad,
        descripcion: menuContext.descripcion,
        hora: menuContext.hora,
        hora_fin: menuContext.hora_fin || '', // 🔥 Agregar hora_fin
        estatus: menuContext.estatus
      });
    } else {
      // console.log('No hay una tarea asociada a esta celda.');
    }
  }

  if (action === 'create') {
    abrirFormularioCrearTarea(menuContext.empId, menuContext.empName);
  }

  if (action === 'edit') {
    if (menuContext.tieneTarea) {
      // Aquí podrías abrir tu propio modal de edición
      // console.log(`Editar tarea de ${menuContext.empName} — ${menuContext.dia} ${menuContext.hora} (${menuContext.actividad})`);
    } else {
      // console.log('No hay tarea que editar en esta celda.');
    }
  }

  hideCellMenu();
}

/* ===== Helper: Validar si una tarea puede completarse ===== */
/**
 * validarSiPuedeCompletarse(tarea, empId, diaName)
 * Valida si una tarea puede completarse según su hora de expiración.
 * 
 * Una tarea puede completarse si:
 * - Es una tarea EXTRA (es_extra=true o esExtra=true) → siempre se puede completar
 * - No es el día de hoy (tareas pasadas siempre se pueden completar)
 * - Es el día de hoy Y ya llegó la hora de inicio (estatus "En Progreso")
 * - Es la última tarea del día Y no han pasado más de 30 minutos desde su hora
 * 
 * Una tarea NO puede completarse si:
 * - Es una tarea REGULAR y aún no llegó su hora de inicio
 * 
 * Returns: { puedeCompletar: boolean, razon: string }
 */
function validarSiPuedeCompletarse(tarea, empId, diaName) {
  const now = new Date();
  const isToday = state.currentDayIndex === now.getDay();
  
  // 🔥 Si es una tarea EXTRA, siempre permitir completar (las extras se manejan diferente)
  const esExtra = tarea.es_extra === true || tarea.es_extra === 1 || 
                  tarea.esExtra === true || tarea.estatus === 5;
  if (esExtra) {
    return { puedeCompletar: true, razon: 'Tarea extra - sin restricción de hora' };
  }
  
  // Si no es hoy, permitir completar (tareas de días pasados)
  if (!isToday) {
    return { puedeCompletar: true, razon: 'Tarea de día pasado' };
  }
  
  // Si no tiene hora, permitir
  if (!tarea.hora) {
    return { puedeCompletar: true, razon: 'Sin restricción de hora' };
  }
  
  // 🔥 VALIDACIÓN PRINCIPAL: Verificar hora directamente (no depender solo del estatus)
  const [horas, minutos] = tarea.hora.split(':').map(Number);
  const horaActual = now.getHours() * 60 + now.getMinutes();
  const horaTareaMinutos = horas * 60 + minutos;
  
  // 🔥 Si aún NO ha llegado la hora de inicio → NO permitir completar
  if (horaActual < horaTareaMinutos) {
    const horaFaltante = Math.floor((horaTareaMinutos - horaActual) / 60);
    const minFaltantes = (horaTareaMinutos - horaActual) % 60;
    const tiempoFaltante = horaFaltante > 0 
      ? `${horaFaltante}h ${minFaltantes}min` 
      : `${minFaltantes} minutos`;
    return { 
      puedeCompletar: false, 
      razon: `Esta tarea inicia a las ${tarea.hora}. Faltan ${tiempoFaltante}.` 
    };
  }
  
  // Obtener todas las tareas del empleado en ese día para verificar vencimiento
  const empleado = state.trabajadores.find(t => t.id === Number(empId));
  if (!empleado) {
    return { puedeCompletar: true, razon: 'Empleado no encontrado' };
  }
  
  const tareasDelDia = (empleado.tareas_asignadas && empleado.tareas_asignadas[diaName]) || [];
  
  // Ordenar tareas por hora
  const tareasOrdenadas = tareasDelDia
    .filter(t => t.hora)
    .sort((a, b) => compareHour(a.hora, b.hora));
  
  // Encontrar índice de esta tarea
  const indice = tareasOrdenadas.findIndex(t => 
    (t.hora === tarea.hora && t.nombre === tarea.nombre) || 
    (tarea.tareaId && t.id === tarea.tareaId)
  );
  
  if (indice === -1) {
    return { puedeCompletar: true, razon: 'Tarea no encontrada en lista' };
  }
  
  // Si hay una tarea siguiente, verificar si ya pasó su hora (VENCIDA)
  if (indice + 1 < tareasOrdenadas.length) {
    const siguiente = tareasOrdenadas[indice + 1];
    const [horasSig, minutosSig] = siguiente.hora.split(':').map(Number);
    const horaSiguienteMinutos = horasSig * 60 + minutosSig;
    
    // Si ya pasó la hora de la siguiente tarea → VENCIDA
    if (horaActual >= horaSiguienteMinutos) {
      return { 
        puedeCompletar: false, 
        razon: `Esta tarea venció a las ${siguiente.hora} (hora de la siguiente tarea)` 
      };
    } else {
      // Estamos entre esta tarea y la siguiente → PUEDE COMPLETARSE
      return { puedeCompletar: true, razon: 'Dentro del horario permitido' };
    }
  } else {
    // Es la última tarea del día
    const minutosPasados = horaActual - horaTareaMinutos;
    
    // Si pasaron >= 30 minutos → VENCIDA
    if (minutosPasados >= 30) {
      return { 
        puedeCompletar: false, 
        razon: 'Esta tarea venció hace más de 30 minutos' 
      };
    } else {
      // Aún dentro de los 30 minutos → PUEDE COMPLETARSE
      return { puedeCompletar: true, razon: 'Dentro del horario permitido' };
    }
  }
}

/* ===== Helper: Calcular estatus correcto al completar tarea ===== */
/**
 * calcularEstatusCompletado(tarea, empId, diaName, esAdmin, usuarioActualId)
 * Determina el estatus correcto cuando se completa una tarea:
 * - Estatus 3: Completada a tiempo por el dueño
 * - Estatus 5: Completada fuera de tiempo o por otra persona
 * 
 * Reglas:
 * 1. Si NO es el dueño → siempre estatus 5 (extra)
 * 2. Si es el dueño y está DENTRO DEL TIEMPO → estatus 3 (completada)
 * 
 * NOTA: Esta función solo se llama si validarSiPuedeCompletarse() retorna true
 */
function calcularEstatusCompletado(tarea, empId, diaName, esAdmin, usuarioActualId) {
  const now = new Date();
  const isToday = state.currentDayIndex === now.getDay();
  
  // Si no es el día de hoy, marcar como completada normal (estatus 3)
  if (!isToday) {
    return 3;
  }
  
  // Si no tiene hora, marcar como completada normal
  if (!tarea.hora) {
    return 3;
  }
  
  // Verificar si es el dueño de la tarea
  const tareaEmpId = Number(empId);
  const usuarioId = Number(usuarioActualId);
  const esDueno = tareaEmpId === usuarioId;
  
  // Si NO es el dueño → siempre es extra (5)
  if (!esDueno && !esAdmin) {
    return 5;
  }
  
  // Si es el dueño o admin → estatus 3 (completada a tiempo)
  // Nota: Ya validamos con validarSiPuedeCompletarse() que está dentro del horario
  return 3;
}

/* ===== Modal (información y edición inline) ===== */
/**
 * openModal(tarea)
 * Muestra el modal de información/edición de tarea. El parámetro `tarea` puede
 * incluir { nombre, descripcion, hora, estatus, empId, allowComplete }.
 * - Permite edición inline de nombre y descripción
 * - Si allowComplete es true se muestra el botón de completar y un botón
 *   adicional para marcar como "extra completada".
 */
/* ===== Modal (información y edición inline) ===== */
/**
 * openModal(tarea)
 * Muestra el modal de información/edición de tarea.
 * - Admin: puede editar y guardar cambios.
 * - Empleado: solo ver sus tareas, puede completarlas.
 * - Visitante/otros: solo ver, sin acciones.
 */
function openModal(tarea) {
  // Obtener usuario actual
  const loggedUserString = localStorage.getItem('loggedUser');
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };
  const isAdmin = loggedUser.role === 'admin' || loggedUser.role === 'supervisor';
  const isEmpleado = loggedUser.role === 'empleado';

  // Verificar si el empleado puede completar esta tarea
  const empleadoId = loggedUser.empleado_id ? Number(loggedUser.empleado_id) : null;
  const tareaEmpId = tarea.empId ? Number(tarea.empId) : null;
  const puedeCompletar = isAdmin || (isEmpleado && empleadoId === tareaEmpId && tarea.allowComplete);

  // Limpiar contenido modal
  DOM.modalTaskName.innerHTML = '';
  DOM.modalTaskDesc.innerHTML = '';

  if (isAdmin) {
    /* ================= ADMIN: edición completa ================= */
    
    // Actualizar título del modal
    DOM.modalTaskName.textContent = 'Editar Tarea';
    
    // Input de nombre editable
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = tarea.nombre || '';
    nameInput.className = 'modal-inline-input modal-name-input';
    nameInput.placeholder = 'Nombre de la tarea';
    DOM.modalTaskDesc.appendChild(nameInput);

    // Textarea de descripción editable
    const descTextarea = document.createElement('textarea');
    descTextarea.value = tarea.descripcion || '';
    descTextarea.className = 'modal-inline-textarea modal-desc-textarea';
    descTextarea.rows = 4;
    descTextarea.placeholder = 'Descripción de la tarea';
    DOM.modalTaskDesc.appendChild(descTextarea);

    // Input de hora editable
    const horaLabel = document.createElement('label');
    horaLabel.textContent = 'Hora de inicio:';
    horaLabel.className = 'modal-field-label';
    horaLabel.style.cssText = 'display: block; margin-top: 15px; margin-bottom: 5px; font-weight: 600; color: #495057;';
    DOM.modalTaskDesc.appendChild(horaLabel);

    const horaInput = document.createElement('input');
    horaInput.type = 'time';
    horaInput.value = tarea.hora || '';
    horaInput.className = 'modal-inline-input modal-hora-input';
    horaInput.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;';
    DOM.modalTaskDesc.appendChild(horaInput);

    // 🔥 Input de hora_fin editable (opcional)
    const horaFinLabel = document.createElement('label');
    horaFinLabel.textContent = 'Hora de finalización (opcional):';
    horaFinLabel.className = 'modal-field-label';
    horaFinLabel.style.cssText = 'display: block; margin-top: 15px; margin-bottom: 5px; font-weight: 600; color: #495057;';
    DOM.modalTaskDesc.appendChild(horaFinLabel);

    const horaFinInput = document.createElement('input');
    horaFinInput.type = 'time';
    horaFinInput.value = tarea.hora_fin || '';
    horaFinInput.className = 'modal-inline-input modal-hora-fin-input';
    horaFinInput.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;';
    DOM.modalTaskDesc.appendChild(horaFinInput);

    const horaFinHint = document.createElement('small');
    horaFinHint.textContent = '💡 La hora de finalización es opcional y sirve para mostrar un rango visual en el tablero';
    horaFinHint.style.cssText = 'display: block; margin-top: 5px; margin-bottom: 10px; color: #666; font-size: 12px;';
    DOM.modalTaskDesc.appendChild(horaFinHint);

    // 🔥 Campo de puntos (siempre visible)
    const puntosLabel = document.createElement('label');
    puntosLabel.textContent = 'Puntos:';
    puntosLabel.className = 'modal-field-label';
    puntosLabel.style.cssText = 'display: block; margin-top: 15px; margin-bottom: 5px; font-weight: 600; color: #495057;';
    DOM.modalTaskDesc.appendChild(puntosLabel);

    const puntosInput = document.createElement('input');
    puntosInput.type = 'number';
    puntosInput.value = tarea.puntaje || 0;
    puntosInput.min = '0';
    puntosInput.className = 'modal-inline-input modal-puntos-input';
    puntosInput.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;';
    DOM.modalTaskDesc.appendChild(puntosInput);
    
    // Mensaje informativo (solo si es edición global)
    if (tarea.editarTodos) {
      const puntosHint = document.createElement('small');
      puntosHint.textContent = '⚠️ Los cambios se aplicarán a TODOS los empleados que tienen esta tarea';
      puntosHint.style.cssText = 'display: block; margin-top: 5px; margin-bottom: 10px; color: #e67e22; font-size: 12px; font-weight: 600;';
      DOM.modalTaskDesc.appendChild(puntosHint);
    }

    // Información de estado
    const estadoLabel = document.createElement('label');
    estadoLabel.textContent = 'Estado:';
    estadoLabel.className = 'modal-field-label';
    estadoLabel.style.cssText = 'display: block; margin-top: 15px; margin-bottom: 5px; font-weight: 600; color: #495057;';
    DOM.modalTaskDesc.appendChild(estadoLabel);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'task-info-panel';
    infoDiv.innerHTML = `
      <div style="padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; font-size: 14px;">
        <span><strong>${getStatusText(tarea.estatus)}</strong></span>
      </div>
    `;
    DOM.modalTaskDesc.appendChild(infoDiv);

    // Botón guardar
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'modal-save-btn';
    saveBtn.innerHTML = '💾 Guardar Cambios';
    
    // 🔥 Decidir qué función de guardado usar
    if (tarea.editarTodos) {
      // Guardar para TODOS los empleados
      saveBtn.onclick = async () => {
        const nuevoNombre = nameInput.value.trim();
        const nuevaDesc = descTextarea.value.trim();
        const nuevaHora = horaInput.value;
        const nuevaHoraFin = horaFinInput.value;
        const nuevosPuntos = puntosInput ? puntosInput.value : null;
        
        if (!nuevoNombre || !nuevaHora) {
          showToast('Nombre y hora son obligatorios', 'error');
          return;
        }
        
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';
        
        try {
          await saveActivityChanges({
            horaActual: tarea.hora,
            nombreActual: tarea.nombre,
            dayName: diasSemana[state.currentDayIndex],
            nuevaHora,
            nuevaHoraFin,
            nuevoNombre,
            nuevaDescripcion: nuevaDesc,
            nuevosPuntos
          });
          closeModal();
        } catch (error) {
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 Guardar Cambios';
        }
      };
    } else {
      // Guardar para UN empleado específico
      saveBtn.onclick = () => {
        const nuevosPuntos = puntosInput ? puntosInput.value : null;
        saveTaskChanges(tarea, nameInput.value.trim(), descTextarea.value.trim(), horaInput.value, horaFinInput.value, nuevosPuntos);
      };
    }

    // 🔥 Botón eliminar (solo para admin)
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'modal-delete-btn';
    deleteBtn.innerHTML = '🗑️ Eliminar Tarea';
    deleteBtn.style.cssText = 'background: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-left: 10px;';
    deleteBtn.onmouseover = () => { deleteBtn.style.background = '#c82333'; };
    deleteBtn.onmouseout = () => { deleteBtn.style.background = '#dc3545'; };
    deleteBtn.onclick = () => deleteTask(tarea);

    const actions = DOM.modal.querySelector('.modal-actions');
    if (actions) {
      // Limpiar botones previos de guardar y eliminar
      const oldSaveBtn = actions.querySelector('.modal-save-btn');
      const oldDeleteBtn = actions.querySelector('.modal-delete-btn');
      if (oldSaveBtn) oldSaveBtn.remove();
      if (oldDeleteBtn) oldDeleteBtn.remove();
      actions.insertBefore(saveBtn, actions.firstChild);
      actions.insertBefore(deleteBtn, saveBtn.nextSibling);
    }

    // Botón completar (admin puede completar cualquier tarea)
    // 🔥 NO mostrar si estatus es 3 (completada) o 5 (extra completada)
    /*alert('🔍 [ADMIN MODAL] Evaluando botón completar:', {
      allowComplete: tarea.allowComplete,
      estatus: tarea.estatus,
      tieneBoton: !!DOM.modalCompleteBtn
    });*/
    
    if (tarea.allowComplete && tarea.estatus !== 3 && tarea.estatus !== 5 && DOM.modalCompleteBtn) {
      // 🔥 VALIDAR si la tarea puede completarse (no está vencida)
      //alert('🔍 [ADMIN MODAL] Ejecutando validarSiPuedeCompletarse...');
      const validacion = validarSiPuedeCompletarse(tarea, tarea.empId, diasSemana[state.currentDayIndex]);
      //alert('🔍 [ADMIN MODAL] Resultado validación:', validacion);
      
      if (validacion.puedeCompletar) {
        //alert('✅ [ADMIN MODAL] Mostrando botón completar y asignando onclick');
        DOM.modalCompleteBtn.style.display = 'inline-flex';
        DOM.modalCompleteBtn.innerHTML = '✓ Completar Tarea';
        DOM.modalCompleteBtn.onclick = () => {
          // console.log('🚀 [ONCLICK ADMIN] Botón completar clickeado!');
          if (!tarea.empId) {
            console.error('❌ [ONCLICK ADMIN] No hay empId, abortando');
            return;
          }
          
          // � DEBUG: Mostrar información de la tarea
          const now = new Date();
          const horaActual = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          //alert(`📝 DEPURACIÓN - Completar Tarea\n\n` +
                //`Tarea: ${tarea.nombre}\n` +
                //`Hora Actual: ${horaActual}\n` +
                //`Hora Inicio: ${tarea.hora || 'N/A'}\n` +
                //`Hora Fin: ${tarea.hora_fin || 'N/A'}\n` +
                //`Es Extra: ${tarea.es_extra || tarea.esExtra || tarea.estatus === 5 ? 'SÍ' : 'NO'}\n` +
                //`Estatus: ${tarea.estatus}`);
          
          // �🔥 VALIDACIÓN FINAL: Verificar hora JUSTO ANTES de completar
          const esExtra = tarea.es_extra === true || tarea.es_extra === 1 || tarea.esExtra === true || tarea.estatus === 5;
          if (!esExtra && tarea.hora) {
            const now = new Date();
            const [h, m] = tarea.hora.split(':').map(Number);
            const horaActualMin = now.getHours() * 60 + now.getMinutes();
            const horaInicioMin = h * 60 + m;
            
            // Verificar si aún no ha llegado la hora de inicio
            if (horaActualMin < horaInicioMin) {
              const minFaltantes = horaInicioMin - horaActualMin;
              const hFalt = Math.floor(minFaltantes / 60);
              const mFalt = minFaltantes % 60;
              const tiempoFaltante = hFalt > 0 ? `${hFalt}h ${mFalt}min` : `${mFalt} minutos`;
              showToast(`⛔ No puedes completar esta tarea aún. Inicia a las ${tarea.hora} (faltan ${tiempoFaltante})`, 'error', 5000);
              return;
            }
            
            // Verificar si ya pasó hora_fin (si existe)
            if (tarea.hora_fin) {
              const [hFin, mFin] = tarea.hora_fin.split(':').map(Number);
              const horaFinMin = hFin * 60 + mFin;
              if (horaActualMin > horaFinMin) {
                showToast(`⛔ Esta tarea ya venció a las ${tarea.hora_fin}`, 'error', 5000);
                return;
              }
            }
          }
          
          // 🔥 USAR LA LÓGICA CORRECTA: calcular estatus basado en tiempo y dueño
          const nuevoEstatus = calcularEstatusCompletado(
            tarea, 
            tarea.empId, 
            diasSemana[state.currentDayIndex],
            true, // es admin
            tarea.empId // admin completa en nombre del dueño
          );
          
          if (tarea.tareaId) {
            updateTaskStatus(tarea.empId, diasSemana[state.currentDayIndex], tarea.hora || '', tarea.nombre || '', nuevoEstatus, tarea.tareaId);
          } else {
            updateTaskStatus(tarea.empId, diasSemana[state.currentDayIndex], tarea.hora || '', tarea.nombre || '', nuevoEstatus);
          }
          closeModal();
        };
      } else {
        // Tarea vencida - mostrar mensaje y ocultar botón
        DOM.modalCompleteBtn.style.display = 'none';
        
        // Agregar mensaje de advertencia
        const warningDiv = document.createElement('div');
        warningDiv.className = 'tarea-vencida-warning';
        warningDiv.innerHTML = `
          <div style="padding: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; margin-top: 15px; color: #856404;">
            <strong>⚠️ Tarea sin iniciar</strong><br>
            ${validacion.razon}
          </div>
        `;
        DOM.modalTaskDesc.appendChild(warningDiv);
      }
    } else if (DOM.modalCompleteBtn) {
      // Ocultar botón de completar si no tiene permiso, está vencida (estado 4), completada (estado 3) o extra (estado 5)
      DOM.modalCompleteBtn.style.display = 'none';
    }
  } else {
    /* ================= EMPLEADO / VISITANTE: solo lectura ================= */
    
    // Actualizar título del modal
    DOM.modalTaskName.textContent = tarea.nombre || 'Información de Tarea';
    
    // Mostrar descripción (solo lectura)
    const descDiv = document.createElement('div');
    descDiv.className = 'modal-readonly-desc';
    descDiv.textContent = tarea.descripcion || 'Sin descripción';
    DOM.modalTaskDesc.appendChild(descDiv);

    // Información de la tarea
    const infoDiv = document.createElement('div');
    infoDiv.className = 'task-info-panel';
    infoDiv.innerHTML = `
      <div style="display: flex; gap: 20px; font-size: 14px;">
        <span><strong>Hora:</strong> ${tarea.hora || 'No especificada'}</span>
        <span><strong>Estado:</strong> ${getStatusText(tarea.estatus)}</span>
      </div>
    `;
    DOM.modalTaskDesc.appendChild(infoDiv);

    // Mostrar botón completar solo si es su propia tarea
    // 🔥 NO mostrar si estatus es 3 (completada) o 5 (extra completada)
    if (puedeCompletar && tarea.estatus !== 3 && tarea.estatus !== 5 && DOM.modalCompleteBtn) {
      // 🔥 VALIDAR si la tarea puede completarse (no está vencida)
      const validacion = validarSiPuedeCompletarse(tarea, tarea.empId, diasSemana[state.currentDayIndex]);
      
      if (validacion.puedeCompletar) {
        DOM.modalCompleteBtn.style.display = 'inline-flex';
        DOM.modalCompleteBtn.innerHTML = '✓ Completar Tarea';
        DOM.modalCompleteBtn.onclick = () => {
          if (!tarea.empId) return;
          
          // � DEBUG: Mostrar información de la tarea
          const now = new Date();
          const horaActual = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
         
          // �🔥 VALIDACIÓN FINAL: Verificar hora JUSTO ANTES de completar
          const esExtra = tarea.es_extra === true || tarea.es_extra === 1 || tarea.esExtra === true || tarea.estatus === 5;
          if (!esExtra && tarea.hora) {
            const now = new Date();
            const [h, m] = tarea.hora.split(':').map(Number);
            const horaActualMin = now.getHours() * 60 + now.getMinutes();
            const horaInicioMin = h * 60 + m;
            
            // Verificar si aún no ha llegado la hora de inicio
            if (horaActualMin < horaInicioMin) {
              const minFaltantes = horaInicioMin - horaActualMin;
              const hFalt = Math.floor(minFaltantes / 60);
              const mFalt = minFaltantes % 60;
              const tiempoFaltante = hFalt > 0 ? `${hFalt}h ${mFalt}min` : `${mFalt} minutos`;
              showToast(`⛔ No puedes completar esta tarea aún. Inicia a las ${tarea.hora} (faltan ${tiempoFaltante})`, 'error', 5000);
              return;
            }
            
            // Verificar si ya pasó hora_fin (si existe)
            if (tarea.hora_fin) {
              const [hFin, mFin] = tarea.hora_fin.split(':').map(Number);
              const horaFinMin = hFin * 60 + mFin;
              if (horaActualMin > horaFinMin) {
                showToast(`⛔ Esta tarea ya venció a las ${tarea.hora_fin}`, 'error', 5000);
                return;
              }
            }
          }
          
          // 🔥 USAR LA LÓGICA CORRECTA: calcular estatus basado en tiempo y dueño
          const nuevoEstatus = calcularEstatusCompletado(
            tarea, 
            tarea.empId, 
            diasSemana[state.currentDayIndex],
            false, // no es admin
            empleadoId // ID del usuario actual
          );
          
          if (tarea.tareaId) {
            updateTaskStatus(tarea.empId, diasSemana[state.currentDayIndex], tarea.hora || '', tarea.nombre || '', nuevoEstatus, tarea.tareaId);
          } else {
            updateTaskStatus(tarea.empId, diasSemana[state.currentDayIndex], tarea.hora || '', tarea.nombre || '', nuevoEstatus);
          }
          closeModal();
        };
      } else {
        // Tarea vencida - mostrar mensaje y ocultar botón
        DOM.modalCompleteBtn.style.display = 'none';
        
        // Agregar mensaje de advertencia
        const warningDiv = document.createElement('div');
        warningDiv.className = 'tarea-vencida-warning';
        warningDiv.innerHTML = `
          <div style="padding: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; margin-top: 15px; color: #856404;">
            <strong>⚠️ Tarea Vencida</strong><br>
            ${validacion.razon}
          </div>
        `;
        DOM.modalTaskDesc.appendChild(warningDiv);
      }
    } else {
      // Ocultar botón completar si no es su tarea, ya está completada (3) o es extra (5)
      if (DOM.modalCompleteBtn) DOM.modalCompleteBtn.style.display = 'none';
    }

    // Ocultar botones de edición (solo admin puede editar)
    const extraBtns = DOM.modal.querySelectorAll('.modal-save-btn, .modal-extra-complete');
    extraBtns.forEach(btn => btn.remove());
  }

  /* ================= Mostrar modal ================= */
  DOM.modal.classList.remove('hidden');
}

/**
 * openModalForAvailableTask(taskInfo)
 * Abre un modal especial para tareas vencidas disponibles (azul claro)
 * Permite completar la tarea como "extra" y asignar puntos al que la complete
 */
function openModalForAvailableTask(taskInfo) {
  if (!DOM.modal) return;

  // Limpiar contenido modal
  DOM.modalTaskName.innerHTML = '';
  DOM.modalTaskDesc.innerHTML = '';

  // Título
  DOM.modalTaskName.textContent = `Tarea Extra Disponible: ${taskInfo.nombre || ''}`;

  // Mensaje explicativo
  const messageDiv = document.createElement('div');
  messageDiv.className = 'modal-available-message';
  messageDiv.style.cssText = `
    background: #e3f2fd;
    border-left: 4px solid #2196f3;
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 4px;
  `;
  messageDiv.innerHTML = `
    <strong style="color: #1976d2;">💡 Tarea Extra</strong>
    <p style="margin: 8px 0 0 0; color: #424242;">
      Esta tarea no fue completada a tiempo por otro empleado. 
      Si la completas, ganarás los puntos como tarea extra.
    </p>
  `;
  DOM.modalTaskDesc.appendChild(messageDiv);

  // Descripción
  const descDiv = document.createElement('div');
  descDiv.className = 'modal-readonly-desc';
  descDiv.textContent = taskInfo.descripcion || 'Sin descripción';
  DOM.modalTaskDesc.appendChild(descDiv);

  // Información de la tarea
  const infoDiv = document.createElement('div');
  infoDiv.className = 'task-info-panel';
  infoDiv.innerHTML = `
    <div style="display: flex; gap: 20px; font-size: 14px;">
      <span><strong>Hora:</strong> ${taskInfo.hora || 'No especificada'}</span>
      <span><strong>Estado:</strong> Vencida (Disponible)</span>
    </div>
  `;
  DOM.modalTaskDesc.appendChild(infoDiv);

  // Botón para completar como extra
  if (DOM.modalCompleteBtn) {
    DOM.modalCompleteBtn.style.display = 'inline-flex';
    DOM.modalCompleteBtn.innerHTML = '✓ Completar como Extra';
    DOM.modalCompleteBtn.style.background = '#2196f3';
    
    DOM.modalCompleteBtn.onclick = () => {
      // Crear una nueva tarea "extra" para este empleado
      completeAvailableTaskAsExtra(taskInfo);
      closeModal();
    };
  }

  // Ocultar botón cerrar de edición
  const saveBtns = DOM.modal.querySelectorAll('.modal-save-btn');
  saveBtns.forEach(btn => btn.style.display = 'none');

  // Mostrar modal
  DOM.modal.classList.remove('hidden');
}

/**
 * completeAvailableTaskAsExtra(taskInfo)
 * Completa una tarea vencida de otro empleado como "extra" para el empleado actual
 */
async function completeAvailableTaskAsExtra(taskInfo) {
  const { nombre, descripcion, hora, originalEmpId, originalTaskId, currentEmpId, puntaje: puntajeFromInfo } = taskInfo;
  
  if (!currentEmpId) {
    showToast('Error: No se pudo identificar el empleado actual', 'error');
    return;
  }

  // 🔥 CRÍTICO: Usar siempre el día actual REAL, no state.currentDayIndex
  const hoyDayIndex = new Date().getDay();
  const dayName = diasSemana[hoyDayIndex];
  
  // Validar que el usuario está mirando el día actual
  if (state.currentDayIndex !== hoyDayIndex) {
    showToast('⚠️ Solo puedes completar tareas extras el día actual. Por favor, vuelve a hoy.', 'warning', 3000);
    return;
  }

  // 🔥 VALIDACIÓN: Verificar si alguien ya completó esta tarea extra
  const yaCompletada = state.trabajadores.some(emp => {
    const tareas = (emp.tareas_asignadas && emp.tareas_asignadas[dayName]) || [];
    return tareas.some(t => 
      t.esExtra === true && 
      Number(t.tareaOriginalId) === Number(originalTaskId)
    );
  });

  if (yaCompletada) {
    showToast('Esta tarea extra ya fue completada por otro empleado', 'warning', 3000);
    return;
  }

  // Buscar el empleado actual
  const empIndex = state.trabajadores.findIndex(t => Number(t.id) === Number(currentEmpId));
  if (empIndex < 0) {
    showToast('Error: No se encontró el empleado', 'error');
    return;
  }

  // 🔥 dayName ya fue definido y validado arriba (solo hoy permitido)
  const empleado = state.trabajadores[empIndex];

  // Buscar la tarea original para obtener el puntaje
  // Primero intentar usar puntaje del info de la tarea (más confiable)
  let puntaje = 0;
  let disponiblePara = "todos"; // valor por defecto
  
  if (puntajeFromInfo) {
    puntaje = parseInt(puntajeFromInfo) || 0;
  }
  
  // Si no viene en info o es 0, buscarlo en el estado
  if (puntaje === 0) {
    const empOriginalIndex = state.trabajadores.findIndex(t => Number(t.id) === Number(originalEmpId));
    if (empOriginalIndex >= 0) {
      const tareasOriginal = (state.trabajadores[empOriginalIndex].tareas_asignadas && state.trabajadores[empOriginalIndex].tareas_asignadas[dayName]) || [];
      const tareaOriginal = tareasOriginal.find(t => Number(t.id) === Number(originalTaskId));
      if (tareaOriginal) {
        // 🔥 Asegurar que se parsea como número entero para evitar divisiones accidentales
        puntaje = parseInt(tareaOriginal.puntaje) || 0;
        // 🔥 FASE 1: Obtener el control de disponibilidad de rol
        disponiblePara = tareaOriginal.disponible_para_rol || "todos";
      }
    }
  } else {
    // Si obtenemos puntaje del info, aún así necesitamos buscar disponible_para_rol
    const empOriginalIndex = state.trabajadores.findIndex(t => Number(t.id) === Number(originalEmpId));
    if (empOriginalIndex >= 0) {
      const tareasOriginal = (state.trabajadores[empOriginalIndex].tareas_asignadas && state.trabajadores[empOriginalIndex].tareas_asignadas[dayName]) || [];
      const tareaOriginal = tareasOriginal.find(t => Number(t.id) === Number(originalTaskId));
      if (tareaOriginal) {
        disponiblePara = tareaOriginal.disponible_para_rol || "todos";
      }
    }
  }

  // 🔥 FASE 1: VALIDACIÓN DE ROL - Si es "mismo_rol", verificar que el empleado actual tenga el mismo role_dp
  if (disponiblePara === "mismo_rol") {
    const empOriginalIndex = state.trabajadores.findIndex(t => Number(t.id) === Number(originalEmpId));
    const empOriginal = state.trabajadores[empOriginalIndex];
    const empActual = state.trabajadores[empIndex];
    
    const roleOriginal = empOriginal ? (empOriginal.role_dp || "empleado").toLowerCase() : "empleado";
    const roleActual = empActual ? (empActual.role_dp || "empleado").toLowerCase() : "empleado";
    
    if (roleActual !== roleOriginal) {
      showToast(
        `❌ Esta tarea solo puede ser completada por empleados con rol "${roleOriginal}". Tu rol es "${roleActual}".`,
        'error',
        4000
      );
      return;
    }
  }

  // Crear nueva tarea "extra" para el empleado actual
  const semanaActual = getWeekNumber(new Date());
  
  // 🔥 CORREGIDO: Usar hora actual para tareas extras (igual que el reloj)
  const ahora = new Date();
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  
  const newExtraTask = {
    nombre,
    descripcion,
    hora: horaActual,  // 🔥 Hora actual, no la hora de la tarea original
    hora_fin: horaActual, // 🔥 Hora fin = hora actual (igual que el reloj)
    estatus: 5, // Estado "extra"
    puntaje,
    esExtra: true, // Marcar como tarea extra
    tareaOriginalId: originalTaskId, // Referencia a la tarea original
    semana_inicio: semanaActual, // 🔥 Agregar semana actual para validación backend
    fecha_completado: new Date().toISOString() // 🔥 Registrar fecha de completado
  };

  // Agregar la tarea al empleado actual
  if (!empleado.tareas_asignadas) {
    empleado.tareas_asignadas = {};
  }
  if (!empleado.tareas_asignadas[dayName]) {
    empleado.tareas_asignadas[dayName] = [];
  }

  // Buscar un ID único para la nueva tarea
  const maxId = Math.max(
    0,
    ...state.trabajadores.flatMap(t => 
      Object.values(t.tareas_asignadas || {}).flatMap(tareas => 
        tareas.map(ta => Number(ta.id) || 0)
      )
    )
  );
  newExtraTask.id = maxId + 1;

  empleado.tareas_asignadas[dayName].push(newExtraTask);

  // Actualizar UI inmediatamente (optimistic update)
  buildActivitiesCache();
  renderForCurrentState();
  const now = new Date();
  updateCellStates(now);

  // Guardar en backend
  try {
    const payload = {
      tareas_asignadas: {
        [dayName]: [newExtraTask]
      }
    };

    // console.log('🔍 Payload enviado:', JSON.stringify(payload, null, 2));

    const resp = await fetch(`/empleados/${currentEmpId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('❌ Error del servidor:', errorText);
      throw new Error(`HTTP ${resp.status}: ${errorText}`);
    }

    // 🔥 NUEVO: Eliminar la tarea de la lista global de tareas extras
    // Para que no aparezca como disponible para otros empleados
    // console.log(`🔥 DEBUG: Enviando puntaje=${puntaje} (tipo: ${typeof puntaje}) para tarea ${nombre}`);
    try {
      const deleteResp = await fetch('/tareas-extras/eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: originalTaskId,
          nombre: nombre,
          completed_by_id: currentEmpId,
          original_emp_id: originalEmpId,
          puntaje: puntaje,
          hora: hora,
          descripcion: descripcion,
          skip_historico: true  // 🔥 NUEVO: No guardar en histórico (el PATCH ya lo hizo)
        })
      });
      
      if (deleteResp.ok) {
        // console.log('✅ Tarea eliminada de la lista global de extras');
      } else {
        console.warn('⚠️ No se pudo eliminar de tareas extras globales (puede no afectar UI web)');
      }
    } catch (errDelete) {
      console.warn('⚠️ Error al eliminar tarea extra global:', errDelete);
      // No lanzar error, la tarea ya se guardó en el empleado
    }

    // Recargar datos del servidor
    const fullResp = await fetch('/empleados-con-tareas', { cache: 'no-store' });
    if (fullResp.ok) {
      const empleados = await fullResp.json();
      const text = JSON.stringify(empleados);
      _lastEmpleadosJsonString = text;
      state.trabajadores = empleados;
      
      // 🔥 NUEVO: Recargar tareas extras completadas del histórico
      await cargarTareasExtrasCompletadas();
      
      buildActivitiesCache();
      renderForCurrentState();
      updateCellStates(now);
    }

    showToast('¡Tarea extra completada! Puntos asignados.', 'success', 3000);
    
  } catch (err) {
    console.error('Error guardando tarea extra:', err);
    // Revertir cambio
    empleado.tareas_asignadas[dayName] = empleado.tareas_asignadas[dayName].filter(t => t.id !== newExtraTask.id);
    buildActivitiesCache();
    renderForCurrentState();
    updateCellStates(now);
    showToast('Error al guardar la tarea extra', 'error');
  }
}

/**
 * editHorarioInline(td, row)
 * Convierte la celda de horario en inputs editables para hora inicio y fin
 */
function editHorarioInline(td, row) {
  // 🔥 Leer datos desde row.dataset (guardados al construir la fila)
  // Esto evita problemas cuando el DOM ya fue modificado
  let horaInicio = row.dataset.horaInicio || '';
  let horaFin = row.dataset.horaFin || '';
  
  // Fallback: si no hay dataset, intentar leer del DOM
  if (!horaInicio) {
    const originalText = td.textContent.trim();
    if (originalText.includes(' - ')) {
      [horaInicio, horaFin] = originalText.split(' - ').map(h => h.trim());
    } else if (originalText.includes(' hrs')) {
      horaInicio = originalText.replace(' hrs', '').trim();
    } else if (originalText !== '-' && originalText !== 'Guardando...') {
      horaInicio = originalText;
    }
  }
  
  // Limpiar celda
  td.innerHTML = '';
  td.style.padding = '4px';
  
  // Crear contenedor flex
  const container = document.createElement('div');
  container.style.cssText = 'display: flex; gap: 4px; align-items: center;';
  
  // Input hora inicio
  const inputInicio = document.createElement('input');
  inputInicio.type = 'time';
  inputInicio.value = horaInicio;
  inputInicio.style.cssText = 'width: 70px; padding: 2px; font-size: 12px; border: 1px solid #0b63d6; border-radius: 3px;';
  
  // Separador
  const separador = document.createElement('span');
  separador.textContent = '-';
  separador.style.fontSize = '12px';
  
  // Input hora fin
  const inputFin = document.createElement('input');
  inputFin.type = 'time';
  inputFin.value = horaFin;
  inputFin.style.cssText = 'width: 70px; padding: 2px; font-size: 12px; border: 1px solid #0b63d6; border-radius: 3px;';
  
  container.appendChild(inputInicio);
  container.appendChild(separador);
  container.appendChild(inputFin);
  td.appendChild(container);
  
  // Focus en el primer input
  inputInicio.focus();
  inputInicio.select();
  
  // 🔥 Flag para evitar llamadas duplicadas a guardar
  let guardando = false;
  let guardadoExitoso = false;
  
  // Función para guardar
  const guardar = async () => {
    // 🔥 Evitar llamadas duplicadas
    if (guardando || guardadoExitoso) return;
    guardando = true;
    
    const nuevaHoraInicio = inputInicio.value;
    const nuevaHoraFin = inputFin.value;
    
    if (!nuevaHoraInicio) {
      showToast('La hora de inicio es obligatoria', 'error');
      inputInicio.focus();
      guardando = false;
      return;
    }
    
    // 🔥 Mostrar indicador de guardando en lugar de modificar con los nuevos valores
    td.innerHTML = '<span style="color: #666; font-style: italic;">Guardando...</span>';
    
    // Obtener información de la actividad
    const actividadCell = row.cells[1];
    const nombreActividad = actividadCell.querySelector('.activity-name')?.textContent.trim() || '';
    const descripcionActividad = actividadCell.querySelector('.activity-desc')?.textContent.trim() || '';
    
    // Guardar cambios
    await saveActivityChanges({
      horaActual: horaInicio,
      nombreActual: nombreActividad,
      dayName: diasSemana[state.currentDayIndex],
      nuevaHora: nuevaHoraInicio,
      nuevaHoraFin: nuevaHoraFin,
      nuevoNombre: nombreActividad,
      nuevaDescripcion: descripcionActividad
    });
    
    guardadoExitoso = true;
  };
  
  // Función para cancelar
  const cancelar = () => {
    if (guardando) return;  // 🔥 No cancelar si ya está guardando
    if (horaFin) {
      td.textContent = `${horaInicio} - ${horaFin}`;
    } else {
      td.textContent = horaInicio ? `${horaInicio} hrs` : '-';
    }
  };
  
  // 🔥 Timer compartido para evitar llamadas duplicadas desde blur
  let blurTimer = null;
  
  // Eventos
  inputInicio.addEventListener('blur', () => {
    if (blurTimer) clearTimeout(blurTimer);
    blurTimer = setTimeout(() => {
      // Solo guardar si no estamos enfocando el otro input
      if (document.activeElement !== inputFin) {
        guardar();
      }
    }, 150);
  });
  
  inputFin.addEventListener('blur', () => {
    if (blurTimer) clearTimeout(blurTimer);
    blurTimer = setTimeout(() => {
      // Solo guardar si no estamos enfocando el otro input
      if (document.activeElement !== inputInicio) {
        guardar();
      }
    }, 150);
  });
  
  inputInicio.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      guardar();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelar();
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      inputFin.focus();
      inputFin.select();
    }
  });
  
  inputFin.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      guardar();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelar();
    }
  });
}

/**
 * editActividadInline(td, row)
 * Convierte la celda de actividad en inputs editables para nombre y descripción
 */
function editActividadInline(td, row) {
  // 🔥 Leer datos desde row.dataset (guardados al construir la fila)
  let nombreOriginal = row.dataset.nombre || '';
  let descripcionOriginal = row.dataset.descripcion || '';
  
  // Fallback: si no hay dataset, intentar leer del DOM
  if (!nombreOriginal) {
    const nombreDiv = td.querySelector('.activity-name');
    const descDiv = td.querySelector('.activity-desc');
    nombreOriginal = nombreDiv?.textContent.trim() || '';
    descripcionOriginal = descDiv?.textContent.trim() || '';
  }
  
  // Limpiar celda
  td.innerHTML = '';
  td.style.padding = '4px';
  td.style.verticalAlign = 'top';
  
  // Crear contenedor
  const container = document.createElement('div');
  container.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  
  // Input nombre (más grande)
  const inputNombre = document.createElement('input');
  inputNombre.type = 'text';
  inputNombre.value = nombreOriginal;
  inputNombre.placeholder = 'Nombre de la actividad';
  inputNombre.style.cssText = 'width: 100%; padding: 4px; font-size: 13px; font-weight: 600; border: 1px solid #0b63d6; border-radius: 3px;';
  
  // Input descripción (más pequeño)
  const inputDesc = document.createElement('input');
  inputDesc.type = 'text';
  inputDesc.value = descripcionOriginal;
  inputDesc.placeholder = 'Descripción (opcional)';
  inputDesc.style.cssText = 'width: 100%; padding: 3px; font-size: 12px; color: #666; border: 1px solid #ccc; border-radius: 3px;';
  
  container.appendChild(inputNombre);
  container.appendChild(inputDesc);
  td.appendChild(container);
  
  // Focus en nombre
  inputNombre.focus();
  inputNombre.select();
  
  // 🔥 Flag para evitar llamadas duplicadas a guardar
  let guardando = false;
  let guardadoExitoso = false;
  
  // Función para guardar
  const guardar = async () => {
    // 🔥 Evitar llamadas duplicadas
    if (guardando || guardadoExitoso) return;
    guardando = true;
    
    const nuevoNombre = inputNombre.value.trim();
    const nuevaDescripcion = inputDesc.value.trim();
    
    if (!nuevoNombre) {
      showToast('El nombre de la actividad es obligatorio', 'error');
      inputNombre.focus();
      guardando = false;
      return;
    }
    
    // 🔥 Mostrar indicador de guardando en lugar de modificar con los nuevos valores
    td.innerHTML = '<span style="color: #666; font-style: italic;">Guardando...</span>';
    
    // 🔥 Obtener información del horario desde row.dataset (no del DOM)
    const horaInicio = row.dataset.horaInicio || '';
    const horaFin = row.dataset.horaFin || '';
    
    // Guardar cambios
    await saveActivityChanges({
      horaActual: horaInicio,
      nombreActual: nombreOriginal,
      dayName: diasSemana[state.currentDayIndex],
      nuevaHora: horaInicio,
      nuevaHoraFin: horaFin,
      nuevoNombre,
      nuevaDescripcion
    });
    
    guardadoExitoso = true;
  };
  
  // Función para cancelar
  const cancelar = () => {
    if (guardando) return;  // 🔥 No cancelar si ya está guardando
    td.innerHTML = '';
    const newNombreDiv = document.createElement('div');
    newNombreDiv.className = 'activity-name';
    newNombreDiv.textContent = nombreOriginal;
    const newDescDiv = document.createElement('div');
    newDescDiv.className = 'activity-desc';
    newDescDiv.textContent = descripcionOriginal;
    td.appendChild(newNombreDiv);
    td.appendChild(newDescDiv);
  };
  
  // 🔥 Timer compartido para evitar llamadas duplicadas desde blur
  let blurTimer = null;
  
  // Eventos
  inputNombre.addEventListener('blur', () => {
    if (blurTimer) clearTimeout(blurTimer);
    blurTimer = setTimeout(() => {
      // Solo guardar si no estamos enfocando el otro input
      if (document.activeElement !== inputDesc) {
        guardar();
      }
    }, 150);
  });
  
  inputDesc.addEventListener('blur', () => {
    if (blurTimer) clearTimeout(blurTimer);
    blurTimer = setTimeout(() => {
      // Solo guardar si no estamos enfocando el otro input
      if (document.activeElement !== inputNombre) {
        guardar();
      }
    }, 150);
  });
  
  inputNombre.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Enter: ir a descripción
        inputDesc.focus();
        inputDesc.select();
      } else {
        guardar();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelar();
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      inputDesc.focus();
      inputDesc.select();
    }
  });
  
  inputDesc.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      guardar();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelar();
    }
  });
}

/**
 * openEditActivityModal({ hora, nombre, descripcion, dayName })
 * Abre un modal para editar el horario y nombre de una actividad
 * Aplica los cambios a TODOS los empleados que tienen esta tarea
 */
function openEditActivityModal({ hora, nombre, descripcion, dayName }) {
  if (!DOM.modal) return;
  
  DOM.modal.classList.remove('hidden');
  
  // Limpiar modal
  DOM.modalTitle.textContent = 'Editar Actividad';
  DOM.modalHour.textContent = '';
  DOM.modalStatus.textContent = '';
  DOM.modalDesc.textContent = '';
  
  // Crear formulario de edición
  const formContainer = document.createElement('div');
  formContainer.className = 'edit-activity-form';
  formContainer.style.cssText = `
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  `;
  
  // Campo de horario
  const horaLabel = document.createElement('label');
  horaLabel.textContent = 'Horario de inicio:';
  horaLabel.style.fontWeight = '600';
  const horaInput = document.createElement('input');
  horaInput.type = 'time';
  horaInput.value = hora;
  horaInput.style.cssText = `
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  `;
  
  // Campo de nombre de actividad
  const nombreLabel = document.createElement('label');
  nombreLabel.textContent = 'Nombre de actividad:';
  nombreLabel.style.fontWeight = '600';
  const nombreInput = document.createElement('input');
  nombreInput.type = 'text';
  nombreInput.value = nombre;
  nombreInput.style.cssText = `
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  `;
  
  // Campo de descripción
  const descripcionLabel = document.createElement('label');
  descripcionLabel.textContent = 'Descripción:';
  descripcionLabel.style.fontWeight = '600';
  const descripcionInput = document.createElement('textarea');
  descripcionInput.value = descripcion;
  descripcionInput.rows = 3;
  descripcionInput.style.cssText = `
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    resize: vertical;
  `;
  
  // Botones
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = `
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 10px;
  `;
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.cssText = `
    padding: 8px 16px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  cancelBtn.onclick = () => {
    formContainer.remove();
    closeModal();
  };
  
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Guardar Cambios';
  saveBtn.style.cssText = `
    padding: 8px 16px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  saveBtn.onclick = async () => {
    const nuevaHora = horaInput.value;
    const nuevoNombre = nombreInput.value.trim();
    const nuevaDescripcion = descripcionInput.value.trim();
    
    if (!nuevaHora || !nuevoNombre) {
      showToast('El horario y nombre son obligatorios', 'error');
      return;
    }
    
    // Aplicar cambios a todos los empleados que tienen esta tarea
    await saveActivityChanges({
      horaActual: hora,
      nombreActual: nombre,
      dayName,
      nuevaHora,
      nuevoNombre,
      nuevaDescripcion
    });
    
    formContainer.remove();
    closeModal();
  };
  
  buttonsContainer.appendChild(cancelBtn);
  buttonsContainer.appendChild(saveBtn);
  
  formContainer.appendChild(horaLabel);
  formContainer.appendChild(horaInput);
  formContainer.appendChild(nombreLabel);
  formContainer.appendChild(nombreInput);
  formContainer.appendChild(descripcionLabel);
  formContainer.appendChild(descripcionInput);
  formContainer.appendChild(buttonsContainer);
  
  // Insertar formulario en el modal
  const modalContent = DOM.modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.appendChild(formContainer);
  }
}

/**
 * saveActivityChanges({ horaActual, nombreActual, dayName, nuevaHora, nuevoNombre, nuevaDescripcion })
 * Guarda los cambios de una actividad para TODOS los empleados que la tienen asignada
 */
/**
 * saveActivityChanges({ horaActual, nombreActual, dayName, nuevaHora, nuevaHoraFin, nuevoNombre, nuevaDescripcion, nuevosPuntos })
 * Guarda los cambios de una actividad para TODOS los empleados que la tienen asignada
 */
async function saveActivityChanges({ horaActual, nombreActual, dayName, nuevaHora, nuevaHoraFin = '', nuevoNombre, nuevaDescripcion, nuevosPuntos = null }) {
  // 🔥 Validar que los puntos estén entre 1 y 10
  if (nuevosPuntos !== null && nuevosPuntos !== undefined) {
    const puntosNum = parseInt(nuevosPuntos);
    if (isNaN(puntosNum) || puntosNum < 1 || puntosNum > 10) {
      showToast('Los puntos deben ser un valor entre 1 y 10', 'error');
      return;
    }
  }
  
  showToast('Guardando cambios...', 'info', 2000);
  
   console.log('🔍 Guardando cambios:', {
    horaActual,
    nombreActual,
    dayName,
    nuevaHora,
    nuevaHoraFin,
    nuevoNombre,
    nuevaDescripcion,
    nuevosPuntos
  });
  
  try {
    // 🔥 Calcular la fecha del día mostrado (las tareas usan YYYY-MM-DD como clave)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDayIndex = today.getDay();
    
    let dayDiff = state.currentDayIndex - todayDayIndex;
    if (state.currentDayIndex < todayDayIndex) {
      dayDiff += 7;
    }
    
    const displayedDate = new Date(today);
    displayedDate.setDate(today.getDate() + dayDiff);
    const fechaKey = displayedDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // console.log('🔍 [saveActivityChanges] Buscando tareas con:', { dayName, fechaKey, horaActual, nombreActual });
    
    // Encontrar todos los empleados que tienen esta tarea
    const empleadosConTarea = [];
    
    state.trabajadores.forEach(emp => {
      // 🔥 Buscar en TODAS las fechas del empleado, no solo en dayName
      const tareas_asignadas = emp.tareas_asignadas || {};
      
      for (const [fKey, tareasDeEstaFecha] of Object.entries(tareas_asignadas)) {
        if (!Array.isArray(tareasDeEstaFecha)) continue;
        
        // Verificar si esta fecha corresponde al día mostrado
        let esMismoDia = false;
        if (/^\d{4}-\d{2}-\d{2}$/.test(fKey)) {
          // Es una fecha, verificar si coincide con fechaKey o el mismo día de semana
          const [year, month, day] = fKey.split('-').map(Number);
          const fecha = new Date(year, month - 1, day);
          const diaSemana = diasSemana[fecha.getDay()];
          esMismoDia = (fKey === fechaKey) || (diaSemana === dayName);
        } else {
          // Fallback: la clave es un día de semana
          esMismoDia = (fKey.toLowerCase() === dayName.toLowerCase());
        }
        
        if (!esMismoDia) continue;
        
        const tarea = tareasDeEstaFecha.find(t => {
          const nombreTarea = (t.nombre || '').trim();
          const horaTarea = (t.hora || '').trim();
          const nombreBuscado = (nombreActual || '').trim();
          const horaBuscada = (horaActual || '').trim();
          
          return nombreTarea === nombreBuscado && horaTarea === horaBuscada;
        });
        
        if (tarea) {
          // console.log('✅ Encontrada en empleado:', emp.nombre, 'Tarea ID:', tarea.id, 'FechaKey:', fKey);
          empleadosConTarea.push({
            empleado: emp,
            tarea: tarea,
            fechaReal: fKey  // 🔥 Guardar la fecha real para el PATCH
          });
        }
      }
    });
    
    if (empleadosConTarea.length === 0) {
      showToast('No se encontraron tareas para actualizar', 'warning');
      return;
    }
    
    // Actualizar cada empleado
    const promises = empleadosConTarea.map(async ({ empleado, tarea, fechaReal }) => {
      const tareaId = Number(tarea.id);
      // 🔥 Usar fechaReal (YYYY-MM-DD) en lugar de dayName
      const payload = {
        tareas_asignadas: {
          [fechaReal]: [{
            id: tareaId,
            nombre: nuevoNombre,
            descripcion: nuevaDescripcion,
            hora: nuevaHora,
            hora_fin: nuevaHoraFin // 🔥 Incluir hora_fin
          }]
        }
      };
      
      // 🔥 Agregar puntos solo si se proporcionan
      if (nuevosPuntos !== null && nuevosPuntos !== undefined) {
        payload.tareas_asignadas[dayName][0].puntaje = parseInt(nuevosPuntos) || 0;
      }
      
      const response = await fetch(`/empleados/${empleado.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Error al actualizar empleado ${empleado.nombre}`);
      }
      
      return response.json();
    });
    
    await Promise.all(promises);
    
    showToast(`✅ Actividad actualizada - Refrescando...`, 'success', 2000);
    
    // 🔥 SOLUCIÓN DEFINITIVA: Refrescar la página completa para limpiar todo el cache
    setTimeout(() => {
      window.location.reload();
    }, 500);
    
  } catch (error) {
    console.error('Error al guardar cambios de actividad:', error);
    showToast('❌ Error al guardar los cambios: ' + error.message, 'error');
  }
}

/* ===== MODAL DE INFORMACIÓN PARA VISITANTES ===== */
/**
 * openModalVisitante(taskInfo)
 * Muestra un modal con información de la tarea para visitantes.
 * Si allowComplete es true, muestra botón de completar que abre el PIN.
 */
function openModalVisitante(taskInfo) {
  // Usar el modal existente #task-modal
  const modal = DOM.modal;
  if (!modal) return;
  
  // Limpiar contenido
  DOM.modalTaskName.innerHTML = '';
  DOM.modalTaskDesc.innerHTML = '';
  
  // Título con nombre de la tarea
  DOM.modalTaskName.textContent = taskInfo.nombre || 'Información de Tarea';
  
  // Descripción
  const descDiv = document.createElement('div');
  descDiv.className = 'modal-readonly-desc';
  descDiv.style.cssText = 'margin-bottom: 15px; color: #555; font-size: 14px; line-height: 1.6;';
  descDiv.textContent = taskInfo.descripcion || 'Sin descripción';
  DOM.modalTaskDesc.appendChild(descDiv);
  
  // Panel de información
  const infoPanel = document.createElement('div');
  infoPanel.className = 'task-info-panel';
  infoPanel.style.cssText = 'background: #f8f9fa; border: 1px solid #e8eaed; border-radius: 10px; padding: 15px; margin-bottom: 15px;';
  
  // Construir información
  let horaInfo = taskInfo.hora || 'No especificada';
  if (taskInfo.hora_fin) {
    horaInfo += ` - ${taskInfo.hora_fin}`;
  }
  
  infoPanel.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 14px;">
      <div>
        <span style="color: #888; font-size: 12px; text-transform: uppercase;">Horario</span>
        <div style="font-weight: 600; color: #333; margin-top: 4px;">${horaInfo}</div>
      </div>
      <div>
        <span style="color: #888; font-size: 12px; text-transform: uppercase;">Puntos</span>
        <div style="font-weight: 600; color: #667eea; margin-top: 4px;">${taskInfo.puntaje || 0} pts</div>
      </div>
      <div style="grid-column: span 2;">
        <span style="color: #888; font-size: 12px; text-transform: uppercase;">Estado</span>
        <div style="font-weight: 600; color: #333; margin-top: 4px;">${getStatusText(taskInfo.estatus)}</div>
      </div>
    </div>
  `;
  DOM.modalTaskDesc.appendChild(infoPanel);
  
  // Configurar botones
  const closeBtn = document.getElementById('modal-close-btn');
  const completeBtn = DOM.modalCompleteBtn;
  
  // Botón cerrar
  if (closeBtn) {
    closeBtn.style.display = 'inline-flex';
    closeBtn.onclick = closeModal;
  }
  
  // Botón completar - solo si se permite y la tarea no está completada/vencida
  if (completeBtn) {
    if (taskInfo.allowComplete) {
      // 🔥 Validar si la tarea puede completarse (horario)
      const validacion = validarSiPuedeCompletarse(taskInfo, taskInfo.empId, diasSemana[state.currentDayIndex]);
      
      if (validacion.puedeCompletar) {
        completeBtn.style.display = 'inline-flex';
        completeBtn.innerHTML = '✓ Completar Tarea';
        completeBtn.onclick = () => {
          // Cerrar este modal y abrir el de PIN
          closeModal();
          openPinModal(taskInfo);
        };
      } else {
        // No puede completar - mostrar mensaje
        completeBtn.style.display = 'none';
        
        // Agregar mensaje de advertencia
        const warningDiv = document.createElement('div');
        warningDiv.className = 'tarea-horario-warning';
        warningDiv.innerHTML = `
          <div style="padding: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; margin-top: 10px; color: #856404;">
            <strong>⚠️ ${validacion.razon}</strong>
          </div>
        `;
        DOM.modalTaskDesc.appendChild(warningDiv);
      }
    } else {
      completeBtn.style.display = 'none';
    }
  }
  
  // Limpiar botones de guardar/eliminar que puedan haber quedado de admin
  const actions = modal.querySelector('.modal-actions');
  if (actions) {
    const oldSaveBtn = actions.querySelector('.modal-save-btn');
    const oldDeleteBtn = actions.querySelector('.modal-delete-btn');
    if (oldSaveBtn) oldSaveBtn.remove();
    if (oldDeleteBtn) oldDeleteBtn.remove();
  }
  
  // Mostrar modal
  modal.classList.remove('hidden');
}

/* ===== MODAL DE PIN PARA ACCESO RÁPIDO ===== */
let currentPinTask = null; // Almacena información de la tarea pendiente
let currentPin = ''; // PIN actual siendo ingresado

/**
 * openPinModal(taskInfo)
 * Abre el modal de PIN para validar acceso rápido y completar tarea
 */
function openPinModal(taskInfo) {
  currentPinTask = taskInfo;
  currentPin = '';
  
  const pinModal = document.getElementById('pin-modal');
  const pinDots = pinModal.querySelectorAll('.pin-dot');
  const pinError = document.getElementById('pin-error');
  
  // Limpiar estado visual
  pinDots.forEach(dot => dot.classList.remove('filled'));
  pinError.textContent = '';
  
  // Mostrar modal
  pinModal.classList.remove('hidden');
  
  // Event listeners para teclado
  const pinKeys = pinModal.querySelectorAll('.pin-key');
  pinKeys.forEach(key => {
    key.onclick = () => handlePinKeyPress(key.dataset.value, pinDots, pinError);
  });
}

/**
 * closePinModal()
 * Cierra el modal de PIN y limpia el estado
 */
function closePinModal() {
  const pinModal = document.getElementById('pin-modal');
  pinModal.classList.add('hidden');
  currentPinTask = null;
  currentPin = '';
}

/**
 * handlePinKeyPress(value, pinDots, pinError)
 * Maneja la entrada del teclado numérico del PIN
 */
function handlePinKeyPress(value, pinDots, pinError) {
  if (value === 'clear') {
    if (currentPin.length > 0) {
      currentPin = currentPin.slice(0, -1);
      updatePinDots(pinDots);
      pinError.textContent = '';
    }
    return;
  }
  
  if (currentPin.length < 4) {
    currentPin += value;
    updatePinDots(pinDots);
    pinError.textContent = '';
    
    // Si completó 4 dígitos, validar automáticamente
    if (currentPin.length === 4) {
      setTimeout(() => validatePinAndCompleteTask(currentPin, currentPinTask, pinError, pinDots), 300);
    }
  }
}

/**
 * updatePinDots(pinDots)
 * Actualiza la visualización de los puntos del PIN
 */
function updatePinDots(pinDots) {
  pinDots.forEach((dot, index) => {
    if (index < currentPin.length) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  });
}

/**
 * validatePinAndCompleteTask(pin, taskInfo, errorElement, pinDots)
 * Valida el PIN con el backend y completa la tarea si es correcto
 */
async function validatePinAndCompleteTask(pin, taskInfo, errorElement, pinDots) {
  try {
    errorElement.textContent = '⏳ Validando PIN...';
    errorElement.style.color = '#666';
    
    // Validar PIN con backend
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    
    if (!response.ok) {
      throw new Error('PIN incorrecto');
    }
    
    // Obtener el texto primero para debug
    const responseText = await response.text();
    // console.log('📥 Respuesta del servidor:', responseText);
    
    // Intentar parsear como JSON
    let userData;
    try {
      userData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Error parseando JSON:', parseError);
      console.error('📄 Texto recibido:', responseText);
      throw new Error('Respuesta inválida del servidor');
    }
    
    // Verificar que el usuario tenga empleado_id
    if (!userData.empleado_id) {
      errorElement.textContent = '❌ Usuario sin empleado asignado';
      errorElement.style.color = '#dc3545';
      currentPin = '';
      updatePinDots(pinDots);
      return;
    }
    
    const empleadoId = Number(userData.empleado_id);
    const dayName = diasSemana[state.currentDayIndex];
    
    // 🔥 CASO 1: Tarea extra disponible (vencida de otro empleado)
    if (taskInfo.isAvailableExtra) {
      // Cualquier empleado puede completar una tarea extra
      await completarTareaExtraConPin(taskInfo, empleadoId, userData.username);
      return;
    }
    
    // 🔥 CASO 2: Tarea normal del empleado
    // Verificar que el empleado sea el dueño de la tarea
    if (empleadoId !== taskInfo.empId) {
      errorElement.textContent = '❌ Esta tarea no te pertenece';
      errorElement.style.color = '#dc3545';
      currentPin = '';
      updatePinDots(pinDots);
      return;
    }
    
    // Validar que esté en horario para completar la tarea
    const validacion = validarSiPuedeCompletarse(taskInfo, empleadoId, dayName);
    
    if (!validacion.puedeCompletar) {
      errorElement.textContent = `❌ ${validacion.razon}`;
      errorElement.style.color = '#dc3545';
      currentPin = '';
      updatePinDots(pinDots);
      return;
    }
    
    // Completar la tarea
    await completarTareaNormalConPin(taskInfo, empleadoId, userData.username);
    
  } catch (error) {
    console.error('Error al validar PIN:', error);
    errorElement.textContent = '❌ PIN incorrecto';
    errorElement.style.color = '#dc3545';
    currentPin = '';
    updatePinDots(pinDots);
  }
}

/**
 * completarTareaNormalConPin(taskInfo, empleadoId, username)
 * Completa una tarea normal del empleado autenticado con PIN
 */
async function completarTareaNormalConPin(taskInfo, empleadoId, username) {
  try {
    const dayName = diasSemana[state.currentDayIndex];
    
    // Calcular el estatus correcto usando la función existente
    // Para PIN, el usuario que completa ES el dueño de la tarea (ya validado)
    const nuevoEstatus = calcularEstatusCompletado(
      taskInfo,
      taskInfo.empId,
      dayName,
      false, // No es admin (es autenticación con PIN)
      empleadoId // El usuario que ingresó el PIN
    );
    
    // Usar la misma lógica que el modal normal
    const payload = { tareas_asignadas: {} };
    payload.tareas_asignadas[dayName] = [{ 
      id: Number(taskInfo.tareaId), 
      estatus: Number(nuevoEstatus) 
    }];
    
    const response = await fetch(`/empleados/${empleadoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }
    
    // Cerrar modal de PIN
    closePinModal();
    
    // Mostrar mensaje de éxito
    showToast(`✅ Tarea completada por ${username}`, 'success', 3000);
    // 🔥 Recargar la página después de completar por PIN (visitante)
    setTimeout(() => { location.reload(); }, 1000);
    
  } catch (error) {
    console.error('Error al completar tarea:', error);
    const pinError = document.getElementById('pin-error');
    pinError.textContent = `❌ ${error.message}`;
    pinError.style.color = '#dc3545';
    currentPin = '';
    const pinDots = document.querySelectorAll('.pin-dot');
    updatePinDots(pinDots);
  }
}

/**
 * completarTareaExtraConPin(taskInfo, empleadoId, username)
 * Completa una tarea extra (vencida de otro empleado) autenticado con PIN
 * - El empleado ORIGINAL (Luis) mantiene estatus 4 (no completada - roja)
 * - El empleado que la completa (David) recibe una tarea extra con estatus 5 (azul fuerte)
 */
async function completarTareaExtraConPin(taskInfo, empleadoId, username) {
  try {
    // 🔥 CRÍTICO: Usar siempre el día actual REAL, no state.currentDayIndex
    // Esto asegura que las extras se completen SOLO en el día actual
    const hoy = new Date();
    const hoyDayIndex = hoy.getDay();
    const dayName = diasSemana[hoyDayIndex];
    
    // 🔥 FIX: Usar fechaKey en formato YYYY-MM-DD para buscar en tareas_asignadas
    // El backend agrupa las tareas por fecha, no por nombre del día
    const fechaKey = hoy.getFullYear() + '-' + 
                     String(hoy.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(hoy.getDate()).padStart(2, '0');
    
    // Validar que el usuario está mirando el día actual
    if (state.currentDayIndex !== hoyDayIndex) {
      throw new Error('⚠️ Solo puedes completar tareas extras el día actual. Por favor, vuelve a hoy.');
    }
    
    // 🔥 DEBUG: Ver datos disponibles
    // console.log('🔍 DEBUG completarTareaExtraConPin:');
    // console.log('  empleadoId recibido:', empleadoId, typeof empleadoId);
    // console.log('  taskInfo:', taskInfo);
    // console.log('  state.trabajadores IDs:', state.trabajadores.map(t => ({id: t.id, nombre: t.nombre})));
    
    // Buscar el empleado que COMPLETÓ la tarea (quien ingresó el PIN)
    const empleadoQueCompleta = state.trabajadores.find(t => {
      // console.log(`    Comparando: t.id=${t.id} (${typeof t.id}) con empleadoId=${empleadoId} (${typeof empleadoId})`);
      return t.id === Number(empleadoId);
    });
    
    if (!empleadoQueCompleta) {
      console.error('❌ Empleado no encontrado. Búsqueda falló.');
      console.error('   Buscando ID:', empleadoId);
      console.error('   IDs disponibles:', state.trabajadores.map(t => t.id));
      throw new Error('Empleado no encontrado');
    }
    
    // console.log('✅ Empleado que completa encontrado:', empleadoQueCompleta.nombre);
    
    // Buscar información de la tarea original
    const empleadoOriginal = state.trabajadores.find(t => t.id === Number(taskInfo.originalEmpId));
    if (!empleadoOriginal) {
      throw new Error('Tarea original no encontrada');
    }
    
    // 🔥 FIX: Buscar usando fechaKey (YYYY-MM-DD) en lugar de dayName
    const tareasOriginal = (empleadoOriginal.tareas_asignadas && empleadoOriginal.tareas_asignadas[fechaKey]) || [];
    const tareaOriginal = tareasOriginal.find(t => String(t.id) === String(taskInfo.originalTaskId));
    
    if (!tareaOriginal) {
      throw new Error('Tarea original no encontrada');
    }
    
    // Obtener tareas del empleado que completa
    if (!empleadoQueCompleta.tareas_asignadas) {
      empleadoQueCompleta.tareas_asignadas = {};
    }
    if (!empleadoQueCompleta.tareas_asignadas[fechaKey]) {
      empleadoQueCompleta.tareas_asignadas[fechaKey] = [];
    }
    
    const tareasDelQueCompleta = empleadoQueCompleta.tareas_asignadas[fechaKey];
    
    // Verificar que no haya completado ya esta tarea extra
    const yaCompletada = tareasDelQueCompleta.some(t => 
      t.estatus === 5 && 
      String(t.tarea_original_id) === String(taskInfo.originalTaskId) &&
      String(t.empleado_original_id) === String(taskInfo.originalEmpId)
    );
    
    if (yaCompletada) {
      throw new Error('Ya completaste esta tarea extra');
    }
    
    // Crear nueva tarea extra para el empleado que la completa
    const nuevaTareaExtra = {
      id: `extra_${taskInfo.originalTaskId}_${Date.now()}`,  // ID único
      nombre: tareaOriginal.nombre || taskInfo.taskDesc,
      hora: tareaOriginal.hora || taskInfo.hour,
      hora_fin: tareaOriginal.hora_fin,
      puntaje: tareaOriginal.puntaje || "0",
      estatus: 5,  // 🔥 Estatus 5 = tarea extra completada (azul fuerte)
      esExtra: true,  // 🔥 Marca para identificar que es tarea extra
      tareaOriginalId: Number(taskInfo.originalTaskId),  // ID de la tarea original (sin guión bajo)
      tarea_original_id: taskInfo.originalTaskId,  // Mantener compatibilidad
      empleado_original_id: taskInfo.originalEmpId,  // ID del dueño original (Luis)
      empleado_original_nombre: empleadoOriginal.nombre,  // Nombre del dueño original
      fecha_completado: new Date().toISOString()
    };
    
    // Agregar la tarea extra al empleado que la completó (solo local, para UI)
    tareasDelQueCompleta.push(nuevaTareaExtra);
    
    // 🔥 [FIX] Enviar SOLO la nueva tarea extra al backend, no todas las tareas del día
    // Esto evita que tareas extras ya guardadas se dupliquen en la BD
    // (Mismo patrón que el flujo de GUI logueado en completarExtraParaEmpleado)
    const response = await fetch(`/empleados/${empleadoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tareas_asignadas: {
          [dayName]: [nuevaTareaExtra]  // 🔥 Solo la NUEVA tarea extra
        }
      })
    });
    
    if (!response.ok) {
      throw new Error('Error al actualizar tarea en el servidor');
    }
    
    // Cerrar modal de PIN
    closePinModal();
    
    // Mostrar mensaje de éxito
    showToast(`✅ Tarea extra completada por ${username}`, 'success', 3000);
    // 🔥 Recargar la página después de completar por PIN (visitante)
    setTimeout(() => { location.reload(); }, 1000);
    
  } catch (error) {
    console.error('Error al completar tarea extra:', error);
    const pinError = document.getElementById('pin-error');
    pinError.textContent = `❌ ${error.message}`;
    pinError.style.color = '#dc3545';
    currentPin = '';
    const pinDots = document.querySelectorAll('.pin-dot');
    updatePinDots(pinDots);
  }
}

function closeModal() { 
  DOM.modal.classList.add('hidden');
  
  // Limpiar campos editables al cerrar
  const inputs = DOM.modal.querySelectorAll('.modal-inline-input, .modal-inline-textarea');
  inputs.forEach(input => input.remove());
  
  // Limpiar elementos adicionales
  const additionalElements = DOM.modal.querySelectorAll('.task-info-panel, .modal-save-btn, .modal-extra-complete');
  additionalElements.forEach(el => el.remove());
  
  // Remover clase de edición inline
  const modalContent = DOM.modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.classList.remove('inline-edit');
  }
}

/**
 * getStatusText(estatus)
 * Convierte el número de estatus a texto legible
 */
function getStatusText(estatus) {
  switch(Number(estatus)) {
    case 1: return 'En Progreso';
    case 2: return 'Sin Iniciar';
    case 3: return 'Completada';
    case 4: return 'No Completada';
    case 5: return 'Extra';
    default: return 'Sin estado';
  }
}

/**
 * saveTaskChanges(tarea, newName, newDesc, newHora)
 * Guarda los cambios realizados en el modal de edición inline
 * SOLO envía los cambios al backend - NO modifica estados localmente
 */
async function saveTaskChanges(tarea, newName, newDesc, newHora, newHoraFin, newPuntos = null) {
  if (!tarea.empId || !tarea.tareaId) {
    showToast('Error: No se pudo identificar la tarea para guardar', 'error');
    return;
  }
  
  // 🔥 NUEVO: Validar que no sea una tarea del pasado (más de 365 días)
  if (tarea.fecha_inicio) {
    const fechaTarea = new Date(tarea.fecha_inicio);
    const ahora = new Date();
    const diasDiferencia = Math.floor((ahora - fechaTarea) / (1000 * 60 * 60 * 24));
    
    if (diasDiferencia > 365) {
      showToast('❌ No puedes editar tareas de más de un año atrás.', 'error', 4000);
      return;
    }
  }
  
  // 🔥 Validar que los puntos estén entre 1 y 10
  if (newPuntos !== null && newPuntos !== undefined) {
    const puntosNum = parseInt(newPuntos);
    if (isNaN(puntosNum) || puntosNum < 1 || puntosNum > 10) {
      showToast('Los puntos deben ser un valor entre 1 y 10', 'error');
      return;
    }
  }

  const saveBtn = DOM.modal.querySelector('.modal-save-btn');
  const originalText = saveBtn.textContent;
  
  // UI feedback: deshabilitar botón mientras se guarda
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';
  saveBtn.style.background = '#6c757d';

  try {
    const dayName = diasSemana[state.currentDayIndex];
    
    // Preparar payload para el backend
    const payload = {
      tareas_asignadas: {}
    };
    const tareaData = {
      id: Number(tarea.tareaId),
      nombre: newName,
      descripcion: newDesc,
      hora: newHora
      // ❌ NO incluir estatus - el backend lo calculará automáticamente
    };
    // 🔥 Incluir hora_fin: si tiene valor, usarlo; si está vacío, NO ENVIAR NADA para mantener el valor anterior
    if (newHoraFin && newHoraFin.trim() !== '') {
      tareaData.hora_fin = newHoraFin;
    }
    // ✅ NO enviar hora_fin = null (esto corrompe la BD con None)
    // 🔥 Incluir puntos si se proporcionan
    if (newPuntos !== null && newPuntos !== undefined) {
      tareaData.puntaje = parseInt(newPuntos) || 0;
    }
    payload.tareas_asignadas[dayName] = [tareaData];

    // Enviar al backend (tarea original)
    const response = await fetch(`/empleados/${tarea.empId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    // 🔥 NUEVO: Actualizar tareas extras que referencian esta tarea original
    const tareaOriginalId = Number(tarea.tareaId);
    const tareasExtrasActualizadas = [];
    
    // console.log(`🔍 Buscando tareas extras con tareaOriginalId === ${tareaOriginalId}`);
    
    // Buscar en todos los empleados tareas extras con tareaOriginalId === tareaId
    for (const empleado of state.trabajadores) {
      if (!empleado.tareas_asignadas) continue;
      
      // Saltar empleado original
      if (Number(empleado.id) === Number(tarea.empId)) {
        // console.log(`⏭️ Saltando empleado original: ${empleado.nombre} (ID: ${empleado.id})`);
        continue;
      }
      
      for (const dia in empleado.tareas_asignadas) {
        const tareasDelDia = empleado.tareas_asignadas[dia] || [];
        
        for (const t of tareasDelDia) {
          // console.log(`🔎 Revisando ${empleado.nombre} - ${dia}: esExtra=${t.esExtra}, tareaOriginalId=${t.tareaOriginalId}, buscando=${tareaOriginalId}`);
          
          // Si es una tarea extra que referencia la tarea original
          if (t.esExtra === true && Number(t.tareaOriginalId) === tareaOriginalId) {
            // console.log(`🎯 ENCONTRADA tarea extra en ${empleado.nombre} (${dia}), ID: ${t.id}`);
            
            // Actualizar con los nuevos valores
            const payloadExtra = {
              tareas_asignadas: {}
            };
            const tareaExtraData = {
              id: Number(t.id),
              nombre: newName,
              descripcion: newDesc,
              hora: newHora
              // Mantener estatus 5 (extra)
            };
            // 🔥 Incluir hora_fin: si tiene valor, usarlo; si está vacío, NO ENVIAR NADA para mantener el valor anterior
            if (newHoraFin && newHoraFin.trim() !== '') {
              tareaExtraData.hora_fin = newHoraFin;
            }
            // ✅ NO enviar hora_fin = null (esto corrompe la BD con None)
            payloadExtra.tareas_asignadas[dia] = [tareaExtraData];
            
            // console.log(`📤 Enviando actualización a empleado ${empleado.id}:`, payloadExtra);
            
            // Enviar actualización al backend
            try {
              const respExtra = await fetch(`/empleados/${empleado.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadExtra)
              });
              
              if (respExtra.ok) {
                tareasExtrasActualizadas.push(`${empleado.nombre} (${dia})`);
                // console.log(`✅ Tarea extra actualizada en ${empleado.nombre} - Nuevo nombre: "${newName}"`);
              } else {
                console.error(`❌ Error HTTP ${respExtra.status} al actualizar ${empleado.nombre}`);
              }
            } catch (errExtra) {
              console.warn(`⚠️ Error al actualizar tarea extra en ${empleado.nombre}:`, errExtra);
            }
          }
        }
      }
    }
    
    // Log final
    if (tareasExtrasActualizadas.length > 0) {
      // console.log(`✅ ${tareasExtrasActualizadas.length} tarea(s) extra(s) actualizada(s):`, tareasExtrasActualizadas);
    } else {
      // console.log(`ℹ️ No se encontraron tareas extras con tareaOriginalId=${tareaOriginalId}`);
    }

    // Mensaje de éxito
    let mensaje = `Tarea "${newName}" actualizada correctamente`;
    if (tareasExtrasActualizadas.length > 0) {
      mensaje += ` (+ ${tareasExtrasActualizadas.length} extra${tareasExtrasActualizadas.length > 1 ? 's' : ''})`;
    }
    showToast(mensaje + ' - Refrescando...', 'success', 2000);
    closeModal();
    
    // 🔥 SOLUCIÓN DEFINITIVA: Refrescar la página completa para limpiar todo el cache
    setTimeout(() => {
      window.location.reload();
    }, 500);
    
  } catch (error) {
    console.error('Error al guardar cambios de tarea:', error);
    showToast('Error al guardar los cambios: ' + error.message, 'error');
    
    // Restaurar botón
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
    saveBtn.style.background = '#28a745';
  }
}

/**
 * deleteTask(tarea)
 * Elimina una tarea del empleado después de confirmar con el usuario
 */
async function deleteTask(tarea) {
  if (!tarea.empId || !tarea.tareaId) {
    showToast('Error: No se pudo identificar la tarea para eliminar', 'error');
    return;
  }

  // 🔥 NUEVO: Validar que no sea una tarea del pasado (más de 7 días)
  if (tarea.fecha_inicio) {
    const fechaTarea = new Date(tarea.fecha_inicio);
    const ahora = new Date();
    const diasDiferencia = Math.floor((ahora - fechaTarea) / (1000 * 60 * 60 * 24));
    
    if (diasDiferencia > 7) {
      showToast('❌ No puedes eliminar tareas de semanas anteriores. Solo el período actual.', 'error', 4000);
      return;
    }
  }

  // Confirmar eliminación
  const confirmacion = confirm(`¿Estás seguro de que deseas eliminar la tarea "${tarea.nombre}"?\n\nEsta acción no se puede deshacer.`);
  if (!confirmacion) return;

  try {
    const dayName = diasSemana[state.currentDayIndex];
    
    // 🔥 NUEVO: Usar endpoint DELETE específico para tareas
    const response = await fetch(`/empleados/${tarea.empId}/tareas/${dayName}/${tarea.tareaId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error del servidor: ${response.status}`);
    }

    const result = await response.json();
    // console.log('✅ Tarea eliminada del backend:', result);

    // 🔥 Eliminar también tareas extras relacionadas (con tareaOriginalId)
    const tareaOriginalId = Number(tarea.tareaId);
    let tareasExtrasEliminadas = 0;

    for (const emp of state.trabajadores) {
      if (!emp.tareas_asignadas) continue;
      
      // Saltar empleado original
      if (Number(emp.id) === Number(tarea.empId)) continue;

      for (const dia in emp.tareas_asignadas) {
        const tareasDelDia = emp.tareas_asignadas[dia] || [];
        
        // Buscar tareas extras con tareaOriginalId que coincida
        for (const t of tareasDelDia) {
          if (t.esExtra === true && Number(t.tareaOriginalId) === tareaOriginalId) {
            // Eliminar esta tarea extra
            try {
              const respExtra = await fetch(`/empleados/${emp.id}/tareas/${dia}/${t.id}`, {
                method: 'DELETE'
              });
              
              if (respExtra.ok) {
                tareasExtrasEliminadas++;
                // console.log(`✅ Tarea extra eliminada: ${emp.nombre} - ${dia} - ID: ${t.id}`);
              }
            } catch (errExtra) {
              console.warn(`⚠️ Error al eliminar tarea extra en ${emp.nombre}:`, errExtra);
            }
          }
        }
      }
    }

    // Mensaje de éxito
    let mensaje = `Tarea "${tarea.nombre}" eliminada correctamente`;
    if (tareasExtrasEliminadas > 0) {
      mensaje += ` (+ ${tareasExtrasEliminadas} extra${tareasExtrasEliminadas > 1 ? 's' : ''})`;
    }
    showToast(mensaje, 'success', 4000);
    closeModal();

    // Forzar recarga de empleados
    setTimeout(async () => {
      try {
        const resp = await fetch('/empleados-con-tareas', { cache: 'no-store' });
        if (resp.ok) {
          state.trabajadores = await resp.json();
          buildActivitiesCache();
          renderForCurrentState();
          
          const now = new Date();
          updateCellStates(now);
        }
      } catch (err) {
        console.warn('Error al recargar empleados después de eliminar:', err);
      }
    }, 500);

  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    showToast('Error al eliminar la tarea: ' + error.message, 'error');
  }
}

/**
 * deleteEmployee(empId, empName)
 * Elimina un empleado completamente del sistema.
 * Solo disponible para admin/supervisor.
 */
async function deleteEmployee(empId, empName) {
  if (!empId) {
    showToast('Error: No se pudo identificar el empleado para eliminar', 'error');
    return;
  }

  // Confirmar eliminación con advertencia fuerte
  const confirmacion = confirm(
    `⚠️ ADVERTENCIA: ¿Estás seguro de que deseas eliminar al empleado "${empName}"?\n\n` +
    `Esta acción eliminará:\n` +
    `• Toda la información del empleado\n` +
    `• Todas sus tareas asignadas\n` +
    `• Su historial de puntos\n` +
    `• Su cuenta de usuario\n\n` +
    `Esta acción NO se puede deshacer.`
  );
  
  if (!confirmacion) return;

  // Segunda confirmación
  const confirmacion2 = confirm(`¿Realmente deseas eliminar a "${empName}"? Esta es tu última oportunidad para cancelar.`);
  if (!confirmacion2) return;

  try {
    showToast(`Eliminando empleado "${empName}"...`, 'info', 2000);

    const response = await fetch(`/empleados/${empId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error del servidor: ${response.status}`);
    }

    const result = await response.json();
    // console.log('✅ Empleado eliminado del backend:', result);

    showToast(`Empleado "${empName}" eliminado correctamente`, 'success', 4000);

    // 🔥 NUEVO: Auto-reload después de eliminar empleado para refrescar toda la interfaz
    setTimeout(() => {
      location.reload();
    }, 1000);

  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    showToast('Error al eliminar el empleado: ' + error.message, 'error');
  }
}


/* ===== Toasts (UI confirmation) ===== */
/**
 * showToast(msg, type = 'success', timeout = 3000)
 * Muestra una notificación no bloqueante en la UI.
 */
function showToast(msg, type = 'success', timeout = 3000) {
  let container = document.getElementById('toast-container-actividades');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container-actividades';
    container.style.position = 'fixed';
    container.style.right = '16px';
    container.style.bottom = '16px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  toast.style.padding = '10px 14px';
  toast.style.borderRadius = '6px';
  toast.style.color = '#111';
  toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  toast.style.fontSize = '14px';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 160ms ease, transform 200ms ease';
  if (type === 'error') {
    toast.style.background = '#ffdede';
    toast.style.border = '1px solid #ff9a9a';
  } else if (type === 'info') {
    toast.style.background = '#e3f2fd';
    toast.style.border = '1px solid #90caf9';
    toast.style.color = '#1565c0';
  } else {
    toast.style.background = '#eaffd6';
    toast.style.border = '1px solid #b7f08a';
  }

  container.appendChild(toast);
  // force layout
  void toast.offsetWidth;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(() => toast.remove(), 300);
  }, timeout);
}


/**
 * Actualiza el estatus de una tarea en state.trabajadores en memoria.
 * Luego re-renderiza la UI y actualiza el KPI/chart.
 * empId: número, dia: nombre del día (e.g., 'lunes'), hora: 'HH:MM', nombre: string, newStatus: número
 */
function updateTaskStatus(empId, dia, hora, nombre, newStatus) {
  if (!empId || !dia) return;
  const empIndex = state.trabajadores.findIndex(t => Number(t.id) === Number(empId));
  if (empIndex < 0) return;
  
  // 🔥 NUEVO: Convertir nombre del día (ej: "domingo") a fecha (ej: "2026-01-11")
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDayIndex = today.getDay();
  const diasSemanaLocal = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  
  const dayIndex = diasSemanaLocal.indexOf(dia.toLowerCase());
  let dayDiff = dayIndex - todayDayIndex;
  if (dayIndex < todayDayIndex) {
    dayDiff += 7;
  }
  
  const displayedDate = new Date(today);
  displayedDate.setDate(today.getDate() + dayDiff);
  const fechaKey = displayedDate.getFullYear() + '-' + 
                   String(displayedDate.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(displayedDate.getDate()).padStart(2, '0');
  
  const tareas = (state.trabajadores[empIndex].tareas_asignadas && state.trabajadores[empIndex].tareas_asignadas[fechaKey]) || [];

  // Intentar localizar por id si se pasó, si no por nombre/hora
  const tareaIndex = tareas.findIndex(t => (t.id !== undefined && t.id !== null && String(t.id) === String(arguments[5])) || ((t.nombre || '') === (nombre || '') && (t.hora || '') === (hora || '')));
  const tareaIdArg = arguments[5] ? Number(arguments[5]) : null;
  let foundIndex = tareaIndex;
  if (tareaIndex < 0 && tareaIdArg) {
    foundIndex = tareas.findIndex(t => Number(t.id) === tareaIdArg);
  }
  if (foundIndex < 0) return;

  // 🔥 NUEVO: Validar que no sea una tarea del pasado
  const tarea = state.trabajadores[empIndex].tareas_asignadas[fechaKey][foundIndex];
  if (tarea && tarea.fecha_inicio) {
    const fechaTarea = new Date(tarea.fecha_inicio);
    const ahora = new Date();
    const diasDiferencia = Math.floor((ahora - fechaTarea) / (1000 * 60 * 60 * 24));
    
    if (diasDiferencia > 7) {
      showToast('❌ No puedes editar tareas de semanas anteriores. Solo el período actual.', 'error', 4000);
      return;
    }
  }

  // UI: deshabilitar botones del modal mientras hacemos la petición
  const extraBtn = DOM.modal ? DOM.modal.querySelector('.modal-extra-complete') : null;
  if (DOM.modalCompleteBtn) DOM.modalCompleteBtn.disabled = true;
  if (extraBtn) extraBtn.disabled = true;

  // ❌ NO hacer optimistic update - esperar respuesta del backend
  
  // 🔥 NUEVO: Preparar payload usando la fecha, no el nombre del día
  const tareaId = Number(state.trabajadores[empIndex].tareas_asignadas[fechaKey][foundIndex].id);
  const payload = { tareas_asignadas: {} };
  payload.tareas_asignadas[fechaKey] = [{ id: tareaId, estatus: Number(newStatus) }];

  // Ejecutar petición PATCH y luego forzar reload de empleados con tareas desde BD
  (async () => {
    try {
      const resp = await fetch(`/empleados/${empId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      // Al recibir OK, recuperar empleados con tareas actualizado desde BD
      const fullResp = await fetch('/api/v1/empleados/con-tareas', { cache: 'no-store' });
      if (!fullResp.ok) throw new Error('No se pudo obtener empleados con tareas después de guardar');
      const text = await fullResp.text();
      try {
        const parsed = JSON.parse(text);
        _lastEmpleadosJsonString = text;
        state.trabajadores = parsed;
        buildActivitiesCache();
        renderForCurrentState();
        
        // Actualizar estados visuales con los datos del backend
        const now = new Date();
        updateCellStates(now);
        
        // 🔥 FASE 1: Refrescar lista de tareas extras disponibles después de actualizar estatus
        refreshAvailableExtraTasks(true).catch(err => console.warn('Error en refresh de extras:', err));
        
        showToast('Cambio guardado correctamente', 'success', 2800);
      } catch (e) {
        console.warn('No se pudo parsear empleados con tareas después de guardar:', e);
        showToast('Guardado, pero no se pudo refrescar cache local', 'error', 4000);
      }
    } catch (err) {
      console.error('Error actualizando estatus en backend:', err);
      // ❌ NO revertir cambios locales - solo mostrar error
      showToast('No se pudo guardar el cambio en el servidor. Intenta nuevamente.', 'error', 4000);
    } finally {
      if (DOM.modalCompleteBtn) DOM.modalCompleteBtn.disabled = false;
      if (extraBtn) extraBtn.disabled = false;
    }
  })();
}

/* Fusionar celdas */
/**
 * mergeCells(columnIndex)
 * Fusiona celdas adyacentes en la misma columna cuando su contenido es igual
 * para mejorar la visualización (rowSpan).
 */
function mergeCells(columnIndex) {
  const rows = Array.from(DOM.tbody.rows);
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

/* Comparador de horas */
/**
 * compareHour(h1, h2)
 * Compara dos horas en formato 'HH:MM' devolviendo la diferencia en minutos.
 * Usado para ordenar actividades por hora.
 */
function compareHour(h1 = '', h2 = '') {
  if (!h1 && !h2) return 0;
  if (!h1) return 1;
  if (!h2) return -1;
  const [H1, M1 = '0'] = h1.split(':');
  const [H2, M2 = '0'] = h2.split(':');
  const a = (parseInt(H1, 10) || 0) * 60 + (parseInt(M1, 10) || 0);
  const b = (parseInt(H2, 10) || 0) * 60 + (parseInt(M2, 10) || 0);
  return a - b;
}


/* Centrado en hora actual */
/**
 * centerOnCurrentTime({forceScroll, now})
 * Determina la fila objetivo basada en la hora actual y centra la tabla en ella.
 * Marca la fila como `current-row` y coloca 'click' en celdas con tareas.
 */
function centerOnCurrentTime({ forceScroll = false, now = new Date() } = {}) {
  const isToday = state.currentDayIndex === now.getDay();
  const rows = Array.from(DOM.tbody?.rows || []);
  if (!rows.length) return;

  // Reset filas/celdas
  rows.forEach(r => {
    r.classList.remove('current-row');
    r.querySelectorAll('td[data-has-task="true"]').forEach(cell => {
      cell.textContent = '';
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
      rows[targetIndex]?.classList.add('current-row');
      rows[targetIndex]?.querySelectorAll('td[data-has-task="true"]').forEach(cell => {
        cell.textContent = '';
      });
      state.lastTargetIndex = targetIndex;
      return;
    }
    state.lastMinuteScrolled = now.getMinutes();
  }

  const targetRow = rows[targetIndex];
  if (!targetRow) return;

  targetRow.classList.add('current-row');
  targetRow.querySelectorAll('td[data-has-task="true"]').forEach(cell => {
    cell.textContent = '';
  });

  state.lastTargetIndex = targetIndex;
  scrollRowToCenter(targetRow);
}

function hourToMinutes(hora = '') {
  if (!hora) return NaN;
  const [H, M = '0'] = hora.split(':');
  const h = parseInt(H, 10); const m = parseInt(M, 10);
  if (isNaN(h) || isNaN(m)) return NaN;
  return h * 60 + m;
}

/**
 * isMostRecentOverdueTask(emp, tarea, dayName, now)
 * Determina si la tarea es la tarea vencida más reciente del empleado.
 * Solo la tarea vencida más reciente debe mostrarse en amarillo (en progreso).
 * Las tareas vencidas anteriores deben mostrarse en rojo (estado 4).
 */
function isMostRecentOverdueTask(emp, tarea, dayName, now = new Date()) {
  if (!emp || !tarea || !tarea.hora) return false;
  
  const tareas = (emp.tareas_asignadas && emp.tareas_asignadas[dayName]) || [];
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const tareaMinutes = hourToMinutes(tarea.hora);
  
  if (isNaN(tareaMinutes) || currentMins <= tareaMinutes) return false;
  
  // Encontrar todas las tareas vencidas (pasadas y no completadas)
  const tareasVencidas = tareas
    .filter(t => {
      const mins = hourToMinutes(t.hora);
      const est = Number(t.estatus ?? -1);
      return !isNaN(mins) && currentMins > mins && est !== 3 && est !== 5;
    })
    .sort((a, b) => hourToMinutes(b.hora) - hourToMinutes(a.hora)); // Ordenar desc
  
  if (tareasVencidas.length === 0) return false;
  
  // La primera en el array ordenado descendente es la más reciente
  const mostRecent = tareasVencidas[0];
  return mostRecent.hora === tarea.hora && (mostRecent.nombre || '') === (tarea.nombre || '');
}

/**
 * isTaskInProgressForEmp(emp, tarea, dayName, now)
 * Determina si la tarea debe mostrarse como "en progreso" para un empleado.
 * Reglas:
 * - No aplica para tareas completadas (estatus 3) ni extras (estatus 5)
 * - Se considera en progreso si current >= start && current < nextStart
 * - Si no hay próxima tarea, se considera en progreso durante 60 minutos
 */
function isTaskInProgressForEmp(emp, tarea, dayName, now = new Date()) {
  if (!emp || !tarea || !tarea.hora) return false;
  const est = Number(tarea.estatus ?? -1);
  // Estado 3 = Completada, estado 5 = Extras - no deben mostrarse como "en progreso"
  if (est === 3 || est === 5) return false;

  const tareas = (emp.tareas_asignadas && emp.tareas_asignadas[dayName]) || [];
  const orden = tareas
    .map(t => ({ hora: t.hora || '', nombre: t.nombre || '', estatus: t.estatus }))
    .filter(t => t.hora && !isNaN(hourToMinutes(t.hora)))
    .sort((a, b) => hourToMinutes(a.hora) - hourToMinutes(b.hora));

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const tareaIndex = orden.findIndex(t => t.hora === tarea.hora && (t.nombre || '') === (tarea.nombre || ''));
  if (tareaIndex < 0) return false;

  const startMins = hourToMinutes(orden[tareaIndex].hora);
  let endMins = startMins + 60;
  if (tareaIndex + 1 < orden.length) {
    const nextMins = hourToMinutes(orden[tareaIndex + 1].hora);
    if (!isNaN(nextMins)) endMins = nextMins;
  }

  return !isNaN(startMins) && currentMins >= startMins && currentMins < endMins;
}

function scrollRowToCenter(rowEl) {
  if (!DOM.tableWrapper || !rowEl) return;
  const headerHeight = DOM.workerTable.tHead ? DOM.workerTable.tHead.offsetHeight : 0;
  const rowTop = rowEl.offsetTop - headerHeight;
  const rowHeight = rowEl.offsetHeight;
  const wrapperHeight = DOM.tableWrapper.clientHeight;
  const desired = Math.max(0, rowTop - ((wrapperHeight / 2) - (rowHeight / 2)));
  DOM.tableWrapper.scrollTo({ top: desired, behavior: "smooth" });
}

/* Ajustar altura banda sticky (si existe) */
/**
 * adjustCenterBandHeight()
 * Actualiza la variable CSS --row-height usada por la banda sticky (si existe).
 */
function adjustCenterBandHeight() {
  if (!DOM.centerBand) return;
  const rows = Array.from(DOM.tbody?.rows || []);
  const target = rows[state.lastTargetIndex] || rows[0];
  const h = target ? target.offsetHeight : 48;
  DOM.centerBand.style.setProperty('--row-height', `${h}px`);
}

/* Clock */
function updateClockVisibility() {
  const isToday = (state.currentDayIndex === new Date().getDay());
  DOM.realClockCols.forEach(col => col.classList.toggle('hidden', !isToday));
  if (DOM.todayBtn) DOM.todayBtn.classList.toggle('hidden', isToday);
}

function animateEmpPageChange(direction, onComplete) {
  const exitClass = direction === 'left' ? 'slide-left-exit' : 'slide-right-exit';
  const enterClass = direction === 'left' ? 'slide-left-enter' : 'slide-right-enter';
  runTransition(DOM.tableWrapper, exitClass, enterClass, onComplete);
}

function animateDayChange(direction, onComplete) {
  const exitClass = direction === 'left' ? 'slide-left-exit' : 'slide-right-exit';
  const enterClass = direction === 'left' ? 'slide-left-enter' : 'slide-right-enter';
  runTransitionMultiple([DOM.tableWrapper, DOM.tasksDayLabel], exitClass, enterClass, onComplete);
}

function runTransition(el, exitClass, enterClass, onComplete) {
  if (!el) return onComplete && onComplete();
  el.classList.add(exitClass);
  const onEnd = () => {
    el.classList.remove(exitClass);
    el.removeEventListener('animationend', onEnd);
    onComplete && onComplete();
    el.classList.add(enterClass);
    const onEndEnter = () => { el.classList.remove(enterClass); el.removeEventListener('animationend', onEndEnter); };
    el.addEventListener('animationend', onEndEnter);
  };
  el.addEventListener('animationend', onEnd);
}

function runTransitionMultiple(elements, exitClass, enterClass, onComplete) {
  const els = elements.filter(Boolean);
  if (!els.length) return onComplete && onComplete();
  let exited = 0;
  const needed = els.length;
  els.forEach(el => {
    const onEnd = () => {
      el.classList.remove(exitClass);
      el.removeEventListener('animationend', onEnd);
      exited++;
      if (exited === needed) {
        onComplete && onComplete();
        els.forEach(e2 => {
          const onEnterEnd = () => { e2.classList.remove(enterClass); e2.removeEventListener('animationend', onEnterEnd); };
          e2.classList.add(enterClass);
          e2.addEventListener('animationend', onEnterEnd);
        });
      }
    };
    el.classList.add(exitClass);
    el.addEventListener('animationend', onEnd);
  });
}

/**
 * updateCellStates(now)
 * Actualiza los estados visuales de todas las celdas de tareas
 * sin necesidad de re-renderizar toda la tabla.
 * Se ejecuta cada minuto para reflejar cambios de estado en tiempo real.
 */
function updateCellStates(now) {
  if (!DOM.tbody) return;
  
  const dayName = diasSemana[state.currentDayIndex];
  const isToday = state.currentDayIndex === now.getDay();
  const isFutureDay = calculateIsFutureDay(state.currentDayIndex, now);
  
  // Obtener todas las celdas con tareas
  const rows = DOM.tbody.querySelectorAll('tr');
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    
    // Las primeras 3 columnas son fijas (Horario, Actividad, Puntos)
    // Las siguientes son de empleados
    for (let i = 3; i < cells.length; i++) {
      const td = cells[i];
      
      // Solo procesar celdas que tienen tarea
      if (td.dataset.hasTask !== 'true') continue;
      
      const empId = td.dataset.empId;
      const hora = td.dataset.hora;
      const nombreTarea = td.dataset.nombre;
      const estatus = td.dataset.estatus ? Number(td.dataset.estatus) : null;
      
      // Buscar el empleado y la tarea correspondiente
      const empleado = state.trabajadores.find(t => String(t.id) === String(empId));
      if (!empleado) continue;
      
      const tareas = (empleado.tareas_asignadas && empleado.tareas_asignadas[dayName]) || [];
      
      // 🔥 FIX: Usar ID si está disponible para manejar duplicados (mismo nombre/hora)
      let tarea;
      if (td.dataset.tareaId) {
        tarea = tareas.find(t => String(t.id) === String(td.dataset.tareaId));
      } else {
        tarea = tareas.find(t => (t.nombre || '') === nombreTarea && (t.hora || '') === hora);
      }
      
      if (!tarea) continue;
      
      // Aplicar la clase correspondiente basada en el estatus guardado
      const newClassName = getStatusClass(tarea.estatus, tarea.hora, isToday, now, isFutureDay);
      
      // Solo actualizar si cambió la clase
      if (td.className !== newClassName) {
        td.className = newClassName;
      }
    }
  });
}

function startClock() {
  updateTime();
  if (clockIntervalId) clearInterval(clockIntervalId);
  clockIntervalId = setInterval(updateTime, 1000);
}

function updateTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const dayName = diasSemana[now.getDay()].toUpperCase();
  document.documentElement.style.setProperty('--timer-hours', `"${hours}"`);
  document.documentElement.style.setProperty('--timer-minutes', `"${minutes}"`);
  document.documentElement.style.setProperty('--timer-seconds', `"${seconds}"`);
  document.documentElement.style.setProperty('--timer-day', `"${dayName}"`);

  // Recentrar y refrescar KPI solo cuando cambia el minuto
  if (state.currentDayIndex === now.getDay() && state.lastMinuteScrolled !== now.getMinutes()) {
    state.lastMinuteScrolled = now.getMinutes();
    centerOnCurrentTime({ forceScroll: true, now });
    adjustCenterBandHeight();
    updateTaskProgressWidget();
    
    // 🔥 ACTUALIZAR estados visuales de las celdas cuando cambia el minuto
    updateCellStates(now);
  }
}

/* Utils */
function getMaxPage() {
  // 🔥 Sin paginación, siempre retorna 0
  return 0;
}

function rafThrottle(fn) {
  let scheduled = false;
  return (...args) => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        fn(...args);
      });
    }
  };
}

/* =========================================================
   KPI: Progreso de tareas (General)
   ========================================================= */
/**
 * updateTaskProgressWidget()
 * Calcula y pinta el donut KPI basado en tareas completadas/vencidas de TODA LA QUINCENA.
 * Cuenta todas las tareas de todos los empleados en las 2 semanas del periodo de pago actual.
 */
function updateTaskProgressWidget() {
  if (!DOM.taskProgress) return;

  const empleados = state.trabajadores || [];
  const countEl   = document.getElementById('chartCountG');
  const percentEl = document.getElementById('chartPercentG');
  const extrasEl  = document.getElementById('extrasCountG');

  if (!empleados.length) {
    if (countEl) {
      countEl.textContent = '0%';
      countEl.style.color = '#dc3545'; // Rojo
      countEl.style.fontWeight = '700';
    }
    if (percentEl) percentEl.style.display = 'none';
    if (extrasEl)  extrasEl.textContent = '0';
    return;
  }

  const loggedUserString = localStorage.getItem('loggedUser');
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };

  let empleadosPara = empleados;
  if (loggedUser.role !== 'admin' && loggedUser.role !== 'supervisor' && loggedUser.role !== 'visitante') {
    const empleadoId = parseInt(loggedUser.empleado_id);
    if (!isNaN(empleadoId)) {
      empleadosPara = empleados.filter(e => e.id === empleadoId);
    }
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  
  // 🔥 NUEVO: Obtener la fecha actual para acceder a tareas_asignadas
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fechaActual = today.getFullYear() + '-' + 
                      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(today.getDate()).padStart(2, '0');

  // 🔥 CAMBIO: Contar PUNTOS del DÍA ACTUAL, no CANTIDAD de tareas
  let totalPuntosVencidos = 0;      // Total de puntos de tareas cuya hora ya llegó
  let totalPuntosCompletados = 0;   // Puntos de tareas completadas (estatus 3)
  let totalPuntosExtrasGanados = 0; // Puntos de extras (estatus 5)

  // 🔥 Detectar tareas vencidas que fueron completadas como extras por otros empleados
  const tareasCompletadasComoExtras = new Set();
  
  // Recorrer todos los empleados del día actual para encontrar tareas extras
  empleados.forEach(emp => {
    const tareasDelDia = emp?.tareas_asignadas?.[fechaActual] || [];
    tareasDelDia.forEach(tarea => {
      // Si es una tarea extra con referencia a una tarea original, marcar el ID original
      if (tarea.estatus === 5 && tarea.tareaOriginalId) {
        tareasCompletadasComoExtras.add(Number(tarea.tareaOriginalId));
      }
    });
  });

  // 🔥 RECORRER TODOS LOS EMPLEADOS - SOLO DÍA ACTUAL
  // console.log(`🔍 DEBUG - Iniciando cálculo de gráfica del día: ${fechaActual}`);
  empleados.forEach(emp => {
    const tareasDia = emp?.tareas_asignadas?.[fechaActual] || [];

    tareasDia.forEach(t => {
      // console.log(`📊 Procesando: ${emp.nombre} - ${t.nombre} - Estatus: ${t.estatus} - Hora: ${t.hora} - Puntaje: ${t.puntaje}`);
      
      const puntaje = parseInt(t.puntaje) || 0;
      const mins = hourToMinutes(t.hora);
      
      // 🔥 EXTRAS (estatus 5): SOLO suman puntos, NO entran en gráfica
      if (t.estatus === 5) {
        totalPuntosExtrasGanados += puntaje;
        // console.log(`  ➕ EXTRA: +${puntaje} puntos extra (Total puntos extras: ${totalPuntosExtrasGanados})`);
        return; // No procesar más, las extras no cuentan para la gráfica
      }

      // 🔥 SOLO contar tareas cuya hora YA LLEGÓ (o pasadas)
      const horaYaLlegó = !isNaN(mins) && nowMinutes >= mins;
      
      if (horaYaLlegó && puntaje > 0) {
        // Verificar si esta tarea vencida fue completada como extra por otro empleado
        const esVencidaQueSeriaExtra = t.estatus === 4 && tareasCompletadasComoExtras.has(Number(t.id));
        
        // 🔥 TOTAL: Sumar PUNTOS de todas las tareas que ya pasaron su hora (1,2,3,4)
        totalPuntosVencidos += puntaje;
        // console.log(`  📈 TOTAL: +${puntaje} puntos (Total puntos: ${totalPuntosVencidos})`);
        
        // 🔥 COMPLETADAS: SOLO estatus 3 (completadas) Y que no fueron completadas por otro
        if (t.estatus === 3 && !esVencidaQueSeriaExtra) {
          totalPuntosCompletados += puntaje;
          // console.log(`  ✅ COMPLETADA: +${puntaje} puntos (Total puntos completados: ${totalPuntosCompletados})`);
        } else if (esVencidaQueSeriaExtra) {
          // console.log(`  ⚠️ VENCIDA pero completada por otro como extra - NO cuenta como completada`);
        } else {
          // 🔥 NO COMPLETADAS: Estatus 1 (en progreso), 2 (sin iniciar), 4 (vencida)
          // console.log(`  ❌ NO COMPLETADA (estatus ${t.estatus} - ${t.estatus === 1 ? 'En progreso' : t.estatus === 2 ? 'Sin iniciar' : 'Vencida'})`);
        }
      } else {
        // console.log(`  ⏭️ Saltada: hora no llegó (${t.hora})`);
      }
    });
  });

  // 🔥 NUEVO: Sumar también las tareas extras completadas cargadas del histórico (BD)
  // PERO solo si NO fueron ya contadas como estatus=5 en las tareas regulares
  if (Array.isArray(tareasExtrasCompletadas)) {
    // console.log(`📚 Verificando ${tareasExtrasCompletadas.length} tareas extras del histórico`);
    tareasExtrasCompletadas.forEach(extra => {
      const puntaje = parseInt(extra.puntaje) || 0;
      const tareaOriginalId = extra.tarea_original_id;
      
      // Verificar si esta extra YA fue contada como estatus=5 en las tareas de algún empleado
      let yaContadaComoEstatus5 = false;
      empleados.forEach(emp => {
        const tareasDia = emp?.tareas_asignadas?.[fechaActual] || [];
        tareasDia.forEach(t => {
          // Si encontramos una tarea estatus=5 con el mismo tarea_original_id o mismo nombre
          if (t.estatus === 5 && (t.tarea_original_id === tareaOriginalId || t.nombre === extra.nombre)) {
            yaContadaComoEstatus5 = true;
          }
        });
      });
      
      if (puntaje > 0 && !yaContadaComoEstatus5) {
        totalPuntosExtrasGanados += puntaje;
        // console.log(`  ➕ EXTRA (histórico): +${puntaje} puntos de "${extra.nombre}" (Total: ${totalPuntosExtrasGanados})`);
      } else if (yaContadaComoEstatus5) {
        // console.log(`  ⏭️ EXTRA "${extra.nombre}" ya contada como estatus=5, omitiendo duplicado`);
      }
    });
  }

  // console.log(`
// 🎯 RESULTADO FINAL (DÍA ACTUAL):
//    Total Puntos Vencidos: ${totalPuntosVencidos}
//    Total Puntos Completados: ${totalPuntosCompletados}
//    Total Puntos Extras Ganados: ${totalPuntosExtrasGanados}
//    Porcentaje: ${totalPuntosVencidos > 0 ? ((totalPuntosCompletados / totalPuntosVencidos) * 100).toFixed(2) : 0}%
  // `);

  const C = 314; // circunferencia
  // Calcular porcentaje basado en PUNTOS completados vs puntos totales
  const pct = totalPuntosVencidos > 0 ? (totalPuntosCompletados / totalPuntosVencidos) * 100 : 0;
  const seg = Math.max(0, Math.min(C, (pct / 100) * C));

  // Determinar color y texto según porcentaje
  let displayText = '';
  let textColor = '';
  
  if (pct > 100) {
    // Más de 100 puntos (con extras)
    displayText = '+100%';
    textColor = '#2d79f3'; // Azul
  } else if (pct >= 91) {
    // 91-100%
    displayText = `${Math.round(pct)}%`;
    textColor = '#28a745'; // Verde
  } else if (pct >= 81) {
    // 81-90%
    displayText = `${Math.round(pct)}%`;
    textColor = '#ffc107'; // Amarillo
  } else {
    // 80% o menos
    displayText = `${Math.round(pct)}%`;
    textColor = '#dc3545'; // Rojo
  }

  // 🔥 Solo mostrar porcentaje
  if (countEl) {
    countEl.textContent = displayText;
    countEl.style.color = textColor;
    countEl.style.fontWeight = '700';
  }
  
  // Ocultar el porcentaje en percentEl (ya está en countEl)
  if (percentEl) {
    percentEl.style.display = 'none';
  }
  
  // 🔥 Mostrar PUNTOS extras en vez de CANTIDAD de tareas extras
  if (extrasEl) extrasEl.textContent = String(totalPuntosExtrasGanados);

  const circleCompleted = DOM.taskProgress.querySelector('.progress-ring__circle.completed');
  const circleNot       = DOM.taskProgress.querySelector('.progress-ring__circle.not-completed');

  if (circleNot) {
    circleNot.style.strokeDasharray  = `${C} 0`;
    circleNot.style.strokeDashoffset = '0';
  }
  if (circleCompleted) {
    circleCompleted.style.strokeDasharray  = `${seg.toFixed(3)} ${(C - seg).toFixed(3)}`;
    circleCompleted.style.strokeDashoffset = '0';
  }
}

/* =========================================================
   Clase según estatus
   ========================================================= */
/**
 * calculateIsFutureDay(dayIndex, now)
 * Determina si el día seleccionado es una fecha futura.
 * Compara el índice del día con el día actual y asume que si es diferente
 * y mayor, es de la próxima semana (futuro).
 */
function calculateIsFutureDay(dayIndex, now) {
  const currentDayIndex = now.getDay();
  // Si el día seleccionado es mayor que el actual, es futuro (misma semana)
  // Si es menor, podría ser pasado (semana actual) o futuro (próxima semana)
  // Por simplicidad: consideramos futuro si dayIndex > currentDayIndex
  return dayIndex > currentDayIndex;
}

/**
 * getStatusClass(estatus, hora, isToday, now, isFutureDay)
 * Devuelve la clase CSS apropiada según el estatus y si la tarea está vencida.
 * - Días futuros: SIEMPRE gris (pendiente)
 * - Día de hoy: Rojo solo si la hora YA PASÓ y no está completada
 * - Días pasados: Mostrar colores según estatus real
 */
function getStatusClass(estatus, hora, isToday, now, isFutureDay = false) {
  // 🔥 FIX: Tareas extras (estatus 5) siempre deben mostrarse en azul, incluso si no es hoy
  if (estatus === 5) {
    return 'status-extra';
  }

  // Si NO es el día de hoy, TODAS las tareas se muestran en gris (sin iniciar)
  if (!isToday) {
    return 'status-todo';
  }

  // Para el día de HOY, respetar el estatus guardado
  // Mapeo directo de estatus a clase CSS
  switch (estatus) {
    case 1: // En progreso
      return 'status-inprogress'; // Amarillo
    case 2: // Sin iniciar
      return 'status-todo'; // Gris
    case 3: // Completada
      return 'status-done'; // Verde
    case 4: // No completada / Vencida
      return 'status-overdue'; // Rojo
    case 5: // Extras
      return 'status-extra'; // Azul
    default:
      return 'status-todo'; // Por defecto gris
  }
}

