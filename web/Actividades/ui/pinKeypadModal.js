export const showPinKeypadModal = (taskInfo = null) => {
  return new Promise((resolve, reject) => {
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.id = 'pin-keypad-overlay';
    overlay.className = 'pin-keypad-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'pin-keypad-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      max-width: 300px;
      width: 90%;
      text-align: center;
      position: relative;
  `;

  // Contenido del modal
  modal.innerHTML = `
    <div class="keypad-header">
      <h2 style="margin: 0 0 10px 0; color: #2d3748; font-size: 1.5rem;">
        🔐 Ingresa tu PIN
      </h2>
      <p style="margin: 0 0 20px 0; color: #718096; font-size: 0.9rem;">
        ${taskInfo ? `Para completar: "${taskInfo.nombre ?? taskInfo.name}"` : 'Ingresa tu PIN de 4 dígitos'}
      </p>
      <button class="close-btn" style="
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #718096;
        cursor: pointer;
      ">×</button>
    </div>

    <div class="pin-display" style="
      background: #f7fafc;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      font-size: 1.8rem;
      letter-spacing: 8px;
      min-height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
    ">
      <span id="pin-dots">____</span>
    </div>

    <div class="keypad-grid" style="
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    ">
      ${[1,2,3,4,5,6,7,8,9].map(num => `
        <button class="keypad-btn" data-digit="${num}" style="
          background: #4299e1;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 15px;
          font-size: 1.2rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">${num}</button>
      `).join('')}
      
      <button class="keypad-btn clear-btn" style="
        background: #f56565;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 15px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      ">Borrar</button>
      
      <button class="keypad-btn" data-digit="0" style="
        background: #4299e1;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 15px;
        font-size: 1.2rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      ">0</button>
      
      <button class="keypad-btn confirm-btn" style="
        background: #48bb78;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 15px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        opacity: 0.5;
      ">✓</button>
    </div>

    <div class="error-message" style="
      color: #e53e3e;
      font-size: 0.9rem;
      margin-top: 10px;
      min-height: 20px;
    "></div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Variables para manejar el PIN
  let currentPin = '';
  const pinDots = modal.querySelector('#pin-dots');
  const errorMessage = modal.querySelector('.error-message');
  const confirmBtn = modal.querySelector('.confirm-btn');
  
  // Actualizar display del PIN
  const updatePinDisplay = () => {
    const dots = currentPin.padEnd(4, '_').split('').join('');
    pinDots.textContent = dots;
    
    // Habilitar botón confirmar solo cuando hay 4 dígitos
    if (currentPin.length === 4) {
      confirmBtn.style.opacity = '1';
      confirmBtn.disabled = false;
    } else {
      confirmBtn.style.opacity = '0.5';
      confirmBtn.disabled = true;
    }
  };

  // Event listeners para los botones numéricos
  modal.querySelectorAll('[data-digit]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentPin.length < 4) {
        currentPin += btn.dataset.digit;
        updatePinDisplay();
        errorMessage.textContent = '';
      }
    });
    
    // Efecto hover
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = 'none';
    });
  });

  // Botón borrar
  modal.querySelector('.clear-btn').addEventListener('click', () => {
    currentPin = '';
    updatePinDisplay();
    errorMessage.textContent = '';
  });

  // Botón confirmar
  confirmBtn.addEventListener('click', () => {
    if (currentPin.length === 4) {
      // Mantener PIN como string, no convertir a number
      resolve(currentPin);
      overlay.remove();
    }
  });

  // Botón cerrar
  modal.querySelector('.close-btn').addEventListener('click', () => {
    resolve(null); // Usuario canceló
    overlay.remove();
  });

  // Cerrar al hacer clic fuera
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      resolve(null); // Usuario canceló
      overlay.remove();
    }
  });

  // Soporte para teclado físico
  const handleKeyPress = (e) => {
    if (e.key >= '0' && e.key <= '9' && currentPin.length < 4) {
      currentPin += e.key;
      updatePinDisplay();
      errorMessage.textContent = '';
    } else if (e.key === 'Backspace') {
      currentPin = currentPin.slice(0, -1);
      updatePinDisplay();
      errorMessage.textContent = '';
    } else if (e.key === 'Enter' && currentPin.length === 4) {
      // Mantener PIN como string, no convertir a number
      resolve(currentPin);
      overlay.remove();
    } else if (e.key === 'Escape') {
      resolve(null); // Usuario canceló
      overlay.remove();
    }
  };

  document.addEventListener('keydown', handleKeyPress);
  
  // Limpiar listener cuando se cierre el modal
  const originalRemove = overlay.remove;
  overlay.remove = function() {
    document.removeEventListener('keydown', handleKeyPress);
    originalRemove.call(this);
  };

  // Agregar modal al DOM
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Dar foco al primer botón
  setTimeout(() => {
    modal.querySelector('.keypad-btn').focus();
  }, 100);
  
  }); // Cerrar la Promise
};