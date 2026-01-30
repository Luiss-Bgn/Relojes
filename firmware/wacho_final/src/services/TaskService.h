#pragma once
#include <vector>
#include <ArduinoJson.h>
#include "../model/Task.h"
#include "../config/SystemConfig.h"

class TaskService {
private:
    static std::vector<Task> tasks;
    static std::vector<Task> extraTasks;

public:
    static void clearTasks();
    static bool parseTasks(const JsonDocument& doc,const bool isExtra);
    static const std::vector<Task>& getTasks();
    static const std::vector<Task>& getExtraTasks();
};
