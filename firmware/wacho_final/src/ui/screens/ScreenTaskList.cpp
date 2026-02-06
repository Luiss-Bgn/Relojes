#include "ScreenTaskList.h"
#include "../builders/UIBuilder.h"
#include "../../services/TaskService.h"
#include "../../services/AuthService.h"
#include "../../utils/ColorUtils.h"
#include "../../core/AppManager.h"
#include "../images/ui_img_agregartarea30_png.h"
#include "../components/TaskPopup.h"

lv_obj_t *ScreenTaskList::screen = nullptr;
lv_obj_t *ScreenTaskList::listContainer = nullptr;
lv_obj_t *ScreenTaskList::btnExtras = nullptr;
lv_obj_t *ScreenTaskList::lblTitle = nullptr;
lv_obj_t *ScreenTaskList::popup = nullptr;

void ScreenTaskList::init(lv_obj_t *parent)
{
    if (screen)
        return;

    // Main Container (ui_ContPanelPrincial)
    screen = lv_obj_create(parent);
    lv_obj_remove_style_all(screen);
    lv_obj_set_width(screen, 240);
    lv_obj_set_height(screen, 220);
    lv_obj_set_align(screen, LV_ALIGN_BOTTOM_MID);
    lv_obj_set_flex_flow(screen, LV_FLEX_FLOW_ROW_WRAP);
    lv_obj_set_flex_align(screen, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_START);
    lv_obj_clear_flag(screen, LV_OBJ_FLAG_GESTURE_BUBBLE | LV_OBJ_FLAG_SCROLLABLE | LV_OBJ_FLAG_SCROLL_ELASTIC | LV_OBJ_FLAG_SCROLL_MOMENTUM | LV_OBJ_FLAG_SCROLL_CHAIN);
    lv_obj_set_scrollbar_mode(screen, LV_SCROLLBAR_MODE_ACTIVE);
    lv_obj_set_scroll_dir(screen, LV_DIR_VER);
    lv_obj_set_style_bg_color(screen, lv_color_hex(0x000000), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_opa(screen, 255, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_row(screen, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_column(screen, 10, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_add_flag(screen, LV_OBJ_FLAG_HIDDEN);

    // Header (ui_ContPanelPBar)
    lv_obj_t *header = lv_obj_create(screen);
    lv_obj_remove_style_all(header);
    lv_obj_set_width(header, 240);
    lv_obj_set_height(header, 40);
    lv_obj_set_x(header, 0);
    lv_obj_set_y(header, 28);
    lv_obj_set_align(header, LV_ALIGN_CENTER);
    lv_obj_set_flex_flow(header, LV_FLEX_FLOW_ROW);
    lv_obj_set_flex_align(header, LV_FLEX_ALIGN_SPACE_BETWEEN, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
    lv_obj_clear_flag(header, LV_OBJ_FLAG_CLICKABLE | LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_set_style_border_color(header, lv_color_hex(0x5C5C5C), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_border_opa(header, 255, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_border_width(header, 2, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_border_side(header, LV_BORDER_SIDE_BOTTOM, LV_PART_MAIN | LV_STATE_DEFAULT);

    // Label (ui_LblPendietes)
    lblTitle = lv_label_create(header);
    lv_obj_set_width(lblTitle, LV_SIZE_CONTENT);
    lv_obj_set_height(lblTitle, LV_SIZE_CONTENT);
    lv_obj_set_x(lblTitle, -50);
    lv_obj_set_y(lblTitle, 0);
    lv_obj_set_align(lblTitle, LV_ALIGN_CENTER);
    const char *empName = getCurrentEmployeeName();
    if (empName && strlen(empName) > 0)
    {
        lv_label_set_text_fmt(lblTitle, "Tareas de %s", empName);
    }
    else
    {
        lv_label_set_text(lblTitle, "Tareas");
    }
    lv_obj_set_style_text_font(lblTitle, &lv_font_montserrat_16, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_text_color(lblTitle, lv_color_white(), LV_PART_MAIN);

    // Extras Button (ui_BtnTareasExtras)
    btnExtras = lv_btn_create(header);
    lv_obj_set_width(btnExtras, 30);
    lv_obj_set_height(btnExtras, 30);
    lv_obj_set_x(btnExtras, 0);
    lv_obj_set_y(btnExtras, 4);
    lv_obj_set_align(btnExtras, LV_ALIGN_TOP_RIGHT);
    lv_obj_add_flag(btnExtras, LV_OBJ_FLAG_SCROLL_ON_FOCUS);
    lv_obj_clear_flag(btnExtras, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_set_style_radius(btnExtras, 25, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_color(btnExtras, lv_color_hex(0xFFFFFF), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_opa(btnExtras, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_img_src(btnExtras, &ui_img_agregartarea30_png, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_img_recolor(btnExtras, lv_color_hex(0x4053FF), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_img_recolor_opa(btnExtras, 255, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_add_event_cb(btnExtras, onExtrasClicked, LV_EVENT_CLICKED, NULL);
    lv_obj_add_flag(btnExtras, LV_OBJ_FLAG_HIDDEN); // oculto hasta que lleguen extras

    // List Container (ui_ContPContenido)
    listContainer = lv_obj_create(screen);
    lv_obj_remove_style_all(listContainer);
    lv_obj_set_width(listContainer, 240);
    lv_obj_set_height(listContainer, 180);
    lv_obj_set_align(listContainer, LV_ALIGN_CENTER);
    lv_obj_set_flex_flow(listContainer, LV_FLEX_FLOW_COLUMN);
    lv_obj_set_flex_align(listContainer, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
    lv_obj_set_scroll_dir(listContainer, LV_DIR_VER);
    lv_obj_set_style_pad_row(listContainer, 5, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_column(listContainer, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
}

void ScreenTaskList::show()
{
    if (!screen)
        return;
    lv_obj_clear_flag(screen, LV_OBJ_FLAG_HIDDEN);
    lv_obj_move_foreground(screen);
    if (lblTitle)
    {
        const char *empName = getCurrentEmployeeName();
        if (empName && strlen(empName) > 0)
        {
            lv_label_set_text_fmt(lblTitle, "Tareas de %s", empName);
        }
        else
        {
            lv_label_set_text(lblTitle, "Tareas");
        }
    }
    updateTasks(TaskService::getTasks());
}

void ScreenTaskList::hide()
{
    if (screen)
        lv_obj_add_flag(screen, LV_OBJ_FLAG_HIDDEN);
}

void ScreenTaskList::updateTasks(const std::vector<Task> &tasks)
{
    if (!listContainer)
        return;

    lv_obj_clean(listContainer);

    if (tasks.empty())
    {
        lv_obj_t *emptyLbl = lv_label_create(listContainer);
        lv_label_set_text(emptyLbl, "Sin Pendientes");
        lv_obj_set_style_text_color(emptyLbl, lv_color_white(), 0);
        lv_obj_set_style_text_font(emptyLbl, &font_sans_serif_20, 0);
        lv_obj_set_align(emptyLbl, LV_ALIGN_CENTER);
        return;
    }

    lv_obj_t *target = nullptr;            // Preferimos la tarea en progreso
    lv_obj_t *lastItem = nullptr;          // Fallback a la última tarea
    lv_obj_t *lastStarted = nullptr;       // Última tarea que no esté "Sin iniciar"

    for (const auto &task : tasks)
    {
        lv_obj_t *item = createTaskItem(listContainer, task);
        lastItem = item;
        if (task.status.equalsIgnoreCase("en_progreso"))
        {
            target = item;
        }
        else if (!task.status.equalsIgnoreCase("sin_iniciar"))
        {
            lastStarted = item;
        }
    }

    if (target == nullptr)
    {
        target = lastStarted ? lastStarted : lastItem; // si no hay en progreso, centrar la última iniciada; si no, la última
    }

    // Aseguramos layout antes de desplazar al target elegido
    lv_obj_update_layout(listContainer);
    if (target)
    {
        lv_obj_update_layout(target);
        lv_obj_scroll_to_view(target, LV_ANIM_ON);
    }
}

void ScreenTaskList::setExtrasButtonVisible(bool visible)
{
    if (!btnExtras)
        return;
    if (visible)
    {
        lv_obj_clear_flag(btnExtras, LV_OBJ_FLAG_HIDDEN);
    }
    else
    {
        lv_obj_add_flag(btnExtras, LV_OBJ_FLAG_HIDDEN);
    }
}

lv_obj_t *ScreenTaskList::createTaskItem(lv_obj_t *parent, const Task &task)
{

    // Botón envolvente
    lv_obj_t *btn = lv_btn_create(parent);
    lv_obj_set_width(btn, lv_pct(100));
    lv_obj_set_height(btn, LV_SIZE_CONTENT);
    lv_obj_set_flex_flow(btn, LV_FLEX_FLOW_ROW);
    lv_obj_set_flex_align(btn, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);
    lv_obj_set_style_bg_opa(btn, LV_OPA_TRANSP, 0);
    lv_obj_set_style_pad_row(btn, 0, 0);
    lv_obj_set_style_pad_column(btn, 2, 0);

    // Registrar click para popup compartido
    Task *taskCopy = new Task(task);
    lv_obj_add_event_cb(btn, onTaskClicked, LV_EVENT_CLICKED, taskCopy);
    lv_obj_add_event_cb(btn, [](lv_event_t *e)
                        {
        void* data = lv_event_get_user_data(e);
        delete static_cast<Task*>(data); }, LV_EVENT_DELETE, taskCopy);

    // Label de hora (izquierda)
    if (task.timeStart.length() > 0) {
        lv_obj_t* lblHora = lv_label_create(btn);

        lv_label_set_text(lblHora, task.timeStart.c_str());
        
        lv_obj_set_style_text_color(lblHora, lv_color_hex(0xffffff), 0);
        lv_obj_set_style_text_font(lblHora, &font_sans_serif_20, 0);
        lv_obj_set_width(lblHora, 70);
    }

    // Label de texto/estado (derecha)
    lv_obj_t *lblTarea = lv_label_create(btn);
    lv_obj_set_width(lblTarea, 170); // Ajustado para caber
    lv_label_set_long_mode(lblTarea, LV_LABEL_LONG_WRAP);
    lv_label_set_text(lblTarea, task.name.c_str());
    lv_obj_set_style_text_color(lblTarea, ColorUtils::getStatusColor(task.status), 0);
    lv_obj_set_style_text_font(lblTarea, &font_sans_serif_20, 0);

    return btn;
}

void ScreenTaskList::onExtrasClicked(lv_event_t *e)
{
    AppManager::changeState(AppState::EXTRAS_LIST);
}

void ScreenTaskList::onTaskClicked(lv_event_t *e)
{
    Task *data = static_cast<Task *>(lv_event_get_user_data(e));
    DEBUG_PRINTF("datos recibidos: %s | %s\n", data->name.c_str(), data->status.c_str());
    if (!data)
        return;
    if (!data->status.equalsIgnoreCase("en_progreso"))
        return;
    showTaskPopup(*data);
}

void ScreenTaskList::showTaskPopup(const Task &task)
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
    popup = createTaskPopup(lv_layer_top(), task, TaskPopupType::Pending, nullptr);
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

const char *ScreenTaskList::getCurrentEmployeeName()
{
    static String cached;
    const String currentId = AuthService::getCurrentEmployeeId();
    if (currentId.isEmpty())
        return "";
    for (const auto &emp : AuthService::getEmployees())
    {
        if (emp.id == currentId)
        {
            cached = emp.name;
            return cached.c_str();
        }
    }
    return "";
}
