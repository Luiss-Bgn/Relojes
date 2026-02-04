document.addEventListener('DOMContentLoaded', () => {
  buildMenu();
  attachMenuListeners();
  highlightActiveTab();
  createUserCard();
});

/**
 * Crea dinámicamente el menú con radio inputs, labels y la 'indicator',
 * según el estado de la sesión y el rol del usuario almacenado en localStorage.
 */
function buildMenu() {
  // Recupera el usuario autenticado del localStorage (puede ser null)
  const loggedUserString = localStorage.getItem("loggedUser");
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : null;
  
  let menuItems = [];

  if (!loggedUser) {
    // No hay sesión iniciada (visitante)
    menuItems = [
      { tabId: 'tab-1', label: 'Actividades Diarias', href: '/actividades' },
      { tabId: 'tab-2', label: 'Top Empleados', href: '/top' },
      { tabId: 'tab-3', label: 'Iniciar Sesión', href: '/login' }
    ];
  } else {
    // Hay sesión iniciada
    const userRole = loggedUser.role ? loggedUser.role.toLowerCase() : "";
    
    console.log(`🔍 [Menu] Usuario: ${loggedUser.username}, Rol: ${userRole}`);
    
    // Solo administradores tienen acceso completo (incluyendo Historial)
    if (userRole === "admin" || userRole === "administrador") {
      console.log("✅ [Menu] Acceso completo - Administrador");
      menuItems = [
        { tabId: 'tab-1', label: 'Actividades Diarias', href: '/actividades', defaultChecked: true },
        { tabId: 'tab-2', label: 'Informes'     , href: '/informes' },
        { tabId: 'tab-3', label: 'Gestión'      , href: '/gestion' },
        { tabId: 'tab-5', label: 'Top Empleados'    , href: '/top'},
        { tabId: 'tab-4', label: 'Cerrar Sesión', href: '/logout' }
      ];
    } else if (userRole === "supervisor") {
      // Supervisores NO tienen acceso a Historial
      // console.log("✅ [Menu] Acceso limitado - Supervisor");
      menuItems = [
        { tabId: 'tab-1', label: 'Actividades Diarias', href: '/actividades', defaultChecked: true },
        { tabId: 'tab-2', label: 'Informes'     , href: '/informes' },
        { tabId: 'tab-3', label: 'Gestión'      , href: '/gestion' },
        { tabId: 'tab-4', label: 'Top Empleados'    , href: '/top'},
        { tabId: 'tab-5', label: 'Cerrar Sesión', href: '/logout' }
      ];
    } else {
      // Usuario empleado (no admin ni supervisor)
      console.log("✅ [Menu] Acceso básico - Empleado");
      menuItems = [
        { tabId: 'tab-1', label: 'Actividades Diarias', href: '/actividades', defaultChecked: true },
        { tabId: 'tab-2', label: 'Informes', href: '/informes' },
        { tabId: 'tab-3', label: 'Top Empleados'    , href: '/top'},
        { tabId: 'tab-4', label: 'Cerrar Sesión', href: '/logout' }
      ];
    }
  }

  // Crear el contenedor principal del menú
  const tabContainer = document.createElement('div');
  tabContainer.classList.add('tab-container');
  
  // Ajustar el ancho del contenedor según el número de opciones
  // (Cada pestaña tiene 130px de ancho y se agregan 4px extra para compensar márgenes)
  tabContainer.style.width = `${menuItems.length * 130 + 4}px`;

  // Generamos dinámicamente cada radio input, label y la 'indicator'
  menuItems.forEach((item, index) => {
    // Crear el input tipo radio
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'tab';
    input.id = item.tabId;
    input.classList.add('tab', `tab--${index + 1}`);
    if (item.defaultChecked) {
      input.checked = true;
    }

    // Crear el label que contiene el enlace
    const label = document.createElement('label');
    label.htmlFor = item.tabId;
    label.classList.add('tab_label');

    // Crear el enlace <a>
    const a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.label;

    // Insertar el enlace dentro del label
    label.appendChild(a);

    // Añadir el input y label al contenedor principal
    tabContainer.appendChild(input);
    tabContainer.appendChild(label);
  });

  // Crear la "indicator"
  const indicator = document.createElement('div');
  indicator.classList.add('indicator');
  tabContainer.appendChild(indicator);

  // Inyectar el menú en el contenedor correspondiente
  const menuContainer = document.getElementById('menu-container');
  menuContainer.innerHTML = ''; // Limpiar contenido previo
  menuContainer.appendChild(tabContainer);
}

/**
 * Intercepta los clics en los enlaces del menú para, por ejemplo,
 * cambiar la URL, resaltar la pestaña activa, etc.
 */
