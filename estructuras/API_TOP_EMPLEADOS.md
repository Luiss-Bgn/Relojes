# API Top Empleados - Documentación

## 📋 Descripción

Esta API permite obtener el top de empleados con mayor puntaje en tareas regulares, excluyendo tareas con estatus '5' o 'extra'. Soporta tres modos de consulta: histórico general, por quincena, y por rango de fechas personalizado.

## 🔗 Endpoint

```
GET /historial/top-empleados
```

## 📅 Patrón de Quincenas

Las quincenas siguen un patrón específico de 15 días:

### Q1 (Primera Quincena)
Del día **28 del mes anterior** al día **12 del mes actual**

**Ejemplos:**
- Q1 Enero: 28 de Diciembre al 12 de Enero
- Q1 Febrero: 28 de Enero al 12 de Febrero
- Q1 Marzo: 28 de Febrero al 12 de Marzo

### Q2 (Segunda Quincena)
Del día **13 al 27 del mes actual**

**Ejemplos:**
- Q2 Enero: 13 de Enero al 27 de Enero
- Q2 Febrero: 13 de Febrero al 27 de Febrero
- Q2 Marzo: 13 de Marzo al 27 de Marzo

## 🎯 Modos de Uso

### 1. Histórico General
Obtiene el top de empleados de todos los tiempos (sin filtro de fecha).

**Ejemplo:**
```http
GET /historial/top-empleados?limite=10
```

**Respuesta:**
```json
{
  "status": "success",
  "periodo": "Histórico general",
  "fecha_inicio": null,
  "fecha_fin": null,
  "top_empleados": [
    {
      "posicion": 1,
      "usuario_id": 5,
      "nombre": "Juan Pérez",
      "total_puntos": 1500,
      "total_tareas": 45
    },
    {
      "posicion": 2,
      "usuario_id": 3,
      "nombre": "María González",
      "total_puntos": 1350,
      "total_tareas": 40
    }
  ],
  "total": 10
}
```

### 2. Por Quincena
Filtra los empleados por una quincena específica.

**Parámetros requeridos:**
- `año`: Año de la quincena
- `mes`: Mes de la quincena (1-12)
- `quincena`: Número de quincena (1 o 2)

**Ejemplo - Q2 de Enero 2026:**
```http
GET /historial/top-empleados?año=2026&mes=1&quincena=2&limite=10
```

**Ejemplo - Q1 de Febrero 2026:**
```http
GET /historial/top-empleados?año=2026&mes=2&quincena=1&limite=10
```

**Respuesta:**
```json
{
  "status": "success",
  "periodo": "Q2 Enero 2026",
  "fecha_inicio": "2026-01-13",
  "fecha_fin": "2026-01-27",
  "top_empleados": [
    {
      "posicion": 1,
      "usuario_id": 5,
      "nombre": "Juan Pérez",
      "total_puntos": 250,
      "total_tareas": 8
    }
  ],
  "total": 10
}
```

### 3. Rango de Fechas Personalizado
Permite especificar un rango de fechas arbitrario.

**Parámetros:**
- `fecha_inicio`: Fecha de inicio (formato YYYY-MM-DD)
- `fecha_fin`: Fecha de fin (formato YYYY-MM-DD)

**Ejemplo - Todo enero 2026:**
```http
GET /historial/top-empleados?fecha_inicio=2026-01-01&fecha_fin=2026-01-31&limite=10
```

**Ejemplo - Última semana de enero:**
```http
GET /historial/top-empleados?fecha_inicio=2026-01-24&fecha_fin=2026-01-31&limite=5
```

## 📊 Parámetros de Query

| Parámetro | Tipo | Requerido | Descripción | Valores |
|-----------|------|-----------|-------------|---------|
| `limite` | int | No | Número de empleados a retornar | 1-100 (default: 10) |
| `año` | int | Condicional* | Año para filtro por quincena | Ejemplo: 2026 |
| `mes` | int | Condicional* | Mes para filtro por quincena | 1-12 |
| `quincena` | int | Condicional* | Número de quincena | 1 o 2 |
| `fecha_inicio` | string | No | Fecha de inicio personalizada | YYYY-MM-DD |
| `fecha_fin` | string | No | Fecha de fin personalizada | YYYY-MM-DD |

\* **Condicional**: Si se usa filtro por quincena, los tres parámetros (`año`, `mes`, `quincena`) son requeridos.

## ⚠️ Validaciones

