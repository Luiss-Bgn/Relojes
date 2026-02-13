import { Q1_INICIO, Q1_FIN, Q2_INICIO, Q2_FIN, obtenerFechaLocal, parsearFechaLocal } from "/web/Informes/constants.js";

class TablaPuntajes {

    constructor({ fechaInicio, fechaFin, fechaCorte, historial }) {
        this.fechaInicio = parsearFechaLocal(fechaInicio);
        this.fechaFin = parsearFechaLocal(fechaFin);
        this.fechaCorte = parsearFechaLocal(fechaCorte);
        this.historial = historial;
    }

    generar(container = null) {

        const tbody = container 
            ? container.querySelector("#tabla-body")
            : document.getElementById("tabla-body");
        const tfoot = container 
            ? container.querySelector("#tabla-footer")
            : document.getElementById("tabla-footer");
        const titulo = container 
            ? container.querySelector("#tabla-titulo")
            : document.getElementById("tabla-titulo");

        if (!tbody || !tfoot) {
            console.error("No se encontraron los elementos tabla-body o tabla-footer");
            return;
        }

        // console.log("Generando tabla de puntajes con fechaInicio:", this.fechaInicio, "fechaFin:", this.fechaFin, "fechaCorte:", this.fechaCorte);
        // Actualizar título con información de la quincena
        const mes = this.fechaInicio.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        const diaInicio = this.fechaInicio.getDate();
        const quincena = diaInicio >= Q1_INICIO || diaInicio <= Q1_FIN ? 1 : 2;
        const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
        // titulo.textContent = `Quincena ${quincena} - ${mesCapitalizado} - Resumen de Todos los Empleados`;

        tbody.innerHTML = "";
        tfoot.innerHTML = "";

        let fechaActual = new Date(this.fechaInicio);

        let totalAsignados = 0;
        let totalGanados = 0;
        let totalNoGanados = 0;
        let totalExtra = 0;
        let totalTotales = 0;

        const filas = [];
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación

        while (fechaActual <= this.fechaFin) {

            const fechaStr = obtenerFechaLocal(fechaActual);

            let data = this.historial.find(d => d.fecha === fechaStr);

            const asignados = data?.asignados ?? 0;
            const ganados = data?.ganados ?? 0;
            const noGanados = data?.noGanados ?? 0;
            const extra = data?.extra ?? 0;
            const total = ganados + extra;

            totalAsignados += asignados;
            totalGanados += ganados;
            totalNoGanados += noGanados;
            totalExtra += extra;
            totalTotales += total;

            const porcentajeDiario = asignados > 0
                ? Math.round((ganados / asignados) * 100)
                : null;

            // Crear copia de la fecha para evitar problemas de referencia
            const fechaCopia = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate());

            filas.push({
                fecha: fechaCopia,
                fechaStr: fechaStr,
                asignados,
                ganados,
                noGanados,
                extra,
                total,
                porcentajeDiario,
                totalAcumulado: totalTotales
            });

            fechaActual.setDate(fechaActual.getDate() + 1);
        }

        // Calcular porcentaje total de la quincena
        const porcentajeTotalQuincenal = totalAsignados > 0
            ? (totalGanados / totalAsignados) * 100
            : 0;

        // Determinar color único para toda la columna quincenal basado en el total
        const claseColorQuincenal = porcentajeTotalQuincenal >= 91
            ? 'col-verde' 
            : porcentajeTotalQuincenal >= 81 
                ? 'col-amarillo' 
                : 'col-rojo';

