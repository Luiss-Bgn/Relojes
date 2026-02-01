# 🧪 Prueba de Validación - Crear Tareas

## ✅ Validaciones Implementadas

### 1️⃣ **Primera Capa de Validación** (crear_tarea.js)
Se ejecuta **ANTES** de llamar a `enviarTarea()`:

```javascript
✓ Nombre de tarea (obligatorio)
✓ Descripción (obligatoria)
✓ Hora de inicio (obligatoria)
✓ Puntaje entre 1-10 (obligatorio)
✓ Al menos 1 día seleccionado (obligatorio) ← NUEVA
```

### 2️⃣ **Segunda Capa de Validación** (crear_tarea_enviar.js)
Se ejecuta **DENTRO** de `enviarTarea()`:

```javascript
✓ ID de empleado válido
✓ Al menos 1 día seleccionado (doble verificación)
```

---

## 🔍 Pasos para Probar

### Caso 1: Sin seleccionar días
1. Abrir formulario de crear tarea
2. Llenar todos los campos (nombre, descripción, hora, puntaje)
3. **NO** seleccionar ningún día
4. Click en "Asignar Tarea"
5. **Resultado esperado:** Alert "⚠️ Debes seleccionar al menos un día..."

### Caso 2: Con al menos un día
1. Abrir formulario de crear tarea
2. Llenar todos los campos
3. Seleccionar al menos 1 día (ej: Lunes)
4. Click en "Asignar Tarea"
5. **Resultado esperado:** Tarea creada exitosamente

### Caso 3: Sin nombre
1. Abrir formulario de crear tarea
2. Dejar nombre vacío
3. Llenar otros campos y seleccionar días
4. Click en "Asignar Tarea"
5. **Resultado esperado:** Alert "⚠️ El nombre de la tarea es obligatorio."

---

## 🐛 Si sigue permitiendo crear sin días:

Verificar en Consola del Navegador (F12):
1. ¿Hay errores JavaScript?
2. ¿Se está llamando a `enviarTarea()`?
3. ¿La validación se ejecuta?

**Consola esperada:**
```
Si NO hay días seleccionados → Alert aparece, NO se ejecuta fetch
Si HAY días seleccionados → Fetch se ejecuta, tarea se crea
```

---

## 📝 Archivos Modificados

- ✅ `crear_tarea.js` - Validación en el evento click
- ✅ `crear_tarea_enviar.js` - Validación de seguridad

**Nota:** La validación está en AMBOS archivos por seguridad (doble capa).
