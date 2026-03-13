import EmployeeCard from "/web/Informes/componentes/EmployeeCard.js";
import TablaPuntajes from "/web/Informes/componentes/TablaPuntajes.js";
import ResumenEstadisticas from "/web/Informes/componentes/ResumenEstadisticas.js";
import TareasVencidasInformes from "/web/Informes/componentes/TareasVencidasInformes.js";
import { Q1_INICIO, Q1_FIN, Q2_INICIO, Q2_FIN, obtenerFechaLocal, parsearFechaLocal, rolUsuario } from "/web/Informes/constants.js";

const sidebarOptions = document.getElementById("sidebar-options");
const contentTitle = document.getElementById("content-title");
const contentBody = document.getElementById("content-body");
const empleadosContainer = document.getElementById("empleados-container");
const resumenContainer = document.getElementById("resumen-container");
const tareasVencidasContainer = document.getElementById("tareas-vencidas-container");
const toggleButtons = document.querySelectorAll(".toggle-btn");

import { API_BASE } from "../config.js";

// ===============================
// ESTADO GLOBAL
// ===============================
let ESTADISTICAS = {
    historial: {},
    hoy: {}
};

let VISTA_ACTUAL = {
    type: 'promedio',
    empleadoId: null,
    empleadoNombre: null
};

let resumenEstadisticas = null;
let tareasVencidasComponent = null;

// ===============================
// SIDEBAR
// ===============================
sidebarOptions.addEventListener("click", async (e) => {
    const item = e.target.closest(".sidebar-item");
    if (!item) return;

    sidebarOptions.querySelectorAll(".sidebar-item")
        .forEach(el => el.classList.remove("active"));

    item.classList.add("active");

    const type = item.dataset.type;
    const modoActual = document.querySelector(".toggle-btn.active").dataset.mode;
    const mostrarTodos = modoActual === "todas";

    if (type === "promedio") {
        VISTA_ACTUAL = { type: 'promedio', empleadoId: null, empleadoNombre: null };
        contentTitle.textContent = "Promedio de todos los empleados";

        // Mostrar controles y tareas vencidas para promedio
        document.querySelector('.toggle-buttons').style.display = 'flex';
        if (tareasVencidasContainer) {
            tareasVencidasContainer.style.display = 'block';
            tareasVencidasContainer.style.visibility = 'visible';
        }

        await mostrarTablaPromedio(mostrarTodos);
    }

    if (type === "empleado") {
        const empleadoId = parseInt(item.dataset.id, 10);
        const empleadoNombre = item.dataset.nombre;
        VISTA_ACTUAL = { type: 'empleado', empleadoId, empleadoNombre };
        contentTitle.textContent = empleadoNombre;

        // Ocultar controles y tareas vencidas para empleado individual
        document.querySelector('.toggle-buttons').style.display = 'none';
        if (tareasVencidasContainer) {
            tareasVencidasContainer.style.display = 'none';
        }
        limpiarResumen();

        await mostrarTablaEmpleado(empleadoId, empleadoNombre, true);
    }
});

// ===============================
// TOGGLE QUINCENAS (BOTONES)
// ===============================
toggleButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
        // Cambiar botón activo
        toggleButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const mostrarTodos = btn.dataset.mode === "todas";

        // Actualizar tareas vencidas si existe
        if (tareasVencidasComponent) {
            await tareasVencidasComponent.actualizarPorModo(mostrarTodos);
        }

        if (VISTA_ACTUAL.type === 'promedio') {
            await mostrarTablaPromedio(mostrarTodos);
        } else if (VISTA_ACTUAL.type === 'empleado') {
            await mostrarTablaEmpleado(VISTA_ACTUAL.empleadoId, VISTA_ACTUAL.empleadoNombre, mostrarTodos);
        }
    });
});

