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


class HistorialDAO:
    """Data Access Object (inserta directamente a la tabla historial)"""
    
    def __init__(self, db_manager):
        self.db = db_manager
    #crear nuevo reg en la tabla historial
    def crear(self, nombre: str, descripcion: str, id_dueño: int, 
              hora_ini: str, hora_fin: str, fecha: str, puntos: int, 
              estatus: str, completadaPor: Optional[int] = None,
              disponible_para_rol: str = "todos") -> Dict[str, Any]:
        
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO historial (nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, completadaPor, disponible_para_rol)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, completadaPor, disponible_para_rol))
            conn.commit()
            
            historial_id = cursor.lastrowid
            return {
                'id': historial_id,
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
    def obtener_por_id(self, historial_id: int) -> Optional[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, completadaPor, disponible_para_rol 
                FROM historial WHERE id = ?
            ''', (historial_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
        
    #get por usuario de la tarea en custion
    def obtener_por_usuario(self, usuario_id: int) -> List[Dict[str, Any]]:
        """Obtiene todos los registros del historial de un usuario"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nombre, descripcion, id_dueño, hora_ini, hora_fin, fecha, puntos, estatus, completadaPor, disponible_para_rol 
                FROM historial WHERE id_dueño = ?
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
                FROM historial WHERE fecha = ?
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
                FROM historial
                ORDER BY fecha DESC
            ''')
            rows= cursor.fetchall()
            return [dict(row) for row in rows]
    
    #update de un registro del historial
    def actualizar(self, historial_id: int, **kwargs) -> bool:
        campos = []
        valores = []
        campos_permitidos = ['nombre', 'descripcion', 'hora_ini', 'hora_fin', 'puntos', 'estatus', 'completadaPor', 'disponible_para_rol']
        
        for campo, valor in kwargs.items():
            if campo in campos_permitidos:
                campos.append(f'{campo} = ?')
                valores.append(valor)
        
        if not campos: #si no se mando ningun campo valido retorna error (false)
            return False
        
        valores.append(historial_id)
        query = f"UPDATE historial SET {', '.join(campos)} WHERE id = ?"
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, valores)
            conn.commit()
            return cursor.rowcount > 0
    #Delete la tarea por id
    def eliminar(self, historial_id: int) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM historial WHERE id = ?', (historial_id,))
            conn.commit()
            return cursor.rowcount > 0

#Logica de negocio, aqui en un futuro debemos agregar validaciones y condiciones, asi como funciones automaticas para el cambio estatyus 
class HistorialManager:
    def __init__(self, db_manager):
        self.historial_dao = HistorialDAO(db_manager)
    
    def crear_registro(self, nombre: str, descripcion: str, id_dueño: int, 
                      hora_ini: str, hora_fin: str, fecha: str, puntos: int, 
                      estatus: str = "sinIniciar", disponible_para_rol: str = "todos") -> Dict[str, Any]:
        """
        Crea un nuevo registro en el historial
        
        Args:
            nombre: Nombre de la tarea/actividad
            descripcion: Descripción detallada
            id_dueño: ID del usuario responsable
            hora_ini: Hora de inicio (HH:MM)
            hora_fin: Hora de fin (HH:MM)
            fecha: Fecha (YYYY-MM-DD)
            puntos: Puntos asociados
            estatus: Estado (pendiente, completada, cancelada)
            disponible_para_rol: Filtro de roles para tareas extras ('todos', 'mismo_rol')
        
        Returns:
            Dict con datos del registro creado o error
        """
        try:
            registro = self.historial_dao.crear(
                nombre, descripcion, id_dueño, hora_ini, hora_fin, 
                fecha, puntos, estatus, disponible_para_rol=disponible_para_rol
            )
            
            logger.info(
                f"REGISTRO HISTORIAL CREADO - ID: {registro['id']} | "
                f"Nombre: {nombre} | Usuario: {id_dueño} | Fecha: {fecha} | "
                f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            )
            
            return {
                "status": "success",
                "registro": registro,
                "mensaje": "Registro creado correctamente"
            }
        except Exception as e:
            logger.error(f"ERROR AL CREAR REGISTRO HISTORIAL: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al crear registro: {str(e)}"
            }
    
    def obtener_registro(self, historial_id: int) -> Dict[str, Any]:
        """Obtiene datos de un registro del historial"""
        try:
            registro = self.historial_dao.obtener_por_id(historial_id)
            
            if registro:
                logger.info(f"REGISTRO HISTORIAL OBTENIDO - ID: {historial_id}")
                return {
                    "status": "success",
                    "registro": registro
                }
            else:
                logger.warning(f"REGISTRO HISTORIAL NO ENCONTRADO - ID: {historial_id}")
                return {
                    "status": "error",
                    "mensaje": "Registro no encontrado"
                }
        except Exception as e:
            logger.error(f"ERROR AL OBTENER REGISTRO HISTORIAL: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al obtener registro: {str(e)}"
            }
    
    def listar_por_usuario(self, usuario_id: int) -> Dict[str, Any]:
        """Lista todos los registros de un usuario"""
        try:
            registros = self.historial_dao.obtener_por_usuario(usuario_id)
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
            registros = self.historial_dao.obtener_por_fecha(fecha)
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
        """Lista todos los registros del historial"""
        try:
            registros = self.historial_dao.obtener_todos()
            logger.info(f"HISTORIAL COMPLETO LISTADO - Total: {len(registros)}")
            return {
                "status": "success",
                "registros": registros,
                "total": len(registros)
            }
        except Exception as e:
            logger.error(f"ERROR AL LISTAR HISTORIAL: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al listar historial: {str(e)}"
            }
    
    def actualizar_registro(self, historial_id: int, **datos) -> Dict[str, Any]:
        """Actualiza datos de un registro"""
        try:
            # Verificar que si existe
            registro = self.historial_dao.obtener_por_id(historial_id)
            if not registro:
                logger.warning(f"ACTUALIZACIÓN FALLIDA - Registro no existe: {historial_id}")
                return {
                    "status": "error",
                    "mensaje": "Registro no encontrado"
                }
            
            # Actualizar
            self.historial_dao.actualizar(historial_id, **datos)
            registro_actualizado = self.historial_dao.obtener_por_id(historial_id)
            
            logger.info(f"REGISTRO ACTUALIZADO - ID: {historial_id} | Campos: {list(datos.keys())}")
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
    
    def eliminar_registro(self, historial_id: int) -> Dict[str, Any]:
        """Elimina un registro del historial"""
        try:
            # Verificar que existe
            registro = self.historial_dao.obtener_por_id(historial_id)
            if not registro:
                logger.warning(f"ELIMINACIÓN FALLIDA - Registro no existe: {historial_id}")
                return {
                    "status": "error",
                    "mensaje": "Registro no encontrado"
                }
            
            nombre = registro['nombre']
            self.historial_dao.eliminar(historial_id)
            
            logger.info(f"REGISTRO ELIMINADO - ID: {historial_id} | Nombre: {nombre}")
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
