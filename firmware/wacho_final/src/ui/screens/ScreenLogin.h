#pragma once
#include <lvgl.h>

class ScreenLogin {
public:
    static void init(lv_obj_t* parent);
    static void show();
    static void hide();
    
private:
    static lv_obj_t* screen;
    static lv_obj_t* label;
};