#pragma once
#include <Arduino.h>
#include <ArduinoJson.h>

class ConfigService {
public:
    static void init();
    static bool load();
    static void save();
    
    static String getUUID();
    static void setUUID(String uuid);
    
    static void clear();

private:
    static String uuid;
    static const char* CONFIG_FILE;
};