#include "TaskService.h"

std::vector<Task> TaskService::tasks;
std::vector<Task> TaskService::extraTasks;

void TaskService::clearTasks() {
    tasks.clear();
    extraTasks.clear();
}

void TaskService::addTask(const Task& task) {
    tasks.push_back(task);
}

bool TaskService::parseTasks(const JsonDocument& doc) {
    JsonArrayConst array = doc["tareas no completadas"].as<JsonArrayConst>();
    if (array.isNull()) {
        array = doc["tareas_no_completadas"].as<JsonArrayConst>();
    }
    if (array.isNull()) return false;

    tasks.clear();
    
    for (JsonObjectConst obj : array) {
        Task task;
        if (obj["TaskID"].is<int>()) {
            task.id = String(obj["TaskID"].as<int>());
        } else {
            task.id = obj["TaskID"].as<String>();
        }
        task.name = obj["Tarea"].as<String>();
        String estado = obj["Estado"].is<const char*>() ? obj["Estado"].as<const char*>() : obj["Status"].as<String>();
        task.status = estado;
        task.timeStart = obj["hora_inicio"].is<const char*>() ? obj["hora_inicio"].as<const char*>() : obj["Hora"].as<String>();
        task.timeEnd = obj["hora_fin"].is<const char*>() ? obj["hora_fin"].as<const char*>() : "";
        task.type = "Tarea";
        
        tasks.push_back(task);
    }
    DEBUG_PRINTF("[TaskService] Parsed %u tasks\n", (unsigned)tasks.size());
    return true;
}

bool TaskService::parseExtraTasks(const JsonDocument& doc) {
    JsonArrayConst array = doc["tareas no completadas"].as<JsonArrayConst>();
    if (array.isNull()) {
        array = doc["tareas_no_completadas"].as<JsonArrayConst>();
    }
    if (array.isNull()) return false;

    extraTasks.clear();
    
    for (JsonObjectConst obj : array) {
        Task task;
        if (obj["TaskID"].is<int>()) {
            task.id = String(obj["TaskID"].as<int>());
        } else {
            task.id = obj["TaskID"].as<String>();
        }
        task.name = obj["Tarea"].as<String>();
        String estado = obj["Estado"].is<const char*>() ? obj["Estado"].as<const char*>() : obj["Status"].as<String>();
        task.status = estado;
        task.timeStart = obj["hora_inicio"].is<const char*>() ? obj["hora_inicio"].as<const char*>() : obj["Hora"].as<String>();
        task.timeEnd = obj["hora_fin"].is<const char*>() ? obj["hora_fin"].as<const char*>() : "";
        task.type = "TareaExtra";
        
        extraTasks.push_back(task);
    }
    DEBUG_PRINTF("[TaskService] Parsed %u extra tasks\n", (unsigned)extraTasks.size());
    return true;
}

const std::vector<Task>& TaskService::getTasks() {
    return tasks;
}

const std::vector<Task>& TaskService::getExtraTasks() {
    return extraTasks;
}

void TaskService::updateTaskStatus(String taskId, String newStatus) {
    for (auto& task : tasks) {
        if (task.id == taskId) {
            task.status = newStatus;
            break;
        }
    }
}
