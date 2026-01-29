#pragma once
#include "../core/AppManager.h"
#include "../model/Employee.h"
#include "../model/Task.h"
#include "components/AppBar.h"
#include <vector>
#include <lvgl.h>

class UIManager {
public:
    static void init();
    static void showScreenForState(AppState state);
    static void updateEmployeeList(const std::vector<Employee>& employees);
    static void updateTaskList(const std::vector<Task>& tasks);
    static void updateExtrasList(const std::vector<Task>& tasks);
    static void setExtrasButtonVisible(bool visible);
    
    static lv_obj_t* getContentContainer();

private:
    static lv_obj_t* mainScreen;
    static lv_obj_t* contentContainer;
};
