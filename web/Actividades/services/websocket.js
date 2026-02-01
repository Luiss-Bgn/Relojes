// WebSocket helper for actividades

let webSocketConnection = null;
let webSocketReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let hasWarned = false;

export function connectToWebSocket({ onExtraCompleted } = {}) {
  if (webSocketConnection && webSocketConnection.readyState === WebSocket.OPEN) {
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Backend expone WS en 8000 en ruta /ws (ver server.py)
  const wsUrl = `${protocol}//${window.location.hostname}:8000/ws`;

  try {
    webSocketConnection = new WebSocket(wsUrl);

    webSocketConnection.onopen = () => {
      webSocketReconnectAttempts = 0;
      hasWarned = false;
    };

    webSocketConnection.onmessage = async (event) => {
      try {
        const mensaje = JSON.parse(event.data);
        if (mensaje.accion === 'tarea_extra_completada' && typeof onExtraCompleted === 'function') {
          await onExtraCompleted(mensaje);
        }
      } catch (err) {
        console.warn('WS mensaje inválido', err);
      }
    };

    webSocketConnection.onerror = () => {
      if (!hasWarned) {
        console.warn(`No se pudo conectar al WebSocket ${wsUrl}. Verifica que el servidor esté arriba.`);
        hasWarned = true;
      }
    };

    webSocketConnection.onclose = () => {
      if (webSocketReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        webSocketReconnectAttempts++;
        setTimeout(() => connectToWebSocket({ onExtraCompleted }), 3000 * webSocketReconnectAttempts);
      } else if (!hasWarned) {
        console.warn(`WebSocket sin conexión tras ${MAX_RECONNECT_ATTEMPTS} intentos.`);
        hasWarned = true;
      }
    };
  } catch (err) {
    console.warn('Error al conectar WebSocket:', err);
  }
}
