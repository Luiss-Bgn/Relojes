import sqlite3
from contextlib import contextmanager
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime

# Configurar logging pa tener loghs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TareasDAO:
    """Data Access Object (inserta directamente a la tabla de tareas)"""
    
    def __init__(self, db_manager):
        self.db = db_manager
    #crear nuevo reg en la tabla tareas_semana
    def crear(self, nombre: str, descripcion: str, id_dueño: int, 
              hora_ini: str, hora_fin: str, fecha: str, puntos: int, 
              estatus: str, completadaPor: Optional[int] = None, 
              disponible_para_rol: str = "todos") -> Dict[str, Any]:
        
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO tareas_semana (nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, completadaPor, disponible_para_rol)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, completadaPor, disponible_para_rol))
            conn.commit()
            
            tarea_id = cursor.lastrowid
            return {
                'id': tarea_id,
                'nombre': nombre,
                'descripcion': descripcion,
                'id_dueño': id_dueño,
                'hora_ini': hora_ini,
                'hora_fin': hora_fin,
                'fecha': fecha,
                'puntos': puntos,
                'estatus': estatus,
                'completadaPor': completadaPor,
                'disponible_para_rol': disponible_para_rol
            }
    #get por id de la tarea en custion
    def obtener_por_id(self, tarea_id: int) -> Optional[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, completadaPor, disponible_para_rol 
                FROM tareas_semana WHERE id = ?
            ''', (tarea_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
        
    #get por usuario de la tarea en custion
    def obtener_por_usuario(self, usuario_id: int) -> List[Dict[str, Any]]:
        """Obtiene todos los registros del tareas_semana de un usuario"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, completadaPor, disponible_para_rol 
                FROM tareas_semana WHERE id_dueño = ?
                ORDER BY fecha DESC
            ''', (usuario_id,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    #get por fecha lista de tareas ene sa fecha 
    def obtener_por_fecha(self, fecha: str) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, completadaPor, disponible_para_rol 
                FROM tareas_semana WHERE fecha = ?
                ORDER BY hora_ini
            ''', (fecha,))
            rows =cursor.fetchall()
            return [dict(row) for row in rows]
    #get all
    def obtener_todos(self) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, completadaPor, disponible_para_rol 
                FROM tareas_semana
                ORDER BY fecha DESC
            ''')
            rows= cursor.fetchall()
            return [dict(row) for row in rows]
    
    #update de un registro del tareas_semana
    def actualizar(self, tareas_semana_id: int, **kwargs) -> bool:
        campos = []
        valores = []
        campos_permitidos = ['nombre', 'descripcion', 'hora_ini', 'hora_fin', 'puntos', 'estatus', 'completadaPor', 'disponible_para_rol']
        
        for campo, valor in kwargs.items():
            if campo in campos_permitidos:
                campos.append(f'{campo} = ?')
                valores.append(valor)
        
        if not campos: #si no se mando ningun campo valido retorna error (false)
            return False
        
        valores.append(tareas_semana_id)
        query = f"UPDATE tareas_semana SET {', '.join(campos)} WHERE id = ?"
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, valores)
            conn.commit()
            return cursor.rowcount > 0
    #Delete la tarea por id
    def eliminar(self, tareas_semana_id: int) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM tareas_semana WHERE id = ?', (tareas_semana_id,))
            conn.commit()
            return cursor.rowcount > 0

