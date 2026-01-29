#pragma once
#include <Arduino.h>

struct Task {
    String id;
    String name;
    String status; // "Pendiente", "En Progreso", "Completada"
    String timeStart;  // hora_inicio (ej: "15:45")
    String timeEnd;    // hora_fin (ej: "15:46")
    String type;   // "Tarea", "Extra"
    String employeeId;
};
