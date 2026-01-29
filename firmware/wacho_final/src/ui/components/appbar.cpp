#include "AppBar.h"
#include "ConnectionIndicator.h"
#include <Arduino.h>

lv_obj_t* AppBar::container = nullptr;
lv_obj_t* AppBar::labelTime = nullptr;
lv_obj_t* AppBar::containerBattery = nullptr;
lv_obj_t* AppBar::labelBattery = nullptr;
lv_obj_t* AppBar::barBattery = nullptr;

void AppBar::init(lv_obj_t* parent) {
    container = lv_obj_create(parent);
    lv_obj_remove_style_all(container);
    lv_obj_set_width(container, 240);
    lv_obj_set_height(container, 20);
    lv_obj_set_align(container, LV_ALIGN_TOP_MID);
    lv_obj_set_flex_flow(container, LV_FLEX_FLOW_ROW);
    lv_obj_set_flex_align(container, LV_FLEX_ALIGN_SPACE_BETWEEN, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);
    lv_obj_set_style_bg_color(container, lv_color_hex(0x000000), LV_PART_MAIN);
    lv_obj_set_style_bg_opa(container, 255, LV_PART_MAIN);
    lv_obj_set_style_pad_left(container, 10, LV_PART_MAIN);
    lv_obj_set_style_pad_right(container, 10, LV_PART_MAIN);

    // Time Label
    labelTime = lv_label_create(container);
    lv_label_set_text(labelTime, "00:00");
    lv_obj_set_style_text_font(labelTime, &lv_font_montserrat_16, LV_PART_MAIN);
    lv_obj_set_style_text_color(labelTime, lv_color_white(), LV_PART_MAIN);

    // Battery Container
    containerBattery = lv_obj_create(container);
    lv_obj_remove_style_all(containerBattery);
    lv_obj_set_height(containerBattery, 20);
    lv_obj_set_width(containerBattery, LV_SIZE_CONTENT);
    lv_obj_set_flex_flow(containerBattery, LV_FLEX_FLOW_ROW);
    lv_obj_set_flex_align(containerBattery, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
    lv_obj_set_style_pad_column(containerBattery, 5, LV_PART_MAIN);

    // Battery Label
    labelBattery = lv_label_create(containerBattery);
    lv_label_set_text(labelBattery, "-- %");
    lv_obj_set_style_text_font(labelBattery, &lv_font_montserrat_16, LV_PART_MAIN);
    lv_obj_set_style_text_color(labelBattery, lv_color_white(), LV_PART_MAIN);

    // Battery Bar
    barBattery = lv_bar_create(containerBattery);
    lv_obj_set_size(barBattery, 30, 13);
    lv_bar_set_range(barBattery, 0, 100);
    lv_bar_set_value(barBattery, 0, LV_ANIM_OFF);
    lv_obj_set_style_border_color(barBattery, lv_color_white(), LV_PART_MAIN);
    lv_obj_set_style_border_width(barBattery, 1, LV_PART_MAIN);
    lv_obj_set_style_bg_color(barBattery, lv_color_black(), LV_PART_MAIN);
    lv_obj_set_style_bg_color(barBattery, lv_color_white(), LV_PART_INDICATOR);

    // Connection Indicator (inside battery container, at the end)
    ConnectionIndicator::init(containerBattery);
}

const char* AppBar::MONTHS[] = {"ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"};

void AppBar::updateTime(struct tm* timeinfo) {
    if (labelTime && timeinfo) {
        char buffer[32];
        // Format: "HH:MM  DD MMM" (e.g., "10:50  15 Dic")
        snprintf(buffer, sizeof(buffer), "%02d:%02d  %d %s", 
                 timeinfo->tm_hour, 
                 timeinfo->tm_min, 
                 timeinfo->tm_mday, 
                 MONTHS[timeinfo->tm_mon % 12]);
        lv_label_set_text(labelTime, buffer);
    }
}

void AppBar::updateBattery(int percent) {
    if (labelBattery) lv_label_set_text_fmt(labelBattery, "%d% %", percent);
    if (barBattery) lv_bar_set_value(barBattery, percent, LV_ANIM_OFF);
}
