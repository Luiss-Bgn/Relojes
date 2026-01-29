#pragma once
#include <lvgl.h>

enum class ConnectionState {
    DISCONNECTED = 0,
    WIFI_CONNECTED = 1,
    SERVER_CONNECTED = 2
};

class ConnectionIndicator {
public:
    static void init(lv_obj_t* parent);
    static void setState(ConnectionState state);

private:
    static lv_obj_t* indicatorObj;
    static ConnectionState currentState;
};
