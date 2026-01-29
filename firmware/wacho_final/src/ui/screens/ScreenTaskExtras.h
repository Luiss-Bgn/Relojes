#pragma once
#include <lvgl.h>
#include "../../model/Task.h"
#include <vector>

class ScreenTaskExtras {
public:
    static void init(lv_obj_t* parent);
    static void show();
    static void hide();
    static void updateTasks(const std::vector<Task>& tasks);
    
private:
    static lv_obj_t* screen;
    static lv_obj_t* listContainer;
    static lv_obj_t* popup;
    static void createTaskItem(lv_obj_t* parent, const Task& task);
    static void onBackClicked(lv_event_t* e);
    static void onTaskClicked(lv_event_t* e);
    static void showTaskPopup(const Task& task);
};
