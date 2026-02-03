const WS_URL = "ws://localhost:8000/ws";
const RETRY_MS = 4000;

export const createSocketClient = ({ onMessage, onStatus }) => {
  let socket;
  let timeoutId;

  const notifyStatus = (state) => {
    if (onStatus) onStatus(state);
  };

  const send = (payload) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
  };

  const connect = () => {
    clearTimeout(timeoutId);
    notifyStatus("connecting");
    socket = new WebSocket(WS_URL, ["web-client"]);

    socket.onopen = () => {
      console.log("🔌 WebSocket conectado");
      socket.send(JSON.stringify({ tipo: "auth", token: localStorage.getItem("authToken") || "" }));
      notifyStatus("online");
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) await onMessage(data);
      } catch (err) {
        console.error("Mensaje WS inválido", err);
      }
    };

    socket.onclose = () => {
      notifyStatus("offline");
      timeoutId = setTimeout(connect, RETRY_MS);
    };

    socket.onerror = () => {
      notifyStatus("error");
      socket.close();
    };
  };

  connect();

  return {
    send,
    reconnect: connect,
    close: () => socket?.close()
  };
};
