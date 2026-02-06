"""
Script para corregir estatus en tareas_semana
Convierte camelCase y números a lowercase con underscore
"""

import sqlite3
from pathlib import Path

# Mapeo de conversión de estatus
MAPEO_ESTATUS = {
    # Números como string
    '1': 'sin_iniciar',
    '2': 'en_progreso',
    '3': 'completada',
    '4': 'vencida',
    '5': 'extra',
    # CamelCase
    'sinIniciar': 'sin_iniciar',
    'enProgreso': 'en_progreso',
    'noCompletada': 'vencida',
    # Con espacios
    'sin iniciar': 'sin_iniciar',
    'en progreso': 'en_progreso',
    'no completada': 'vencida',
    # Variaciones
    'completado': 'completada',
    'extras': 'extra',
}

def corregir_estatus():
    """Corrige todos los estatus en tareas_semana"""
    db_path = Path(__file__).parent / "relojes.db"
    
    if not db_path.exists():
        print(f"❌ Base de datos no encontrada en: {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Obtener todas las tareas
        cursor.execute("SELECT id, nombre, estatus FROM tareas_semana")
        tareas = cursor.fetchall()
        
        print(f"\n{'='*60}")
        print(f"CORRECCIÓN DE ESTATUS EN tareas_semana")
        print(f"{'='*60}\n")
        print(f"Total de tareas encontradas: {len(tareas)}\n")
        
        actualizadas = 0
        sin_cambios = 0
        
        for tarea in tareas:
            tarea_id = tarea['id']
            estatus_actual = tarea['estatus']
            nombre = tarea['nombre'][:30]  # Truncar para display
            
            # Determinar el estatus correcto
            estatus_nuevo = None
            
            # Buscar en el mapeo
            if estatus_actual in MAPEO_ESTATUS:
                estatus_nuevo = MAPEO_ESTATUS[estatus_actual]
            # Buscar case-insensitive
            elif estatus_actual.lower() in [k.lower() for k in MAPEO_ESTATUS.keys()]:
                for key, value in MAPEO_ESTATUS.items():
                    if key.lower() == estatus_actual.lower():
                        estatus_nuevo = value
                        break
            # Si ya está en formato correcto
            elif estatus_actual in ['sin_iniciar', 'en_progreso', 'completada', 'vencida', 'extra']:
                estatus_nuevo = estatus_actual  # Ya está correcto
            else:
                print(f"⚠️  ID {tarea_id}: '{estatus_actual}' no reconocido - se mantiene")
                sin_cambios += 1
                continue
            
            # Actualizar si es diferente
            if estatus_nuevo != estatus_actual:
                cursor.execute(
                    "UPDATE tareas_semana SET estatus = ? WHERE id = ?",
                    (estatus_nuevo, tarea_id)
                )
                print(f"✅ ID {tarea_id:3d}: '{estatus_actual:15s}' → '{estatus_nuevo:15s}' | {nombre}")
                actualizadas += 1
            else:
                sin_cambios += 1
        
        conn.commit()
        
        print(f"\n{'='*60}")
        print(f"RESUMEN:")
        print(f"  ✅ Actualizadas: {actualizadas}")
        print(f"  ⏭️  Sin cambios:  {sin_cambios}")
        print(f"  📊 Total:        {len(tareas)}")
        print(f"{'='*60}\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    corregir_estatus()
    print("✨ Script completado. Presiona Enter para salir...")
    input()
