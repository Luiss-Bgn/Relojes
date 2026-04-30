import hashlib
import json
import logging
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

CONFIG_FILE_NAME = "backup_targets.json"
BACKUP_PREFIX = "relojes_db_backup"
BACKUP_EXTENSION = ".sqlite3"


def _sha256_file(file_path: Path) -> str:
    hasher = hashlib.sha256()
    with file_path.open("rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest()


def _load_config() -> Dict[str, Any]:
    config_path = Path(__file__).resolve().parent / CONFIG_FILE_NAME
    if not config_path.exists():
        raise FileNotFoundError(f"No existe configuración de backup: {config_path}")

    with config_path.open("r", encoding="utf-8") as f:
        config = json.load(f)

    if not isinstance(config, dict):
        raise ValueError("La configuración debe ser un objeto JSON")

    return config


def _safe_filename(corte: str, fecha_real: str, timestamp: datetime) -> str:
    return (
        f"{BACKUP_PREFIX}_{fecha_real}_{timestamp.strftime('%H%M%S')}_{corte}"
        f"{BACKUP_EXTENSION}"
    )


def _create_consistent_sqlite_backup(source_db: Path, target_file: Path) -> None:
    target_tmp = target_file.with_suffix(target_file.suffix + ".tmp")

    source_conn = sqlite3.connect(str(source_db), timeout=30)
    source_conn.execute("PRAGMA busy_timeout = 30000")

    target_conn = sqlite3.connect(str(target_tmp))
    try:
        # SQLite Backup API: copia consistente aunque la DB esté en uso.
        source_conn.backup(target_conn)
        target_conn.commit()
    finally:
        target_conn.close()
        source_conn.close()

    target_tmp.replace(target_file)


def _cleanup_local_backups(local_dir: Path, retention_count: int) -> List[str]:
    if retention_count <= 0:
        return []

    pattern = f"{BACKUP_PREFIX}_*{BACKUP_EXTENSION}"
    backups = sorted(
        local_dir.glob(pattern),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    deleted: List[str] = []
    for old_file in backups[retention_count:]:
        old_file.unlink(missing_ok=True)
        deleted.append(str(old_file))

    return deleted


def replicar_backup_db(corte: str, fecha_real: str, db_path: str) -> Dict[str, Any]:
    """
    Replica backup consistente de SQLite a backups locales y destinos en red.

    Args:
        corte: "morning" o "final"
        fecha_real: fecha de negocio en formato YYYY-MM-DD
        db_path: ruta al archivo SQLite principal

    Returns:
        Resumen con estado local, resultados por destino y limpieza de retención.
    """
    if corte not in ("morning", "final"):
        raise ValueError("corte inválido. Debe ser 'morning' o 'final'")

    cfg = _load_config()
    if not cfg.get("enabled", False):
        return {
            "status": "skipped",
            "reason": "replicacion_deshabilitada",
            "corte": corte,
            "fecha_real": fecha_real,
        }

    local_backup_dir_raw = cfg.get("local_backup_dir")
    retention_count = int(cfg.get("retention_count", 30))
    targets = cfg.get("targets", [])

    if not local_backup_dir_raw:
        raise ValueError("Falta local_backup_dir en backup_targets.json")
    if not isinstance(targets, list):
        raise ValueError("targets debe ser una lista")

    local_backup_dir = Path(local_backup_dir_raw)
    local_backup_dir.mkdir(parents=True, exist_ok=True)

    source_db = Path(db_path)
    if not source_db.exists():
        raise FileNotFoundError(f"No existe DB principal: {source_db}")

    ts = datetime.now()
    backup_filename = _safe_filename(corte, fecha_real, ts)
    local_backup_file = local_backup_dir / backup_filename

    _create_consistent_sqlite_backup(source_db, local_backup_file)
    local_sha256 = _sha256_file(local_backup_file)
    local_size = local_backup_file.stat().st_size

    logger.info(
        "Backup DB local creado: %s | size=%s | sha256=%s",
        local_backup_file,
        local_size,
        local_sha256,
    )

    target_results: List[Dict[str, Any]] = []
    for target in targets:
        target_info: Dict[str, Any] = {
            "target": target,
            "status": "error",
            "message": "",
            "remote_file": None,
        }
        try:
            if not isinstance(target, str) or not target.strip():
                raise ValueError("Destino inválido")

            target_dir = Path(target)
            target_dir.mkdir(parents=True, exist_ok=True)

            remote_file = target_dir / backup_filename
            shutil.copy2(local_backup_file, remote_file)

            remote_size = remote_file.stat().st_size
            remote_sha256 = _sha256_file(remote_file)

            if remote_sha256 != local_sha256:
                raise ValueError(
                    "Checksum no coincide "
                    f"(local={local_sha256}, remote={remote_sha256})"
                )
            if remote_size != local_size:
                raise ValueError(
                    f"Tamaño no coincide (local={local_size}, remote={remote_size})"
                )

            target_info.update(
                {
                    "status": "ok",
                    "message": "Replicación verificada",
                    "remote_file": str(remote_file),
                    "remote_size": remote_size,
                    "remote_sha256": remote_sha256,
                }
            )
            logger.info("Replicación OK en destino %s", target)

        except Exception as e:
            target_info["message"] = str(e)
            logger.error("Replicación FALLIDA en destino %s: %s", target, e)

        target_results.append(target_info)

    deleted_files = _cleanup_local_backups(local_backup_dir, retention_count)
    for deleted in deleted_files:
        logger.info("Retención local: eliminado backup antiguo %s", deleted)

    total_targets = len(target_results)
    ok_targets = sum(1 for r in target_results if r["status"] == "ok")

    return {
        "status": "ok",
        "corte": corte,
        "fecha_real": fecha_real,
        "local_backup_file": str(local_backup_file),
        "local_size": local_size,
        "local_sha256": local_sha256,
        "targets_total": total_targets,
        "targets_ok": ok_targets,
        "targets_error": total_targets - ok_targets,
        "targets": target_results,
        "retention_deleted": deleted_files,
    }
