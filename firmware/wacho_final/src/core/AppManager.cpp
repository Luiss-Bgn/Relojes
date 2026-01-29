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
    DynamicJsonDocument doc(8192);
    DeserializationError error = deserializeJson(doc, message);

    if (error)
    {
        DEBUG_PRINTLN("[App] JSON Error");
        return;
    }

    // Manejar ping/pong (keep-alive)
    String pingCmd = doc["comando"].is<const char *>() ? String(doc["comando"].as<const char *>()) : "";

    if (pingCmd == "ping")
    {
        JsonDocument pong;
        pong["comando"] = "pong";
        String out;
        serializeJson(pong, out);
        NetworkService::send(out);
        return;
    }

    bool handledCommand = false;
    bool vibrar = doc["vibrar"].is<bool>() && doc["vibrar"].as<bool>();

    // Handle UUID reception
    if (currentState == AppState::WAITING_UUID && doc["uuid"].is<String>())
    {
        String newUuid = doc["uuid"].as<String>();
        ConfigService::setUUID(newUuid);
        DEBUG_PRINTLN("[App] UUID received and saved: " + newUuid);

        // Immediately login with new UUID without restart
        JsonDocument loginDoc;
        loginDoc["tipo"] = "relojes";
        loginDoc["comando"] = "inicio";
        loginDoc["uuid"] = newUuid;

        String output;
        serializeJson(loginDoc, output);
        NetworkService::send(output);

        changeState(AppState::EMPLOYEE_SELECTION);
        handledCommand = true;
    }

    // Handle Employee List
    if (doc["lista_usuarios"].is<JsonArray>())
    {
        DEBUG_PRINTLN("[App] Found lista_usuarios array");
        JsonArrayConst users = doc["lista_usuarios"];
        if (AuthService::parseEmployees(users))
        {
            DEBUG_PRINTLN("[App] Employees updated");
            UIManager::updateEmployeeList(AuthService::getEmployees());

            // If we were waiting for this, ensure we are in the right state
            if (currentState == AppState::SERVER_CONNECTING || currentState == AppState::EMPLOYEE_SELECTION)
            {
                changeState(AppState::EMPLOYEE_SELECTION);
            }
            handledCommand = true;
        }
        else
        {
            DEBUG_PRINTLN("[App] Failed to parse employees");
        }
    }
    else if (doc.containsKey("lista_usuarios"))
    {
        DEBUG_PRINTLN("[App] lista_usuarios exists but is NOT an array");
    }

    // Handle Task List
    JsonArrayConst tareasArr = doc["tareas"].as<JsonArrayConst>();

    if (!tareasArr.isNull())
    {
        String comando = doc["comando"].is<const char *>() ? String(doc["comando"].as<const char *>()) : "";
        comando.toLowerCase();

        bool isExtra = comando == "tareas_extras";

        if (isExtra)
        {
            if (TaskService::parseExtraTasks(doc))
            {
                DEBUG_PRINTLN("[App] Extra Tasks updated");
                UIManager::updateExtrasList(TaskService::getExtraTasks());
                UIManager::setExtrasButtonVisible(!TaskService::getExtraTasks().empty());
                handledCommand = true;
            }
            else
            {
                DEBUG_PRINTLN("[App] Failed to parse extra tasks");
            }
        }
        else
        {
            bool parsed = TaskService::parseTasks(doc);
            if (parsed)
            {
                DEBUG_PRINTLN("[App] Tasks updated");
                UIManager::updateTaskList(TaskService::getTasks());
            }
            else
            {
                DEBUG_PRINTLN("[App] Failed to parse tasks (forcing task screen)");
                TaskService::clearTasks();
                UIManager::updateTaskList(TaskService::getTasks());
            }
            // Mostrar/ocultar botón de extras según disponibilidad
            UIManager::setExtrasButtonVisible(!TaskService::getExtraTasks().empty());
            // Siempre pasar a TASK_LIST cuando llegan tareas normales, incluso si el parseo falla
            if (currentState == AppState::EMPLOYEE_SELECTION)
            {
                changeState(AppState::TASK_LIST);
            }
            handledCommand = true;
        }
    }

    // Handle Vibration
    if (doc["vibrar"].is<int>())
    {
        int intensity = doc["vibrar"].as<int>();
        int count = doc["veces"].is<int>() ? doc["veces"].as<int>() : 1;
        DEBUG_PRINTF("[App] Vibrating: %d, %d times\n", intensity, count);
        Hal::vibratePattern(intensity, count);
        handledCommand = true;
    }

    // Notificación condicional según hasChanges
    if (handledCommand && vibrar)
    {
        Hal::vibratePattern(90, 1); // Vibración corta para indicar cambio
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

