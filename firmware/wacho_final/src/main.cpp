#include <Arduino.h>
#include "core/AppManager.h"

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n\n=========================================");
    Serial.println("   FIRMWARE UPDATE: 2026-01-26 v4.4");
    Serial.println("   LittleFS Fix + Employee List Debug");
    Serial.println("=========================================\n");
    AppManager::setup();
}

void loop() {
    AppManager::loop();
    delay(2);
}
