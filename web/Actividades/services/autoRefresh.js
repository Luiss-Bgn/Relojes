// Auto-refresh y polling ligero para Actividades

import {state} from "../state.js";

let lastEmpleadosJsonString = null;
let lastCssText = null;
let autoRefreshIntervalId = null;

async function fetchFallbackFromTareas() {
  try {
    const [usuariosResp, tareasResp] = await Promise.all([
      fetch('/usuarios', {cache: 'no-store'}),
      fetch('/tareas', {cache: 'no-store'})
    ]);
    if (!usuariosResp.ok || !tareasResp.ok) return null;
    const usuariosData = await usuariosResp.json();
    const tareasData = await tareasResp.json();
    const usuarios = usuariosData.usuarios || usuariosData || [];
    const tareas = tareasData.registros || tareasData.tareas || tareasData || [];

    const trabajadores = usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre || u.username || `Empleado ${u.id}`,
      puesto: u.puesto || u.rol || '',
      imagen: u.imagen || '',
      tareas_asignadas: {}
    }));

    tareas.forEach((t) => {
      const empId = t.id_dueño || t.id_dueno || t.usuario_id || t.user_id;
      if (!empId) return;
      const emp = trabajadores.find((e) => Number(e.id) === Number(empId));
      if (!emp) return;
      const fechaKey = t.fecha || t.dia || t.dia_semana || '';
      if (!fechaKey) return;
      if (!emp.tareas_asignadas[fechaKey]) emp.tareas_asignadas[fechaKey] = [];
      emp.tareas_asignadas[fechaKey].push({
        id: t.id,
        nombre: t.nombre,
        descripcion: t.descripcion,
        hora: t.hora_ini || t.hora || '',
        hora_fin: t.hora_fin || '',
        puntaje: t.puntos || t.puntaje || 0,
        estatus: t.estatus || 2
      });
    });

    return trabajadores;
  } catch (err) {
    console.warn('fetchFallbackFromTareas error', err);
    return null;
  }
}

export async function fetchEmpleadosIfChanged() {
  try {
    const resp = await fetch('/empleados-con-tareas', {cache: 'no-store'});
    if (resp.ok) {
      const data = await resp.json();
      const text = JSON.stringify(data);
      if (lastEmpleadosJsonString === text) return null;
      lastEmpleadosJsonString = text;
      return data;
    }

    // Fallback: construir estructura desde /usuarios + /tareas cuando el endpoint no existe
    const fallback = await fetchFallbackFromTareas();
    if (!fallback) return null;
    const text = JSON.stringify(fallback);
    if (lastEmpleadosJsonString === text) return null;
    lastEmpleadosJsonString = text;
    return fallback;
  } catch (err) {
    console.warn('fetchEmpleadosIfChanged error', err);
    return null;
  }
}

export async function fetchCssIfChanged() {
  try {
    const resp = await fetch('/web/Actividades/actividades.css', {cache: 'no-store'});
    if (!resp.ok) return null;
    const text = await resp.text();
    if (lastCssText === text) return null;
    lastCssText = text;
    return text;
  } catch (err) {
    console.warn('fetchCssIfChanged error', err);
    return null;
  }
}

export function applyCssText(cssText) {
  const link = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .find(l => l.href && l.href.includes('/web/Actividades/actividades.css'));
  if (link) {
    let style = document.getElementById('live-actividades-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'live-actividades-css';
      document.head.appendChild(style);
    }
    style.textContent = cssText;
  } else {
    let style = document.getElementById('live-actividades-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'live-actividades-css';
      document.head.appendChild(style);
    }
    style.textContent = cssText;
  }
}

export function startAutoRefresh({
  intervalMs = 1000,
  onDataChange,
  onCssChange,
  onExtrasRefresh
} = {}) {
  stopAutoRefresh();

  autoRefreshIntervalId = setInterval(async () => {
    const empleadosData = await fetchEmpleadosIfChanged();
    if (empleadosData && typeof onDataChange === 'function') {
      await onDataChange(empleadosData);
    }

    if (typeof onExtrasRefresh === 'function') {
      await onExtrasRefresh();
    }

    const cssText = await fetchCssIfChanged();
    if (cssText && typeof onCssChange === 'function') {
      onCssChange(cssText);
    }
  }, intervalMs);

  window.startAutoRefresh = () => startAutoRefresh({intervalMs, onDataChange, onCssChange, onExtrasRefresh});
  window.stopAutoRefresh = stopAutoRefresh;
}

export function stopAutoRefresh() {
  if (autoRefreshIntervalId) {
    clearInterval(autoRefreshIntervalId);
    autoRefreshIntervalId = null;
  }
}
