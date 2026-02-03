# Endpoint: GET `/empleados-con-tareas`

## Purpose
Cargar lista completa de empleados con todas sus tareas asignadas, agrupadas por fecha. Usado por el frontend para construir la tabla de actividades, aplicar filtros por rol y detectar tareas disponibles para completar como extras.

## Request
- **Method**: GET
- **Path**: `/empleados-con-tareas`
- **Query Parameters**: Ninguno (se puede agregar cache: 'no-store')
- **Body**: Ninguno

## Response Structure

### Success (200)
Array de objetos empleado con estructura anidada:

```json
[
  {
    "id": 1,
    "nombre": "Luis García",
    "username": "luis.garcia",
    "role": "admin",
    "role_dp": "admin",
    "puesto": "Administrador",
    "imagen": "luis_garcia.jpg",
    "tareas_asignadas": {
      "2026-02-01": [
        {
          "id": 101,
          "nombre": "Revisión de reportes",
          "descripcion": "Revisar reportes diarios",
          "hora": "09:00",
          "hora_fin": "10:00",
          "puntaje": 5,
          "estatus": 3,
          "esExtra": false,
          "tareaOriginalId": null,
          "fecha_inicio": "2026-02-01T09:00:00",
          "disponible_para_rol": "todos"
        }
      ],
      "2026-02-02": [...]
    }
  }
]
```

## Data Structure Details

### Empleado Object
```javascript
{
  id: number,                    // ID único
  nombre: string,                // Nombre completo
  username: string,              // Usuario para login
  role: string,                  // Rol sistema (admin, supervisor, empleado)
  role_dp: string,               // Rol departamental (operario, supervisor, etc)
  puesto: string,                // Puesto laboral
  imagen: string,                // Nombre archivo imagen
  tareas_asignadas: {            // Tareas agrupadas por fecha YYYY-MM-DD
    [fechaKey]: Tarea[]
  }
}
```

### Tarea Object
```javascript
{
  id: number,                    // ID único de la tarea
  nombre: string,                // Nombre de la actividad
  descripcion: string,           // Descripción detallada
  hora: "HH:MM",                 // Hora inicio
  hora_fin: "HH:MM",             // Hora fin
  puntaje: 0-10,                 // Puntos asignados
  estatus: 1|2|3|4|5,            // Estado de la tarea
  esExtra: boolean,              // ¿Es tarea extra?
  tareaOriginalId: number|null,  // ID tarea original (si esExtra=true)
  tarea_original_id: number|null,// Alias para compatibilidad
  fecha_completado: ISO_DATE|null, // Cuándo se completó como extra
  empleado_original_id: number|null, // ID dueño original
  empleado_original_nombre: string|null, // Nombre dueño original
  fecha_inicio: ISO_DATE,        // Fecha/hora creación
  disponible_para_rol: string    // "todos" | "supervisores" | "operarios"
}
```

## Estados (estatus)

| Valor | Nombre | Color UI | Significado |
|-------|--------|----------|------------|
| 1 | En Progreso | Amarillo | Tarea en curso |
| 2 | Sin Iniciar | Gris | No comenzada |
| 3 | Completada | Verde | Finalizada exitosamente |
| 4 | No Completada | Rojo | Vencida sin completar |
| 5 | Extra | Azul Fuerte | Tarea extra completada por otro |

## Frontend Usage

### 1. Inicialización
```javascript
const resp = await fetch('/empleados-con-tareas');
const allEmpleados = await resp.json();
```

### 2. Filtrado por Rol
```javascript
const userRole = loggedUser.role?.toLowerCase() || 'visitante';
state.trabajadores = allEmpleados.filter(emp => {
  const empRole = emp.role?.toLowerCase() || 'empleado';
  
  // Admin nunca aparece
  if (empRole === 'admin') return false;
  
  // Visitante/Empleado: solo ven empleados
  if (userRole === 'visitante' || userRole === 'empleado') {
    return empRole === 'empleado';
  }
  
  // Supervisor/Admin: ven empleados + supervisores
  return empRole === 'empleado' || empRole === 'supervisor';
});
```

### 3. Construcción de Caché
```javascript
// Tareas agrupadas por día de semana
state.activitiesByDay = new Map();
const diasSemana = ["domingo", "lunes", "martes", ...];

empleados.forEach(emp => {
  for (const [fechaKey, tareas] of Object.entries(emp.tareas_asignadas || {})) {
    const fecha = new Date(fechaKey);
    const diaSemana = diasSemana[fecha.getDay()];
    // Construir actividades por día
  }
});
```

### 4. Acceso a Tareas de un Día
```javascript
// Opción A: Por fecha YYYY-MM-DD
const tareasDelDia = empleado.tareas_asignadas['2026-02-01'] || [];

// Opción B: Por nombre día (necesita conversión)
const dayName = 'lunes';
const tareasDelDia = empleado.tareas_asignadas[fechaKey] || [];
```

## Key Points

### Fechas
- **Clave**: YYYY-MM-DD (ISO date format)
- NO se usan nombres de días como clave
- El frontend convierte índice de día (0-6) a fecha para acceder

### Tareas Extras
- Tienen `esExtra: true`
- Referencian tarea original con `tareaOriginalId`
- Se almacenan junto con tareas normales del empleado que las completó
- Estatus siempre es 5

### Roles
- **role**: Para filtrado general del sistema
- **role_dp**: Para validar si puede completar tareas con `disponible_para_rol`
- Puede haber diferencias entre ambos campos

### Imagen
- Campo opcional, ruta relativa: `/web/Images/{imagen}`
- Fallback a avatar si no existe

## Backend Responsibilities

1. ✅ Retornar TODOS los empleados excepto admin (o admin solo si es el logueado)
2. ✅ Incluir todas las tareas asignadas del empleado
3. ✅ Agrupar tareas por fecha YYYY-MM-DD
4. ✅ Incluir tareas extras completadas (estatus 5)
5. ✅ Mantener sincronía con base de datos de tareas
6. ✅ No incluir contraseñas en la respuesta

## Error Handling

### 404 - Not Found
```json
{
  "detail": "No hay empleados registrados"
}
```

### 500 - Server Error
```json
{
  "detail": "Error al obtener empleados con tareas"
}
```

## Performance Considerations

- Esta ruta se llama:
  - Al cargar la página (`init()`)
  - Cada 1 segundo en auto-refresh (`checkForUpdates()`)
  - Al completar tareas
  - Después de cambios en empleados
- **CRÍTICO**: Implementar caché eficiente o índices en BD para optimizar

## Testing Examples

### Caso 1: Admin listando todos
```bash
curl -X GET http://localhost:8000/empleados-con-tareas
# Retorna: [admin, supervisor, empleados...] - NO incluye otros admins
```

### Caso 2: Empleado filtrando
```bash
# Frontend filtra automáticamente después de recibir
# Solo verá sus compañeros empleados, no supervisores
```

### Caso 3: Acceder a tarea específica
```javascript
const emp = empleados[0];
const tareasHoy = emp.tareas_asignadas['2026-02-01'];
const tarea = tareasHoy.find(t => t.id === 101);
```
