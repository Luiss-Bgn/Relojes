import { initCrearEmpleado } from './components/crear-empleado.js';
import { initRelojesConectados } from './components/relojes-conectados.js';

document.addEventListener('DOMContentLoaded', () => {
  const crearPanel = document.getElementById('crear-empleado-panel');
  const relojesPanel = document.getElementById('relojes-panel');

  initCrearEmpleado(crearPanel);
  initRelojesConectados(relojesPanel);
});
