"""
db_ciclo.py — Control de cortes/backups del ciclo operativo diario.

Gestiona la tabla backup_control que registra qué cortes (morning/final)
ya se ejecutaron para cada fecha+día, evitando duplicados en historial
y permitiendo que el actualizador automático sepa qué tareas no tocar.

Uso externo principal:
    from database.db_ciclo import CicloOperativoService
    ciclo = CicloOperativoService(db_manager)
"""

import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


class CicloOperativoService:
    """
    Servicio de control de ciclo operativo.

    Responsabilidades:
      - Registrar inicio/fin/fallo de cada corte (morning, final).
      - Consultar si un corte ya fue completado (para evitar duplicados).
      - Consultar si hay un backup corriendo ahora mismo (guard en actualizador).
    """

    CORTE_MORNING = "morning"
    CORTE_FINAL   = "final"

    def __init__(self, db_manager):
        self.db = db_manager

    # ------------------------------------------------------------------
    # Control de estado de cortes
    # ------------------------------------------------------------------

    def mark_backup_started(self, corte: str, fecha_real: str, dia_semana: str) -> bool:
        """
        Registra el inicio de un corte.
        Si ya existe un registro 'done' para este corte/fecha/dia,
        devuelve False (no debe volver a correr).
        Si ya existe 'running', devuelve False (ya está en marcha).
        """
        corte = corte.lower()
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                # Verificar si ya existe
                cursor.execute(
                    "SELECT estado FROM backup_control "
                    "WHERE fecha_real=? AND dia_semana=? AND corte=?",
                    (fecha_real, dia_semana, corte)
                )
                row = cursor.fetchone()
                if row:
                    estado = row["estado"]
                    if estado in ("done", "running"):
                        logger.info(
                            f"Corte {corte} para {dia_semana}/{fecha_real} ya tiene estado '{estado}'. Omitiendo."
                        )
                        return False
                    # Si está en 'failed', permitir reintento: actualizar a running
                    cursor.execute(
                        "UPDATE backup_control SET estado='running', started_at=?, finished_at=NULL "
                        "WHERE fecha_real=? AND dia_semana=? AND corte=?",
                        (datetime.now().isoformat(), fecha_real, dia_semana, corte)
                    )
                else:
                    cursor.execute(
                        "INSERT INTO backup_control (fecha_real, dia_semana, corte, estado, started_at) "
                        "VALUES (?, ?, ?, 'running', ?)",
                        (fecha_real, dia_semana, corte, datetime.now().isoformat())
                    )
                conn.commit()
                logger.info(f"Corte {corte} INICIADO — {dia_semana} ({fecha_real})")
                return True
        except Exception as e:
            logger.error(f"Error en mark_backup_started: {e}")
            return False

    def mark_backup_finished(self, corte: str, fecha_real: str, dia_semana: str) -> None:
        """Marca el corte como completado exitosamente."""
        corte = corte.lower()
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE backup_control SET estado='done', finished_at=? "
                    "WHERE fecha_real=? AND dia_semana=? AND corte=?",
                    (datetime.now().isoformat(), fecha_real, dia_semana, corte)
                )
                conn.commit()
            logger.info(f"Corte {corte} FINALIZADO — {dia_semana} ({fecha_real})")
        except Exception as e:
            logger.error(f"Error en mark_backup_finished: {e}")

    def mark_backup_failed(self, corte: str, fecha_real: str, dia_semana: str) -> None:
        """Marca el corte como fallido (permite reintento posterior)."""
        corte = corte.lower()
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE backup_control SET estado='failed', finished_at=? "
                    "WHERE fecha_real=? AND dia_semana=? AND corte=?",
                    (datetime.now().isoformat(), fecha_real, dia_semana, corte)
                )
                conn.commit()
            logger.warning(f"Corte {corte} FALLIDO — {dia_semana} ({fecha_real})")
        except Exception as e:
            logger.error(f"Error en mark_backup_failed: {e}")

    # ------------------------------------------------------------------
    # Consultas de estado
    # ------------------------------------------------------------------

    def is_backup_running(self) -> bool:
        """
        Devuelve True si hay algún corte en estado 'running' ahora mismo.
        El actualizador automático usa esto como guard para no pisar estados.
        """
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT COUNT(*) as cnt FROM backup_control WHERE estado='running'"
                )
                row = cursor.fetchone()
                return (row["cnt"] > 0) if row else False
        except Exception as e:
            logger.error(f"Error en is_backup_running: {e}")
            return False

    def is_cutoff_done(self, fecha_real: str, dia_semana: str, corte: str) -> bool:
        """
        Devuelve True si el corte (morning o final) ya fue completado
        para esta fecha_real + dia_semana.
        Usado por el actualizador para omitir tareas del corte matutino.
        """
        corte = corte.lower()
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT estado FROM backup_control "
                    "WHERE fecha_real=? AND dia_semana=? AND corte=?",
                    (fecha_real, dia_semana, corte)
                )
                row = cursor.fetchone()
                return row is not None and row["estado"] == "done"
        except Exception as e:
            logger.error(f"Error en is_cutoff_done: {e}")
            return False
