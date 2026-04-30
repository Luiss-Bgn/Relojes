"""
Backup Scheduler - Sistema de cortes/autoguardado de tareas por turnos.

Dos cortes configurables por día:
  - Corte matutino (morning): guarda tareas con hora_fin <= BACKUP_MORNING_TIME.
                               NO resetea tareas ni cierra el día.
  - Corte final   (final):    guarda tareas restantes (hora_fin > BACKUP_MORNING_TIME
                               o sin hora_fin), evita duplicar las del corte matutino,
                               cierra el día y resetea para el siguiente ciclo.

Para cambiar los horarios modifica las constantes BACKUP_MORNING_TIME / BACKUP_FINAL_TIME.
"""

import schedule
import sqlite3
import time
from datetime import datetime, timedelta
from database.database import DatabaseManager
from database.db_tareas import TareasManager
from database.db_ciclo import CicloOperativoService
from db_file_backup import replicar_backup_db
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN DE HORARIOS
# Cambia estos valores para ajustar los horarios de autoguardado.
# Formato HH:MM (24 h).
# ─────────────────────────────────────────────────────────────────────
BACKUP_MORNING_TIME = "16:00"   # Corte matutino (ej: 4 PM)
BACKUP_FINAL_TIME   = "00:01"   # Corte final / cierre de día


def _obtener_corte_tarea(hora_fin: str, morning_cutoff: str) -> str:
    """
    Clasifica una tarea en 'morning' o 'final' según su hora_fin.

    Reglas:
      - hora_fin <= morning_cutoff  → 'morning'
      - hora_fin >  morning_cutoff  → 'final'
      - Sin hora_fin o formato inválido → 'final' (seguro por defecto)

    Args:
        hora_fin:       Hora de fin de la tarea en formato 'HH:MM'.
        morning_cutoff: Hora límite del corte matutino en formato 'HH:MM'.

    Returns:
        'morning' o 'final'
    """
    if not hora_fin:
        return "final"
    try:
        t_fin    = datetime.strptime(hora_fin,       "%H:%M").time()
        t_cutoff = datetime.strptime(morning_cutoff, "%H:%M").time()
        return "morning" if t_fin <= t_cutoff else "final"
    except ValueError:
        logger.warning(f"Formato de hora_fin inválido: '{hora_fin}'. Asignando a corte final.")
        return "final"


