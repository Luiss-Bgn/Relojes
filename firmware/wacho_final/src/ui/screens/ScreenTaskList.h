#pragma once
#include <lvgl.h>
#include "../../model/Task.h"
#include <vector>

class ScreenTaskList {
public:
    static void init(lv_obj_t* parent);
    static void show();
    static void hide();
    static void updateTasks(const std::vector<Task>& tasks);
    static void setExtrasButtonVisible(bool visible);
    
private:
    static lv_obj_t* screen;
    static lv_obj_t* listContainer;
    static lv_obj_t* btnExtras;
    static lv_obj_t* lblTitle;
    static lv_obj_t* popup;
    static lv_obj_t* createTaskItem(lv_obj_t* parent, const Task& task);
    static void onExtrasClicked(lv_event_t* e);
    static void onTaskClicked(lv_event_t* e);
    static void showTaskPopup(const Task& task);
    static const char* getCurrentEmployeeName();
};