// ===============================
// EMPLEADOS
// ===============================
async function cargarEmpleados() {
    try {
        const res = await fetch(`${API_BASE}/usuarios`);
        const data = await res.json();

        const empleados = data.usuarios.filter(
            u => u.rol?.toLowerCase() !== "admin"
        );

        empleadosContainer.innerHTML = "";

        empleados.forEach((emp, index) => {
            const empleadoCard = new EmployeeCard(emp).render();
            // Agregar delay de animación escalonada
            empleadoCard.style.animationDelay = `${index * 0.1}s`;
            empleadosContainer.appendChild(empleadoCard);
        });

    } catch (err) {
        console.error("Error cargando empleados:", err);
    }
}

// ===============================
// INFORMES
// ===============================
async function cargarInformes() {
    try {
        const estadisticasRes = await fetch(`${API_BASE}/tareas/estadisticas`);
        const estadisticasData = await estadisticasRes.json();

        const histRes = await fetch(`${API_BASE}/historial`);
        const histData = await histRes.json();

        const estadisticas = estadisticasGenerales(histData, estadisticasData);

        ESTADISTICAS.historial = estadisticas.estadisticasHistorial;
        ESTADISTICAS.hoy = estadisticas.estadisticasHoy;

        // console.log("ESTADISTICAS GENERALES CARGADAS:", ESTADISTICAS);

    } catch (err) {
        console.error("Error cargando informes:", err);
    }
}

