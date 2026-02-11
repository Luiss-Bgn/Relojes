/**
 Esta madre crea la tabla de las tarjetas de empleados con foto nombre y 
 su puesto, ademas al hacer clic  en una tarjeta se abre su panel
 */
import { mostrarTareasEmpleado } from './TareasPanel.js';

export function createEmpleadoCard(empleado, index) {
  const card = document.createElement('div');
  card.classList.add('empleado-card', `card-color-${index % 6}`);
  card.setAttribute('role', 'listitem');

  card.innerHTML = `
    <img src="/web/Images/${empleado.imagen}" alt="Foto de ${empleado.nombre}">
    <div class="empleado-info">
      <h2>${empleado.nombre}</h2>
      <p>${empleado.puesto}</p>
    </div>
  `;

  card.addEventListener('click', () => {
    selectCard(card);
    mostrarTareasEmpleado(empleado);
  });

  return card;
}

// marca la tarjeta como seleccionada y pone las demas grises
export function selectCard(card) {
  document.querySelectorAll('.empleado-card').forEach(c => {
    c.classList.remove('selected');
    c.classList.add('dimmed');
  });
  card.classList.add('selected');
  card.classList.remove('dimmed');
}

// quita toda seleccion de tarjetas, las deja normal
export function clearSelection() {
  document.querySelectorAll('.empleado-card').forEach(c => {
    c.classList.remove('selected', 'dimmed');
  });
}
