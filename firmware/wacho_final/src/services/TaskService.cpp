#include "TaskService.h"

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
        task.name = obj["tarea"].as<String>();
        task.status = obj["estado"].is<const char *>() ? obj["estado"].as<const char *>() : "";
        task.timeStart = obj["hora_inicio"].is<const char *>() ? obj["hora_inicio"].as<const char *>() : "";
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