// ===============================
// TABLA PROMEDIO GENERAL
// ===============================
async function mostrarTablaPromedio(mostrarTodos = false) {
    // Cargar el HTML de la tabla
    const response = await fetch('/web/Informes/componentes/TablaPuntajes.html');
    const html = await response.text();

    if (mostrarTodos) {
        // Limpiar resumen cuando se muestran todas las quincenas
        // limpiarResumen();

        // Obtener todas las quincenas desde los datos ya cargados
        const histRes = await fetch(`${API_BASE}/historial`);
        const histData = await histRes.json();

        const estadisticasRes = await fetch(`${API_BASE}/tareas/estadisticas`);
        const estadisticasData = await estadisticasRes.json();

        const resultado = estadisticasGenerales(histData, estadisticasData, false, true);

        // Limpiar contenedor y preparar para múltiples tablas
        contentBody.innerHTML = '';

        // Acumulador para todas las quincenas
        let totalesGenerales = { ganados: 0, noGanados: 0, extras: 0, asignados: 0 };

        // Generar una tabla para cada quincena
        resultado.quincenas.forEach((quincena, index) => {
            // Crear contenedor para esta quincena
            const quincenaContainer = document.createElement('div');
            quincenaContainer.innerHTML = html;
            quincenaContainer.style.marginBottom = '2rem';
            contentBody.appendChild(quincenaContainer);

            const historialAdaptado = [];

            // Recorrer rango completo de esta quincena
            for (
                let d = parsearFechaLocal(quincena.inicio);
                d <= parsearFechaLocal(quincena.fin);
                d.setDate(d.getDate() + 1)
            ) {
                const fecha = obtenerFechaLocal(d);
                const data =
                    quincena.hoy?.[fecha] ??
                    quincena.historial?.[fecha] ??
                    null;

                if (!data) {
                    historialAdaptado.push({
                        fecha,
                        asignados: 0,
                        ganados: 0,
                        noGanados: 0,
                        extra: 0
                    });
                    continue;
                }

                historialAdaptado.push({
                    fecha,
                    asignados: data.completada + data.vencida,
                    ganados: data.completada,
                    noGanados: data.vencida,
                    extra: data.extra
                });
            }

            const tabla = new TablaPuntajes({
                fechaInicio: quincena.inicio,
                fechaFin: quincena.fin,
                fechaCorte: quincena.fin,
                historial: historialAdaptado,
            });

            // console.log("Generando tabla para quincena: mostrar tabla promedio todos", quincena.numero, quincena.mesAnio, "con fechas:", quincena.inicio, quincena.fin);
            tabla.generar(quincenaContainer);

            // Acumular totales de esta quincena
            const totalesQuincena = historialAdaptado.reduce((acc, dia) => ({
                ganados: acc.ganados + dia.ganados,
                noGanados: acc.noGanados + dia.noGanados,
                extras: acc.extras + dia.extra,
                asignados: acc.asignados + dia.asignados
            }), { ganados: 0, noGanados: 0, extras: 0, asignados: 0 });

            // Sumar al total general
            totalesGenerales.ganados += totalesQuincena.ganados;
            totalesGenerales.noGanados += totalesQuincena.noGanados;
            totalesGenerales.extras += totalesQuincena.extras;
            totalesGenerales.asignados += totalesQuincena.asignados;

            // Actualizar título con número de quincena y mes
            const tablaTitulo = quincenaContainer.querySelector('#tabla-titulo');
            if (tablaTitulo) {
                tablaTitulo.textContent = `Quincena ${quincena.numero} - ${quincena.mesAnio} - Todos los Empleados`;
            }
        });

        // Actualizar resumen con totales de todas las quincenas
        await actualizarResumen(totalesGenerales);
    } else {
        // Mostrar solo quincena actual (comportamiento original)
        contentBody.innerHTML = html;

        // const quincena =  determinarQuincena();
        // console.log("Quincena actual para promedio:", quincena);
        const { inicio, fin, corte } = determinarQuincena();
        const historialAdaptado = [];
        // console.log("fechas para promedio:", inicio, fin, corte);
        // recorrer rango completo
        for (
            let d = parsearFechaLocal(inicio);
            d <= parsearFechaLocal(fin);
            d.setDate(d.getDate() + 1)
        ) {
            const fecha = obtenerFechaLocal(d);
            const data =
                ESTADISTICAS.hoy?.[fecha] ??
                ESTADISTICAS.historial?.[fecha] ??
                null;
            // console.log("Datos para fecha", fecha, ":", data);
            if (!data) {
                historialAdaptado.push({
                    fecha,
                    asignados: 0,
                    ganados: 0,
                    noGanados: 0,
                    extra: 0
                });
                continue;
            }

            historialAdaptado.push({
                fecha,
                asignados: data.completada + data.vencida,
                ganados: data.completada,
                noGanados: data.vencida,
                extra: data.extra
            });
        }

        // console.log("Generando tabla para quincena: mostrar tabla promedio una sola con fechas:", inicio, fin);
        const tabla = new TablaPuntajes({
            fechaInicio: inicio,
            fechaFin: fin,
            fechaCorte: corte,
            historial: historialAdaptado,
        });

        // console.log("Generando tabla para quincena: mostrar tabla promedio una sola", "con fechas:", inicio, fin);

        tabla.generar();

        // Actualizar resumen de estadísticas
        const totalesQuincena = historialAdaptado.reduce((acc, dia) => ({
            ganados: acc.ganados + dia.ganados,
            noGanados: acc.noGanados + dia.noGanados,
            extras: acc.extras + dia.extra,
            asignados: acc.asignados + dia.asignados
        }), { ganados: 0, noGanados: 0, extras: 0, asignados: 0 });

        // Actualizar título con información completa de la quincena
        const quincenaInfo = determinarQuincena();
        const tablaTitulo = document.querySelector('#tabla-titulo');
        if (tablaTitulo) {
            tablaTitulo.textContent = `Quincena ${quincenaInfo.numero} - ${quincenaInfo.mesAnio} - Todos los Empleados`;
        }

        await actualizarResumen(totalesQuincena);
    }
}

