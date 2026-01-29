#include "ScreenTaskExtras.h"
#include "../builders/UIBuilder.h"
#include "../../services/TaskService.h"
#include "../../utils/ColorUtils.h"
#include "../../core/AppManager.h"
#include "../images/ui_img_volver30_png.h"
#include "../components/TaskPopup.h"

lv_obj_t *ScreenTaskExtras::screen = nullptr;
lv_obj_t *ScreenTaskExtras::listContainer = nullptr;
lv_obj_t *ScreenTaskExtras::popup = nullptr;

void ScreenTaskExtras::init(lv_obj_t *parent)
{
    if (screen)
        return;

    // Main Container (ui_ContTareasExtras)
    screen = lv_obj_create(parent);
    lv_obj_remove_style_all(screen);
    lv_obj_set_width(screen, 240);
    lv_obj_set_height(screen, 220);
    lv_obj_set_align(screen, LV_ALIGN_BOTTOM_MID);
    lv_obj_set_flex_flow(screen, LV_FLEX_FLOW_ROW_WRAP);
    lv_obj_set_flex_align(screen, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
    lv_obj_clear_flag(screen, LV_OBJ_FLAG_GESTURE_BUBBLE | LV_OBJ_FLAG_SCROLLABLE | LV_OBJ_FLAG_SCROLL_ELASTIC | LV_OBJ_FLAG_SCROLL_MOMENTUM | LV_OBJ_FLAG_SCROLL_CHAIN);
    lv_obj_set_scrollbar_mode(screen, LV_SCROLLBAR_MODE_OFF);
    lv_obj_set_scroll_dir(screen, LV_DIR_VER);
    lv_obj_set_style_bg_color(screen, lv_color_hex(0x000000), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_opa(screen, 255, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_row(screen, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_column(screen, 10, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_add_flag(screen, LV_OBJ_FLAG_HIDDEN);

    // Header (ui_ContTEBar)
    lv_obj_t *header = lv_obj_create(screen);
    lv_obj_remove_style_all(header);
    lv_obj_set_width(header, 240);
    lv_obj_set_height(header, 40);
    lv_obj_set_x(header, 43);
    lv_obj_set_y(header, -12);
    lv_obj_set_align(header, LV_ALIGN_CENTER);
    lv_obj_set_flex_flow(header, LV_FLEX_FLOW_ROW);
    lv_obj_set_flex_align(header, LV_FLEX_ALIGN_SPACE_BETWEEN, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
    lv_obj_clear_flag(header, LV_OBJ_FLAG_CLICKABLE | LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_set_style_border_color(header, lv_color_hex(0x5C5C5C), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_border_opa(header, 255, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_border_width(header, 2, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_border_side(header, LV_BORDER_SIDE_BOTTOM, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_row(header, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_column(header, 12, LV_PART_MAIN | LV_STATE_DEFAULT);

    // Back Button (ui_BtnPendientes)
    lv_obj_t *btnBack = lv_btn_create(header);
    lv_obj_set_width(btnBack, 30);
    lv_obj_set_height(btnBack, 30);
    lv_obj_set_x(btnBack, -184);
    lv_obj_set_y(btnBack, 5);
    lv_obj_set_align(btnBack, LV_ALIGN_TOP_RIGHT);
    lv_obj_add_flag(btnBack, LV_OBJ_FLAG_SCROLL_ON_FOCUS);
    lv_obj_clear_flag(btnBack, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_set_style_radius(btnBack, 25, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_color(btnBack, lv_color_hex(0xFFFFFF), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_opa(btnBack, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_img_src(btnBack, &ui_img_volver30_png, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_img_recolor(btnBack, lv_color_white(), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_img_recolor_opa(btnBack, 255, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_add_event_cb(btnBack, onBackClicked, LV_EVENT_CLICKED, NULL);

    // Label (ui_lblTareasExtras)
    lv_obj_t *lbl = lv_label_create(header);
    lv_obj_set_width(lbl, LV_SIZE_CONTENT);
    lv_obj_set_height(lbl, LV_SIZE_CONTENT);
    lv_obj_set_x(lbl, 15);
    lv_obj_set_y(lbl, 0);
    lv_obj_set_align(lbl, LV_ALIGN_CENTER);
    lv_label_set_text(lbl, "Tareas Extras");
    lv_obj_set_style_text_font(lbl, &lv_font_montserrat_18, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_text_color(lbl, lv_color_white(), LV_PART_MAIN);

    // List Container (ui_ContTEContenido)
    listContainer = lv_obj_create(screen);
    lv_obj_remove_style_all(listContainer);
    lv_obj_set_width(listContainer, 240);
    lv_obj_set_height(listContainer, 180);
    lv_obj_set_flex_flow(listContainer, LV_FLEX_FLOW_COLUMN);
    lv_obj_set_flex_align(listContainer, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
    lv_obj_clear_flag(listContainer, LV_OBJ_FLAG_SCROLL_ELASTIC);
    lv_obj_set_scroll_dir(listContainer, LV_DIR_VER);
    lv_obj_set_style_pad_row(listContainer, 10, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_column(listContainer, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
}

void ScreenTaskExtras::show()
{
    if (!screen)
        return;
    lv_obj_clear_flag(screen, LV_OBJ_FLAG_HIDDEN);
    lv_obj_move_foreground(screen);
    updateTasks(TaskService::getExtraTasks());
}

void ScreenTaskExtras::hide()
{
    if (screen)
        lv_obj_add_flag(screen, LV_OBJ_FLAG_HIDDEN);
}

void ScreenTaskExtras::updateTasks(const std::vector<Task> &tasks)
{
    if (!listContainer)
        return;

    lv_obj_clean(listContainer);

    for (const auto &task : tasks)
    {
        createTaskItem(listContainer, task);
    }
}

void ScreenTaskExtras::createTaskItem(lv_obj_t *parent, const Task &task)
{
    // Same as ScreenTaskList
    lv_obj_t *cont = lv_obj_create(parent);
    lv_obj_remove_style_all(cont);
    lv_obj_set_style_bg_opa(cont, LV_OPA_TRANSP, 0);
    lv_obj_set_width(cont, lv_pct(100));
    lv_obj_set_height(cont, LV_SIZE_CONTENT);
    lv_obj_set_flex_flow(cont, LV_FLEX_FLOW_ROW);
    lv_obj_set_style_pad_all(cont, 0, 0);

    lv_obj_t *btn = lv_btn_create(cont);
    lv_obj_set_width(btn, lv_pct(100));
    lv_obj_set_height(btn, LV_SIZE_CONTENT);
    lv_obj_set_flex_flow(btn, LV_FLEX_FLOW_ROW);
    lv_obj_set_flex_align(btn, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);
    lv_obj_set_style_bg_opa(btn, LV_OPA_TRANSP, 0);
    lv_obj_set_style_pad_row(btn, 0, 0);
    lv_obj_set_style_pad_column(btn, 4, 0);
    // Registrar click para popup
    Task *taskCopy = new Task(task);
    lv_obj_add_event_cb(btn, onTaskClicked, LV_EVENT_CLICKED, taskCopy);
    lv_obj_add_event_cb(btn, [](lv_event_t *e)
                        {
        void* data = lv_event_get_user_data(e);
        delete static_cast<Task*>(data); }, LV_EVENT_DELETE, taskCopy);

    if (task.timeStart.length() > 0)
    {
        lv_obj_t *lblHora = lv_label_create(btn);
        // if (task.timeEnd.length() > 0) {
        //     String horaDisplay = task.timeStart + "-" + task.timeEnd;
        //     lv_label_set_text(lblHora, horaDisplay.c_str());
        // } else {
        //     lv_label_set_text(lblHora, task.timeStart.c_str());
        // }
        lv_label_set_text(lblHora, task.timeStart.c_str());

        lv_obj_set_style_text_color(lblHora, lv_color_hex(0xffffff), 0);
        lv_obj_set_style_text_font(lblHora, &font_sans_serif_20, 0);
        lv_obj_set_width(lblHora, 70);
    }

    lv_obj_t *lblTarea = lv_label_create(btn);
    lv_obj_set_width(lblTarea, 170);
    lv_label_set_long_mode(lblTarea, LV_LABEL_LONG_WRAP);
    lv_label_set_text(lblTarea, task.name.c_str());
    lv_obj_set_style_text_color(lblTarea, ColorUtils::getStatusColor(task.status), 0);
    lv_obj_set_style_text_font(lblTarea, &font_sans_serif_20, 0);
}

void ScreenTaskExtras::onBackClicked(lv_event_t *e)
{
    AppManager::changeState(AppState::TASK_LIST);
}

void ScreenTaskExtras::onTaskClicked(lv_event_t *e)
{
    Task *data = static_cast<Task *>(lv_event_get_user_data(e));
    if (!data)
        return;
    Serial.printf("[ScreenTaskExtras] Task clicked: %s | Status: %s\n", data->name.c_str(), data->status.c_str());
    if (!data->status.equalsIgnoreCase("Extra"))
    {
        Serial.printf("[ScreenTaskExtras] ❌ Status is not 'Extra', popup not shown\n");
        return;
    }
    Serial.println("[ScreenTaskExtras] ✅ Showing popup");
    showTaskPopup(*data);
}

void ScreenTaskExtras::showTaskPopup(const Task &task)
{
    if (!screen)
        return;
    if (popup)
    {
        lv_obj_del(popup);
        popup = nullptr;
    }
    if (!listContainer)
        return;

    // Crear el popup en la capa superior y alinearlo sobre el listContainer
    popup = createTaskPopup(lv_layer_top(), task, TaskPopupType::Extra, nullptr);
    if (popup)
    {
        lv_obj_set_size(popup, lv_obj_get_width(listContainer), lv_obj_get_height(listContainer));
        lv_obj_align_to(popup, listContainer, LV_ALIGN_CENTER, 0, 0);
        lv_obj_move_foreground(popup);
        // Clear our static pointer when LVGL deletes the popup
        lv_obj_add_event_cb(popup, [](lv_event_t *e)
                            {
            lv_obj_t** holder = static_cast<lv_obj_t**>(lv_event_get_user_data(e));
            if (holder) *holder = nullptr; }, LV_EVENT_DELETE, &popup);
    }
}
