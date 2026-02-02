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
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Crear menú
  const menu = document.createElement('div');
  menu.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 24px;
    min-width: 320px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease;
  `;

  menu.innerHTML = `
    <style>
      @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .menu-option {
        background: white;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 15px;
        font-weight: 500;
        color: #333;
        transition: all 0.2s ease;
      }
      .menu-option:hover {
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      .menu-option.danger {
        color: #ef4444;
      }
      .menu-header {
        color: white;
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 20px;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    </style>
    <div class="menu-header">
      <span>Opciones: ${emp.nombre}</span>
      <button class="close-btn" onclick="this.closest('#employee-menu-overlay').remove()">✕</button>
    </div>
    <div class="menu-option" data-action="crear-tarea">
      <span style="font-size: 20px;">➕</span>
      <span>Crear Tarea</span>
    </div>
    <div class="menu-option" data-action="editar-tareas">
      <span style="font-size: 20px;">✏️</span>
      <span>Editar Tareas</span>
    </div>
    <div class="menu-option" data-action="ver-info">
      <span style="font-size: 20px;">👤</span>
      <span>Ver/Editar Información</span>
    </div>
    ${userRole === 'admin' ? `
    <div class="menu-option danger" data-action="eliminar">
      <span style="font-size: 20px;">🗑️</span>
      <span>Eliminar Empleado</span>
    </div>
    ` : ''}
    <div class="menu-option" data-action="cerrar">
      <span style="font-size: 20px;">❌</span>
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
        console.log('Crear tarea para:', emp.nombre);
        // TODO: Implementar modal de crear tarea
        break;
      case 'editar-tareas':
        console.log('Editar tareas de:', emp.nombre);
        // TODO: Implementar vista de edición de tareas
        break;
      case 'ver-info':
        console.log('Ver información de:', emp.nombre);
        // TODO: Implementar modal de información del empleado
        break;
      case 'eliminar':
        console.log('Eliminar empleado:', emp.nombre);
        // TODO: Implementar confirmación y eliminación
        break;
      case 'cerrar':
        overlay.remove();
        return;
    }
    
    overlay.remove();
  });

  // Cerrar al hacer clic fuera
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
};