// ===============================
// TABLA EMPLEADO INDIVIDUAL
// ===============================
async function mostrarTablaEmpleado(empleadoId, empleadoNombre, mostrarTodos = false) {
    try {
        // Cargar el HTML de la tabla
        const response = await fetch('/web/Informes/componentes/TablaPuntajes.html');
        const html = await response.text();

        // Cargar estadísticas del empleado
        const estadisticasRes = await fetch(`${API_BASE}/tareas/estadisticas`);
        const estadisticasData = await estadisticasRes.json();

        const empleado = estadisticasData.empleados.find(
            e => e.empleado_id === empleadoId
        );

        const histRes = await fetch(`${API_BASE}/historial/usuario/${empleadoId}`);
        const histData = await histRes.json();

        if (!empleado) {
            console.warn("Empleado no encontrado en panel");
            contentBody.innerHTML = `<div class="placeholder">No se encontraron datos para este empleado</div>`;
            return;
        }

        // Calcular estadísticas individuales
        const resultado = estadisticasGenerales(histData, empleado, true, mostrarTodos);

        let totalesGeneralesEmpleado = { ganados: 0, noGanados: 0, extras: 0, asignados: 0 };

        if (mostrarTodos) {
            // Limpiar resumen cuando se muestran todas las quincenas
            limpiarResumen();

            // Limpiar contenedor y preparar para múltiples tablas
            contentBody.innerHTML = '';

            // Generar una tabla para cada quincena
            resultado.quincenas.forEach((quincena, index) => {
                // Crear contenedor para esta quincena
                const quincenaContainer = document.createElement('div');
                quincenaContainer.innerHTML = html;
                quincenaContainer.style.marginBottom = '2rem';
                contentBody.appendChild(quincenaContainer);

                // Agregar clase compacta para vista de empleado individual
                const tablaCard = quincenaContainer.querySelector('.tabla-puntajes-card');
                if (tablaCard) {
                    tablaCard.classList.add('tabla-compacta');
                }

                const historialAdaptado = [];

                // Recorrer rango completo de esta quincena
                for (
                    let d = parsearFechaLocal(quincena.inicio);
                    d <= parsearFechaLocal(quincena.fin);
                    d.setDate(d.getDate() + 1)
                ) {
                    const fecha = obtenerFechaLocal(d);
                    const data =
                        quincena.hoy?.[fecha] ??
                        quincena.historial?.[fecha] ??
                        null;

                    if (!data) {
                        historialAdaptado.push({
                            fecha,
                            asignados: 0,
                            ganados: 0,
                            noGanados: 0,
                            extra: 0
                        });
                        continue;
                    }

                    historialAdaptado.push({
                        fecha,
                        asignados: data.completada + data.vencida,
                        ganados: data.completada,
                        noGanados: data.vencida,
                        extra: data.extra
                    });
                }

                const tabla = new TablaPuntajes({
                    fechaInicio: quincena.inicio,
                    fechaFin: quincena.fin,
                    fechaCorte: quincena.fin,
                    historial: historialAdaptado,
                });

                tabla.generar(quincenaContainer);
                // console.log("Generando tabla para quincena: mostrar tabla empleados todos", quincena.numero, quincena.mesAnio, "con fechas:", quincena.inicio, quincena.fin);

                // Calcular totales de esta quincena
                const totalesQuincena = historialAdaptado.reduce((acc, dia) => ({
                    ganados: acc.ganados + dia.ganados,
                    noGanados: acc.noGanados + dia.noGanados,
                    extras: acc.extras + dia.extra,
                    asignados: acc.asignados + dia.asignados
                }), { ganados: 0, noGanados: 0, extras: 0, asignados: 0 });

                // Sumar al total general
                totalesGeneralesEmpleado.ganados += totalesQuincena.ganados;
                totalesGeneralesEmpleado.noGanados += totalesQuincena.noGanados;
                totalesGeneralesEmpleado.extras += totalesQuincena.extras;
                totalesGeneralesEmpleado.asignados += totalesQuincena.asignados;

                // Actualizar título con número de quincena y mes
                const titulo = quincenaContainer.querySelector('#tabla-titulo');
                if (titulo) {
                    titulo.textContent = `Quincena ${quincena.numero} - ${quincena.mesAnio} - ${empleadoNombre}`;
                }
            });

            // Actualizar resumen con totales de todas las quincenas
            // await actualizarResumen(totalesGeneralesEmpleado);
        } else {
            // Mostrar solo quincena actual (comportamiento original)
            contentBody.innerHTML = html;

            // Agregar clase compacta para vista de empleado individual
            const tablaCard = contentBody.querySelector('.tabla-puntajes-card');
            if (tablaCard) {
                tablaCard.classList.add('tabla-compacta');
            }

            const { inicio, fin, corte } = determinarQuincena();
            const historialAdaptado = [];

            // Recorrer rango completo
            for (
                let d = parsearFechaLocal(inicio);
                d <= parsearFechaLocal(fin);
                d.setDate(d.getDate() + 1)
            ) {
                const fecha = obtenerFechaLocal(d);
                const data =
                    resultado.estadisticasHoy?.[fecha] ??
                    resultado.estadisticasHistorial?.[fecha] ??
                    null;

                if (!data) {
                    historialAdaptado.push({
                        fecha,
                        asignados: 0,
                        ganados: 0,
                        noGanados: 0,
                        extra: 0
                    });
                    continue;
                }

                historialAdaptado.push({
                    fecha,
                    asignados: data.completada + data.vencida,
                    ganados: data.completada,
                    noGanados: data.vencida,
                    extra: data.extra
                });
            }

            const tabla = new TablaPuntajes({
                fechaInicio: inicio,
                fechaFin: fin,
                fechaCorte: corte,
                historial: historialAdaptado,
            });

            // console.log("Generando tabla para quincena: mostrar tabla empleados uno solo", "con fechas:", inicio, fin);

            tabla.generar();

            // Actualizar resumen de estadísticas
            const totalesQuincena = historialAdaptado.reduce((acc, dia) => ({
                ganados: acc.ganados + dia.ganados,
                noGanados: acc.noGanados + dia.noGanados,
                extras: acc.extras + dia.extra,
                asignados: acc.asignados + dia.asignados
            }), { ganados: 0, noGanados: 0, extras: 0, asignados: 0 });

            // await actualizarResumen(totalesQuincena);

            // Actualizar el título de la tabla
            const titulo = document.getElementById("tabla-titulo");
            if (titulo) {
                const fechaInicio = parsearFechaLocal(inicio);
                const mes = fechaInicio.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                const diaInicio = fechaInicio.getDate();
                const quincena = diaInicio >= Q1_INICIO || diaInicio <= Q1_FIN ? 1 : 2;
                const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
                titulo.textContent = `Quincena ${quincena} - ${mesCapitalizado} - ${empleadoNombre}`;
            }
        }

    } catch (err) {
        console.error("Error cargando informes del empleado:", err);
        contentBody.innerHTML = `<div class="placeholder">Error al cargar los datos del empleado</div>`;
    }
}

