#pragma once
#include <Arduino.h>
#include <lvgl.h>
#include "../services/Hal.h"

class PowerManager {
public:
    static void init();
    static void update();
    static void wakeUp();

private:
    static const uint32_t DIM_TIME_MS = 30000;   // 30 seconds
    static const uint32_t SLEEP_TIME_MS = 60000; // 60 seconds
    static const uint8_t DIM_BRIGHTNESS = 20;
    static const uint8_t MAX_BRIGHTNESS = 200; // Or whatever default is
    static const int CPU_HIGH = 240;
    static const int CPU_LOW = 80;

    static bool isDimmed;
    static bool isSleeping;
};
