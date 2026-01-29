#ifndef SYSTEM_CONFIG_H
#define SYSTEM_CONFIG_H

#include <Arduino.h>

// ====================================
// 🔧 DEBUG CONFIGURATION
// ====================================
#define DEBUG_ENABLED true

#if DEBUG_ENABLED
  #define DEBUG_PRINT(x)   Serial.print(x)
  #define DEBUG_PRINTLN(x) Serial.println(x)
  #define DEBUG_PRINTF(...) Serial.printf(__VA_ARGS__)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
  #define DEBUG_PRINTF(...)
#endif

// ====================================
// 🌐 NETWORK CONFIGURATION
// ====================================
struct WifiCredential {
    const char* ssid;
    const char* password;
};

// WiFi credentials (try in order)
constexpr WifiCredential WIFI_NETWORKS[] = {
  {"Totalplay-48AA","48AA58DFdPvKaGdA"},
    // {"SuizT-WiFi", "SuizT-Changarro"},
    // {"SuizT-WiFi_2.4G", "SuizT-Changarro"},
    //  {"MEGACABLE-F29F", "DfUE5f3u"},
};

constexpr size_t WIFI_NETWORK_COUNT = sizeof(WIFI_NETWORKS) / sizeof(WIFI_NETWORKS[0]);

// WebSocket server configuration
constexpr const char* WS_SERVER = "192.168.100.30";
constexpr int   WS_PORT   = 8000;
constexpr const char* WS_PATH   = "/ws";

// Intervalo entre intentos de reconexión WiFi (ms)
constexpr unsigned long WIFI_RETRY_INTERVAL_MS = 5000;  // 5 segundos

#endif // SYSTEM_CONFIG_H
