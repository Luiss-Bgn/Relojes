#pragma once
#include <lvgl.h>

class UIBuilder {
public:
    static lv_obj_t* createHeader(lv_obj_t* parent, const char* title);
    static lv_obj_t* createButton(lv_obj_t* parent, const char* text, lv_event_cb_t event_cb);
};
