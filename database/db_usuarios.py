import sqlite3
from contextlib import contextmanager
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class UsuarioDAO:
    """Data Access Object para la tabla Usuarios"""
    
    def __init__(self, db_manager):
        self.db = db_manager
    
    def crear(self, nombre: str, username: str, contraseña: str, pin: int, 
              rol: str, puesto: str, imagen: Optional[str] = None) -> Dict[str, Any]:
        """Crea un nuevo usuario"""
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO usuarios (nombre, username, contraseña, pin, rol, puesto, imagen)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (nombre, username, contraseña, pin, rol, puesto, imagen))
            conn.commit()
            
            usuario_id = cursor.lastrowid
            return {
                'id': usuario_id,
                'nombre': nombre,
                'username': username,
                'pin': pin,
                'rol': rol,
                'puesto': puesto,
                'imagen': imagen
            }
    
    def obtener_por_id(self, usuario_id: int) -> Optional[Dict[str, Any]]:
        """Obtiene un usuario por ID"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, nombre, username, pin, rol, puesto, imagen FROM usuarios WHERE id = ?', 
                          (usuario_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def obtener_por_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Obtiene un usuario por username"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, nombre, username, pin, rol, puesto, imagen FROM usuarios WHERE username = ?', 
                          (username,))
            row = cursor.fetchone()
            return dict(row) if row else None
        
    def obtener_por_pin(self, pin: int) -> Optional[Dict[str, Any]]:
        """Obtiene un usuario por PIN"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, nombre, username, pin, rol, puesto, imagen FROM usuarios WHERE pin = ?', 
                          (pin,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def obtener_todos(self) -> List[Dict[str, Any]]:
        """Obtiene todos los usuarios"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, nombre, username, pin, rol, puesto, imagen FROM usuarios')
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def actualizar(self, usuario_id: int, **kwargs) -> bool:
        """Actualiza un usuario"""
        campos = []
        valores = []
        
        campos_permitidos = ['nombre', 'contraseña', 'pin', 'rol', 'puesto', 'imagen']
        
        for campo, valor in kwargs.items():
            if campo in campos_permitidos:
                campos.append(f'{campo} = ?')
                valores.append(valor)
        
        if not campos:
            return False
        
        valores.append(usuario_id)
        query = f"UPDATE usuarios SET {', '.join(campos)} WHERE id = ?"
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, valores)
            conn.commit()
            return cursor.rowcount > 0
    
    def eliminar(self, usuario_id: int) -> bool:
        """Elimina un usuario"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM usuarios WHERE id = ?', (usuario_id,))
            conn.commit()
            return cursor.rowcount > 0
    
    def verificar_contraseña(self, username: str, contraseña: str) -> bool:
        """Verifica si la contraseña es correcta"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT contraseña FROM usuarios WHERE username = ?', (username,))
            row = cursor.fetchone()
            if row:
                return row[0] == contraseña
            return False
        
    def obtener_por_roles(self, roles: List[str]) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            query = f"""
                SELECT id, nombre, username, pin, rol, puesto, imagen
                FROM usuarios
                WHERE rol IN ({','.join('?' for _ in roles)})
            """
            cursor.execute(query, roles)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]



class UsuarioManager:
    
    
    def __init__(self, db_manager):
        self.usuario_dao = UsuarioDAO(db_manager)
    
    def crear_usuario(self, nombre: str, username: str, contraseña: str, 
                     pin: int, rol: str, puesto: str, imagen: Optional[str] = None) -> Dict[str, Any]:
        """
        Creamos un nuevo usuario
        
        Args:
            nombre: Nombre completo del usuario
            username: Nombre de usuario único
            contraseña: Contraseña del usuario
            pin: PIN de acceso
            rol: Rol del usuario (admin, supervisor o empleado)
            puesto: Puesto
            imagen: URL o path de la imagen del usuario (opcional)
        
        Returns:
            Dict con datos del usuario creado o error
        """
        try:
            # Verificar si el usuario ya existe
            if self.usuario_dao.obtener_por_username(username):
                logger.warning(
                    f"✗ ERROR AL CREAR - Username duplicado: {username} | "
                    f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                )
                return {
                    "status": "error",
                    "mensaje": "El username ya existe"
                }
            
            usuario = self.usuario_dao.crear(nombre, username, contraseña, pin, rol, puesto, imagen)
            
            logger.info(
                f"✓ USUARIO CREADO - Username: {username} | ID: {usuario['id']} | "
                f"Nombre: {nombre} | Rol: {rol} | "
                f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            )
            
            return {
                "status": "success",
                "usuario": usuario,
                "mensaje": "Usuario creado correctamente"
            }
        except Exception as e:
            logger.error(f"✗ ERROR AL CREAR USUARIO: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al crear usuario: {str(e)}"
            }
    
    def obtener_usuario(self, usuario_id: int) -> Dict[str, Any]:
        """Obtiene datos de un usuario"""
        try:
            usuario = self.usuario_dao.obtener_por_id(usuario_id)
            
            if usuario:
                # logger.info(f"✓ USUARIO OBTENIDO - ID: {usuario_id}")
                return {
                    "status": "success",
                    "usuario": usuario
                }
            else:
                logger.warning(f"✗ USUARIO NO ENCONTRADO - ID: {usuario_id}")
                return {
                    "status": "error",
                    "mensaje": "Usuario no encontrado"
                }
        except Exception as e:
            logger.error(f"✗ ERROR AL OBTENER USUARIO: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al obtener usuario: {str(e)}"
            }
    
    def listar_usuarios(self) -> Dict[str, Any]:
        """Lista todos los usuarios"""
        try:
            usuarios = self.usuario_dao.obtener_todos()
            # logger.info(f"✓ USUARIOS LISTADOS - Total: {len(usuarios)}")
            return {
                "status": "success",
                "usuarios": usuarios,
                "total": len(usuarios)
            }
        except Exception as e:
            logger.error(f"✗ ERROR AL LISTAR USUARIOS: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al listar usuarios: {str(e)}"
            }
    
    def actualizar_usuario(self, usuario_id: int, **datos) -> Dict[str, Any]:
        """Actualiza datos de un usuario"""
        try:
            # Verificar que existe
            usuario = self.usuario_dao.obtener_por_id(usuario_id)
            if not usuario:
                logger.warning(f"✗ ACTUALIZACIÓN FALLIDA - Usuario no existe: {usuario_id}")
                return {
                    "status": "error",
                    "mensaje": "Usuario no encontrado"
                }
            
            # Actualizar
            self.usuario_dao.actualizar(usuario_id, **datos)
            usuario_actualizado = self.usuario_dao.obtener_por_id(usuario_id)
            
            logger.info(f"✓ USUARIO ACTUALIZADO - ID: {usuario_id} | Campos: {list(datos.keys())}")
            return {
                "status": "success",
                "usuario": usuario_actualizado,
                "mensaje": "Usuario actualizado correctamente"
            }
        except Exception as e:
            logger.error(f"✗ ERROR AL ACTUALIZAR USUARIO: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al actualizar usuario: {str(e)}"
            }
    
    def eliminar_usuario(self, usuario_id: int) -> Dict[str, Any]:
        """Elimina un usuario"""
        try:
            # Verificar que existe
            usuario = self.usuario_dao.obtener_por_id(usuario_id)
            if not usuario:
                logger.warning(f"✗ ELIMINACIÓN FALLIDA - Usuario no existe: {usuario_id}")
                return {
                    "status": "error",
                    "mensaje": "Usuario no encontrado"
                }
            
            username = usuario['username']
            self.usuario_dao.eliminar(usuario_id)
            
            logger.info(f"✓ USUARIO ELIMINADO - ID: {usuario_id} | Username: {username}")
            return {
                "status": "success",
                "mensaje": "Usuario eliminado correctamente"
            }
        except Exception as e:
            logger.error(f"✗ ERROR AL ELIMINAR USUARIO: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al eliminar usuario: {str(e)}"
            }
    
    def autenticar(self, username: str, contraseña: str) -> Dict[str, Any]:
        """Autentica un usuario"""
        try:
            usuario = self.usuario_dao.obtener_por_username(username)
            
            if not usuario:
                logger.warning(f"✗ AUTENTICACIÓN FALLIDA - Usuario no existe: {username}")
                return {
                    "status": "error",
                    "mensaje": "Usuario o contraseña incorrectos"
                }
            
            if self.usuario_dao.verificar_contraseña(username, contraseña):
                logger.info(f"✓ USUARIO AUTENTICADO - Username: {username}")
                return {
                    "status": "success",
                    "usuario": usuario,
                    "mensaje": "Autenticación exitosa"
                }
            else:
                logger.warning(f"✗ AUTENTICACIÓN FALLIDA - Contraseña incorrecta: {username}")
                return {
                    "status": "error",
                    "mensaje": "Usuario o contraseña incorrectos"
                }
        except Exception as e:
            logger.error(f"✗ ERROR EN AUTENTICACIÓN: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error en autenticación: {str(e)}"
            }
        

    def buscar_por_pin(self, pin: str) -> Dict[str, Any]:
        try:
            usuario = self.usuario_dao.obtener_por_pin(pin)
            
            if usuario:
                # logger.info(f"✓ USUARIO OBTENIDO - PIN: {pin}")
                return {
                    "status": "success",
                    "usuario": usuario
                }
            else:
                logger.warning(f"✗ USUARIO NO ENCONTRADO - PIN: {pin}")
                return {
                    "status": "error",
                    "mensaje": "Usuario no encontrado"
                }
        except Exception as e:
            logger.error(f"✗ ERROR AL OBTENER USUARIO: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al obtener usuario: {str(e)}"
            }
        
    def obtener_ids_por_roles(self, roles):
        with self.usuario_dao.db.get_connection() as conn:
            cursor = conn.cursor()
            query = f"""
                SELECT id FROM usuarios
                WHERE rol IN ({','.join('?' for _ in roles)})
            """
            cursor.execute(query, roles)
            return [row["id"] for row in cursor.fetchall()]
        
    def obtener_usuarios_por_roles(self, roles: List[str]) -> Dict[str, Any]:
        try:
            usuarios = self.usuario_dao.obtener_por_roles(roles)

            if usuarios:
                logger.info(f"✓ USUARIOS OBTENIDOS POR ROLES - Roles: {roles} | Total: {len(usuarios)}")
                return {
                    "status": "success",
                    "usuarios": usuarios,
                    "total": len(usuarios)
                }
            else:
                logger.warning(f"✗ NO SE ENCONTRARON USUARIOS PARA ROLES: {roles}")
                return {
                    "status": "error",
                    "mensaje": "No se encontraron usuarios con esos roles"
                }
        except Exception as e:
            logger.error(f"✗ ERROR AL OBTENER USUARIOS POR ROLES: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al obtener usuarios: {str(e)}"
            }

