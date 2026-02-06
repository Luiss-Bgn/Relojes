# Estandarización de Estatus - Resumen de Cambios

## Problema Identificado
La aplicación utilizaba inconsistentemente estatus en diferentes formatos (camelCase vs lowercase con guion):
- `sinIniciar` vs `sin_iniciar`
- `enProgreso` vs `en_progreso`
- `noCompletada` vs `vencida`

## Estatus Estandarizados (Solo Lowercase con Guion)

```
sin_iniciar  → La tarea aún no ha comenzado
en_progreso  → La tarea está siendo ejecutada
completada   → La tarea ha sido completada
vencida      → La tarea no se completó en el tiempo establecido
extra        → Una tarea extra/adicional
```

## Cambios Realizados

### Backend (Python)

1. **database/db_tareas.py**
   - ❌ `estatus: str = "sinIniciar"` → ✅ `estatus: str = "sin_iniciar"`

2. **database/db_historial.py**
   - ❌ `estatus: str = "sinIniciar"` → ✅ `estatus: str = "sin_iniciar"`
   - ❌ SQL Query con estatus en camelCase → ✅ Convertido a lowercase

3. **backup_scheduler.py**
   - ❌ `estatus = 'sinIniciar'` → ✅ `estatus = 'sin_iniciar'` (en reseteo semanal)

4. **api/tareas/routes.py**
   - ❌ `"estatus": "enProgreso"` → ✅ `"estatus": "en_progreso"` (2 ubicaciones)

5. **funciones/relojes/relojes.py** ✅ Ya usa lowercase
   - Valida `!= "en_progreso"` 
   - Establece `estatus="completada"`

6. **funciones/tareas/tareas.py** ✅ Ya usa lowercase
   - Cambia automáticamente a `'en_progreso'` cuando es hora
   - Establece `'vencida'` después de hora_fin

### Frontend (JavaScript)

1. **web/Gestion/Editar Empleado/Crear tareas/crear_tarea_enviar.js**
   - ❌ `estatus: 'enProgreso'` → ✅ `estatus: 'en_progreso'` (default al crear)

2. **web/Informes/services/empleadosService.js**
   - ⚠️ Necesitaba mejora en normalización de estatus
   - Ahora normaliza con `.toLowerCase().replace(/\s+/g, '_')`
   - Maneja tanto strings como números (1-5) correctamente

3. **web/Informes/components/TareasPanel.js** ✅ Ya usa lowercase

4. **web/Informes/components/PromedioEmpleados.js** ✅ Ya usa lowercase

5. **web/Actividades/ui/renderTable.js** ✅ Ya usa lowercase

6. **web/Actividades/services/panelAdapter.js** ✅ Ya usa lowercase

### Tests

1. **testeo/test_historial.http**
   - ❌ Tenía comentario JSON inválido: `"completadaPor": 1 // ID del usuario` 
   - ✅ Comentario removido (JSON no soporta comentarios)
   - ❌ `"estatus": "sinIniciar"` → ✅ `"estatus": "sin_iniciar"`

## Error Reportado - Solución

**Error al actualizar registro 16:**
```json
{
  "detail": [{
    "type": "json_invalid",
    "loc": ["body", 24],
    "msg": "JSON decode error",
    "input": {},
    "ctx": {"error": "Expecting ',' delimiter"}
  }]
}
```

**Causa:** Comentario en JSON
```http
{
  "completadaPor": 1 // ID del usuario que la completo  ← ❌ INVÁLIDO
}
```

**Solución:** Remover comentario
```http
{
  "completadaPor": 1  ← ✅ CORRECTO
}
```

## Validación Completa

### ✅ Backend
- [x] Defaults consistentes con lowercase
- [x] SQL queries actualizadas
- [x] Comparaciones de estatus correctas
- [x] Funciones de actualización automática usan lowercase

### ✅ Frontend
- [x] Comparaciones de estatus usan lowercase
- [x] Normalizaciones de strings correctas
- [x] Mapeos numéricos (1-5) considerados
- [x] Comentarios de código actualizados

### ✅ Tests
- [x] JSON válido (sin comentarios)
- [x] Estatus en lowercase

## Cómo Verificar

En la terminal, ejecutar:
```bash
# Buscar si quedan estatus en camelCase (no debería encontrar nada)
grep -r "sinIniciar\|enProgreso\|noCompletada" . --include="*.py" --include="*.js"
```

Si el comando retorna vacío, ¡todos los cambios se han implementado correctamente!
