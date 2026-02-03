import { showCrearTareaModal } from './modals/crearTareaModal.js';
import { showEditarTareasModal } from './modals/editarTareasModal.js';
import { showVerInfoModal } from './modals/verInfoModal.js';

export const showEmployeeMenu = (emp, event) => {
  // Cerrar menú anterior si existe
  const existingMenu = document.getElementById('employee-menu-overlay');
  if (existingMenu) existingMenu.remove();

  // Verificar rol del usuario
  const loggedUser = localStorage.getItem("loggedUser");
  const user = loggedUser ? JSON.parse(loggedUser) : null;
  const userRole = user?.role ? user.role.toLowerCase() : "visitante";

  // Solo admin y supervisor pueden ver el menú
  if (userRole !== "admin" && userRole !== "supervisor") return;

  // Crear overlay
  const overlay = document.createElement('div');
  overlay.id = 'employee-menu-overlay';
  overlay.className = 'employee-menu-overlay';

  // Crear menú
  const menu = document.createElement('div');
  menu.className = 'employee-menu';

  menu.innerHTML = `
    <div class="menu-header">
      Opciones: ${emp.nombre}
    </div>
    <div class="menu-option" data-action="crear-tarea">
      <span class="menu-icon">➕</span>
      <span>Crear Tarea</span>
    </div>
    <div class="menu-option" data-action="editar-tareas">
      <span class="menu-icon">✏️</span>
      <span>Editar Tareas</span>
    </div>
    <div class="menu-option" data-action="ver-info">
      <span class="menu-icon">👤</span>
      <span>Ver/Editar Información</span>
    </div>
    ${userRole === 'admin' ? `
    <div class="menu-option danger" data-action="eliminar">
      <span class="menu-icon">🗑️</span>
      <span>Eliminar Empleado</span>
    </div>
    ` : ''}
    <div class="menu-option close-option" data-action="cerrar">
      <span class="menu-icon">✕</span>
      <span>Cerrar</span>
    </div>
  `;

  overlay.appendChild(menu);
  document.body.appendChild(overlay);

  // Event listeners para las opciones
  menu.addEventListener('click', (e) => {
    const option = e.target.closest('.menu-option');
    if (!option) return;

    const action = option.dataset.action;
    
    switch(action) {
      case 'crear-tarea':
        overlay.remove();
        showCrearTareaModal(emp);
        break;
      case 'editar-tareas':
        overlay.remove();
        showEditarTareasModal(emp);
        break;
      case 'ver-info':
        overlay.remove();
        showVerInfoModal(emp);
        break;
      case 'eliminar':
        console.log('Eliminar empleado:', emp.nombre);
        overlay.remove();
        // TODO: Implementar confirmación y eliminación
        break;
      case 'cerrar':
        overlay.remove();
        return;
    }
  });

  // Cerrar al hacer clic fuera
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
};