// ===============================
// QUINCENA
// ===============================



/**
 * Determina a qué quincena pertenece una fecha dada
 * @param {string|Date} fecha - Fecha a evaluar
 * @returns {Object} Objeto con inicio, fin, numero, mesAnio de la quincena
 */
function determinarQuincena(fecha) {
    const f = fecha
        ? (typeof fecha === 'string' ? parsearFechaLocal(fecha) : fecha)
        : new Date();
    const dia = f.getDate();
    let inicio, fin, numero;

    if (dia >= Q1_INICIO || dia <= Q1_FIN) {
        // Q1: del día Q1_INICIO al Q1_FIN del siguiente mes
        if (dia >= Q1_INICIO) {
            inicio = new Date(f.getFullYear(), f.getMonth(), Q1_INICIO);
            fin = new Date(f.getFullYear(), f.getMonth() + 1, Q1_FIN);
        } else {
            inicio = new Date(f.getFullYear(), f.getMonth() - 1, Q1_INICIO);
            fin = new Date(f.getFullYear(), f.getMonth(), Q1_FIN);
        }
        numero = 1;
    } else {
        // Q2: del día Q2_INICIO al Q2_FIN
        inicio = new Date(f.getFullYear(), f.getMonth(), Q2_INICIO);
        fin = new Date(f.getFullYear(), f.getMonth(), Q2_FIN);
        numero = 2;
    }

    const mesAnio = fin.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const mesCapitalizado = mesAnio.charAt(0).toUpperCase() + mesAnio.slice(1);

    return {
        inicio: obtenerFechaLocal(inicio),
        fin: obtenerFechaLocal(fin),
        corte: obtenerFechaLocal(fin),

        numero,
        mesAnio: mesCapitalizado,
        // Clave única para agrupar
        clave: `${obtenerFechaLocal(inicio)}_${obtenerFechaLocal(fin)}`
    };
}


