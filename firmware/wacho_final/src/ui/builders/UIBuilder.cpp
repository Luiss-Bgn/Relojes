#include "UIBuilder.h"

lv_obj_t* UIBuilder::createHeader(lv_obj_t* parent, const char* title) {
    lv_obj_t* header = lv_obj_create(parent);
    lv_obj_set_size(header, 240, 40);
    lv_obj_set_align(header, LV_ALIGN_TOP_MID);
    lv_obj_set_style_bg_color(header, lv_color_hex(0x202020), 0);
    lv_obj_set_style_border_width(header, 0, 0);
    lv_obj_set_scrollbar_mode(header, LV_SCROLLBAR_MODE_OFF);
    
    lv_obj_t* label = lv_label_create(header);
    lv_label_set_text(label, title);
    lv_obj_center(label);
    lv_obj_set_style_text_color(label, lv_color_white(), 0);
    
    return header;
}

lv_obj_t* UIBuilder::createButton(lv_obj_t* parent, const char* text, lv_event_cb_t event_cb) {
    lv_obj_t* btn = lv_btn_create(parent);
    lv_obj_set_size(btn, 200, 50);
    lv_obj_add_event_cb(btn, event_cb, LV_EVENT_CLICKED, NULL);
    
    lv_obj_t* label = lv_label_create(btn);
    lv_label_set_text(label, text);
    lv_obj_center(label);
    
    return btn;
}
