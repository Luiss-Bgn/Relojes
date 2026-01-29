#pragma once
#include <Arduino.h>

enum class AppState {
    INIT,
    WIFI_CONNECTING,
    SERVER_CONNECTING,
    WAITING_UUID,
    EMPLOYEE_SELECTION,
    TASK_LIST,
    EXTRAS_LIST
};

class AppManager {
public:
    static void setup();
    static void loop();
    static void changeState(AppState newState);
    static AppState getState();
    static void onEmployeeSelected(String id, String name);

private:
    static void processMessage(String message);
    static AppState currentState;
};