        // Renderizar filas
        filas.forEach((fila, index) => {
            const tr = document.createElement("tr");

            if (this.esMismoDia(fila.fecha, new Date())) {
                tr.classList.add("fila-hoy");
            }

            if (this.esMismoDia(fila.fecha, this.fechaCorte)) {
                tr.classList.add("fila-corte");
            }

            // Determinar clase de color para porcentaje diario
            let clasePorcentajeDiario = "col-nd";
            if (fila.porcentajeDiario !== null) {
                if (fila.porcentajeDiario >= 91) {
                    clasePorcentajeDiario = "col-verde";
                } else if (fila.porcentajeDiario >= 81) {
                    clasePorcentajeDiario = "col-amarillo";
                } else {
                    clasePorcentajeDiario = "col-rojo";
                }
            }

            // Determinar si el día ya pasó (comparar fechas)
            const fechaFila = new Date(fila.fecha);
            fechaFila.setHours(0, 0, 0, 0);
            const yaPaso = fechaFila <= hoy;
            const esHoy = this.esMismoDia(fila.fecha, new Date());

            // Columna % Quincenal: mismo color para todos los días pasados, texto solo en día actual
            let porcentajeQuincenalHTML = '<td class="col-vacio"></td>';
            if (yaPaso) {
                if (esHoy) {
                    // Día actual: mostrar porcentaje total con texto
                    porcentajeQuincenalHTML = `<td class="${claseColorQuincenal} col-quincenal-hoy">${porcentajeTotalQuincenal.toFixed(1)}%</td>`;
                } else {
                    // Días pasados: solo color sólido sin texto (mismo color para todos)
                    porcentajeQuincenalHTML = `<td class="${claseColorQuincenal} col-quincenal-solido"></td>`;
                }
            }

            tr.innerHTML = `
                <td>
                    ${this.formatearDia(fila.fecha)}
                    ${this.esMismoDia(fila.fecha, this.fechaCorte) ? "<span style='color:#f97316; font-weight: normal;'> CORTE</span>" : ""}
                </td>
                <td ${fila.asignados === 0 ? 'data-value="0"' : ''}>${fila.asignados}</td>
                <td ${fila.ganados === 0 ? 'data-value="0"' : ''}>${fila.ganados}</td>
                <td ${fila.noGanados === 0 ? 'data-value="0"' : ''}>${fila.noGanados}</td>
                <td ${fila.extra === 0 ? 'data-value="0"' : ''}>${fila.extra}</td>
                <td ${fila.total === 0 ? 'data-value="0"' : ''}>${fila.total}</td>
                <td class="${clasePorcentajeDiario}">
                    ${fila.porcentajeDiario === null ? "N/D" : fila.porcentajeDiario.toFixed(1) + "%"}
                </td>
                ${porcentajeQuincenalHTML}
            `;

            tbody.appendChild(tr);
        });

        // Calcular porcentajes para el footer
        const porcentajeTotalDiario = totalAsignados > 0 
            ? (totalGanados / totalAsignados) * 100 
            : 0;

        // Determinar clases de color para los porcentajes
        const getClaseColor = (porcentaje) => {
            if (porcentaje >= 91) return 'col-verde';
            if (porcentaje >= 81) return 'col-amarillo';
            return 'col-rojo';
        };

        const claseDiario = getClaseColor(porcentajeTotalDiario);

        tfoot.innerHTML = `
            <tr>
                <td>TOTAL QUINCENA ${quincena}</td>
                <td>${totalAsignados}</td>
                <td>${totalGanados}</td>
                <td>${totalNoGanados}</td>
                <td>${totalExtra}</td>
                <td>${totalTotales}</td>
                <td class="${claseDiario}">${totalAsignados > 0 ? porcentajeTotalDiario.toFixed(1) + '%' : 'N/D'}</td>
                <td class="${claseColorQuincenal}">${totalAsignados > 0 ? porcentajeTotalQuincenal.toFixed(1) + '%' : 'N/D'}</td>
            </tr>
        `;
    }

    formatearDia(fecha) {
        const dias = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
        const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
        return `${dias[fecha.getDay()]} ${fecha.getDate()} (${meses[fecha.getMonth()]})`;
    }

    esMismoDia(a, b) {
        return a.toDateString() === b.toDateString();
    }
}

export default TablaPuntajes;
