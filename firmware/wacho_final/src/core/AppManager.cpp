#include "AppManager.h"
#include "../config/SystemConfig.h"
#include "../services/Hal.h"
#include "../services/NetworkService.h"
#include "../services/AuthService.h"
#include "../services/TaskService.h"
#include "../core/ConfigService.h"
#include "../ui/UIManager.h"
#include "../ui/screens/ScreenEmployeeSel.h" // Need this for callback
#include "PowerManager.h"
#include <ArduinoJson.h>

AppState AppManager::currentState = AppState::INIT;

void AppManager::setup()
{
    Hal::init();
    PowerManager::init();
    NetworkService::init();
    AuthService::init();
    UIManager::init();

    NetworkService::onMessage(processMessage);
    ScreenEmployeeSel::setCallback(onEmployeeSelected);

    changeState(AppState::INIT);
}

void AppManager::loop()
{
    Hal::update();
    PowerManager::update();
    NetworkService::update();

    // Simple State Machine
    switch (currentState)
    {
    case AppState::INIT:
        changeState(AppState::WIFI_CONNECTING);
        break;

    case AppState::WIFI_CONNECTING:
        if (NetworkService::isWifiConnected())
        {
            changeState(AppState::SERVER_CONNECTING);
        }
        break;

    case AppState::SERVER_CONNECTING:
        if (NetworkService::isServerConnected())
        {
            if (AuthService::hasUUID())
            {
                // Send Login packet
                JsonDocument doc;
                doc["tipo"] = "relojes";
                doc["comando"] = "inicio";
                doc["uuid"] = AuthService::getUUID();

                String output;
                serializeJson(doc, output);
                NetworkService::send(output);

                changeState(AppState::EMPLOYEE_SELECTION);
            }
            else
            {
                // Send Register packet
                JsonDocument doc;
                doc["tipo"] = "relojes";
                doc["comando"] = "registro";

                String output;
                serializeJson(doc, output);
                NetworkService::send(output);

                changeState(AppState::WAITING_UUID);
            }
        }
        else if (!NetworkService::isWifiConnected())
        {
            changeState(AppState::WIFI_CONNECTING);
        }
        break;

    default:
        // Handle disconnection in other states
        if (!NetworkService::isWifiConnected())
        {
            changeState(AppState::WIFI_CONNECTING);
        }
        else if (!NetworkService::isServerConnected())
        {
            changeState(AppState::SERVER_CONNECTING);
        }
        break;
    }
}

void AppManager::changeState(AppState newState)
{
    if (currentState == newState)
        return;

    DEBUG_PRINTF("[App] State change: %d -> %d\n", (int)currentState, (int)newState);
    currentState = newState;
    UIManager::showScreenForState(newState);
}

AppState AppManager::getState()
{
    return currentState;
}

void AppManager::processMessage(String message)
{
    DEBUG_PRINTLN("[App] Processing message...");

    JsonDocument doc;
    if (deserializeJson(doc, message))
    {
        DEBUG_PRINTLN("[App] JSON Error");
        return;
    }

    const char *comando = doc["comando"] | "";
    bool vibrarFlag = doc["vibrar"].is<bool>() && doc["vibrar"].as<bool>();
    bool handled = false;

    /* ===============================
       1️⃣ COMANDOS INMEDIATOS
       =============================== */

    if (strcmp(comando, "ping") == 0)
    {
        JsonDocument pong;
        pong["tipo"] = "relojes";
        pong["comando"] = "pong";
        pong["uuid"] = AuthService::getUUID();

        String out;
        serializeJson(pong, out);
        NetworkService::send(out);
        return; // ⚠️ ping no sigue procesando nada más
    }

    else if (strcmp(comando, "actualizar_hora") == 0)
    {
        if (Hal::updateClockFromJson(doc))
        {
            handled = true;
        }
    }

    else if (strcmp(comando, "update_tareas") == 0)
    {
        JsonDocument message;
        message["tipo"] = "relojes";
        message["comando"] = "actualizar_tareas";
        message["uuid"] = AuthService::getUUID();
        message["id"] = AuthService::getCurrentEmployeeId();

        String out;
        serializeJson(message, out);
        NetworkService::send(out);

        handled = true;
    }
    /* ===============================
       2️⃣ MENSAJES DEPENDIENTES DE ESTADO
       =============================== */

    if (currentState == AppState::WAITING_UUID && doc["uuid"].is<String>())
    {
        String newUuid = doc["uuid"].as<String>();
        ConfigService::setUUID(newUuid);

        DEBUG_PRINTLN("[App] UUID received: " + newUuid);

        JsonDocument login;
        login["tipo"] = "relojes";
        login["comando"] = "inicio";
        login["uuid"] = newUuid;

        String out;
        serializeJson(login, out);
        NetworkService::send(out);

        changeState(AppState::EMPLOYEE_SELECTION);
        handled = true;
    }

    /* ===============================
       3️⃣ PAYLOADS DE DATOS
       =============================== */

    if (doc["lista_usuarios"].is<JsonArray>())
    {
        if (AuthService::parseEmployees(doc["lista_usuarios"]))
        {
            UIManager::updateEmployeeList(AuthService::getEmployees());
            changeState(AppState::EMPLOYEE_SELECTION);
            handled = true;
        }
    }

    if (doc["tareas"].is<JsonArray>())
    {
        bool isExtra = strcmp(comando, "extras") == 0;

        if (TaskService::parseTasks(doc, isExtra))
        {
            if (isExtra)
            {
                UIManager::updateExtrasList(TaskService::getExtraTasks());
            }
            else
            {
                UIManager::updateTaskList(TaskService::getTasks());
                if (currentState == AppState::EMPLOYEE_SELECTION)
                {
                    changeState(AppState::TASK_LIST);
                }
            }

            UIManager::setExtrasButtonVisible(!TaskService::getExtraTasks().empty());
            handled = true;
        }
    }

    /* ===============================
       4️⃣ EFECTOS (NO LÓGICA)
       =============================== */

    if (doc["vibrar"].is<int>())
    {
        int intensidad = doc["vibrar"].as<int>();
        int veces = doc["veces"] | 1;
        Hal::vibratePattern(intensidad, veces);
        handled = true;
    }

    if (handled && vibrarFlag)
    {
        Hal::vibratePattern(90, 1);
    }
}

void AppManager::onEmployeeSelected(String id, String name)
{
    DEBUG_PRINTLN("[App] Employee selected: " + id + " (" + name + ")");
    AuthService::login(id);

    // Send login to server
    JsonDocument doc;
    doc["tipo"] = "relojes";
    doc["comando"] = "empleado_seleccionado";
    doc["nombre"] = name;
    doc["id"] = id;
    doc["uuid"] = AuthService::getUUID();

    String output;
    serializeJson(doc, output);
    NetworkService::send(output);
}
