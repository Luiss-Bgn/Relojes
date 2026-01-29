#include "UIManager.h"
#include "screens/ScreenLogin.h"
#include "screens/ScreenEmployeeSel.h"
#include "screens/ScreenTaskList.h"
#include "screens/ScreenTaskExtras.h"
#include "components/AppBar.h"
#include <Arduino.h>

lv_obj_t* UIManager::mainScreen = nullptr;
lv_obj_t* UIManager::contentContainer = nullptr;

void UIManager::init() {
    // Initialize Theme (Dark Mode)
    lv_disp_t *dispp = lv_disp_get_default();
    lv_theme_t *theme = lv_theme_default_init(dispp,
                                              lv_palette_main(LV_PALETTE_BLUE),
                                              lv_palette_main(LV_PALETTE_RED),
                                              true, // Dark mode
                                              LV_FONT_DEFAULT);
    lv_disp_set_theme(dispp, theme);

    // Create Main Screen
    mainScreen = lv_obj_create(NULL);
    lv_obj_clear_flag(mainScreen, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_set_style_bg_color(mainScreen, lv_color_black(), 0);
    
    // Create Appbar
    AppBar::init(mainScreen);
    
    // Create Content Container
    contentContainer = lv_obj_create(mainScreen);
    lv_obj_set_size(contentContainer, 240, 220); // 240 - 20 (appbar)
    lv_obj_align(contentContainer, LV_ALIGN_BOTTOM_MID, 0, 0);
    lv_obj_set_style_bg_color(contentContainer, lv_color_black(), 0);
    lv_obj_set_style_border_width(contentContainer, 0, 0);
    lv_obj_set_style_pad_all(contentContainer, 0, 0);
    
    // Initialize Screens
    ScreenLogin::init(contentContainer);
    ScreenEmployeeSel::init(contentContainer);
    ScreenTaskList::init(contentContainer);
    ScreenTaskExtras::init(contentContainer);
    
    lv_scr_load(mainScreen);
}

lv_obj_t* UIManager::getContentContainer() {
    return contentContainer;
}

void UIManager::showScreenForState(AppState state) {
    Serial.printf("UIManager::showScreenForState: %d\n", (int)state);
    
    // Hide all first
    ScreenLogin::hide();
    ScreenEmployeeSel::hide();
    ScreenTaskList::hide();
    ScreenTaskExtras::hide();
    
    switch (state) {
        case AppState::WAITING_UUID:
            ScreenLogin::show();
            break;
            
        case AppState::EMPLOYEE_SELECTION:
            ScreenEmployeeSel::show();
            break;

        case AppState::TASK_LIST:
            ScreenTaskList::show();
            break;

        case AppState::EXTRAS_LIST:
            ScreenTaskExtras::show();
            break;
            
        default:
            break;
    }
}

void UIManager::updateEmployeeList(const std::vector<Employee>& employees) {
    ScreenEmployeeSel::updateList(employees);
}

void UIManager::updateTaskList(const std::vector<Task>& tasks) {
    ScreenTaskList::updateTasks(tasks);
}

void UIManager::updateExtrasList(const std::vector<Task>& tasks) {
    ScreenTaskExtras::updateTasks(tasks);
}

void UIManager::setExtrasButtonVisible(bool visible) {
    ScreenTaskList::setExtrasButtonVisible(visible);
}