// ===============================
// ESTADÍSTICAS GENERALES
// ===============================


/**
 * Calcula las estadísticas generales de puntos por día organizadas por quincenas
 * 
 * @param {Object} historialData - Datos del historial
 * @param {Object} estadisticasData - Datos del panel/estadísticas
 * @param {boolean} estadisticasIndividuales - Si son estadísticas individuales o de equipo
 * @param {boolean} mostrarTodos - Si true, devuelve todas las quincenas; si false, solo la actual
 * @returns {Object} Objeto con quincenas (array ordenado) y quincenaActual
 */
function estadisticasGenerales(historialData, estadisticasData, estadisticasIndividuales = false, mostrarTodos = false) {

    // Mapa para agrupar datos por quincena
    const quincenasMap = new Map();

    const quincenaActualInfo = determinarQuincena();

    // console.log("Calculando estadísticas generales...", estadisticasData, historialData);

    /* ===============================
       PROCESAR HISTORIAL
       =============================== */
    if (historialData && historialData.registros) {
        historialData.registros.forEach(registro => {
            const fecha = registro.fecha;
            const quincenaInfo = determinarQuincena(fecha);

            // Si no mostramos todos, solo procesamos la quincena actual
            if (!mostrarTodos && quincenaInfo.clave !== `${quincenaActualInfo.inicio}_${quincenaActualInfo.fin}`) {
                return;
            }

            // Inicializar quincena si no existe
            if (!quincenasMap.has(quincenaInfo.clave)) {
                quincenasMap.set(quincenaInfo.clave, {
                    inicio: quincenaInfo.inicio,
                    fin: quincenaInfo.fin,
                    numero: quincenaInfo.numero,
                    mesAnio: quincenaInfo.mesAnio,
                    historial: {},
                    hoy: {}
                });
            }

            const quincena = quincenasMap.get(quincenaInfo.clave);

            // Inicializar fecha si no existe
            if (!quincena.historial[fecha]) {
                quincena.historial[fecha] = {
                    sin_iniciar: 0,
                    en_progreso: 0,
                    completada: 0,
                    vencida: 0,
                    extra: 0,
                    total: 0,
                    asignados: 0,
                };
            }

            const puntos = registro.puntos || 0;
            const estatus = registro.estatus;

            if (estatus === "extra" && registro.completadaPor !== null) {
                quincena.historial[fecha].extra += puntos;
            } else if (estatus === "sin_iniciar") {
                quincena.historial[fecha].sin_iniciar += puntos;
            } else if (estatus === "en_progreso") {
                quincena.historial[fecha].en_progreso += puntos;
            } else if (estatus === "completada" || estatus === "completado") {
                quincena.historial[fecha].completada += puntos;
            } else if (estatus === "vencida") {
                quincena.historial[fecha].vencida += puntos;
            }

            quincena.historial[fecha].total += puntos;
        });
    }

    /* ===============================
       ESTADISTICAS (HOY)
       =============================== */
    const fecha_hoy = obtenerFechaLocal();
    const quincenaHoyInfo = determinarQuincena(fecha_hoy);

    // console.log("fecha hoy para estadísticas:", fecha_hoy);
    // console.log("generales Quincena de hoy:", quincenaHoyInfo);
    // Asegurar que la quincena actual exista
    if (!quincenasMap.has(quincenaHoyInfo.clave)) {
        quincenasMap.set(quincenaHoyInfo.clave, {
            inicio: quincenaHoyInfo.inicio,
            fin: quincenaHoyInfo.fin,
            numero: quincenaHoyInfo.numero,
            mesAnio: quincenaHoyInfo.mesAnio,
            historial: {},
            hoy: {}
        });
    }

    const quincenaHoy = quincenasMap.get(quincenaHoyInfo.clave);

    if (estadisticasIndividuales) {
        quincenaHoy.hoy[fecha_hoy] = {
            sin_iniciar: 0,
            en_progreso: 0,
            completada: estadisticasData.puntos_obtenidos,
            vencida: estadisticasData.puntos_perdidos,
            extra: estadisticasData.puntos_extras,
            asignados: estadisticasData.puntos_asignados,
            promedio: estadisticasData.efectividad,
            total: estadisticasData.puntos_obtenidos + estadisticasData.puntos_extras
        };
    } else {
        quincenaHoy.hoy[fecha_hoy] = {
            sin_iniciar: 0,
            en_progreso: 0,
            completada: estadisticasData.equipo.puntos_obtenidos,
            vencida: estadisticasData.equipo.puntos_perdidos,
            extra: estadisticasData.equipo.puntos_extras,
            asignados: estadisticasData.equipo.puntos_asignados,
            promedio: estadisticasData.equipo.efectividad_equipo,
            total: estadisticasData.equipo.puntos_obtenidos + estadisticasData.equipo.puntos_extras
        };
    }

    // Convertir Map a array y ordenar de más reciente a más antigua
    const quincenasArray = Array.from(quincenasMap.values()).sort((a, b) => {
        return new Date(b.fin) - new Date(a.fin);
    });

    // Encontrar la quincena actual
    const quincenaActual = quincenasArray.find(q => q.inicio === quincenaActualInfo.inicio && q.fin === quincenaActualInfo.fin);

    // console.log("Quincenas procesadas:", quincenasArray);

    return {
        quincenas: quincenasArray,
        quincenaActual: quincenaActual || null,
        // Mantener compatibilidad con código antiguo
        estadisticasHistorial: quincenaActual ? quincenaActual.historial : {},
        estadisticasHoy: quincenaActual ? quincenaActual.hoy : {}
    };
}

