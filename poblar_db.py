"""
Script para poblar la base de datos con usuarios y tareas de ejemplo
"""

import sqlite3
from datetime import datetime, timedelta


def poblar_base_datos():
    """Crea usuarios y tareas de ejemplo en la base de datos"""
    
    db_path = "relojes.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("=" * 60)
        print("POBLANDO BASE DE DATOS")
        print("=" * 60)
        
        # ==================== CREAR USUARIOS ====================
        
        # Usuario 1: Adrian
        cursor.execute('SELECT id FROM usuarios WHERE username = ?', ('adrian',))
        if cursor.fetchone():
            print("⚠️  Usuario 'adrian' ya existe")
            cursor.execute('SELECT id FROM usuarios WHERE username = ?', ('adrian',))
            adrian_id = cursor.fetchone()[0]
        else:
            cursor.execute('''
                INSERT INTO usuarios (nombre, username, contraseña, pin, rol, puesto, imagen)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', ('Adrian', 'adrian', '123456', 1001, 'empleado', 'Developer', None))
            adrian_id = cursor.lastrowid
            print(f"✅ Usuario 'Adrian' creado con ID {adrian_id}")
        
        # Usuario 2: David
        cursor.execute('SELECT id FROM usuarios WHERE username = ?', ('david',))
        if cursor.fetchone():
            print("⚠️  Usuario 'david' ya existe")
            cursor.execute('SELECT id FROM usuarios WHERE username = ?', ('david',))
            david_id = cursor.fetchone()[0]
        else:
            cursor.execute('''
                INSERT INTO usuarios (nombre, username, contraseña, pin, rol, puesto, imagen)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', ('David', 'david', '123456', 1002, 'empleado', 'Developer', None))
            david_id = cursor.lastrowid
            print(f"✅ Usuario 'David' creado con ID {david_id}")
        
        conn.commit()
        
        # ==================== CREAR TAREAS PARA ADRIAN ====================
        # Tareas completadas en la semana pasada
        
        hoy = datetime.now()
        semana_pasada = hoy - timedelta(days=7)
        
        # Lunes de la semana pasada
        lunes_pasado = semana_pasada - timedelta(days=semana_pasada.weekday())
        martes_pasado = lunes_pasado + timedelta(days=1)
        
        print(f"\n📅 Creando tareas para Adrian (semana pasada)...")
        
        # Tarea 1 de Adrian - Lunes pasado
        cursor.execute('''
            INSERT INTO tareas_semana (nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, disponible_para_rol)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            'Desarrollar módulo de login',
            'Implementar autenticación de usuarios',
            adrian_id,
            '09:00',
            '12:00',
            lunes_pasado.strftime('%Y-%m-%d'),
            10,
            3,  # Completada
            'empleado'
        ))
        print(f"   ✅ Tarea 1: 'Desarrollar módulo de login' - {lunes_pasado.strftime('%Y-%m-%d')} (Completada)")
        
        # Tarea 2 de Adrian - Martes pasado
        cursor.execute('''
            INSERT INTO tareas_semana (nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, disponible_para_rol)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            'Revisar código del frontend',
            'Code review y optimizaciones',
            adrian_id,
            '14:00',
            '17:00',
            martes_pasado.strftime('%Y-%m-%d'),
            8,
            3,  # Completada
            'empleado'
        ))
        print(f"   ✅ Tarea 2: 'Revisar código del frontend' - {martes_pasado.strftime('%Y-%m-%d')} (Completada)")
        
        # ==================== CREAR HISTORIAL PARA ADRIAN ====================
        # Registrar las tareas completadas en el historial
        
        print(f"\n📊 Creando historial para Adrian...")
        
        cursor.execute('''
            INSERT INTO historial (nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, disponible_para_rol)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('Desarrollar módulo de login', 'Implementar autenticación de usuarios', adrian_id, '09:00', '12:00', lunes_pasado.strftime('%Y-%m-%d'), 10, '3', 'empleado'))
        print(f"   ✅ Historial: {lunes_pasado.strftime('%Y-%m-%d')} - Tarea completada")
        
        cursor.execute('''
            INSERT INTO historial (nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, disponible_para_rol)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('Revisar código del frontend', 'Code review y optimizaciones', adrian_id, '14:00', '17:00', martes_pasado.strftime('%Y-%m-%d'), 8, '3', 'empleado'))
        print(f"   ✅ Historial: {martes_pasado.strftime('%Y-%m-%d')} - Tarea completada")
        
        # ==================== CREAR TAREAS PARA DAVID ====================
        # Tareas para esta semana
        
        print(f"\n📅 Creando tareas para David (semana actual)...")
        
        # Calcular días de esta semana
        hoy_weekday = hoy.weekday()
        lunes_actual = hoy - timedelta(days=hoy_weekday)
        miercoles_actual = lunes_actual + timedelta(days=2)
        
        # Tarea 1 de David - Lunes actual
        cursor.execute('''
            INSERT INTO tareas_semana (nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, disponible_para_rol)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            'Implementar API de usuarios',
            'Crear endpoints REST para gestión de usuarios',
            david_id,
            '10:00',
            '13:00',
            lunes_actual.strftime('%Y-%m-%d'),
            12,
            2,  # En progreso
            'empleado'
        ))
        print(f"   ✅ Tarea 1: 'Implementar API de usuarios' - {lunes_actual.strftime('%Y-%m-%d')} (En progreso)")
        
        # Tarea 2 de David - Miércoles actual
        cursor.execute('''
            INSERT INTO tareas_semana (nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, disponible_para_rol)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            'Documentar funciones principales',
            'Agregar documentación técnica al código',
            david_id,
            '15:00',
            '18:00',
            miercoles_actual.strftime('%Y-%m-%d'),
            6,
            1,  # Sin iniciar
            'empleado'
        ))
        print(f"   ✅ Tarea 2: 'Documentar funciones principales' - {miercoles_actual.strftime('%Y-%m-%d')} (Sin iniciar)")
        
        # ==================== CREAR HISTORIAL PARA DAVID ====================
        
        print(f"\n📊 Creando historial para David...")
        
        cursor.execute('''
            INSERT INTO historial (nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, disponible_para_rol)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('Implementar API de usuarios', 'Crear endpoints REST para gestión de usuarios', david_id, '10:00', '13:00', lunes_actual.strftime('%Y-%m-%d'), 12, '2', 'empleado'))
        print(f"   ✅ Historial: {lunes_actual.strftime('%Y-%m-%d')} - Tarea en progreso")
        
        conn.commit()
        
        # ==================== RESUMEN ====================
        
        print("\n" + "=" * 60)
        print("RESUMEN")
        print("=" * 60)
        
        cursor.execute('SELECT COUNT(*) FROM usuarios WHERE rol = "empleado"')
        total_empleados = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM tareas_semana')
        total_tareas = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM historial')
        total_historial = cursor.fetchone()[0]
        
        print(f"👥 Total empleados: {total_empleados}")
        print(f"📋 Total tareas: {total_tareas}")
        print(f"📊 Total registros de historial: {total_historial}")
        
        print("\n✅ Base de datos poblada exitosamente!")
        print("=" * 60)
        
        print("\n🔐 CREDENCIALES DE ACCESO:")
        print(f"   Usuario: adrian | Contraseña: 123456 | PIN: 1001")
        print(f"   Usuario: david  | Contraseña: 123456 | PIN: 1002")
        print("=" * 60)
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"❌ Error de base de datos: {e}")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")


if __name__ == "__main__":
    poblar_base_datos()
