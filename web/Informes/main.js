// main.js
// ===============================================
import { obtenerEmpleados, obtenerBackup, crearMapaTareasRealizadas } from "./services/empleadosService.js";
import { createEmpleadoCard } from "./components/EmpleadoCard.js";
import { mostrarTareasEmpleado, setTareasRealizadasMap, setEmpleadosGlobales, mostrarResumenAgregado } from "./components/TareasPanel.js";
import { inicializarTareasVencidas, setEmpleadosDataVencidas, mostrarPanelTareasVencidas, ocultarPanelTareasVencidas, renderizarTareasVencidas } from "./components/TareasVencidas.js";
import { setEmpleadosPromedioData, renderizarGraficaPromedio, setTareasRealizadasMap as setTareasRealizadasMapPromedio } from "./components/PromedioEmpleados.js";

/* -------------------- Sesión ------------------- */
const usuario = JSON.parse(localStorage.getItem("loggedUser"));

// 🔥 DEBUG: Ver qué usuario está intentando acceder
console.log("=== INFORMES - DEBUG ===");
console.log("Usuario desde localStorage:", usuario);
console.log("Rol del usuario:", usuario?.role);
console.log("Cookies del navegador:", document.cookie);

if (!usuario || !["admin", "administrador", "supervisor", "empleado"].includes(usuario.role)) {
  console.log("❌ ACCESO DENEGADO - Redirigiendo a actividades");
  console.log("Razón:", !usuario ? "No hay usuario" : `Rol no permitido: ${usuario.role}`);
  window.location.href = "/actividades";
} else {
  console.log("✅ ACCESO PERMITIDO - Usuario con rol:", usuario.role);
}

/* ---- Datos globales en memoria (una sola carga) */
let empleadosData = [];
let tareasRealizadasMap = {};
let autoRefreshIntervalId = null;
let _lastEmpleadosJsonString = null;

/* ========== Auto-refresh para informes ========== */
/**
 * fetchEmpleadosIfChanged()
 * Poll ligero: obtiene /empleados-con-tareas y devuelve datos solo si cambiaron
 * Retorna `null` si no hubo cambios o si hubo error.
 */
async function fetchEmpleadosIfChanged() {
  try {
    // 🔥 CAMBIO: Usar /empleados-con-tareas para obtener tareas asignadas
    const resp = await fetch('/empleados-con-tareas', { cache: 'no-store' });
    if (!resp.ok) return null;
    const data = await resp.json();
    const txt = JSON.stringify(data);
    if (txt === _lastEmpleadosJsonString) return null;
    _lastEmpleadosJsonString = txt;
    return data;
  } catch (err) {
    console.error('[Auto-refresh] Error al obtener empleados:', err);
    return null;
  }
}

/**
 * checkForUpdates()
 * Ejecutado periódicamente: verifica cambios en empleados y actualiza la vista
 */
async function checkForUpdates() {
  const empleadosData_new = await fetchEmpleadosIfChanged();
  if (empleadosData_new) {
    console.info('[Auto-refresh] Detectados cambios en empleados. Actualizando vista...');
    
    // 🔥 NUEVO: Obtener el backup actualizado para sincronizar tareasRealizadasMap e historial_puntos
    const backup = await obtenerBackup();
    
    // 🔥 NUEVO: Combinar empleados con historial_puntos del backup
    empleadosData = empleadosData_new.map(emp => {
      const empFromBackup = backup.find(b => b.id === emp.id);
      if (empFromBackup && empFromBackup.historial_puntos) {
        emp.historial_puntos = empFromBackup.historial_puntos;
      }
      return emp;
    });
    
    tareasRealizadasMap = crearMapaTareasRealizadas(backup);
    setTareasRealizadasMap(tareasRealizadasMap);
    setTareasRealizadasMapPromedio(tareasRealizadasMap);
    
    // 🔥 Actualizar la lista global de empleados en TareasPanel
    setEmpleadosGlobales(empleadosData);
    // 🔥 Actualizar datos para tareas vencidas
    setEmpleadosDataVencidas(empleadosData);
    // 🔥 Actualizar datos para promedio de empleados
    setEmpleadosPromedioData(empleadosData);
    
    // Si está viendo el panel de tareas vencidas, refrescar ambos (tareas vencidas + gráfica)
    const tareasVencidasPanel = document.getElementById('tareas-vencidas-panel');
    if (tareasVencidasPanel && !tareasVencidasPanel.classList.contains('is-hidden')) {
      renderizarTareasVencidas();
      renderizarGraficaPromedio();
    }
    
    // Actualizar la vista según el rol
    const { role, empleado_id } = usuario;
    
    if (role === "admin" || role === "supervisor") {
      // Si está viendo el panel de tarjetas, no hacer nada (ya está actualizado en memoria)
      // Si está viendo un empleado específico, actualizar ese panel
      const calendarioContainer = document.getElementById("calendario-container");
      if (calendarioContainer && calendarioContainer.style.display !== "none") {
        // Hay un empleado siendo mostrado, encontrarlo y actualizar
        const empleadoMostrado = empleadosData.find(e => 
          calendarioContainer.innerHTML.includes(e.nombre)
        );
        if (empleadoMostrado) {
          mostrarTareasEmpleado(empleadoMostrado);
        }
      }
    } else if (role === "empleado") {
      // Empleado viendo su propio panel, actualizar
      const empleado = empleadosData.find(e => e.id === parseInt(empleado_id, 10));
      if (empleado) {
        mostrarTareasEmpleado(empleado);
      }
    }
  }
}

