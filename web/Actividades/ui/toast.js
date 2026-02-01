// Toast helper for Actividades UI

export function showToast(msg, type = 'success', timeout = 3000) {
  let container = document.getElementById('toast-container-actividades');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container-actividades';
    container.style.position = 'fixed';
    container.style.right = '16px';
    container.style.bottom = '16px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  toast.style.padding = '10px 14px';
  toast.style.borderRadius = '6px';
  toast.style.color = '#111';
  toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  toast.style.fontSize = '14px';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 160ms ease, transform 200ms ease';
  if (type === 'error') {
    toast.style.background = '#ffdede';
    toast.style.border = '1px solid #ff9a9a';
  } else if (type === 'info') {
    toast.style.background = '#e3f2fd';
    toast.style.border = '1px solid #90caf9';
    toast.style.color = '#1565c0';
  } else {
    toast.style.background = '#eaffd6';
    toast.style.border = '1px solid #b7f08a';
  }

  container.appendChild(toast);
  // force layout
  void toast.offsetWidth;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(() => toast.remove(), 300);
  }, timeout);
}
