#pragma once
#include <Arduino.h>
#include <vector>
#include "../model/Employee.h"
#include <ArduinoJson.h>

class AuthService {
public:
    static void init();
    static bool hasUUID();
    static String getUUID();
    
    // Employee management
    static void setEmployees(const std::vector<Employee>& list);
    static const std::vector<Employee>& getEmployees();
    static bool parseEmployees(JsonArrayConst array);
    
    // Login
    static void login(String employeeId);
    static String getCurrentEmployeeId();
    static bool isLoggedIn();

private:
    static std::vector<Employee> employees;
    static String currentEmployeeId;
};