/**
 * startAutoRefresh(intervalMs)
 * Inicia polling periódico para detectar cambios en empleados.
 */
function startAutoRefresh(intervalMs = 2000) {
  stopAutoRefresh();
  // Inicializar valor para comparar
  (async () => { 
    // 🔥 CAMBIO: Usar /empleados-con-tareas en lugar de /empleados
    const empleados = await (await fetch('/empleados-con-tareas', { cache: 'no-store' })).json();
    _lastEmpleadosJsonString = JSON.stringify(empleados); 
  })().catch(()=>{});
  autoRefreshIntervalId = setInterval(checkForUpdates, intervalMs);
  console.info(`[Auto-refresh] Iniciado con intervalo de ${intervalMs}ms`);
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

/* ----------------- ADMIN ----------------------- */
async function generarItinerarios() {
  console.log("🚀 [generarItinerarios] INICIANDO...");
  console.log("🚀 [generarItinerarios] empleadosData.length:", empleadosData.length);
  
  const tarjetasContainer = document.getElementById("tarjetas-container");
  console.log("🚀 [generarItinerarios] tarjetasContainer:", tarjetasContainer);
  
  if (!tarjetasContainer) {
    console.error("❌ No existe contenedor con ID 'tarjetas-container'.");
    return;
  }

  tarjetasContainer.style.display = "block";
  tarjetasContainer.innerHTML = "";

  // 🔥 NUEVO: Agregar botón "Promedio de todos los empleados" arriba del primer empleado
  const btnPromedioCard = document.createElement("div");
  btnPromedioCard.classList.add("empleado-card", "promedio-btn-card");
  btnPromedioCard.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    transition: all 0.3s ease;
  `;
  btnPromedioCard.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; color: white;">
      <span style="font-size: 28px;">📊</span>
      <span style="font-size: 16px; font-weight: 600;">Promedio de todos los empleados</span>
    </div>
  `;
  btnPromedioCard.addEventListener("mouseenter", () => {
    btnPromedioCard.style.transform = "translateY(-4px)";
    btnPromedioCard.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.4)";
  });
  btnPromedioCard.addEventListener("mouseleave", () => {
    btnPromedioCard.style.transform = "translateY(0)";
    btnPromedioCard.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.3)";
  });
  btnPromedioCard.addEventListener("click", () => {
    // Quitar selección de empleados
    document.querySelectorAll(".empleado-card").forEach(c => {
      c.classList.remove("selected");
      c.classList.remove("dimmed");
    });
    btnPromedioCard.classList.add("selected");
    
    // 🔥 Mostrar resumen agregado de todos los empleados
    mostrarResumenAgregado();
  });
  tarjetasContainer.appendChild(btnPromedioCard);

  // 🔥 Filtrar empleados según el rol del usuario
  const { role } = usuario;
  const userRole = role ? role.toLowerCase() : 'visitante';
  let empleadosFiltrados = empleadosData;
  
  console.log(`🔍 [Informes] Usuario logueado: ${userRole}`);
  console.log(`📊 [Informes] Total empleados desde API: ${empleadosData.length}`);
  
  // 🔥 Filtrar según rol del usuario
  empleadosFiltrados = empleadosData.filter(emp => {
    // 🔥 CORREGIDO: La propiedad se llama 'rol' (no 'role')
    const empRole = emp.rol ? emp.rol.toLowerCase() : 'empleado';
    
    // NUNCA mostrar admin
    if (empRole === 'admin' || empRole === 'administrador') {
      console.log(`   ❌ ${emp.nombre} (rol=${empRole}) → Admin nunca aparece`);
      return false;
    }
    
    // Lógica de visibilidad por rol de usuario
    if (userRole === 'visitante' || userRole === 'empleado') {
      // Solo ver empleados
      const mostrar = empRole === 'empleado';
      console.log(`   ${mostrar ? '✅' : '❌'} ${emp.nombre} (rol=${empRole}) → ${userRole} solo ve empleados`);
      return mostrar;
    } else if (userRole === 'supervisor' || userRole === 'admin' || userRole === 'administrador') {
      // Ver empleados + supervisores
      const mostrar = empRole === 'empleado' || empRole === 'supervisor';
      console.log(`   ${mostrar ? '✅' : '❌'} ${emp.nombre} (rol=${empRole}) → ${userRole} ve empleados + supervisores`);
      return mostrar;
    }
    
    return true; // Por defecto, mostrar
  });
  
  console.log(`📊 [Informes] Empleados a mostrar: ${empleadosFiltrados.length}`);

  empleadosFiltrados.forEach((empleado, i) => {
    const card = createEmpleadoCard(empleado, i);
    tarjetasContainer.appendChild(card);
  });

  // 🔥 Mostrar resumen agregado al inicio (Tareas vencidas + Tabla general)
  setTimeout(() => {
    mostrarResumenAgregado();
  }, 100);

  // fade-in
  setTimeout(() => {
    document.getElementById("informes-content")?.classList.add("show");
  }, 300);
}

