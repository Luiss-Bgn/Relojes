#pragma once

#include <lvgl.h>
#include <functional>
#include "../../model/Task.h"

// Tipo de tarea para configurar el popup
enum class TaskPopupType {
    Pending,
    Extra
};

struct TaskPopupData {
    Task task;                          // Datos de la tarea a mostrar
    TaskPopupType type;                 // Tipo de tarea
    lv_obj_t* popup = nullptr;          // Raiz del modal creado
    std::function<void(const Task&)> onComplete; // Callback opcional al completar

    TaskPopupData(const Task& t, TaskPopupType tp, std::function<void(const Task&)> cb)
        : task(t), type(tp), popup(nullptr), onComplete(cb) {}
};

// Crea un popup de confirmacion de tarea sobre el parent dado. Devuelve el modal creado.
lv_obj_t* createTaskPopup(lv_obj_t* parent, const Task& task, TaskPopupType type, std::function<void(const Task&)> onComplete = nullptr);
