#include "TaskService.h"
#include "AuthService.h"

std::vector<Task> TaskService::tasks;
std::vector<Task> TaskService::extraTasks;

void TaskService::clearTasks()
{
    tasks.clear();
    extraTasks.clear();
}

bool TaskService::parseTasks(const JsonDocument &doc, const bool isExtra)
{
    JsonArrayConst array = doc["tareas"].as<JsonArrayConst>();
    if (array.isNull())
        return false;

    if (isExtra)
        extraTasks.clear();
    else
        tasks.clear();

    for (JsonObjectConst obj : array)
    {
        Task task;
        if (obj["id"].is<int>())
        {
            task.id = String(obj["id"].as<int>());
        }
        else
        {
            task.id = obj["id"].as<String>();
        }

        DEBUG_PRINTF("datos tarea id: %s, estatus: %s, id_dueno: %s, completadaPor: %s\n",
                     task.id.c_str(),
                     obj["estatus"].is<const char *>() ? obj["estatus"].as<const char *>() : "null",
                     obj["id_dueno"].is<int>() ? String(obj["id_dueno"].as<int>()) : "null",
                     obj["completadaPor"].is<const char *>() ? obj["completadaPor"].as<const char *>() : "null");
                     
        if (AuthService::getCurrentEmployeeId() == obj["id_dueno"].as<String>() && !obj["completadaPor"].isNull() || obj["estatus"].as<String>() == "extra" && AuthService::getCurrentEmployeeId() == String(obj["id_dueno"].as<int>()))
        {
            task.status = "vencida";
        }
        else
        {
            task.status = obj["estatus"].is<const char *>() ? obj["estatus"].as<const char *>() : "";
        }

        task.name = obj["nombre"].as<String>();

        task.timeStart = obj["hora_ini"].is<const char *>() ? obj["hora_ini"].as<const char *>() : "";
        task.timeEnd = obj["hora_fin"].is<const char *>() ? obj["hora_fin"].as<const char *>() : "";
        task.type = isExtra ? "extra" : "tarea";

        if (isExtra)
            extraTasks.push_back(task);
        else
            tasks.push_back(task);
    }
    DEBUG_PRINTF("[TaskService] Parsed %u %s\n", (unsigned)(isExtra ? extraTasks.size() : tasks.size()), isExtra ? "extra tasks" : "tasks");
    return true;
}

const std::vector<Task> &TaskService::getTasks()
{
    return tasks;
}

const std::vector<Task> &TaskService::getExtraTasks()
{
    return extraTasks;
}