1. **No se pueden mezclar modos**: No puedes combinar el filtro por quincena con rango de fechas personalizado.
   ```http
   # ❌ Error - Combina quincena con fechas
   GET /historial/top-empleados?año=2026&mes=1&quincena=2&fecha_inicio=2026-01-01
   ```

2. **Parámetros completos para quincena**: Si usas filtro por quincena, debes proporcionar año, mes y quincena.
   ```http
   # ❌ Error - Falta parámetro quincena
   GET /historial/top-empleados?año=2026&mes=1
   ```

3. **Límite válido**: El límite debe estar entre 1 y 100.
   ```http
   # ❌ Error - Límite fuera de rango
   GET /historial/top-empleados?limite=150
   ```

## 🎯 Filtros Aplicados

La API automáticamente **excluye**:
- Tareas con estatus `'5'`
- Tareas con estatus `'extra'`
- Tareas sin empleado asignado (`completadaPor IS NULL`)

Solo considera **tareas regulares completadas** por empleados.

## 📝 Ejemplos de Uso Práctico

### Obtener top 10 del mes actual (ejemplo: Febrero 2026)
```http
GET /historial/top-empleados?fecha_inicio=2026-02-01&fecha_fin=2026-02-28
```

### Comparar quincenas de Enero 2026
```http
# Primera quincena
GET /historial/top-empleados?año=2026&mes=1&quincena=1

# Segunda quincena
GET /historial/top-empleados?año=2026&mes=1&quincena=2
```

### Top 3 empleados del trimestre
```http
GET /historial/top-empleados?limite=3&fecha_inicio=2026-01-01&fecha_fin=2026-03-31
```

## 🔧 Integración con Frontend

Ejemplo JavaScript para llamar a la API:

```javascript
// Histórico general
async function obtenerTopEmpleadosHistorico(limite = 10) {
  const response = await fetch(`/historial/top-empleados?limite=${limite}`);
  return await response.json();
}

// Por quincena
async function obtenerTopEmpleadosQuincena(año, mes, quincena, limite = 10) {
  const url = `/historial/top-empleados?año=${año}&mes=${mes}&quincena=${quincena}&limite=${limite}`;
  const response = await fetch(url);
  return await response.json();
}

// Rango personalizado
async function obtenerTopEmpleadosRango(fechaInicio, fechaFin, limite = 10) {
  const url = `/historial/top-empleados?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&limite=${limite}`;
  const response = await fetch(url);
  return await response.json();
}

// Ejemplo de uso
const topQ2Enero = await obtenerTopEmpleadosQuincena(2026, 1, 2, 10);
console.log(topQ2Enero.top_empleados);
```

## 📈 Estructura de Respuesta

```typescript
interface TopEmpleadosResponse {
  status: "success" | "error";
  periodo: string;              // Descripción del periodo consultado
  fecha_inicio: string | null;  // Fecha de inicio del rango (YYYY-MM-DD)
  fecha_fin: string | null;     // Fecha de fin del rango (YYYY-MM-DD)
  top_empleados: Array<{
    posicion: number;           // Posición en el ranking (1-10)
    usuario_id: number;         // ID del usuario
    nombre: string;             // Nombre del empleado
    total_puntos: number;       // Suma total de puntos
    total_tareas: number;       // Cantidad de tareas completadas
  }>;
  total: number;                // Total de empleados retornados
  mensaje?: string;             // Mensaje de error (solo si status="error")
}
```

## 🚀 Casos de Uso

1. **Dashboard principal**: Mostrar top 10 histórico
2. **Análisis quincenal**: Comparar rendimiento entre quincenas
3. **Reportes mensuales**: Agregar datos de Q1 y Q2 de un mes
4. **Bonificaciones**: Calcular incentivos basados en puntaje quincenal
5. **Análisis de tendencias**: Comparar rendimiento entre periodos

## ⚙️ Implementación Técnica

### Base de datos
La función consulta la tabla `historial` y agrupa por `completadaPor`:
- Suma los puntos de tareas regulares
- Cuenta el número de tareas completadas
- Ordena por puntos descendente
- Retorna el top N empleados

### Optimización
- Usa índices en las columnas `completadaPor`, `fecha` y `estatus`
- Agrupa en la base de datos para eficiencia
- Enriquece con información de usuario en memoria

---

**Versión:** 1.0  
**Fecha:** Febrero 2026  
**Autor:** Sistema de Gestión de Relojes
