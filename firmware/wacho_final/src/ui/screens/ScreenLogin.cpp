#include "ScreenLogin.h"

lv_obj_t* ScreenLogin::screen = nullptr;
lv_obj_t* ScreenLogin::label = nullptr;

void ScreenLogin::init(lv_obj_t* parent) {
    if (screen) return;
    
    screen = lv_obj_create(parent);
    lv_obj_set_size(screen, 240, 220);
    lv_obj_set_style_bg_color(screen, lv_color_black(), LV_PART_MAIN);
    lv_obj_add_flag(screen, LV_OBJ_FLAG_HIDDEN);
    lv_obj_set_style_border_width(screen, 0, 0);
    lv_obj_set_style_pad_all(screen, 0, 0);
    
    label = lv_label_create(screen);
    lv_label_set_text(label, "Esperando Registro...\nSolicitando UUID");
    lv_obj_set_style_text_color(label, lv_color_white(), LV_PART_MAIN);
    lv_obj_set_style_text_align(label, LV_TEXT_ALIGN_CENTER, 0);
    lv_obj_align(label, LV_ALIGN_CENTER, 0, 0);
}

void ScreenLogin::show() {
    if (!screen) return;
    lv_obj_clear_flag(screen, LV_OBJ_FLAG_HIDDEN);
    lv_obj_move_foreground(screen);
}

void ScreenLogin::hide() {
    if (screen) lv_obj_add_flag(screen, LV_OBJ_FLAG_HIDDEN);
}