function attachMenuListeners() {
  const menuContainer = document.getElementById('menu-container');

  menuContainer.addEventListener('click', (event) => {
    const clickedElement = event.target;

    // Solo nos interesa si se hace clic en un <a>
    if (clickedElement.tagName === 'A') {
      const href = clickedElement.getAttribute('href');
      
      // Si se hace clic en "Cerrar Sesión" (href = /logout)
      if (href === '/logout') {
        event.preventDefault(); // Evitar la redirección inmediata
        
        // 🔥 Mostrar popup de confirmación antes de cerrar sesión
        mostrarConfirmacionLogout();
        return;
      }
      
      // Si se hace clic en "Iniciar Sesión" (href = /login)
      if (href === '/login') {
        window.location.href = "/login";
        return;
      }
      
      // Para las demás opciones, actualizar la clase 'active'
      const links = menuContainer.querySelectorAll('a');
      links.forEach(link => link.classList.remove('active'));
      clickedElement.classList.add('active');

      // Actualizar la pestaña activa
      highlightActiveTab();
    }
  });
}

/**
 * Resalta la pestaña activa según la URL actual o según el <a> con clase 'active'.
 */
function highlightActiveTab() {
  const currentPath = window.location.pathname;
  const tabs = document.querySelectorAll('.tab_label');
  const indicator = document.querySelector('.indicator');

  let activeIndex = 0;

  tabs.forEach((tab, index) => {
    const link = tab.querySelector('a');
    // Quitar la clase 'active' a todos
    tab.classList.remove('active');

    // Si la ruta coincide con el href o si el enlace tiene la clase 'active'
    if (link && (link.getAttribute('href') === currentPath || link.classList.contains('active'))) {
      tab.classList.add('active');
      activeIndex = index;
    }
  });

  // Usar el ancho real de una pestaña para posicionar correctamente la indicator
  const tabWidth = tabs[0] ? tabs[0].offsetWidth : 130;
  requestAnimationFrame(() => {
    indicator.style.transform = `translateX(${activeIndex * tabWidth}px)`;
  });
}

/**
 * Mostrar popup de confirmación antes de cerrar sesión
 */
function mostrarConfirmacionLogout() {
  // Crear overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease;
  `;
  
  // Crear popup
  const popup = document.createElement('div');
  popup.style.cssText = `
    background: white;
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    max-width: 400px;
    width: 90%;
    animation: slideIn 0.3s ease;
  `;
  
  popup.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 48px; margin-bottom: 15px;">🚪</div>
      <h2 style="margin: 0 0 15px 0; color: #333; font-size: 1.5rem;">¿Cerrar sesión?</h2>
      <p style="color: #666; margin-bottom: 25px; font-size: 1rem;">¿Realmente quieres cerrar la sesión?</p>
      
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="btn-cancelar-logout" style="
          flex: 1;
          padding: 12px 24px;
          border: 2px solid #ddd;
          background: white;
          color: #666;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        ">Cancelar</button>
        
        <button id="btn-confirmar-logout" style="
          flex: 1;
          padding: 12px 24px;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        ">Sí, cerrar</button>
      </div>
    </div>
  `;
  
  // Agregar animaciones CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    #btn-cancelar-logout:hover {
      background: #f5f5f5;
      border-color: #bbb;
    }
    #btn-confirmar-logout:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }
  `;
  document.head.appendChild(style);
  
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  
  // Botón cancelar
  document.getElementById('btn-cancelar-logout').addEventListener('click', () => {
    overlay.remove();
  });
  
  // Botón confirmar
  document.getElementById('btn-confirmar-logout').addEventListener('click', async () => {
    try {
      // Limpiar el localStorage
      localStorage.removeItem("loggedUser");
      
      // Hacer petición al endpoint de logout (opcional, para limpiar sesión en backend)
      await fetch("/logout", { method: "GET" }).catch(() => {});
      
      // Redirigir al login
      window.location.replace("/login");
    } catch (error) {
      console.error("Error en logout:", error);
      // Aún así redirigir al login
      window.location.replace("/login");
    }
  });
  
  // Cerrar al hacer clic fuera del popup
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

/**
 * Crea la tarjeta de usuario en la esquina superior izquierda
 */
function createUserCard() {
  const loggedUserString = localStorage.getItem("loggedUser");
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : null;

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

  // Crear estructura con ícono, nombre y rol
  let username, roleDisplay;
  
  if (!loggedUser) {
    // Usuario visitante
    username = 'usuario';
    roleDisplay = 'visitante';
  } else {
    username = loggedUser.nombre || loggedUser.username  || 'Usuario';
    const role = loggedUser.role || 'empleado';
    roleDisplay = role === 'admin' ? 'Administrador' : role === 'supervisor' ? 'Supervisor' : 'Empleado';
  }
  
  userNameDisplay.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
    <span>${username} (${roleDisplay})</span>
  `;
}
