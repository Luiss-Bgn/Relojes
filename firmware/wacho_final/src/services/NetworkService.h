#pragma once
#include <Arduino.h>
#include <WebSocketsClient.h>

class NetworkService {
public:
    static void init();
    static void update();
    static bool isWifiConnected();
    static bool isServerConnected();
    
    // Send data to server
    static void send(String data);
    
    // Callback for received messages
    typedef std::function<void(String)> MessageCallback;
    static void onMessage(MessageCallback callback);

private:
    static void onWebSocketEvent(WStype_t type, uint8_t * payload, size_t length);
    static MessageCallback messageCallback;
    static WebSocketsClient webSocket;
};
