import sqlite3
from contextlib import contextmanager
from typing import Optional, List, Dict, Any
import uuid
import logging
from datetime import datetime

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RelojDAO:
    """Data Access Object para la tabla Relojes"""
    
    def __init__(self, db_manager):
        self.db = db_manager
    
    def crear(self, empleado_id: Optional[int] = None, rol: Optional[str] = None) -> Dict[str, Any]:
        """Crea un nuevo reloj"""
        new_uuid = str(uuid.uuid4())
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO relojes (uuid, empleado_id, rol)
                VALUES (?, ?, ?)
            ''', (new_uuid, empleado_id, rol))
            conn.commit()
            
            reloj_id = cursor.lastrowid
            return {
                'id': reloj_id,
                'uuid': new_uuid,
                'empleado_id': empleado_id,
                'rol': rol
            }
    
    def obtener_por_id(self, reloj_id: int) -> Optional[Dict[str, Any]]:
        """Obtiene un reloj por ID"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM relojes WHERE id = ?', (reloj_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def obtener_por_uuid(self, uuid_val: str) -> Optional[Dict[str, Any]]:
        """Obtiene un reloj por UUID"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM relojes WHERE uuid = ?', (uuid_val,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def obtener_todos(self) -> List[Dict[str, Any]]:
        """Obtiene todos los relojes"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM relojes')
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def actualizar(self, reloj_id: int, **kwargs) -> bool:
        """Actualiza un reloj"""
        campos = []
        valores = []
        
        for campo, valor in kwargs.items():
            if campo in ['empleado_id', 'rol', 'nombre']:
                campos.append(f'{campo} = ?')
                valores.append(valor)
        
        if not campos:
            return False
        
        valores.append(reloj_id)
        query = f"UPDATE relojes SET {', '.join(campos)} WHERE id = ?"
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, valores)
            conn.commit()
            return cursor.rowcount > 0
    
    def eliminar(self, reloj_id: int) -> bool:
        """Elimina un reloj"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM relojes WHERE id = ?', (reloj_id,))
            conn.commit()
            return cursor.rowcount > 0


class RelojManager:
    """Gestor de funciones de negocio para relojes"""
    
    def __init__(self, db_manager):
        self.reloj_dao = RelojDAO(db_manager)
    
    def registrar_reloj_nuevo(self) -> Dict[str, Any]:
        """
        Registra un nuevo reloj sin UUID.
        El reloj enviará: {"tipo":"relojes", "comando":"registro"}
        
        Returns:
            {"uuid": "uuid-generado", "status": "success"}
        """
        reloj = self.reloj_dao.crear()
        
        logger.info(
            f"✓ RELOJ REGISTRADO - UUID asignado: {reloj['uuid']} "
            f"| ID: {reloj['id']} | Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )
        
        return {
            "status": "success",
            "uuid": reloj['uuid'],
            "id": reloj['id'],
            "mensaje": "UUID asignado permanentemente al reloj"
        }
    
    def iniciar_sesion_reloj(self, uuid_reloj: str, empleado_id: int, rol: str, nombre:str) -> Dict[str, Any]:

        reloj = self.reloj_dao.obtener_por_uuid(uuid_reloj)

        if not reloj:
            return {
                "status": "error",
                "mensaje": "No existe ese registro de reloj"
            }

        actualizado = self.reloj_dao.actualizar(
            reloj["id"],
            empleado_id=empleado_id,
            rol=rol,
            nombre = nombre
        )

        if not actualizado:
            return {
                "status": "error",
                "mensaje": "No se pudo actualizar el reloj"
            }
        reloj_actualizado = self.reloj_dao.obtener_por_uuid(uuid_reloj)

        return {
            "status": "success",
            "mensaje": "Sesión iniciada correctamente",
            "reloj": reloj_actualizado
        }
        
    
    def obtener_uuids_por_empleados(self, empleados_ids):
        if not empleados_ids:
            return []

        with self.reloj_dao.db.get_connection() as conn:
            cursor = conn.cursor()
            query = f"""
                SELECT uuid FROM relojes
                WHERE empleado_id IN ({','.join('?' for _ in empleados_ids)})
            """
            cursor.execute(query, empleados_ids)
            return [row["uuid"] for row in cursor.fetchall()]


