#include "TaskPopup.h"
#include "../../services/AuthService.h"
#include "../../services/NetworkService.h"
#include <ArduinoJson.h>

namespace
{

    void destroyData(TaskPopupData *data)
    {
        delete data;
    }

    // Envía al servidor la tarea completada (nuevo formato encapsulado en "tarea")
    void sendTaskCompleted(const TaskPopupData &data)
    {
        JsonDocument doc;
        // Formato requerido:
        // {
        //   "tipo": "relojes",
        //   "comando": "completar_tarea",
        //   "tarea": {
        //       "id": <id>,
        //       "id_empleado": <id_empleado>,
        //       "tipo": <"tarea" | "extra">
        //   }
        // }
        doc["tipo"] = "relojes";
        doc["comando"] = "completar_tarea";

        JsonObject tarea = doc.createNestedObject("tarea");

        // id: ya viene normalizado al parsear tareas, se envía tal cual (string)
        if (data.task.id.length() > 0)
        {
            tarea["id"] = data.task.id;
        }

        // id_empleado: siempre el empleado logueado (las tareas no lo traen)
        if (AuthService::isLoggedIn())
        {
            tarea["id_empleado"] = AuthService::getCurrentEmployeeId();
        }

        // tipo: normal/extra
        String tipo = data.task.type;
        tipo.toLowerCase();
        if (tipo == "tareaextra" || tipo == "extra")
        {
            tarea["tipo"] = "extra";
        }
        else
        {
            // Fallback según popup
            tarea["tipo"] = (data.type == TaskPopupType::Extra) ? "extra" : "tarea";
        }

        String jsonString;
        serializeJson(doc, jsonString);
        NetworkService::send(jsonString);
    }

    static void onPopupDelete(lv_event_t *e)
    {
        auto *data = static_cast<TaskPopupData *>(lv_event_get_user_data(e));
        if (!data)
            return;
        destroyData(data);
    }

    static void onClose(lv_event_t *e)
    {
        auto *data = static_cast<TaskPopupData *>(lv_event_get_user_data(e));
        if (!data || !data->popup)
            return;
        lv_obj_del_async(data->popup);
        data->popup = nullptr;
    }

    static void onCompleteEvent(lv_event_t *e)
    {
        auto *data = static_cast<TaskPopupData *>(lv_event_get_user_data(e));
        if (!data)
            return;
        if (data->onComplete)
        {
            data->onComplete(data->task);
        }
        else
        {
            sendTaskCompleted(*data);
        }
        if (data->popup)
        {
            lv_obj_del_async(data->popup);
            data->popup = nullptr;
        }
    }

} // namespace

lv_obj_t *createTaskPopup(lv_obj_t *parent, const Task &task, TaskPopupType type, std::function<void(const Task &)> onCompleteCb)
{
    if (!parent)
        return nullptr;

    auto *data = new TaskPopupData(task, type, onCompleteCb);

    lv_obj_t *modal = lv_obj_create(parent);
    lv_obj_remove_style_all(modal);
    lv_obj_set_size(modal, 240, 180);
    lv_obj_set_align(modal, LV_ALIGN_BOTTOM_MID);
    lv_obj_set_style_bg_opa(modal, 255, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_color(modal, lv_color_black(), 0);
    lv_obj_set_flex_flow(modal, LV_FLEX_FLOW_COLUMN);
    lv_obj_set_flex_align(modal, LV_FLEX_ALIGN_SPACE_BETWEEN, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);
    lv_obj_clear_flag(modal, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_move_foreground(modal);

    // Nombre + hora
    lv_obj_t* lbl = lv_label_create(modal);
    // if (task.timeStart.length() > 0) {
    //     if (task.timeEnd.length() > 0) {
    //         lv_label_set_text_fmt(lbl, "%s - %s\n%s", task.timeStart.c_str(), task.timeEnd.c_str(), task.name.c_str());
    //     } else {
    //         lv_label_set_text_fmt(lbl, "%s\n%s", task.timeStart.c_str(), task.name.c_str());
    //     }
    // } else {
    //     lv_label_set_text(lbl, task.name.c_str());
    // }
    lv_label_set_text(lbl, task.name.c_str());
    
    lv_obj_set_style_text_color(lbl, lv_color_white(), 0);
    lv_obj_set_width(lbl, 240);
    lv_obj_set_style_text_font(lbl, &font_sans_serif_24, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_text_align(lbl, LV_TEXT_ALIGN_LEFT, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_label_set_long_mode(lbl, LV_LABEL_LONG_WRAP);

    // Botonera
    lv_obj_t *row = lv_obj_create(modal);
    lv_obj_remove_style_all(row);
    lv_obj_set_width(row, 240);
    lv_obj_set_height(row, LV_SIZE_CONTENT);
    lv_obj_set_flex_flow(row, LV_FLEX_FLOW_ROW);
    lv_obj_set_flex_align(row, LV_FLEX_ALIGN_SPACE_BETWEEN, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);
    lv_obj_clear_flag(row, LV_OBJ_FLAG_CLICKABLE | LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_set_style_pad_left(row, 10, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_right(row, 10, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_pad_bottom(row, 10, LV_PART_MAIN | LV_STATE_DEFAULT);

    // Cancelar
    lv_obj_t *btn_cancel = lv_btn_create(row);
    lv_obj_set_width(btn_cancel, 100);
    lv_obj_set_style_bg_color(btn_cancel, lv_color_hex(0xFB0000), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_opa(btn_cancel, 255, LV_PART_MAIN | LV_STATE_DEFAULT);

    lv_obj_t *lbl_cancel = lv_label_create(btn_cancel);
    lv_label_set_text(lbl_cancel, "Cancelar");
    lv_obj_center(lbl_cancel);
    lv_obj_set_style_text_font(lbl_cancel, &lv_font_montserrat_14, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_add_event_cb(btn_cancel, onClose, LV_EVENT_CLICKED, data);

    // Completar
    lv_obj_t *btn_ok = lv_btn_create(row);
    lv_obj_set_width(btn_ok, 100);
    lv_obj_set_style_bg_color(btn_ok, lv_color_hex(0x009904), LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_set_style_bg_opa(btn_ok, 255, LV_PART_MAIN | LV_STATE_DEFAULT);

    lv_obj_t *lbl_ok = lv_label_create(btn_ok);
    lv_label_set_text(lbl_ok, "Completada");
    lv_obj_center(lbl_ok);
    lv_obj_set_style_text_font(lbl_ok, &lv_font_montserrat_14, LV_PART_MAIN | LV_STATE_DEFAULT);
    lv_obj_add_event_cb(btn_ok, onCompleteEvent, LV_EVENT_CLICKED, data);

    data->popup = modal;
    lv_obj_add_event_cb(modal, onPopupDelete, LV_EVENT_DELETE, data);
    return modal;
}
