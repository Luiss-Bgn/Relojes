#include "ConnectionIndicator.h"
#include <Arduino.h>

lv_obj_t* ConnectionIndicator::indicatorObj = nullptr;
ConnectionState ConnectionIndicator::currentState = ConnectionState::DISCONNECTED;

void ConnectionIndicator::init(lv_obj_t* parent) {
    indicatorObj = lv_obj_create(parent);
    lv_obj_remove_style_all(indicatorObj);
    lv_obj_set_size(indicatorObj, 10, 10);
    lv_obj_set_align(indicatorObj, LV_ALIGN_CENTER);
    lv_obj_set_style_radius(indicatorObj, LV_RADIUS_CIRCLE, LV_PART_MAIN);
    lv_obj_set_style_bg_color(indicatorObj, lv_color_hex(0xFF0000), LV_PART_MAIN); // Red default
    lv_obj_set_style_bg_opa(indicatorObj, 255, LV_PART_MAIN);
    
    setState(ConnectionState::DISCONNECTED);
}

void ConnectionIndicator::setState(ConnectionState state) {
    if (!indicatorObj) return;
    if (currentState == state) return;
    
    currentState = state;
    
    switch (state) {
        case ConnectionState::DISCONNECTED:
            lv_obj_set_style_bg_color(indicatorObj, lv_color_hex(0xFF0000), LV_PART_MAIN);
            break;
        case ConnectionState::WIFI_CONNECTED:
            lv_obj_set_style_bg_color(indicatorObj, lv_color_hex(0xFFAA00), LV_PART_MAIN);
            break;
        case ConnectionState::SERVER_CONNECTED:
            lv_obj_set_style_bg_color(indicatorObj, lv_color_hex(0x00FF00), LV_PART_MAIN);
            break;
    }
}
