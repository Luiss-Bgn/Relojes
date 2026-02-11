/**
 * TareasVencidasInformes.js
 * Componente específico para mostrar tareas vencidas en el sistema de informes
 */

export default class TareasVencidasInformes {
    constructor() {
        this.mostrandoQuincena = true;
        this.paginaActual = 1;
        this.itemsPorPagina = 6;
        this.tareasCache = [];
    }

    async cargar() {
        const response = await fetch('/web/Informes/componentes/TareasVencidasInformes.html');
        const html = await response.text();
        return html;
    }

    async inicializar(container) {
        try {
            // Cargar HTML
            const html = await this.cargar();
            container.innerHTML = html;

            // Configurar eventos
            this.configurarEventos();

            // Cargar datos iniciales
            await this.actualizarTareasVencidas();
        } catch (error) {
            console.error('Error inicializando TareasVencidasInformes:', error);
            container.innerHTML = '<div class="error-message">Error cargando tareas vencidas</div>';
        }
    }

    configurarEventos() {
        const btnQuincena = document.getElementById('tareas-btn-quincena');
        const btnTodo = document.getElementById('tareas-btn-todo');

        if (btnQuincena) {
            btnQuincena.addEventListener('click', () => {
                this.mostrandoQuincena = true;
                this.paginaActual = 1;
                btnQuincena.classList.add('active');
                btnTodo.classList.remove('active');
                this.actualizarTareasVencidas();
            });
        }

        if (btnTodo) {
            btnTodo.addEventListener('click', () => {
                this.mostrandoQuincena = false;
                this.paginaActual = 1;
                btnTodo.classList.add('active');
                btnQuincena.classList.remove('active');
                this.actualizarTareasVencidas();
            });
        }
    }

    async obtenerTareasVencidasAPI() {
        try {
            const url = this.mostrandoQuincena 
                ? 'http://localhost:8001/historial/top-vencidas?solo_quincena_actual=true' 
                : 'http://localhost:8001/historial/top-vencidas?solo_quincena_actual=false';
            
            const response = await fetch(url, { cache: 'no-store' });
            
            if (!response.ok) {
                console.error('Error obteniendo tareas vencidas:', response.status);
                return { top_tareas: [], periodo: '', total: 0 };
            }
            
            const data = await response.json();
            return data || { top_tareas: [], periodo: '', total: 0 };
        } catch (error) {
            console.error('Error en obtenerTareasVencidasAPI:', error);
            return { top_tareas: [], periodo: '', total: 0 };
        }
    }

    async actualizarTareasVencidas() {
        const container = document.getElementById('tareas-vencidas-lista');
        if (!container) return;

        container.innerHTML = '<div class="tareas-loading">Cargando tareas vencidas...</div>';

        const data = await this.obtenerTareasVencidasAPI();
        this.tareasCache = data.top_tareas || [];

        if (this.tareasCache.length === 0) {
            container.innerHTML = `
                <div class="tareas-vencidas-empty">
                    <div class="empty-icon">✅</div>
                    <div class="empty-text">¡Excelente trabajo!</div>
                    <div class="empty-subtext">No hay tareas vencidas ${this.mostrandoQuincena ? 'en esta quincena' : ''}</div>
                </div>
            `;
            return;
        }

        this.renderizarTareasPaginadas();
    }

    renderizarTareasPaginadas() {
        const container = document.getElementById('tareas-vencidas-lista');
        if (!container || this.tareasCache.length === 0) return;

        const totalPaginas = Math.ceil(this.tareasCache.length / this.itemsPorPagina) || 1;
        const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        const tareasPagina = this.tareasCache.slice(inicio, fin);

        const tareasHTML = `
            <div class="tareas-vencidas-grid">
                ${tareasPagina.map((tarea, index) => `
                    <div class="tarea-vencida-card" style="animation-delay: ${index * 0.1}s">
                        <div class="tarea-header">
                            <h4 class="tarea-titulo">${this.escapeHtml(tarea.nombre || 'Tarea')}</h4>
                            <span class="tarea-badge">#${inicio + index + 1}</span>
                        </div>
                        <div class="tarea-stats">
                            <span class="stat-item">
                                <span class="stat-icon">🔥</span>
                                <span>${tarea.total_vencidas} ${tarea.total_vencidas === 1 ? 'vez' : 'veces'}</span>
                            </span>
                            <span class="stat-item">
                                <span class="stat-icon">⭐</span>
                                <span>${tarea.total_puntos || 0} pts</span>
                            </span>
                            <span class="stat-item">
                                <span class="stat-icon">📅</span>
                                <span>${this.formatearFecha(tarea.ultima_fecha)}</span>
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        const paginacionHTML = totalPaginas > 1 ? `
            <div class="tareas-paginacion">
                <button class="paginacion-btn" id="tareas-btn-prev" ${this.paginaActual === 1 ? 'disabled' : ''}>
                    ← Anterior
                </button>
                <span class="paginacion-info">
                    ${inicio + 1}-${Math.min(fin, this.tareasCache.length)} de ${this.tareasCache.length}
                </span>
                <button class="paginacion-btn" id="tareas-btn-next" ${this.paginaActual === totalPaginas ? 'disabled' : ''}>
                    Siguiente →
                </button>
            </div>
        ` : '';

        container.innerHTML = tareasHTML + paginacionHTML;

        // Event listeners pagination
        if (totalPaginas > 1) {
            const btnPrev = document.getElementById('tareas-btn-prev');
            const btnNext = document.getElementById('tareas-btn-next');

            if (btnPrev) {
                btnPrev.addEventListener('click', () => {
                    if (this.paginaActual > 1) {
                        this.paginaActual--;
                        this.renderizarTareasPaginadas();
                    }
                });
            }

            if (btnNext) {
                btnNext.addEventListener('click', () => {
                    if (this.paginaActual < totalPaginas) {
                        this.paginaActual++;
                        this.renderizarTareasPaginadas();
                    }
                });
            }
        }
    }

    formatearFecha(fecha) {
        if (!fecha) return '--/--/----';
        const date = typeof fecha === 'string' ? new Date(fecha + 'T00:00:00') : fecha;
        const dia = date.getDate().toString().padStart(2, '0');
        const mes = (date.getMonth() + 1).toString().padStart(2, '0');
        const año = date.getFullYear();
        return `${dia}/${mes}/${año}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async actualizarPorModo(mostrarTodas = false) {
        this.mostrandoQuincena = !mostrarTodas;
        this.paginaActual = 1;
        
        // Actualizar botones
        const btnQuincena = document.getElementById('tareas-btn-quincena');
        const btnTodo = document.getElementById('tareas-btn-todo');
        
        if (btnQuincena && btnTodo) {
            if (mostrarTodas) {
                btnTodo.classList.add('active');
                btnQuincena.classList.remove('active');
            } else {
                btnQuincena.classList.add('active');
                btnTodo.classList.remove('active');
            }
        }
        
        await this.actualizarTareasVencidas();
    }
}