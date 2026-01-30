#include "NetworkService.h"
#include <WiFi.h>
#include "../ui/components/ConnectionIndicator.h"
#include "../config/SystemConfig.h"  // Credenciales y debug

// --- Globals ---
WebSocketsClient NetworkService::webSocket;
NetworkService::MessageCallback NetworkService::messageCallback = nullptr;
static size_t currentNetworkIndex = 0;
static unsigned long lastConnectionAttempt = 0;
static bool webSocketStarted = false;

void NetworkService::init() {
    DEBUG_PRINTLN("[Network] Initializing...");
    
    WiFi.disconnect(true,true);  // Desconectar cualquier conexión previa
    // Setup WiFi
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    
    // Optimizaciones para conexión rápida
    WiFi.setAutoReconnect(true);      // Reconectar automáticamente si se pierde la conexión
    // WiFi.persistent(true);             // Guardar credenciales en memoria persistente
    WiFi.setAutoConnect(true);         // Conectar automáticamente a redes conocidas
    // WiFi.setScanMethod(WIFI_FAST_SCAN);  // Escaneo rápido (solo canales más comunes)
    // WiFi.setSortMethod(WIFI_CONNECT_AP_BY_SIGNAL);  // Conectar a la red más fuerte primero
    
    // Mostrar redes configuradas
    for (size_t i = 0; i < WIFI_NETWORK_COUNT; ++i) {
        DEBUG_PRINTF("[Network] Will try AP: %s\n", WIFI_NETWORKS[i].ssid);
    }
    
    // Setup WebSocket (se inicia cuando haya WiFi)
    webSocket.disconnect();
    webSocketStarted = false;
    
    currentNetworkIndex = 0;
    lastConnectionAttempt = 0;
}

void NetworkService::update() {
    // Si ya está conectado a WiFi
    if (WiFi.status() == WL_CONNECTED) {
        // Iniciar WebSocket una vez tengamos red
        if (!webSocketStarted) {
            IPAddress resolved;
            bool dnsOk = WiFi.hostByName(WS_SERVER, resolved);
            if (dnsOk) {
                DEBUG_PRINTF("[WS] DNS resolved %s -> %s:%d%s\n", WS_SERVER, resolved.toString().c_str(), WS_PORT, WS_PATH);
            } else {
                DEBUG_PRINTF("[WS] DNS failed for %s, letting client resolve\n", WS_SERVER);
            }

            webSocket.begin(WS_SERVER, WS_PORT, WS_PATH);
            webSocket.enableHeartbeat(15000, 3000, 2);
            webSocket.onEvent(onWebSocketEvent);
            webSocket.setReconnectInterval(1000);
            webSocketStarted = true;
        }

        webSocket.loop();
        ConnectionIndicator::setState(webSocket.isConnected() ? ConnectionState::SERVER_CONNECTED
                                                              : ConnectionState::WIFI_CONNECTED);
        return;
    }

    // Si no hay WiFi, asegurarse de no dejar sockets pendientes
    if (webSocket.isConnected()) {
        webSocket.disconnect();
    }
    webSocketStarted = false;

    // Intentar conectarse a WiFi con pacing
    unsigned long now = millis();
    if (now - lastConnectionAttempt < WIFI_RETRY_INTERVAL_MS) {
        ConnectionIndicator::setState(ConnectionState::DISCONNECTED);
        return;
    }

    lastConnectionAttempt = now;

    if (currentNetworkIndex < WIFI_NETWORK_COUNT) {
        const WifiCredential& net = WIFI_NETWORKS[currentNetworkIndex];
        DEBUG_PRINTF("[Network] Attempting connection to: %s\n", net.ssid);
        WiFi.begin(net.ssid, net.password);

        // Esperar un resultado rápido para evitar estados colgados
        wl_status_t res = (wl_status_t)WiFi.waitForConnectResult(8000);
        if (res == WL_CONNECTED) {
            DEBUG_PRINTF("[Network] Connected to %s, IP: %s\n", net.ssid, WiFi.localIP().toString().c_str());
        } else {
            DEBUG_PRINTF("[Network] Failed to connect (%d) to %s\n", (int)res, net.ssid);
        }

        currentNetworkIndex = (currentNetworkIndex + 1) % WIFI_NETWORK_COUNT;
    }

    ConnectionIndicator::setState(ConnectionState::DISCONNECTED);
}

bool NetworkService::isWifiConnected() {
    return WiFi.status() == WL_CONNECTED;
}

bool NetworkService::isServerConnected() {
    return webSocket.isConnected();
}

void NetworkService::send(String data) {
    if (isServerConnected()) {
        Serial.printf("📩 Mensaje de reloj: %s\n", data.c_str());
        webSocket.sendTXT(data);
    }
}

void NetworkService::onMessage(MessageCallback callback) {
    messageCallback = callback;
}

void NetworkService::onWebSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            DEBUG_PRINTLN("[WS] Disconnected!");
                        {
                IPAddress resolved;
                bool dnsOk = WiFi.hostByName(WS_SERVER, resolved);
                DEBUG_PRINTF("[WS] Disconnected (WiFi %d, RSSI %d, IP %s, GW %s, DNS %s -> %s)\n",
                             (int)WiFi.status(),
                             WiFi.RSSI(),
                             WiFi.localIP().toString().c_str(),
                             WiFi.gatewayIP().toString().c_str(),
                             WS_SERVER,
                             dnsOk ? resolved.toString().c_str() : "<fail>");
            }
            ConnectionIndicator::setState(ConnectionState::WIFI_CONNECTED);
            break;
        case WStype_CONNECTED:
            DEBUG_PRINTF("[WS] Connected to url: %s\n", payload);
            ConnectionIndicator::setState(ConnectionState::SERVER_CONNECTED);
            break;
        case WStype_TEXT:
            DEBUG_PRINTF("[WS] Received text: %s\n", payload);
            if (messageCallback) {
                messageCallback(String((char*)payload));
            }
            break;
        case WStype_BIN:
        case WStype_ERROR:
        case WStype_FRAGMENT_TEXT_START:
        case WStype_FRAGMENT_BIN_START:
        case WStype_FRAGMENT:
        case WStype_FRAGMENT_FIN:
            break;
    }
}