/* ---------------- EMPLEADO --------------------- */
async function mostrarPanelDerecho(empleadoId) {
  // Oculta panel izq completo (incluyendo promedio)
  const leftPanel = document.querySelector('.left-panel');
  if (leftPanel) {
    leftPanel.style.display = 'none';
  }

  const empleado = empleadosData.find(e => e.id === empleadoId);
  if (!empleado) {
    console.error("No se encontró empleado con ID:", empleadoId);
    return;
  }

  mostrarTareasEmpleado(empleado);

  setTimeout(() => {
    document.getElementById("informes-content")?.classList.add("show");
  }, 300);
}

/* ------------- Al cargar la página ------------- */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 🔥 MOSTRAR FECHA COMPLETA en el encabezado
    const fechaDiv = document.getElementById('fecha-actual-informes');
    if (fechaDiv) {
      const hoy = new Date();
      const diasSemana = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
      const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      const diaNumero = hoy.getDate();
      const diaNombre = diasSemana[hoy.getDay()];
      const mesNombre = meses[hoy.getMonth()];
      fechaDiv.textContent = `${diaNombre} ${diaNumero} DE ${mesNombre}`;
    }
    
    // 1. Descargamos ambos JSON en paralelo
    const [emps, backup] = await Promise.all([
      obtenerEmpleados(),
      obtenerBackup()
    ]);

    // 🔥 NUEVO: Combinar empleados con historial_puntos del backup
    empleadosData = emps.map(emp => {
      const empFromBackup = backup.find(b => b.id === emp.id);
      if (empFromBackup && empFromBackup.historial_puntos) {
        emp.historial_puntos = empFromBackup.historial_puntos;
      }
      return emp;
    });

    tareasRealizadasMap = crearMapaTareasRealizadas(backup);
    setTareasRealizadasMap(tareasRealizadasMap);
    // 🔥 NUEVO: Pasar el mapa de tareas realizadas también a PromedioEmpleados
    setTareasRealizadasMapPromedio(tareasRealizadasMap);
    // 🔥 Nuevo: pasar los empleados globales a TareasPanel para detectar tareas extras
    setEmpleadosGlobales(emps);
    // 🔥 Inicializar datos para Tareas Vencidas
    setEmpleadosDataVencidas(emps);
    // 🔥 Inicializar datos para Promedio de Empleados
    setEmpleadosPromedioData(emps);
    inicializarTareasVencidas();

    const { role, empleado_id } = usuario;

    console.log("📍 [DOMContentLoaded] Rol del usuario:", role);
    console.log("📍 [DOMContentLoaded] Empleados cargados:", empleadosData.length);

    // Restaurar el título principal sin header derecho
    const tituloInformes = document.getElementById("titulo-informes");
    if (tituloInformes) {
      tituloInformes.textContent = 'Informes';
      // Eliminar el header derecho si existe
      const rightInfo = document.getElementById('titulo-informes-right');
      if (rightInfo) rightInfo.remove();
      tituloInformes.style.overflow = 'hidden';
      tituloInformes.style.display = 'block';
    }

    if (role === "admin" || role === "administrador" || role === "supervisor") {
      console.log("✅ [DOMContentLoaded] Llamando a generarItinerarios()...");
      await generarItinerarios();
      console.log("✅ [DOMContentLoaded] generarItinerarios() completado");
    } else if (role === "empleado") {
      console.log("✅ [DOMContentLoaded] Llamando a mostrarPanelDerecho()...");
      await mostrarPanelDerecho(parseInt(empleado_id, 10));
    }
    
    // 🔥 AUTO-REFRESH DESHABILITADO - Los datos solo se cargan al entrar/refrescar la página
    // startAutoRefresh(2000); // Cada 2 segundos
    console.info("✅ Informes cargados (sin auto-refresh)");
    
  } catch (e) {
    console.error("Error inicializando aplicación:", e);
  }
});
