import sqlite3
from contextlib import contextmanager
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime, timedelta

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
    
    def obtener_top_empleados(self, fecha_inicio: Optional[str] = None, 
                               fecha_fin: Optional[str] = None, 
                               limite: int = 10) -> List[Dict[str, Any]]:
        """
        Obtiene el top de empleados con mayor puntaje en tareas regulares
        Excluye tareas con estatus 'extra'
        
        Args:
            fecha_inicio: Fecha de inicio del rango (formato YYYY-MM-DD)
            fecha_fin: Fecha de fin del rango (formato YYYY-MM-DD)
            limite: Número de empleados a retornar (default 10)
        
        Returns:
            Lista de empleados con su puntaje total
        """
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Query mejorado - incluye completadas, vencidas y porcentaje
            query = '''
                SELECT 
                    h.id_dueño as usuario_id,
                    SUM(CASE WHEN h.estatus IN ('completada', 'completado') THEN h.puntos ELSE 0 END) as total_puntos,
                    COUNT(*) as total_tareas,
                    SUM(CASE WHEN h.estatus IN ('completada', 'completado') THEN 1 ELSE 0 END) as completadas,
                    SUM(CASE WHEN h.estatus IN ('sinIniciar', 'enProgreso', 'noCompletada', 'vencida') THEN 1 ELSE 0 END) as vencidas
                FROM historial h
                WHERE h.id_dueño IS NOT NULL
                AND h.estatus NOT IN ('extra', 'extras')
            '''
            
            params = []
            
            # Agregar filtros de fecha si se proporcionan
            if fecha_inicio and fecha_fin:
                query += ' AND h.fecha BETWEEN ? AND ?'
                params.extend([fecha_inicio, fecha_fin])
            elif fecha_inicio:
                query += ' AND h.fecha >= ?'
                params.append(fecha_inicio)
            elif fecha_fin:
                query += ' AND h.fecha <= ?'
                params.append(fecha_fin)
            
            query += '''
                GROUP BY h.id_dueño
                HAVING total_tareas > 0
                ORDER BY total_puntos DESC
                LIMIT ?
            '''
            params.append(limite)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            # Calcular porcentaje para cada empleado
            resultados = []
            for row in rows:
                data = dict(row)
                total = data.get('total_tareas', 0)
                completadas = data.get('completadas', 0)
                porcentaje = (completadas / total * 100) if total > 0 else 0
                data['porcentaje'] = round(porcentaje, 1)
                resultados.append(data)
            
            return resultados
    
    def obtener_top_extras(self, fecha_inicio: Optional[str] = None, 
                           fecha_fin: Optional[str] = None, 
                           limite: int = 10) -> List[Dict[str, Any]]:
        """
        Obtiene el top de empleados con mayor puntaje en tareas extras
        Solo incluye tareas con estatus 'extra'
        
        Args:
            fecha_inicio: Fecha de inicio del rango (formato YYYY-MM-DD)
            fecha_fin: Fecha de fin del rango (formato YYYY-MM-DD)
            limite: Número de empleados a retornar (default 10)
        
        Returns:
            Lista de empleados con su puntaje total en extras
        """
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Query base - suma puntos por empleado, solo estatus 'extra'
            query = '''
                SELECT 
                    h.completadaPor as usuario_id,
                    SUM(h.puntos) as total_puntos,
                    COUNT(*) as total_tareas
                FROM historial h
                WHERE h.completadaPor IS NOT NULL
                AND h.estatus IN ('extra')
            '''
            
            params = []
            
            # Agregar filtros de fecha si se proporcionan
            if fecha_inicio and fecha_fin:
                query += ' AND h.fecha BETWEEN ? AND ?'
                params.extend([fecha_inicio, fecha_fin])
            elif fecha_inicio:
                query += ' AND h.fecha >= ?'
                params.append(fecha_inicio)
            elif fecha_fin:
                query += ' AND h.fecha <= ?'
                params.append(fecha_fin)
            
            query += '''
                GROUP BY h.completadaPor
                ORDER BY total_puntos DESC
                LIMIT ?
            '''
            params.append(limite)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def obtener_quincenas_con_datos(self) -> List[Dict[str, Any]]:
        """
        Obtiene las quincenas que tienen registros en la base de datos
        
        Returns:
            Lista de quincenas únicas que tienen datos, ordenadas de más reciente a más antigua
        """
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Obtener todas las fechas únicas de los registros
            query = '''
                SELECT DISTINCT fecha
                FROM historial
                WHERE fecha IS NOT NULL
                ORDER BY fecha DESC
            '''
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            # Convertir fechas a quincenas únicas
            quincenas_set = set()
            for row in rows:
                fecha_str = row['fecha']
                try:
                    fecha = datetime.strptime(fecha_str, '%Y-%m-%d')
                    dia = fecha.day
                    mes = fecha.month
                    año = fecha.year
                    
                    # Calcular a qué quincena pertenece esta fecha
                    if dia >= 28:
                        # Días 28+ pertenecen a Q1 del MES SIGUIENTE
                        mes += 1
                        if mes > 12:
                            mes = 1
                            año += 1
                        quincena = 1
                    elif dia <= 12:
                        # Días 1-12 pertenecen a Q1 del mes actual
                        quincena = 1
                    else:
                        # Días 13-27 pertenecen a Q2 del mes actual
                        quincena = 2
                    
                    quincenas_set.add((año, mes, quincena))
                except Exception as e:
                    logger.warning(f"Error al procesar fecha {fecha_str}: {e}")
                    continue
            
            # Convertir a lista y ordenar
            quincenas_list = [
                {'año': q[0], 'mes': q[1], 'quincena': q[2]}
                for q in sorted(quincenas_set, reverse=True)
            ]
            
            return quincenas_list

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
            
            # logger.info(f"REGISTRO ACTUALIZADO - ID: {historial_id} | Campos: {list(datos.keys())}")
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
    
    def calcular_fechas_quincena(self, año: int, mes: int, quincena: int) -> Dict[str, str]:
        """
        Calcula las fechas de inicio y fin de una quincena específica
        
        Patrón de quincenas:
        - Q1 de cada mes: del día 28 del mes anterior al día 12 del mes actual
        - Q2 de cada mes: del día 13 al día 27 del mes actual
        
        Args:
            año: Año de la quincena
            mes: Mes de la quincena (1-12)
            quincena: Número de quincena (1 o 2)
        
        Returns:
            Dict con fecha_inicio y fecha_fin en formato YYYY-MM-DD
        """
        try:
            if quincena == 1:
                # Q1: del 28 del mes anterior al 12 del mes actual
                if mes == 1:
                    fecha_inicio = datetime(año - 1, 12, 28).strftime('%Y-%m-%d')
                else:
                    fecha_inicio = datetime(año, mes - 1, 28).strftime('%Y-%m-%d')
                fecha_fin = datetime(año, mes, 12).strftime('%Y-%m-%d')
            elif quincena == 2:
                # Q2: del 13 al 27 del mes actual
                fecha_inicio = datetime(año, mes, 13).strftime('%Y-%m-%d')
                fecha_fin = datetime(año, mes, 27).strftime('%Y-%m-%d')
            else:
                raise ValueError("La quincena debe ser 1 o 2")
            
            return {
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin
            }
        except Exception as e:
            logger.error(f"ERROR AL CALCULAR FECHAS DE QUINCENA: {str(e)}")
            raise
    
    def obtener_top_empleados(self, fecha_inicio: Optional[str] = None, 
                              fecha_fin: Optional[str] = None,
                              año: Optional[int] = None,
                              mes: Optional[int] = None,
                              quincena: Optional[int] = None,
                              limite: int = 10) -> Dict[str, Any]:
        """
        Obtiene el top de empleados con mayor puntaje en tareas regulares
        
        Args:
            fecha_inicio: Fecha de inicio personalizada (formato YYYY-MM-DD)
            fecha_fin: Fecha de fin personalizada (formato YYYY-MM-DD)
            año: Año para filtro por quincena
            mes: Mes para filtro por quincena (1-12)
            quincena: Número de quincena (1 o 2)
            limite: Número de empleados a retornar (default 10)
        
        Returns:
            Dict con status, top de empleados y metadatos
        """
        try:
            # Si se proporciona año, mes y quincena, calcular fechas
            if año and mes and quincena:
                fechas = self.calcular_fechas_quincena(año, mes, quincena)
                fecha_inicio = fechas['fecha_inicio']
                fecha_fin = fechas['fecha_fin']
                periodo = f"Q{quincena} {self._nombre_mes(mes)} {año}"
            elif fecha_inicio and fecha_fin:
                periodo = f"{fecha_inicio} a {fecha_fin}"
            else:
                periodo = "Histórico general"
            
            # Obtener top de empleados
            top_empleados = self.historial_dao.obtener_top_empleados(
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                limite=limite
            )
            
            # Enriquecer con información del usuario
            from database.db_usuarios import UsuarioDAO
            usuario_dao = UsuarioDAO(self.historial_dao.db)
            
            empleados_enriquecidos = []
            for empleado in top_empleados:
                usuario_info = usuario_dao.obtener_por_id(empleado['usuario_id'])
                if usuario_info:
                    empleados_enriquecidos.append({
                        'posicion': len(empleados_enriquecidos) + 1,
                        'usuario_id': empleado['usuario_id'],
                        'nombre': usuario_info.get('nombre', 'Desconocido'),
                        'puesto': usuario_info.get('puesto', 'N/A'),
                        'total_puntos': empleado['total_puntos'],
                        'total_tareas': empleado['total_tareas'],
                        'completadas': empleado.get('completadas', 0),
                        'vencidas': empleado.get('vencidas', 0),
                        'porcentaje': empleado.get('porcentaje', 0)
                    })
            
            logger.info(f"TOP EMPLEADOS OBTENIDO - Periodo: {periodo} | Total: {len(empleados_enriquecidos)}")
            return {
                "status": "success",
                "periodo": periodo,
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin,
                "top_empleados": empleados_enriquecidos,
                "total": len(empleados_enriquecidos)
            }
        except Exception as e:
            logger.error(f"ERROR AL OBTENER TOP EMPLEADOS: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al obtener top empleados: {str(e)}"
            }
    
    def _nombre_mes(self, mes: int) -> str:
        """Retorna el nombre del mes en español"""
        meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ]
        return meses[mes - 1] if 1 <= mes <= 12 else str(mes)
    
    def obtener_top_extras(self, fecha_inicio: Optional[str] = None, 
                           fecha_fin: Optional[str] = None,
                           año: Optional[int] = None,
                           mes: Optional[int] = None,
                           quincena: Optional[int] = None,
                           limite: int = 10) -> Dict[str, Any]:
        """
        Obtiene el top de empleados con mayor puntaje en tareas extras
        
        Args:
            fecha_inicio: Fecha de inicio personalizada (formato YYYY-MM-DD)
            fecha_fin: Fecha de fin personalizada (formato YYYY-MM-DD)
            año: Año para filtro por quincena
            mes: Mes para filtro por quincena (1-12)
            quincena: Número de quincena (1 o 2)
            limite: Número de empleados a retornar (default 10)
        
        Returns:
            Dict con status, top de empleados en extras y metadatos
        """
        try:
            # Si se proporciona año, mes y quincena, calcular fechas
            if año and mes and quincena:
                fechas = self.calcular_fechas_quincena(año, mes, quincena)
                fecha_inicio = fechas['fecha_inicio']
                fecha_fin = fechas['fecha_fin']
                periodo = f"Q{quincena} {self._nombre_mes(mes)} {año}"
            elif fecha_inicio and fecha_fin:
                periodo = f"{fecha_inicio} a {fecha_fin}"
            else:
                periodo = "Histórico general"
            
            # Obtener top de empleados en extras
            top_extras = self.historial_dao.obtener_top_extras(
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                limite=limite
            )
            
            # Enriquecer con información del usuario
            from database.db_usuarios import UsuarioDAO
            usuario_dao = UsuarioDAO(self.historial_dao.db)
            
            empleados_enriquecidos = []
            for empleado in top_extras:
                usuario_info = usuario_dao.obtener_por_id(empleado['usuario_id'])
                if usuario_info:
                    empleados_enriquecidos.append({
                        'posicion': len(empleados_enriquecidos) + 1,
                        'usuario_id': empleado['usuario_id'],
                        'nombre': usuario_info.get('nombre', 'Desconocido'),
                        'total_puntos': empleado['total_puntos'],
                        'total_tareas': empleado['total_tareas']
                    })
            
            logger.info(f"TOP EXTRAS OBTENIDO - Periodo: {periodo} | Total: {len(empleados_enriquecidos)}")
            return {
                "status": "success",
                "periodo": periodo,
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin,
                "top_extras": empleados_enriquecidos,
                "total": len(empleados_enriquecidos)
            }
        except Exception as e:
            logger.error(f"ERROR AL OBTENER TOP EXTRAS: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al obtener top extras: {str(e)}"
            }
    
    def obtener_quincenas_disponibles(self) -> Dict[str, Any]:
        """
        Obtiene las quincenas que tienen datos en el historial
        
        Returns:
            Dict con status y lista de quincenas con datos
        """
        try:
            quincenas = self.historial_dao.obtener_quincenas_con_datos()
            
            # Enriquecer con información adicional
            quincenas_enriquecidas = []
            for q in quincenas:
                quincenas_enriquecidas.append({
                    'año': q['año'],
                    'mes': q['mes'],
                    'quincena': q['quincena'],
                    'label': f"Q{q['quincena']} - {self._nombre_mes(q['mes'])} {q['año']}"
                })
            
            logger.info(f"QUINCENAS DISPONIBLES OBTENIDAS - Total: {len(quincenas_enriquecidas)}")
            return {
                "status": "success",
                "quincenas": quincenas_enriquecidas,
                "total": len(quincenas_enriquecidas)
            }
        except Exception as e:
            logger.error(f"ERROR AL OBTENER QUINCENAS DISPONIBLES: {str(e)}")
            return {
                "status": "error",
                "mensaje": f"Error al obtener quincenas disponibles: {str(e)}"
            }
