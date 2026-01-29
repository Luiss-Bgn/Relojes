#pragma once
#include <lvgl.h>

class AppBar {
public:
    static void init(lv_obj_t* parent);
    static void updateTime(struct tm* timeinfo);
    static void updateBattery(int percent);

private:
    static lv_obj_t* container;
    static lv_obj_t* labelTime;
    static lv_obj_t* containerBattery;
    static lv_obj_t* labelBattery;
    static lv_obj_t* barBattery;
    
    static const char* MONTHS[];
};
