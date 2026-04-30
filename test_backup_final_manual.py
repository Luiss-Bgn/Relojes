from datetime import datetime
import sys

from backup_scheduler import BackupManager


if __name__ == "__main__":
    # Uso:
    #   python test_backup_final_manual.py
    #   python test_backup_final_manual.py 2026-04-29
    if len(sys.argv) > 1:
        fecha_objetivo = datetime.strptime(sys.argv[1], "%Y-%m-%d")
    else:
        fecha_objetivo = datetime(2026, 4, 29)

    backup = BackupManager()
    backup.realizar_backup_final_para_fecha(fecha_objetivo)
