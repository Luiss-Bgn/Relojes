export function initRelojesConectados(target) {
  if (!target) return;
  target.innerHTML = template();
  const listEl = target.querySelector('#relojes-list');
  const stateEl = target.querySelector('#relojes-state');
  loadRelojes(listEl, stateEl);
}

function template() {
  return `
    <div class="panel-header">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
      </svg>
      Equipos conectados
    </div>
    <div class="panel-content">
      <div id="relojes-state" class="hint"></div>
      <div id="relojes-list" class="relojes-list"></div>
    </div>
  `;
}

async function loadRelojes(listEl, stateEl) {
  if (!listEl || !stateEl) return;
  
  stateEl.textContent = 'Cargando equipos conectados...';
  stateEl.style.color = '#6b7280';
  
  try {
    const response = await fetch('/relojes-conectados');
    if (!response.ok) throw new Error('Error al cargar relojes');
    
    const relojes = await response.json();
    
    if (!Array.isArray(relojes) || relojes.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
          <p>No hay equipos conectados</p>
        </div>
      `;
      stateEl.textContent = '';
      return;
    }
    
    renderRelojes(listEl, relojes);
    stateEl.textContent = '';
    
  } catch (error) {
    console.error('Error al cargar relojes conectados:', error);
    listEl.innerHTML = `
      <div class="empty-state">
        <p style="color: #ef4444;">⚠️ Error al cargar equipos conectados</p>
      </div>
    `;
    stateEl.textContent = '';
  }
}

function renderRelojes(listEl, relojes) {
  const rows = relojes.map(reloj => {
    const nombre = reloj.nombre || 'Sin nombre';
    const rol = reloj.rol || 'empleado';
    const rolClass = rol === 'admin' ? 'tag-admin' : rol === 'supervisor' ? 'tag-supervisor' : 'tag-empleado';
    
    return `
      <div class="reloj-item">
        <div class="reloj-info">
          <div class="reloj-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
          </div>
          <div class="reloj-details">
            <span class="reloj-nombre">${nombre}</span>
            <span class="tag ${rolClass}">${rol.charAt(0).toUpperCase() + rol.slice(1)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  listEl.innerHTML = rows;
}
