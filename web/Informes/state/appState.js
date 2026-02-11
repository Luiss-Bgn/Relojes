/*
  Aqui se guarda el estado global de Informes.
  Asi no ando pasando variables por todos lados como loco
*/

const state = {
  empleados: [],
  modoGrafica: 'quincena', // 'quincena' | 'todo'
};

/*  empleados  */
export function setEmpleados(data) { state.empleados = data || []; }
export function getEmpleados() { return state.empleados; }

/*  modo de la grafica (quincena o todo)  */
export function setModoGrafica(modo) { state.modoGrafica = modo; }
export function getModoGrafica() { return state.modoGrafica; }

/*  datos de sesion del usuario logueado  */
export function getUsuario() {
  return JSON.parse(localStorage.getItem('loggedUser') || 'null');
}

export function getRol() {
  return getUsuario()?.role?.toLowerCase() || 'visitante';
}

export function isAdmin() {
  const r = getRol();
  return r === 'admin' || r === 'administrador' || r === 'supervisor';
}
