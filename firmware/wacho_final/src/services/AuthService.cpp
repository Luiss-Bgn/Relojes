#include "AuthService.h"
#include "../core/ConfigService.h"
#include "../config/SystemConfig.h"

std::vector<Employee> AuthService::employees;
String AuthService::currentEmployeeId = "";

void AuthService::init() {
    ConfigService::init();
}

bool AuthService::hasUUID() {
    return ConfigService::getUUID().length() > 0;
}

String AuthService::getUUID() {
    return ConfigService::getUUID();
}

void AuthService::setEmployees(const std::vector<Employee>& list) {
    employees = list;
}

const std::vector<Employee>& AuthService::getEmployees() {
    return employees;
}

bool AuthService::parseEmployees(JsonArrayConst array) {
    DEBUG_PRINTLN("[Auth] Parsing employees from array...");
    employees.clear();
    DEBUG_PRINTF("[Auth] Array size: %d\n", array.size());
    
    for (JsonVariantConst v : array) {
        JsonObjectConst obj = v.as<JsonObjectConst>();
        if (obj.isNull()) {
            DEBUG_PRINTLN("[Auth] Skipping non-object employee entry");
            continue;
        }
        Employee emp;

        if (obj["nombre"].is<String>()) {
            emp.name = obj["nombre"].as<String>();
        }

        if (obj["id"].is<int>()) {
            emp.id = String(obj["id"].as<int>());
        } else if (obj["id"].is<String>()) {
            emp.id = obj["id"].as<String>();
        }

        if (emp.name.length() == 0) {
            DEBUG_PRINTLN("[Auth] Skipping employee without nombre");
            continue;
        }
        if (emp.id.length() == 0) {
            DEBUG_PRINTF("[Auth] Skipping employee without id (nombre=%s)\n", emp.name.c_str());
            continue;
        }

        DEBUG_PRINTF("[Auth] Parsed employee: %s (%s)\n", emp.name.c_str(), emp.id.c_str());
        employees.push_back(emp);
    }
    
    DEBUG_PRINTF("[Auth] Parsed %d employees\n", employees.size());
    return true;
}

void AuthService::login(String employeeId) {
    currentEmployeeId = employeeId;
    DEBUG_PRINTLN("[Auth] Logged in as: " + currentEmployeeId);
}

String AuthService::getCurrentEmployeeId() {
    return currentEmployeeId;
}

bool AuthService::isLoggedIn() {
    return currentEmployeeId.length() > 0;
}
