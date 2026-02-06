"""
Backup Scheduler - Sistema automatizado de backup de tareas
Copia datos de tareas_semana a historial diariamente a las 12:10 AM
"""

import schedule
import time
from datetime import datetime, timedelta
from database.database import DatabaseManager
from database.db_tareas import TareasManager
from database.db_historial import HistorialManager
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BackupManager:
    """Administrador del backup automático de tareas_semana a historial"""
    
    def __init__(self):
        self.db_manager = DatabaseManager("relojes.db")
        self.tareas_manager = TareasManager(self.db_manager)
        self.historial_manager = HistorialManager(self.db_manager)
        
        # Mapeo de días de la semana a números (lunes=0, domingo=6)
        self.dias_semana = {
            'lunes': 0,
            'martes': 1,
            'miércoles': 2,
            'miercoles': 2,  # sin tilde
            'jueves': 3,
            'viernes': 4,
            'sábado': 5,
            'sabado': 5,  # sin tilde
            'domingo': 6
        }
    
    def obtener_fecha_para_dia_semana(self, dia_semana: str, fecha_base: datetime = None) -> str:
        """
        Convierte un día de la semana a una fecha específica YYYY-MM-DD
        
        Args:
            dia_semana: Nombre del día (ej: 'lunes', 'martes')
            fecha_base: Fecha de referencia (por defecto hoy)
        
        Returns:
            Fecha en formato YYYY-MM-DD
        """
        if fecha_base is None:
            fecha_base = datetime.now()
        
        dia_normalizado = dia_semana.lower().strip()
        
        if dia_normalizado not in self.dias_semana:
            logger.warning(f"Día '{dia_semana}' no reconocido, usando fecha base")
            return fecha_base.strftime('%Y-%m-%d')
        
        # Obtener el número del día objetivo (0=lunes, 6=domingo)
        dia_objetivo = self.dias_semana[dia_normalizado]
        
        # Obtener el día actual (0=lunes, 6=domingo)
        dia_actual = fecha_base.weekday()
        
        # Calcular cuántos días retroceder para llegar al día objetivo
        dias_atras = (dia_actual - dia_objetivo) % 7
        
        # Si es el mismo día (dias_atras == 0), usar la fecha actual
        # Esto permite respaldar el día actual cuando se ejecuta manualmente
        
        fecha_resultado = fecha_base - timedelta(days=dias_atras)
        return fecha_resultado.strftime('%Y-%m-%d')
    
    def realizar_backup_diario(self):
        """
        Ejecuta el backup diario de tareas_semana a historial
        Copia todas las tareas de la semana pasada y resetea los status
        """
        try:
            logger.info("="*60)
            logger.info("INICIANDO BACKUP DIARIO: tareas_semana → historial")
            logger.info("="*60)
            
            fecha_backup = datetime.now()
            tareas_respaldadas = 0
            errores = 0
            
            # Procesar cada día de la semana
            for dia_nombre in ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']:
                # Obtener tareas del día
                resultado = self.tareas_manager.listar_por_fecha(dia_nombre.capitalize())
                
                if resultado.get("status") != "success":
                    logger.error(f"Error al listar tareas de {dia_nombre}")
                    continue
                
                tareas = resultado.get("registros", [])
                
                if not tareas:
                    logger.info(f"  {dia_nombre.capitalize()}: Sin tareas para respaldar")
                    continue
                
                # Convertir día de semana a fecha específica
                fecha_especifica = self.obtener_fecha_para_dia_semana(dia_nombre, fecha_backup)
                
                logger.info(f"  {dia_nombre.capitalize()} → {fecha_especifica} ({len(tareas)} tareas)")
                
                # Copiar cada tarea a historial
                for tarea in tareas:
                    try:
                        # Crear registro en historial con la fecha específica
                        resultado_historial = self.historial_manager.crear_registro(
                            nombre=tarea['nombre'],
                            descripcion=tarea['descripcion'],
                            id_dueño=tarea['id_dueño'],
                            hora_ini=tarea['hora_ini'],
                            hora_fin=tarea['hora_fin'],
                            fecha=fecha_especifica,  # Fecha específica YYYY-MM-DD
                            puntos=tarea['puntos'],
                            estatus=tarea['estatus'],  # Mantener el status actual
                            completadaPor=tarea.get('completadaPor'),  # 🔥 NUEVO: Preservar quién completó como extra
                            disponible_para_rol=tarea.get('disponible_para_rol', 'todos')
                        )
                        
                        if resultado_historial.get("status") == "success":
                            tareas_respaldadas += 1
                        else:
                            errores += 1
                            logger.error(f"    ❌ Error al respaldar '{tarea['nombre']}': {resultado_historial.get('mensaje')}")
                    
                    except Exception as e:
                        errores += 1
                        logger.error(f"    ❌ Excepción al respaldar '{tarea['nombre']}': {e}")
                
                # Resetear status de las tareas a 'sin_iniciar' para la nueva semana
                try:
                    with self.db_manager.get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE tareas_semana 
                            SET estatus = 'sin_iniciar', completadaPor = NULL
                            WHERE fecha = ?
                        """, (dia_nombre.capitalize(),))
                        conn.commit()
                        logger.info(f"    ✓ Status reseteado para {dia_nombre}")
                except Exception as e:
                    logger.error(f"    ❌ Error al resetear status de {dia_nombre}: {e}")
            
            logger.info("="*60)
            logger.info(f"BACKUP COMPLETADO:")
            logger.info(f"  ✅ Tareas respaldadas: {tareas_respaldadas}")
            if errores > 0:
                logger.info(f"  ❌ Errores: {errores}")
            logger.info(f"  Hora: {fecha_backup.strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info("="*60)
            
        except Exception as e:
            logger.error(f"ERROR CRÍTICO en backup diario: {e}")
            import traceback
            traceback.print_exc()


def ejecutar_backup_manual():
    """Función auxiliar para ejecutar backup manualmente desde test"""
    backup_manager = BackupManager()
    backup_manager.realizar_backup_diario()


if __name__ == "__main__":
    # Test manual del backup
    print("\n🔧 Ejecutando backup manual para pruebas...\n")
    ejecutar_backup_manual()
