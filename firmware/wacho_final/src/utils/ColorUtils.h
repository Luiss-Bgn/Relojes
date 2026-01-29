#pragma once
#include <lvgl.h>
#include <Arduino.h>

class ColorUtils {
public:
    static lv_color_t getStatusColor(const String& status);
};
