class ResumenEstadisticas {
    constructor(container) {
        this.container = container;
        this.canvas = null;
        this.ctx = null;
        this.porcentajeCentro = null;
        this.puntosExtrasElement = null;
    }

    async cargar() {
        // Cargar HTML
        const response = await fetch('/web/Informes/componentes/ResumenEstadisticas.html');
        const html = await response.text();
        this.container.innerHTML = html;

        // Obtener referencias a elementos
        this.canvas = this.container.querySelector('#grafica-circular');
        this.ctx = this.canvas.getContext('2d');
        this.porcentajeCentro = this.container.querySelector('#porcentaje-centro');
        this.puntosExtrasElement = this.container.querySelector('#puntos-extras');

        // Configurar canvas con resolución alta
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
    }

    actualizar(estadisticas) {
        const { ganados = 0, noGanados = 0, extras = 0, asignados = 0 } = estadisticas;

        // Calcular porcentaje
        const porcentaje = asignados > 0 ? Math.round((ganados / asignados) * 100) : 0;

        // Actualizar textos
        this.porcentajeCentro.textContent = `${porcentaje}%`;
        this.puntosExtrasElement.textContent = extras;

        // Dibujar gráfica
        this.dibujarGrafica(ganados, noGanados, asignados);
    }

    dibujarGrafica(ganados, noGanados, asignados) {
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        const lineWidth = 16;

        // Limpiar canvas
        this.ctx.clearRect(0, 0, rect.width, rect.height);

        // Colores
        const colorVerde = '#10b981';
        const colorRojo = '#ef4444';
        const colorFondo = '#f1f5f9';

        const total = asignados;
        if (total === 0) {
            // Si no hay datos, mostrar círculo gris
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            this.ctx.strokeStyle = colorFondo;
            this.ctx.lineWidth = lineWidth;
            this.ctx.stroke();
            return;
        }

        // Calcular ángulos
        const ganadosAngle = (ganados / total) * 2 * Math.PI;
        const noGanadosAngle = (noGanados / total) * 2 * Math.PI;

        // Base gris
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = colorFondo;
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();

        // Puntos no ganados (rojo)
        if (noGanados > 0) {
            this.ctx.beginPath();
            this.ctx.arc(
                centerX,
                centerY,
                radius,
                -Math.PI / 2,
                -Math.PI / 2 + noGanadosAngle
            );
            this.ctx.strokeStyle = colorRojo;
            this.ctx.lineWidth = lineWidth;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        }

        // Puntos ganados (verde) - continúa después del rojo
        if (ganados > 0) {
            this.ctx.beginPath();
            this.ctx.arc(
                centerX,
                centerY,
                radius,
                -Math.PI / 2 + noGanadosAngle,
                -Math.PI / 2 + noGanadosAngle + ganadosAngle
            );
            this.ctx.strokeStyle = colorVerde;
            this.ctx.lineWidth = lineWidth;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        }
    }
}

export default ResumenEstadisticas;
