from datetime import datetime, timedelta

from database.database import DatabaseManager
from database.db_usuarios import UsuarioManager
from database.db_tareas import TareasManager

# from .models import listar

db_manager = DatabaseManager("relojes.db")
usuario_manager = UsuarioManager(db_manager)
tareas_manager = TareasManager(db_manager)

async def construir_panel():

    try:
        empleados = usuario_manager.listar_usuarios()

        lista_empleados = {}

        for emp in empleados['usuarios']:
            lista_empleados[emp['id']] = {
                "id": emp['id'],
                "nombre": emp['nombre'],
                "username": emp['username'],
                "pin": emp['pin'],
                "rol": emp['rol'],
                "puesto": emp['puesto'],
                "imagen": emp.get('imagen', None),
                "tareas_asignadas": {}
            }
            lista_tareas = {}
            print(tareas_manager.listar_por_usuario(int(emp['id'])))
            for tarea in tareas_manager.listar_por_usuario(int(emp['id']))['registros']:
                lista_tareas.setdefault(tarea['fecha'], []).append({
                    "id": tarea['id'],
                    "nombre": tarea['nombre'],
                    "descripcion": tarea['descripcion'],
                    "id_dueño": int(emp['id']),
                    "hora_ini": tarea['hora_ini'],
                    "hora_fin": tarea['hora_fin'],
                    "puntos": tarea['puntos'],
                    "estatus": tarea['estatus'],
                    "fecha": tarea['fecha'],
                    "disponible_para_rol": "todos",
                    "completadaPor": tarea.get('completadaPor', None)
                })
            
            lista_empleados[emp['id']]['tareas_asignadas'] = lista_tareas
                
        lista_empleados = {
            "status": "success",
            "panel": list(lista_empleados.values())
        }
    except Exception as e:
        print(f"Error obteniendo empleados: {e}")
        return {"status": "error", "mensaje": "Error obteniendo empleados"}
    return lista_empleados