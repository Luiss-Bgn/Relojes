# Documentación Técnica - Firmware Wacho Final (Etapa 5)

## 1. Visión General
Este documento describe la arquitectura y funcionamiento del firmware para el T-Watch S3 ("Wacho Final") hasta la implementación de la Etapa 5. El sistema ha sido reescrito para ser modular, eficiente y fácil de mantener, separando claramente la lógica de negocio, la interfaz de usuario y el manejo de hardware.

---

## 2. Arquitectura del Sistema

El sistema sigue un patrón de diseño modular donde `AppManager` actúa como el orquestador central.

### Módulos Principales
*   **AppManager**: Máquina de estados central. Recibe mensajes de red y decide qué pantalla mostrar o qué acción ejecutar.
*   **TaskService**: Gestor de datos en memoria. Mantiene los vectores de tareas y tareas extras.
*   **UIManager**: Controlador de la interfaz gráfica (LVGL). Administra las transiciones entre pantallas.
*   **NetworkService**: Capa de comunicación (WiFi + WebSocket).
*   **Hal (Hardware Abstraction Layer)**: Interfaz con el hardware físico (Pantalla, Touch, Motor de Vibración).
*   **PowerManager**: Gestor de consumo energético.

---

## 3. Flujo de Datos y Gestión de Tareas

El sistema maneja dos tipos de listas de tareas de forma independiente. Esto asegura que la actualización de una no afecte a la otra.

### 3.1 Estructura de Datos (`TaskService`)
El servicio mantiene dos vectores separados en memoria RAM:
```cpp
std::vector<Task> tasks;      // Tareas Normales (Pendientes)
std::vector<Task> extraTasks; // Tareas Extras
```

### 3.2 Actualización de Tareas Normales
1.  **Evento**: El servidor envía un JSON con la clave `"tareas no completadas"`.
2.  **Procesamiento**: Se invoca `TaskService::parseTasks(doc)`.
3.  **Acción**:
    *   Se limpia **SOLAMENTE** el vector `tasks`.
    *   Se llena con los nuevos datos.
    *   El vector `extraTasks` permanece intacto.
4.  **UI**: Se actualiza `ScreenTaskList`.

### 3.3 Actualización de Tareas Extras
1.  **Evento**: El servidor envía un JSON con `"tareas no completadas"` Y el campo `"Comando": "TareasExtras"`.
2.  **Procesamiento**: `AppManager` detecta el comando y llama a `TaskService::parseExtraTasks(doc)`.
3.  **Acción**:
    *   Se limpia **SOLAMENTE** el vector `extraTasks`.
    *   Se llena con los nuevos datos.
    *   El vector `tasks` permanece intacto.
4.  **UI**: Se actualiza `ScreenTaskExtras`.

> **Nota Importante**: La función `clearTasks()` existe en el código pero no se utiliza en el flujo normal de actualización, garantizando que no haya borrados accidentales de listas cruzadas.

---

## 4. Ciclo de Vida y Estados (`AppManager`)

El reloj opera bajo una máquina de estados finitos:

1.  **INIT**: Inicialización de hardware y servicios.
2.  **WIFI_CONNECTING**: Intentando conectar al AP configurado.
3.  **SERVER_CONNECTING**: Intentando abrir conexión WebSocket con el servidor.
4.  **WAITING_UUID**: (Solo primera vez) Esperando asignación de ID único.
5.  **EMPLOYEE_SELECTION**: Mostrando lista de empleados para login.
6.  **TASK_LIST**: Pantalla principal de tareas pendientes.
7.  **EXTRAS_LIST**: Pantalla secundaria de tareas extras.

---

## 5. Gestión de Energía (`PowerManager`)

Para optimizar la batería del T-Watch S3, se implementó un sistema de gestión basado en inactividad (tiempo sin tocar la pantalla).

| Estado | Tiempo Inactividad | Comportamiento | Consumo |
| :--- | :--- | :--- | :--- |
| **Activo** | 0 - 10 seg | Brillo Máximo, CPU 240MHz. | Alto |
| **Atenuado** | 10 - 30 seg | Brillo 10% (20/255). CPU 240MHz. | Medio |
| **Suspensión** | > 30 seg | Pantalla OFF. CPU 80MHz. WiFi ON. | Bajo |

*   **Despertar**: Cualquier toque en la pantalla restaura inmediatamente el estado **Activo**.
*   **Conectividad**: El WiFi se mantiene activo incluso en suspensión para recibir notificaciones y vibraciones en tiempo real.

---

## 6. Hardware y Feedback (`Hal`)

### Vibración Háptica
Se utiliza el controlador DRV2605 integrado.
*   **Modo**: Real-time Playback (Mode 5).
*   **Funcionalidad**: Permite patrones de vibración personalizados enviados por el servidor (ej. `{"vibrar": 100, "veces": 3}`).
*   **Implementación**: `Hal::vibratePattern` ejecuta un bucle de encendido/apagado del motor respetando la intensidad y repeticiones solicitadas.

### Pantalla
*   **Driver**: LVGL 8.x.
*   **Resolución**: 240x240.
*   **Estilo**: Fondo negro, items transparentes, tipografía Montserrat 20 para legibilidad.