#Logica de negocio, aqui en un futuro debemos agregar validaciones y condiciones, asi como funciones automaticas para el cambio estatyus 
class TareasManager:
    def __init__(self, db_manager):
        self.tareas_dao = TareasDAO(db_manager)
    
    def crear_registro(self, nombre: str, descripcion: str, id_dueño: int, 
                      hora_ini: str, hora_fin: str, fecha: str, puntos: int, 
                      estatus: str = "sinIniciar", disponible_para_rol: str = "todos") -> Dict[str, Any]:
        """
        Crea un nuevo registro en el tareas_semana
        
        Args:
            nombre: Nombre de la tarea/actividad
            descripcion: Descripción detallada
            id_dueño: ID del usuario responsable
            hora_ini: Hora de inicio (HH:MM)
            hora_fin: Hora de fin (HH:MM)
            fecha: Fecha string con los dias de la semana (lunes, martes, etc)
            puntos: Puntos asociados
            estatus: Estado (pendiente, completada, cancelada)
            disponible_para_rol: Filtro de roles para tareas extras ('todos', 'mismo_rol')
        
        Returns:
            Dict con datos del registro creado o error
        """
        try:
            registro = self.tareas_dao.crear(
                nombre, descripcion, id_dueño, hora_ini, hora_fin, 
                fecha, puntos, estatus, disponible_para_rol=disponible_para_rol
            )
            
            logger.info(
                f"REGISTRO TAREAS CREADO - ID: {registro['id']} | "
                f"Nombre: {nombre} | Usuario: {id_dueño} | Fecha: {fecha} | "
                f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            )
            
            return {
                "status": "success",
                "registro": registro,
                "mensaje": "Registro creado correctamente"
            }
        except Exception as e:
            logger.error(f"ERROR AL CREAR REGISTRO TAREAS: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al crear registro: {str(e)}"
            }
    
    def obtener_registro(self, tareas_semana_id: int) -> Dict[str, Any]:
        """Obtiene datos de un registro del tareas_semana"""
        try:
            registro = self.tareas_dao.obtener_por_id(tareas_semana_id)
            
            if registro:
                logger.info(f"REGISTRO TAREAS OBTENIDO - ID: {tareas_semana_id}")
                return {
                    "status": "success",
                    "registro": registro
                }
            else:
                logger.warning(f"REGISTRO TAREAS NO ENCONTRADO - ID: {tareas_semana_id}")
                return {
                    "status": "error",
                    "mensaje": "Registro no encontrado"
                }
        except Exception as e:
            logger.error(f"ERROR AL OBTENER REGISTRO TAREAS: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al obtener registro: {str(e)}"
            }
    
    def listar_por_usuario(self, usuario_id: int) -> Dict[str, Any]:
        """Lista todos los registros de un usuario"""
        try:
            registros = self.tareas_dao.obtener_por_usuario(usuario_id)
            logger.info(f"REGISTROS USUARIO LISTADOS - Usuario: {usuario_id} | Total: {len(registros)}")
            return {
                "status": "success",
                "registros": registros,
                "total": len(registros)
            }
        except Exception as e:
            logger.error(f"ERROR AL LISTAR REGISTROS: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al listar registros: {str(e)}"
            }
    
    def listar_por_fecha(self, fecha: str) -> Dict[str, Any]:
        """Lista registros por fecha específica"""
        try:
            registros = self.tareas_dao.obtener_por_fecha(fecha)
            logger.info(f"REGISTROS POR FECHA LISTADOS - Fecha: {fecha} | Total: {len(registros)}")
            return {
                "status": "success",
                "registros": registros,
                "total": len(registros)
            }
        except Exception as e:
            logger.error(f"ERROR AL LISTAR REGISTROS POR FECHA: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al listar registros: {str(e)}"
            }
    
    def listar_todos(self) -> Dict[str, Any]:
        """Lista todos los registros del tareas_semana"""
        try:
            registros = self.tareas_dao.obtener_todos()
            logger.info(f"TAREAS COMPLETO LISTADO - Total: {len(registros)}")
            return {
                "status": "success",
                "registros": registros,
                "total": len(registros)
            }
        except Exception as e:
            logger.error(f"ERROR AL LISTAR TAREAS: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al listar tareas: {str(e)}"
            }
    
    def actualizar_registro(self, tareas_semana_id: int, **datos) -> Dict[str, Any]:
        """Actualiza datos de un registro"""
        try:
            # Verificar que si existe
            registro = self.tareas_dao.obtener_por_id(tareas_semana_id)
            if not registro:
                logger.warning(f"ACTUALIZACIÓN FALLIDA - Registro no existe: {tareas_semana_id}")
                return {
                    "status": "error",
                    "mensaje": "Registro no encontrado"
                }
            
            # Actualizar
            self.tareas_dao.actualizar(tareas_semana_id, **datos)
            registro_actualizado = self.tareas_dao.obtener_por_id(tareas_semana_id)
            
            logger.info(f"REGISTRO ACTUALIZADO - ID: {tareas_semana_id} | Campos: {list(datos.keys())}")
            return {
                "status": "success",
                "registro": registro_actualizado,
                "mensaje": "Registro actualizado correctamente"
            }
        except Exception as e:
            logger.error(f"ERROR AL ACTUALIZAR REGISTRO: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al actualizar registro: {str(e)}"
            }
        
    def actualizar_varios(self, tareas: list[dict]) -> Dict[str, Any]:
        actualizados = []
        errores = []

        for tarea in tareas:
            tarea_id = tarea.get("id")
            if not tarea_id:
                errores.append({"tarea": tarea, "error": "Sin ID"})
                continue

            # Quitamos campos que no se deben actualizar
            datos_actualizar = tarea.copy()
            datos_actualizar.pop("id", None)

            resultado = self.actualizar_registro(tarea_id, **datos_actualizar)

            if resultado["status"] == "success":
                actualizados.append(tarea_id)
            else:
                errores.append({"id": tarea_id, "error": resultado["mensaje"]})

        return {
            "status": "success" if not errores else "partial",
            "actualizados": actualizados,
            "errores": errores
        }

    
    def eliminar_registro(self, tareas_semana_id: int) -> Dict[str, Any]:
        """Elimina un registro del tareas_semana"""
        try:
            # Verificar que existe
            registro = self.tareas_dao.obtener_por_id(tareas_semana_id)
            if not registro:
                logger.warning(f"ELIMINACIÓN FALLIDA - Registro no existe: {tareas_semana_id}")
                return {
                    "status": "error",
                    "mensaje": "Registro no encontrado"
                }
            
            nombre = registro['nombre']
            self.tareas_dao.eliminar(tareas_semana_id)
            
            logger.info(f"REGISTRO ELIMINADO - ID: {tareas_semana_id} | Nombre: {nombre}")
            return {
                "status": "success",
                "mensaje": "Registro eliminado correctamente"
            }
        except Exception as e:
            logger.error(f"ERROR AL ELIMINAR REGISTRO: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al eliminar registro: {str(e)}"
            }