// ===============================
// RESUMEN ESTADÍSTICAS
// ===============================
async function actualizarResumen(estadisticas) {
    if (!resumenEstadisticas) {
        resumenEstadisticas = new ResumenEstadisticas(resumenContainer);
        await resumenEstadisticas.cargar();
    }
    resumenEstadisticas.actualizar(estadisticas);
}

function limpiarResumen() {
    if (resumenContainer) {
        resumenContainer.innerHTML = '';
        resumenEstadisticas = null;
    }
}


// ===============================
// INIT
// ===============================
init();

async function init() {
    const { role, userId, username } = rolUsuario();

    await cargarInformes();

    if (role === 'empleado') {
        // Empleado ve directamente todas sus quincenas
        document.querySelector('.sidebar').style.display = 'none';
        document.querySelector('.content').style.marginLeft = '0';
        document.querySelector('.toggle-buttons').style.display = 'none';
        if (tareasVencidasContainer) {
            tareasVencidasContainer.style.display = 'none';
        }

        contentTitle.textContent = `Informe de ${username}`;
        VISTA_ACTUAL = { type: 'empleado', empleadoId: userId, empleadoNombre: username };

        await mostrarTablaEmpleado(userId, username, true);

    } else {
        // Supervisor/admin ve cards y tabla promedio por defecto
        await cargarEmpleados();

        // Inicializar componente de tareas vencidas
        tareasVencidasComponent = new TareasVencidasInformes();
        try {
            await tareasVencidasComponent.inicializar(tareasVencidasContainer);
            // Asegurar que sea visible
            tareasVencidasContainer.style.display = 'block';
            tareasVencidasContainer.style.visibility = 'visible';
        } catch (error) {
            console.error("Error inicializando componente de tareas vencidas:", error);
        }

        // Seleccionar promedio por defecto
        const promedioItem = sidebarOptions.querySelector('[data-type="promedio"]');
        if (promedioItem) {
            promedioItem.classList.add('active');
        }

        contentTitle.textContent = "Promedio de todos los empleados";
        VISTA_ACTUAL = { type: 'promedio', empleadoId: null, empleadoNombre: null };

        // Activar modo quincena actual
        document.querySelector('.toggle-btn[data-mode="actual"]').classList.add('active');
        document.querySelector('.toggle-btn[data-mode="todas"]').classList.remove('active');

        await mostrarTablaPromedio(false);
    }
}


