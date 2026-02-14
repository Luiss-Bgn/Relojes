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
        
        self.dias_ordenados = [
            'Domingo',
            'Lunes',
            'Martes',
            'Miércoles',
            'Jueves',
            'Viernes',
            'Sábado'
        ]

    def obtener_nombre_dia(self, fecha: datetime) -> str:
        dias_python = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
        return dias_python[fecha.weekday()]


    def realizar_backup_diario(self):
        try:
            logger.info("INICIANDO BACKUP INTELIGENTE")

            ahora = datetime.now()
            ayer = ahora - timedelta(days=1)

            nombre_ayer = self.obtener_nombre_dia(ayer)

            # Posición en la rueda
            indice = self.dias_ordenados.index(nombre_ayer)

            tareas_respaldadas = 0
            dias_procesados = 0

            while dias_procesados < 7:

                dia_nombre = self.dias_ordenados[indice]

                resultado = self.tareas_manager.listar_no_reseteadas(dia_nombre)

                if resultado["status"] != "success":
                    logger.error(f"Error consultando {dia_nombre}")
                    break

                tareas = resultado["registros"]

                # Si no hay tareas pendientes, detener
                if not tareas:
                    logger.info(f"{dia_nombre} ya estaba limpio. Deteniendo.")
                    break

                logger.info(f"Respaldando {dia_nombre} ({len(tareas)} tareas)")
                fecha_real = ahora - timedelta(days=dias_procesados + 1)
                for tarea in tareas:
                    estatus = tarea['estatus']
                    if estatus == "extra" and tarea.get('completadaPor') == None:
                        estatus = "vencida"
                        
                    self.historial_manager.crear_registro(
                        nombre=tarea['nombre'],
                        descripcion=tarea['descripcion'],
                        id_dueño=tarea['id_dueño'],
                        hora_ini=tarea['hora_ini'],
                        hora_fin=tarea['hora_fin'],
                        fecha=fecha_real.strftime('%Y-%m-%d'),
                        puntos=tarea['puntos'],
                        estatus=estatus,
                        completadaPor=tarea.get('completadaPor'),
                        disponible_para_rol=tarea.get('disponible_para_rol', 'todos')
                    )
                    tareas_respaldadas += 1

                # Resetear ese día
                with self.db_manager.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE tareas_semana
                        SET estatus = 'sin_iniciar',
                            completadaPor = NULL
                        WHERE fecha = ?
                    """, (dia_nombre,))
                    conn.commit()

                # Retroceder en la rueda
                indice = (indice - 1) % 7
                dias_procesados += 1

            logger.info(f"BACKUP FINALIZADO. Total tareas respaldadas: {tareas_respaldadas}")

        except Exception as e:
            logger.error(f"Error en backup: {e}")



def ejecutar_backup_manual():
    """Función auxiliar para ejecutar backup manualmente desde test"""
    backup_manager = BackupManager()
    backup_manager.realizar_backup_diario()


if __name__ == "__main__":
    # Test manual del backup
    print("\n🔧 Ejecutando backup manual para pruebas...\n")
    ejecutar_backup_manual()
