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
    static void addTask(const Task& task);
    static bool parseTasks(const JsonDocument& doc);
    static bool parseExtraTasks(const JsonDocument& doc);
    static const std::vector<Task>& getTasks();
    static const std::vector<Task>& getExtraTasks();
    static void updateTaskStatus(String taskId, String newStatus);
};
