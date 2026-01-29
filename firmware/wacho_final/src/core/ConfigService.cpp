#include "ConfigService.h"
#include <LittleFS.h>

const char* ConfigService::CONFIG_FILE = "/config.json";
String ConfigService::uuid = "";

void ConfigService::init() {
    // Intenta montar sin formatear primero
    // IMPORTANTE: Especificar "littlefs" como nombre de partición, ya que por defecto busca "spiffs"
    if (LittleFS.begin(false, "/littlefs", 10, "littlefs")) {
        Serial.println("[Config] ✅ LittleFS mounted successfully");
    } else {
        Serial.println("[Config] ⚠️ Failed to mount LittleFS. Formatting...");
        // Si falla, intenta formatear explícitamente
        if (LittleFS.format()) {
            Serial.println("[Config] ✅ LittleFS formatted successfully. Mounting...");
            if (LittleFS.begin(false, "/littlefs", 10, "littlefs")) {
                Serial.println("[Config] ✅ LittleFS mounted after format");
            } else {
                Serial.println("[Config] ❌ Failed to mount even after format");
                return;
            }
        } else {
            Serial.println("[Config] ❌ Failed to format LittleFS");
            // Último intento con begin(true)
            if (LittleFS.begin(true, "/littlefs", 10, "littlefs")) {
                Serial.println("[Config] ✅ LittleFS mounted with formatOnFail");
            } else {
                Serial.println("[Config] ❌ Critical Failure: Could not initialize LittleFS");
                return;
            }
        }
    }
    load();
}

bool ConfigService::load() {
    if (!LittleFS.exists(CONFIG_FILE)) {
        Serial.println("[Config] ⚠️ File not found, creating default");
        save();
        return false;
    }

    File file = LittleFS.open(CONFIG_FILE, "r");
    if (!file) {
        Serial.println("[Config] ❌ Failed to open file for reading");
        return false;
    }

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
        Serial.println("[Config] ❌ Failed to parse config file");
        return false;
    }

    if (doc["uuid"].is<String>()) {
        uuid = doc["uuid"].as<String>();
        Serial.println("[Config] ✅ Loaded UUID: " + uuid);
    } else {
        Serial.println("[Config] ⚠️ UUID not found in config file");
    }

    return true;
}

void ConfigService::save() {
    JsonDocument doc;
    doc["uuid"] = uuid;

    File file = LittleFS.open(CONFIG_FILE, "w");
    if (!file) {
        Serial.println("[Config] ❌ Failed to open file for writing. Attempting to remount/format...");
        // Try to mount/format if not mounted
        if (LittleFS.begin(true, "/littlefs", 10, "littlefs")) {
             Serial.println("[Config] ✅ Remounted successfully");
             file = LittleFS.open(CONFIG_FILE, "w");
             if (!file) {
                 Serial.println("[Config] ❌ Still failed to open file after remount.");
                 return;
             }
        } else {
             Serial.println("[Config] ❌ Failed to remount LittleFS.");
             return;
        }
    }

    serializeJson(doc, file);
    file.close();
    Serial.println("[Config] ✅ Saved config: " + uuid);
}

String ConfigService::getUUID() {
    return uuid;
}

void ConfigService::setUUID(String newUuid) {
    uuid = newUuid;
    save();
}

void ConfigService::clear() {
    uuid = "";
    save();
}