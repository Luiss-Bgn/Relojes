// ===============================
// CONSTANTES DE QUINCENAS
// ===============================

/**
 * Configuración de los períodos de las quincenas
 * Q1: Del día 26 del mes anterior al día 10 del mes actual
 * Q2: Del día 11 al día 25 del mes actual
 */

export const Q1_INICIO = 26;  // Q1 inicia el día 26 del mes anterior
export const Q1_FIN = 10;     // Q1 termina el día 10 del mes actual
export const Q2_INICIO = 11;  // Q2 inicia el día 11 del mes actual
export const Q2_FIN = 25;     // Q2 termina el día 25 del mes actual

/**
 * Convierte una fecha a string YYYY-MM-DD usando zona horaria local
 * @param {Date} fecha - Fecha a convertir (por defecto: fecha actual)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function obtenerFechaLocal(fecha = new Date()) {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

/**
 * Parsea un string YYYY-MM-DD como fecha local (no UTC)
 * @param {string} fechaStr - Fecha en formato YYYY-MM-DD
 * @returns {Date} Objeto Date en zona horaria local
 */
export function parsearFechaLocal(fechaStr) {
    const [año, mes, dia] = fechaStr.split('-').map(Number);
    return new Date(año, mes - 1, dia);
}

export function rolUsuario() {
    const loggedUserString = localStorage.getItem("loggedUser");
    const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : null;
    let username, role, userId;
    
    // console.log("Usuario logueado:", loggedUser);
    if (!loggedUser) {
        // Usuario visitante
        username = 'usuario';
        role = 'visitante';
        userId = null;
    } else {
        username = loggedUser.nombre || 'Usuario';
        role = loggedUser.role || 'empleado';
        userId = loggedUser.empleado_id;
    }
    
    return { username, role, userId };
}