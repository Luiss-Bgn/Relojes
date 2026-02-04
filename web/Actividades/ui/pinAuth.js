import { createNotificationMessage, NOTIFICATION_TYPES } from "../services/notificationTypes.js";

/**
 * Valida un PIN contra la base de datos y devuelve el usuario correspondiente
 * @param {string} pin - PIN a validar
 * @returns {Promise<Object>} Resultado de la validación
 */
export const validatePin = async (pin) => {
    try {
        // Obtener información del empleado por PIN desde el endpoint específico
        const response = await fetch(`http://localhost:8001/usuarios/pin/${pin}`);

        // console.log("respuesta", response);
        if (!response.ok) {
            if (response.status === 404) {
                return {
                    valid: false,
                    error: ' PIN incorrecto'
                };
            }
            throw new Error('Error de conexión al validar PIN');
        }

        const data = await response.json();
        // console.log('📡 Respuesta del servidor:', data);

        // Verificar que la respuesta tenga el formato esperado
        if (data.status === 'success' && data.usuario) {
            //   console.log('✅ PIN válido, usuario encontrado:', data.usuario);
            return {
                valid: true,
                user: data.usuario
            };
        } else {
            //   console.log('❌ Respuesta inesperada del servidor:', data);
            return {
                valid: false,
                error: ' PIN incorrecto'
            };
        }

    } catch (error) {
        console.error('Error al validar PIN:', error);
        return {
            valid: false,
            error: 'Error de conexión al validar PIN'
        };
    }
};

/**
 * Verifica si un usuario puede completar una tarea específica
 * @param {Object} user - Usuario que intenta completar
 * @param {Object} task - Tarea a completar
 * @returns {Object} Resultado de la validación
 */
export const validateTaskPermissions = (user, task) => {
    console.log("validando permisos usuario", user)
    console.log("validando permisos tarea", task)
    // console.log('🔍 Validando permisos:', {
    //     usuario: `${user.nombre} (ID: ${user.id}, Rol: ${user.rol})`,
    //     tarea: `ID: ${task.id}, Estado: ${task.estatus}, Empleado: ${task.empleadoId}`,
    //     rolRequerido: task.rol_disponible || task.disponible_para_rol || 'No especificado'
    // });

    // Si la tarea está vencida
    if (task.estatus === 'vencida') {
        return {
            canComplete: false,
            error: ' Tarea vencida, no puede ser completada'
        };

    }

    // Verificar disponibilidad por rol (usando la propiedad correcta)
    const rolRequerido = task.rol_disponible || task.disponible_para_rol;
    if (rolRequerido && rolRequerido !== 'todos') {
        if (user.rol !== rolRequerido) {
            console.log(`❌ Rol insuficiente: Usuario tiene "${user.rol}", se requiere "${rolRequerido}"`);
            return {
                canComplete: false,
                error: ` No tienes permiso para completar esta tarea (${rolRequerido} requerido)`
            };
        }
    }
    console.log('✅ Rol válido');

    // Si la tarea está en progreso
    if (task.estatus === 'en_progreso') {
        if (task.empleadoId !== user.id) {
            console.log(`❌ Tarea en progreso: Solo el dueño puede completarla`);
            return {
                canComplete: false,
                error: ' Solo el empleado asignado puede completar esta tarea'
            };
        }
        console.log('✅ Es el dueño original de la tarea en progreso');
        return { canComplete: true };
    }



    console.log("id usuario", user.id)
    console.log("id empleado tarea", task.empleadoId)
    // Si la tarea es extra
    if (task.estatus === 'extra') {
        if (task.empleadoId == user.id) {
            return {
                canComplete: false,
                error: ' No puedes completar tu propia tarea extra'
            };
        }
        console.log('✅ Tarea extra - cualquier usuario con rol correcto puede completarla');
        return { canComplete: true };
    }


    console.log('algo fallo en la validacion de permisos');
    return {
        canComplete: false,
        error: 'No se pudo completar'
    };
};

/**
 * Completa una tarea usando PIN authentication
 * @param {Object} task - Tarea a completar
 * @param {string} pin - PIN del usuario
 * @returns {Promise<Object>} Resultado de la operación
 */
export const completeTaskWithPin = async (task, pin) => {
    try {
        console.log('🚀 Iniciando completado de tarea con PIN:', task);

        // Validar PIN
        const userPin = await validatePin(pin);
        if (!userPin.valid) {
            console.log('❌ PIN inválido');
            return {
                success: false,
                message: userPin.error || 'PIN incorrecto'
            };
        }
        const user = userPin.user;

        console.log('👤 Usuario autenticado:', user);

        // Validar permisos de la tarea
        const validation = validateTaskPermissions(user, task);
        if (!validation.canComplete) {
            console.log('❌ Permisos insuficientes');
            return {
                success: false,
                message: validation.error
            };
        }

        // Preparar datos para enviar al servidor
        let updateData = {};
        let successMessage = '';

        // Determinar si la tarea debe completarse como extra
        const isExtraCompletion = (task.estatus === 'extra') ||
            (task.estatus === 'vencida' && task.empleadoId !== user.id);

        if (isExtraCompletion) {
            // Completar como tarea extra
            updateData = {
                estatus: 'extra',
                completadaPor: user.id,
            };
            successMessage = `Tarea extra completada por ${user.nombre}`;
            console.log('⭐ Completando como tarea extra');
        } else {
            // Completar normalmente
            updateData = {
                estatus: 'completada'
            };
            successMessage = `Tarea completada por ${user.nombre}`;
            console.log('✅ Completando como tarea normal');
        }

        // Enviar al servidor
        console.log('📡 Enviando actualización al servidor:', updateData);
        const response = await fetch(`http://localhost:8001/tareas/${task.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const result = await response.json();
            console.log('❌ Error del servidor:', result);
            return {
                success: false,
                message: result.message || 'Error al completar la tarea en el servidor'
            };
        }

        const serverResult = await response.json();
        console.log('✅ Tarea completada exitosamente:', serverResult);

        createNotificationMessage(NOTIFICATION_TYPES.TAREA_COMPLETADA, {
            taskId: task.id,
            completedBy: user.nombre
        });

        return {
            success: true,
            message: successMessage,
            user: user
        };

    } catch (error) {
        console.error('❌ Error al completar tarea con PIN:', error);
        return {
            success: false,
            message: 'Error interno del sistema'
        };
    }
};

/**
 * Verifica si hay una sesión activa
 * @returns {boolean} true si hay sesión activa
 */
export const hasActiveSession = () => {
    const loggedUserString = localStorage.getItem("loggedUser");
    const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : null;
    const userId = loggedUser ? loggedUser.empleado_id : null;
    return !!(loggedUser && userId);
};