class BackupManager:
    """Administrador del backup automático de tareas_semana a historial."""

    def __init__(self):
        self.db_manager       = DatabaseManager("relojes.db")
        self.tareas_manager   = TareasManager(self.db_manager)
        self.ciclo            = CicloOperativoService(self.db_manager)

        # Limpiar estados 'running' huérfanos de ejecuciones anteriores que
        # quedaron sin cerrar por un crash del servidor. Se marcan 'failed'
        # para permitir reintento y para que is_backup_running() no bloquee
        # el actualizador automático indefinidamente.
        try:
            with self.db_manager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE backup_control SET estado='failed' WHERE estado='running'"
                )
                conn.commit()
        except Exception as e:
            logger.warning(f"No se pudieron limpiar estados running huérfanos: {e}")

        self.dias_ordenados = [
            'Domingo', 'Lunes', 'Martes', 'Miércoles',
            'Jueves',  'Viernes', 'Sábado'
        ]

    def obtener_nombre_dia(self, fecha: datetime) -> str:
        dias_python = ['Lunes', 'Martes', 'Miércoles', 'Jueves',
                       'Viernes', 'Sábado', 'Domingo']
        return dias_python[fecha.weekday()]

    # ------------------------------------------------------------------
    # TRANSACCIÓN ATÓMICA — núcleo del sistema de idempotencia
    # ------------------------------------------------------------------

    def _ejecutar_corte_atomico(
        self,
        tareas_a_guardar: list,
        fecha_real: str,
        dia_nombre: str,
        es_final: bool,
        corte_str: str,
        convertir_en_progreso_a_vencida: bool = False,
        convertir_extra_incompleta_a_vencida: bool = True,
    ) -> None:
        """
        Inserta los registros en historial, opcionalmente resetea el día y
        marca el corte como done, todo dentro de una única transacción SQLite.

        Garantías:
          - Todo-o-nada: si cualquier operación falla, ROLLBACK completo.
          - Historial, reset y marcado done son atómicos: no puede quedar
            un estado parcial persistente.
          - En retry tras fallo: backup_control sigue en 'running'/'failed',
            lo que permite que mark_backup_started autorice una nueva ejecución;
            como el ROLLBACK deshace las inserciones previas, no hay duplicados.

        El llamador debe capturar la excepción y llamar mark_backup_failed().
        """
        conn = sqlite3.connect(self.db_manager.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            conn.execute("BEGIN IMMEDIATE")

            for tarea in tareas_a_guardar:
                estatus = tarea['estatus']
                if es_final and convertir_en_progreso_a_vencida and estatus == "en_progreso":
                    estatus = "vencida"
                if convertir_extra_incompleta_a_vencida and estatus == "extra" and tarea.get('completadaPor') is None:
                    estatus = "vencida"
                conn.execute(
                    """
                    INSERT INTO historial
                        (nombre, descripcion, id_dueño, hora_ini, hora_fin,
                         fecha, puntos, estatus, completadaPor, disponible_para_rol)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        tarea['nombre'],
                        tarea['descripcion'],
                        tarea['id_dueño'],
                        tarea['hora_ini'],
                        tarea['hora_fin'],
                        fecha_real,
                        tarea['puntos'],
                        estatus,
                        tarea.get('completadaPor'),
                        tarea.get('disponible_para_rol', 'todos'),
                    )
                )

            if es_final:
                conn.execute(
                    "UPDATE tareas_semana SET estatus = 'sin_iniciar', completadaPor = NULL "
                    "WHERE fecha = ?",
                    (dia_nombre,)
                )

            conn.execute(
                "UPDATE backup_control SET estado = 'done', finished_at = ? "
                "WHERE fecha_real = ? AND dia_semana = ? AND corte = ?",
                (datetime.now().isoformat(), fecha_real, dia_nombre, corte_str)
            )

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # CORTE MATUTINO
    # ------------------------------------------------------------------

    def realizar_backup_morning(self):
        """
        Corte matutino: guarda en historial solo las tareas cuya
        hora_fin <= BACKUP_MORNING_TIME del día en curso.

        NO resetea tareas (el día sigue corriendo).
        NO cierra el ciclo.
        Si ya se ejecutó hoy, lo omite silenciosamente (anti-duplicado).
        """
        ahora      = datetime.now()
        fecha_real = ahora.strftime('%Y-%m-%d')
        dia_nombre = self.obtener_nombre_dia(ahora)

        logger.info(f"=== CORTE MATUTINO [{dia_nombre} / {fecha_real}] ===")

        iniciado = self.ciclo.mark_backup_started(
            CicloOperativoService.CORTE_MORNING, fecha_real, dia_nombre
        )
        if not iniciado:
            logger.info("Corte matutino ya ejecutado o en progreso. Omitiendo.")
            return

        try:
            resultado = self.tareas_manager.listar_no_reseteadas(dia_nombre)
            if resultado["status"] != "success":
                raise RuntimeError(f"Error al consultar tareas de {dia_nombre}")

            tareas_a_guardar = []
            omitidas = 0
            for tarea in resultado["registros"]:
                if _obtener_corte_tarea(tarea.get('hora_fin'), BACKUP_MORNING_TIME) == "morning":
                    tareas_a_guardar.append(tarea)
                else:
                    omitidas += 1

            self._ejecutar_corte_atomico(
                tareas_a_guardar, fecha_real, dia_nombre,
                es_final=False, corte_str=CicloOperativoService.CORTE_MORNING
            )

            try:
                resultado_replica = replicar_backup_db(
                    corte=CicloOperativoService.CORTE_MORNING,
                    fecha_real=fecha_real,
                    db_path=self.db_manager.db_path,
                )
                logger.info(
                    "Replicación DB post-morning: status=%s, ok=%s, error=%s",
                    resultado_replica.get("status"),
                    resultado_replica.get("targets_ok", 0),
                    resultado_replica.get("targets_error", 0),
                )
            except Exception as e:
                logger.error("Error en replicación DB post-morning: %s", e)

            logger.info(
                f"Corte matutino LISTO — respaldadas: {len(tareas_a_guardar)}, "
                f"dejadas para corte final: {omitidas}"
            )

        except Exception as e:
            logger.error(f"Error en corte matutino: {e}")
            self.ciclo.mark_backup_failed(
                CicloOperativoService.CORTE_MORNING, fecha_real, dia_nombre
            )

    # ------------------------------------------------------------------
    # CORTE FINAL
    # ------------------------------------------------------------------

    def realizar_backup_final(self):
        """
        Corte final: guarda en historial las tareas del corte final
        (hora_fin > BACKUP_MORNING_TIME) del día anterior y cualquier
        día atrás pendiente.

        Evita duplicar tareas ya guardadas por el corte matutino.
        Resetea tareas y cierra el día operativo al terminar.
        """
        logger.info("=== CORTE FINAL (CIERRE DE DÍA) ===")

        ahora          = datetime.now()
        ayer           = ahora - timedelta(days=1)
        nombre_ayer    = self.obtener_nombre_dia(ayer)
        indice         = self.dias_ordenados.index(nombre_ayer)
        tareas_totales = 0
        dias_procesados = 0

        while dias_procesados < 7:
            dia_nombre = self.dias_ordenados[indice]
            fecha_real = (ahora - timedelta(days=dias_procesados + 1)).strftime('%Y-%m-%d')

            resultado = self.tareas_manager.listar_no_reseteadas(dia_nombre)
            if resultado["status"] != "success":
                logger.error(f"Error consultando {dia_nombre}")
                break

            tareas = resultado["registros"]
            if not tareas:
                logger.info(f"{dia_nombre} ya estaba limpio. Deteniendo rueda.")
                break

            iniciado = self.ciclo.mark_backup_started(
                CicloOperativoService.CORTE_FINAL, fecha_real, dia_nombre
            )
            if not iniciado:
                # Corte ya done o running — no insertar, no resetear de nuevo.
                logger.info(
                    f"Corte final {dia_nombre}/{fecha_real} ya ejecutado o en progreso. "
                    "Sin acción adicional."
                )
                indice = (indice - 1) % 7
                dias_procesados += 1
                continue

            try:
                morning_ya_cerrado = self.ciclo.is_cutoff_done(
                    fecha_real, dia_nombre, CicloOperativoService.CORTE_MORNING
                )

                tareas_a_guardar = []
                for tarea in tareas:
                    corte_tarea = _obtener_corte_tarea(
                        tarea.get('hora_fin'), BACKUP_MORNING_TIME
                    )
                    if morning_ya_cerrado and corte_tarea == "morning":
                        continue
                    tareas_a_guardar.append(tarea)

                self._ejecutar_corte_atomico(
                    tareas_a_guardar, fecha_real, dia_nombre,
                    es_final=True, corte_str=CicloOperativoService.CORTE_FINAL
                )

                try:
                    resultado_replica = replicar_backup_db(
                        corte=CicloOperativoService.CORTE_FINAL,
                        fecha_real=fecha_real,
                        db_path=self.db_manager.db_path,
                    )
                    logger.info(
                        "Replicación DB post-final: status=%s, ok=%s, error=%s",
                        resultado_replica.get("status"),
                        resultado_replica.get("targets_ok", 0),
                        resultado_replica.get("targets_error", 0),
                    )
                except Exception as e:
                    logger.error("Error en replicación DB post-final: %s", e)

                tareas_totales += len(tareas_a_guardar)
                logger.info(
                    f"Corte final {dia_nombre} — "
                    f"respaldadas: {len(tareas_a_guardar)}, reseteado."
                )

            except Exception as e:
                logger.error(f"Error en corte final para {dia_nombre}: {e}")
                self.ciclo.mark_backup_failed(
                    CicloOperativoService.CORTE_FINAL, fecha_real, dia_nombre
                )

            indice = (indice - 1) % 7
            dias_procesados += 1

        logger.info(
            f"=== CORTE FINAL COMPLETO. Total nuevas entradas historial: {tareas_totales} ==="
        )

    def realizar_backup_final_para_fecha(self, fecha_objetivo: datetime):
        """
        Ejecuta el corte final de manera explícita para una fecha concreta.

        Uso principal: pruebas manuales controladas sin alterar la lógica
        productiva del schedule de las 00:01.

        Reglas:
          - Misma prevención de duplicados por backup_control.
          - Misma transacción atómica (historial + reset + done).
          - Si el corte final ya está done/running, no inserta ni resetea.
        """
        if not isinstance(fecha_objetivo, datetime):
            raise TypeError("fecha_objetivo debe ser datetime")

        fecha_real = fecha_objetivo.strftime('%Y-%m-%d')
        dia_nombre = self.obtener_nombre_dia(fecha_objetivo)

        logger.info(f"=== CORTE FINAL MANUAL [{dia_nombre} / {fecha_real}] ===")

        resultado = self.tareas_manager.listar_no_reseteadas(dia_nombre)
        if resultado["status"] != "success":
            logger.error(f"Error consultando {dia_nombre}")
            return

        tareas = resultado["registros"]
        if not tareas:
            logger.info(f"{dia_nombre} ya estaba limpio. No hay nada que cerrar.")
            return

        iniciado = self.ciclo.mark_backup_started(
            CicloOperativoService.CORTE_FINAL, fecha_real, dia_nombre
        )
        if not iniciado:
            logger.info(
                f"Corte final manual {dia_nombre}/{fecha_real} ya ejecutado o en progreso. "
                "Sin acción adicional."
            )
            return

        try:
            morning_ya_cerrado = self.ciclo.is_cutoff_done(
                fecha_real, dia_nombre, CicloOperativoService.CORTE_MORNING
            )

            tareas_a_guardar = []
            for tarea in tareas:
                corte_tarea = _obtener_corte_tarea(
                    tarea.get('hora_fin'), BACKUP_MORNING_TIME
                )
                if morning_ya_cerrado and corte_tarea == "morning":
                    continue
                tareas_a_guardar.append(tarea)

            self._ejecutar_corte_atomico(
                tareas_a_guardar,
                fecha_real,
                dia_nombre,
                es_final=True,
                corte_str=CicloOperativoService.CORTE_FINAL,
                convertir_en_progreso_a_vencida=True,
                convertir_extra_incompleta_a_vencida=False,
            )

            try:
                resultado_replica = replicar_backup_db(
                    corte=CicloOperativoService.CORTE_FINAL,
                    fecha_real=fecha_real,
                    db_path=self.db_manager.db_path,
                )
                logger.info(
                    "Replicación DB post-final-manual: status=%s, ok=%s, error=%s",
                    resultado_replica.get("status"),
                    resultado_replica.get("targets_ok", 0),
                    resultado_replica.get("targets_error", 0),
                )
            except Exception as e:
                logger.error("Error en replicación DB post-final-manual: %s", e)

            logger.info(
                f"Corte final manual {dia_nombre} — "
                f"respaldadas: {len(tareas_a_guardar)}, reseteado."
            )

        except Exception as e:
            logger.error(f"Error en corte final manual para {dia_nombre}: {e}")
            self.ciclo.mark_backup_failed(
                CicloOperativoService.CORTE_FINAL, fecha_real, dia_nombre
            )

    # ------------------------------------------------------------------
    # Compatibilidad: backup diario original (por si se llama desde tests)
    # ------------------------------------------------------------------

    def realizar_backup_diario(self):
        """
        Alias de compatibilidad con el comportamiento anterior.
        Ejecuta el corte final completo (incluye reset).
        Mantener para no romper llamadas externas.
        """
        logger.info("realizar_backup_diario() → delegando a realizar_backup_final()")
        self.realizar_backup_final()


# ─────────────────────────────────────────────────────────────────────
# Entrypoints manuales para pruebas
# ─────────────────────────────────────────────────────────────────────

def ejecutar_backup_manual():
    """Ejecuta el corte final manualmente (compatibilidad con tests existentes)."""
    backup_manager = BackupManager()
    backup_manager.realizar_backup_final()


def ejecutar_backup_morning_manual():
    """Ejecuta el corte matutino manualmente."""
    backup_manager = BackupManager()
    backup_manager.realizar_backup_morning()


if __name__ == "__main__":
    import sys
    modo = sys.argv[1] if len(sys.argv) > 1 else "final"
    print(f"\n🔧 Ejecutando backup manual: corte={modo}\n")
    if modo == "morning":
        ejecutar_backup_morning_manual()
    else:
        ejecutar_backup_manual()

