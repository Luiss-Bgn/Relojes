#pragma once
#include <Arduino.h>
#include <LilyGoLib.h>
#include <LV_Helper.h>
#include <ArduinoJson.h>

class Hal {
public:
    static void init();
    static void update();
    static void setBrightness(uint8_t level);
    static void vibrate();
    static void vibrateSuccess();
    static void vibrateError();
    
    // Manual vibration control
    static void vibrateManual(uint32_t durationMs, uint8_t intensity = 100);
    static void vibratePattern(uint8_t intensity, int count);

    // RTC/time helpers
    static bool updateClockFromJson(JsonDocument &doc);
    static bool setDateTime(int year, int month, int day, int hour, int minute, int second);

private:
    static struct VibrationState {
        bool active;
        uint32_t startTime;
        uint32_t duration;
    } vibState;
};
