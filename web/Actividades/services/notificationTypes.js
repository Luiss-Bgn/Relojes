// Tipos de notificaciones para WebSocket
import { createSocketClient } from './socketClient.js';

// Crear instancia propia del socket para notificaciones
let notificationSocket = null;

// Inicializar socket cuando se carga el módulo
const initNotificationSocket = () => {
  if (!notificationSocket) {
    notificationSocket = createSocketClient({
      onMessage: null, // No necesitamos recibir mensajes en este módulo
      onStatus: (status) => {
        if (status === 'online') {
          console.log('📡 Socket de notificaciones conectado');
        }
      }
    });
  }
  return notificationSocket;
};

// Inicializar socket inmediatamente
initNotificationSocket();

export const NOTIFICATION_TYPES = {
  // Empleados
  EMPLEADO_CREADO: 'empleado_creado',
  EMPLEADO_ACTUALIZADO: 'empleado_actualizado',
  EMPLEADO_ELIMINADO: 'empleado_eliminado',
  
  // Tareas
  TAREA_CREADA: 'tarea_creada',
  TAREA_ACTUALIZADA: 'tarea_actualizada',
  TAREA_ELIMINADA: 'tarea_eliminada',
  TAREA_COMPLETADA: 'tarea_completada',
  
  // Tareas extras
  TAREA_EXTRA_DISPONIBLE: 'tarea_extra_disponible',
  TAREA_EXTRA_COMPLETADA: 'tarea_extra_completada',
  
  // Panel
  PANEL_ACTUALIZADO: 'panel_actualizado',
  REFRESH_PANEL: 'refresh_panel',
  
  // Autenticación
  USUARIO_LOGIN: 'usuario_login',
  USUARIO_LOGOUT: 'usuario_logout',
};

// Tipos de mensajes WebSocket
export const MESSAGE_TYPES = {
  NOTIFICACION: 'notificacion',
  ACTUALIZACION: 'actualizacion',
  ESTADO: 'estado',
};

// Función helper para enviar notificaciones
export function createNotificationMessage(notificationType, data = {}) {
  const message = {
    tipo: MESSAGE_TYPES.NOTIFICACION,
    notificacion: notificationType,
    timestamp: new Date().toISOString(),
    ...data
  };
  
  // Asegurar que el socket esté inicializado y enviar
  const socket = notificationSocket || initNotificationSocket();
  if (socket && socket.send) {
    socket.send(message);
  } else {
    console.warn('Socket no disponible para enviar notificación:', notificationType);
  }
}
