// Sistema de notificaciones toast
export function showToast(message, type = 'info', duration = 3000) {
  // Crear contenedor si no existe
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Crear toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Icono según el tipo
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ'}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Animación de entrada
  setTimeout(() => toast.classList.add('toast-show'), 10);

  // Auto-cerrar
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Modal de confirmación personalizado
export function showConfirm(message, title = '¿Estás seguro?') {
  return new Promise((resolve) => {
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
      <div class="confirm-header">
        <h3>${title}</h3>
      </div>
      <div class="confirm-body">
        <p>${message}</p>
      </div>
      <div class="confirm-footer">
        <button class="btn-cancel" id="confirm-cancel">Cancelar</button>
        <button class="btn-confirm" id="confirm-ok">Aceptar</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Animación de entrada
    setTimeout(() => {
      overlay.classList.add('confirm-show');
      modal.classList.add('confirm-show');
    }, 10);

    // Handlers
    const cleanup = (result) => {
      overlay.classList.remove('confirm-show');
      modal.classList.remove('confirm-show');
      setTimeout(() => overlay.remove(), 300);
      resolve(result);
    };

    document.getElementById('confirm-cancel').addEventListener('click', () => cleanup(false));
    document.getElementById('confirm-ok').addEventListener('click', () => cleanup(true));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}
