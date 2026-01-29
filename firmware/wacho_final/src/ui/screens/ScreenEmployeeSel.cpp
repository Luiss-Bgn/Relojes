#include "ScreenEmployeeSel.h"

lv_obj_t* ScreenEmployeeSel::screen = nullptr;
lv_obj_t* ScreenEmployeeSel::listContainer = nullptr;
lv_obj_t* ScreenEmployeeSel::popup = nullptr;
ScreenEmployeeSel::SelectionCallback ScreenEmployeeSel::callback = nullptr;
String ScreenEmployeeSel::tempSelectedId = "";
String ScreenEmployeeSel::tempSelectedName = "";

void ScreenEmployeeSel::init(lv_obj_t* parent) {
    if (screen) return;
    
    // Main Container (ui_ContEmpleados)
    screen = lv_obj_create(parent);
    lv_obj_remove_style_all(screen);
    lv_obj_set_width(screen, 240);
    lv_obj_set_height(screen, 220);
    lv_obj_set_align(screen, LV_ALIGN_BOTTOM_MID);
    lv_obj_set_flex_flow(screen, LV_FLEX_FLOW_ROW_WRAP);
    lv_obj_set_flex_align(screen, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_START);
    lv_obj_clear_flag(screen, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_set_scrollbar_mode(screen, LV_SCROLLBAR_MODE_ACTIVE);
    lv_obj_set_scroll_dir(screen, LV_DIR_VER);
    lv_obj_set_style_bg_color(screen, lv_color_hex(0x000000), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_opa(screen, 255, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_row(screen, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_column(screen, 10, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_add_flag(screen, LV_OBJ_FLAG_HIDDEN);

    // Header (ui_ContEmpeadosBar)
    lv_obj_t* header = lv_obj_create(screen);
    lv_obj_remove_style_all(header);
    lv_obj_set_width(header, 240);
    lv_obj_set_height(header, 40);
    lv_obj_set_x(header, 43);
    lv_obj_set_y(header, -12);
    lv_obj_set_align(header, LV_ALIGN_CENTER);
    lv_obj_set_flex_flow(header, LV_FLEX_FLOW_ROW);
    lv_obj_set_flex_align(header, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
    lv_obj_clear_flag(header, LV_OBJ_FLAG_CLICKABLE | LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_set_style_border_color(header, lv_color_hex(0x5C5C5C), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_border_opa(header, 255, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_border_width(header, 2, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_border_side(header, LV_BORDER_SIDE_BOTTOM, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_row(header, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_column(header, 12, LV_PART_MAIN | LV_STATE_DEFAULT);

    // Title (ui_LblEmpleados)
    lv_obj_t* title = lv_label_create(header);
    lv_obj_set_width(title, LV_SIZE_CONTENT);
    lv_obj_set_height(title, LV_SIZE_CONTENT);
    lv_obj_set_x(title, -2);
    lv_obj_set_y(title, 1);
    lv_obj_set_align(title, LV_ALIGN_CENTER);
    lv_label_set_text(title, "¿Quién Eres?");
    lv_obj_set_style_text_font(title, &font_sans_serif_20, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_text_color(title, lv_color_white(), LV_PART_MAIN);

    // List Container (ui_ContEmpleadosContenido)
    listContainer = lv_obj_create(screen);
    lv_obj_remove_style_all(listContainer);
    lv_obj_set_width(listContainer, 240);
    lv_obj_set_height(listContainer, 180);
    lv_obj_set_align(listContainer, LV_ALIGN_CENTER);
    lv_obj_set_flex_flow(listContainer, LV_FLEX_FLOW_COLUMN);
    lv_obj_set_flex_align(listContainer, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
    lv_obj_set_scroll_dir(listContainer, LV_DIR_VER);
    lv_obj_set_style_pad_row(listContainer, 10, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_column(listContainer, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
}

void ScreenEmployeeSel::show() {
    if (!screen) return;
    lv_obj_clear_flag(screen, LV_OBJ_FLAG_HIDDEN);
    lv_obj_move_foreground(screen);
}

void ScreenEmployeeSel::hide() {
    if (screen) lv_obj_add_flag(screen, LV_OBJ_FLAG_HIDDEN);
}

void ScreenEmployeeSel::updateList(const std::vector<Employee>& employees) {
    if (!listContainer) return;
    
    lv_obj_clean(listContainer);
    
    for (const auto& emp : employees) {
        // Botón estilo wacho5 (transparente, alto compacto, padding ligero)
        lv_obj_t* btn = lv_btn_create(listContainer);
        lv_obj_set_width(btn, 240);
        lv_obj_set_height(btn, 40);
        lv_obj_add_flag(btn, LV_OBJ_FLAG_SCROLL_ON_FOCUS);
        lv_obj_clear_flag(btn, LV_OBJ_FLAG_SCROLLABLE);
        lv_obj_set_style_bg_color(btn, lv_color_hex(0xFFFFFF), LV_PART_MAIN | LV_STATE_DEFAULT);
        lv_obj_set_style_bg_opa(btn, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
        lv_obj_set_style_border_width(btn, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
        lv_obj_set_style_outline_width(btn, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
        lv_obj_set_style_shadow_width(btn, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
        lv_obj_set_flex_flow(btn, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(btn, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_row(btn, 5, LV_PART_MAIN | LV_STATE_DEFAULT);
        lv_obj_set_style_pad_column(btn, 10, LV_PART_MAIN | LV_STATE_DEFAULT);
        
        char* idCopy = strdup(emp.id.c_str());
        lv_obj_set_user_data(btn, idCopy);
        
        lv_obj_add_event_cb(btn, event_handler, LV_EVENT_ALL, NULL);
        
        lv_obj_t* label = lv_label_create(btn);
        lv_obj_set_width(label, 240);
        lv_obj_set_height(label, LV_SIZE_CONTENT);
        lv_label_set_long_mode(label, LV_LABEL_LONG_WRAP);
        lv_label_set_text(label, emp.name.c_str());
        lv_obj_set_style_text_color(label, lv_color_hex(0xFFFFFF), LV_PART_MAIN | LV_STATE_DEFAULT);
        lv_obj_set_style_text_font(label, &lv_font_montserrat_24, LV_PART_MAIN | LV_STATE_DEFAULT);
        lv_obj_set_style_text_align(label, LV_TEXT_ALIGN_AUTO, LV_PART_MAIN | LV_STATE_DEFAULT);
    }
}

void ScreenEmployeeSel::setCallback(SelectionCallback cb) {
    callback = cb;
}

void ScreenEmployeeSel::event_handler(lv_event_t* e) {
    lv_event_code_t code = lv_event_get_code(e);
    lv_obj_t* obj = lv_event_get_target(e);
    
    if (code == LV_EVENT_CLICKED) {
        Serial.println("[ScreenEmployeeSel] Button clicked");
        char* id = (char*)lv_obj_get_user_data(obj);
        if (id) {
            Serial.printf("[ScreenEmployeeSel] ID: %s\n", id);
            tempSelectedId = String(id);
            
            const char* name = "Empleado";
            // Try to find label (child 0)
            if (lv_obj_get_child_cnt(obj) > 0) {
                lv_obj_t* label = lv_obj_get_child(obj, 0);
                if (lv_obj_check_type(label, &lv_label_class)) {
                    name = lv_label_get_text(label);
                }
            }
            tempSelectedName = String(name);
            Serial.printf("[ScreenEmployeeSel] Name: %s\n", name);
            createConfirmationPopup(name);
        } else {
            Serial.println("[ScreenEmployeeSel] ID is NULL");
        }
    }
    else if (code == LV_EVENT_DELETE) {
        char* id = (char*)lv_obj_get_user_data(obj);
        if (id) {
            free(id);
            lv_obj_set_user_data(obj, NULL);
        }
    }
}

void ScreenEmployeeSel::createConfirmationPopup(const char* name) {
    Serial.println("[ScreenEmployeeSel] Creating popup...");
    if (popup) {
        Serial.println("[ScreenEmployeeSel] Popup already exists, deleting...");
        lv_obj_del(popup);
        popup = nullptr;
    }

    // Modal Container
    popup = lv_obj_create(screen); // Parent is screen so it covers it
    lv_obj_remove_style_all(popup);
    
    // IMPORTANT: Add floating flag to ignore parent's flex layout
    lv_obj_add_flag(popup, LV_OBJ_FLAG_FLOATING);
    
    lv_obj_set_size(popup, 240, 180);
    lv_obj_set_align(popup, LV_ALIGN_BOTTOM_MID);
    lv_obj_set_style_bg_opa(popup, 255, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_color(popup, lv_color_black(), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_flex_flow(popup, LV_FLEX_FLOW_COLUMN);
    lv_obj_set_flex_align(popup, LV_FLEX_ALIGN_SPACE_BETWEEN, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);
    lv_obj_set_style_pad_all(popup, 10, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_clear_flag(popup, LV_OBJ_FLAG_SCROLLABLE);
    
    // Ensure it's on top
    lv_obj_move_foreground(popup);
    Serial.println("[ScreenEmployeeSel] Popup created and moved to foreground");

    // Label "Ingresar como..."
    lv_obj_t *lbl = lv_label_create(popup);
    lv_label_set_text_fmt(lbl, "Ingresar como\n%s", name ? name : "");
    lv_obj_set_style_text_color(lbl, lv_color_white(), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_width(lbl, 220);
    lv_obj_set_style_text_font(lbl, &font_sans_serif_20, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_text_align(lbl, LV_TEXT_ALIGN_CENTER, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_label_set_long_mode(lbl, LV_LABEL_LONG_WRAP);

    // Button Row
    lv_obj_t *row = lv_obj_create(popup);
    lv_obj_remove_style_all(row);
    lv_obj_set_width(row, 220);
    lv_obj_set_height(row, LV_SIZE_CONTENT);
    lv_obj_set_flex_flow(row, LV_FLEX_FLOW_ROW);
    lv_obj_set_flex_align(row, LV_FLEX_ALIGN_SPACE_BETWEEN, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);
    lv_obj_clear_flag(row, LV_OBJ_FLAG_CLICKABLE | LV_OBJ_FLAG_SCROLLABLE);

    // Cancel Button
    lv_obj_t *btn_cancel = lv_btn_create(row);
    lv_obj_set_width(btn_cancel, 100);
    lv_obj_set_style_bg_color(btn_cancel, lv_color_hex(0xFB0000), LV_PART_MAIN | LV_STATE_DEFAULT); // Red
    lv_obj_set_style_bg_opa(btn_cancel, 255, LV_PART_MAIN | LV_STATE_DEFAULT);
    
    lv_obj_t *lbl_cancel = lv_label_create(btn_cancel);
    lv_label_set_text(lbl_cancel, "Cancelar");
    lv_obj_center(lbl_cancel);
    lv_obj_set_style_text_font(lbl_cancel, &lv_font_montserrat_14, LV_PART_MAIN | LV_STATE_DEFAULT);
    
    // User data 0 for Cancel
    lv_obj_set_user_data(btn_cancel, (void*)0);
    lv_obj_add_event_cb(btn_cancel, popup_event_handler, LV_EVENT_CLICKED, NULL);

    // OK Button
    lv_obj_t *btn_ok = lv_btn_create(row);
    lv_obj_set_width(btn_ok, 100);
    lv_obj_set_style_bg_color(btn_ok, lv_color_hex(0x009904), LV_PART_MAIN | LV_STATE_DEFAULT); // Green
    lv_obj_set_style_bg_opa(btn_ok, 255, LV_PART_MAIN | LV_STATE_DEFAULT);
    
    lv_obj_t *lbl_ok = lv_label_create(btn_ok);
    lv_label_set_text(lbl_ok, "Ingresar");
    lv_obj_center(lbl_ok);
    lv_obj_set_style_text_font(lbl_ok, &lv_font_montserrat_14, LV_PART_MAIN | LV_STATE_DEFAULT);

    // User data 1 for OK
    lv_obj_set_user_data(btn_ok, (void*)1);
    lv_obj_add_event_cb(btn_ok, popup_event_handler, LV_EVENT_CLICKED, NULL);
}

void ScreenEmployeeSel::popup_event_handler(lv_event_t* e) {
    lv_obj_t* btn = lv_event_get_target(e);
    int action = (int)lv_obj_get_user_data(btn);
    
    Serial.printf("[ScreenEmployeeSel] Popup action: %d\n", action);

    if (action == 1) { // OK
        if (callback && tempSelectedId.length() > 0) {
            Serial.println("[ScreenEmployeeSel] Calling callback");
            callback(tempSelectedId, tempSelectedName);
        }
    }
    
    // Close popup (for both OK and Cancel)
    if (popup) {
        Serial.println("[ScreenEmployeeSel] Closing popup");
        lv_obj_del_async(popup);
        popup = nullptr;
    }
}