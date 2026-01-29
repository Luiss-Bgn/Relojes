#pragma once
#include <lvgl.h>
#include <vector>
#include "../../model/Employee.h"

class ScreenEmployeeSel {
public:
    static void init(lv_obj_t* parent);
    static void show();
    static void hide();
    static void updateList(const std::vector<Employee>& employees);
    
    typedef void (*SelectionCallback)(String id, String name);
    static void setCallback(SelectionCallback cb);

private:
    static void event_handler(lv_event_t* e);
    static void popup_event_handler(lv_event_t* e);
    static void createConfirmationPopup(const char* name);
    
    static lv_obj_t* screen;
    static lv_obj_t* listContainer;
    static lv_obj_t* popup; // Reference to the active popup
    static SelectionCallback callback;
    static String tempSelectedId;
    static String tempSelectedName;
};