import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Optional, List, Dict, Any
import uuid


class DatabaseManager:
    """Gestor principal de la base de datos SQLite"""
    
    def __init__(self, db_path: str = "relojes.db"):
        """
        Inicializa el gestor de base de datos
        
        Args:
            db_path: Ruta al archivo de base de datos SQLite
        """
        self.db_path = db_path
        self._init_database()
    
    @contextmanager
    def get_connection(self):
        #obtener conexión a la db
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
        finally:
            conn.close()
    
    def _init_database(self):
     #Inicializar la db creando las tablas si no existen
        with self.get_connection() as conn:
            cursor = conn.cursor()
            self._create_tables(cursor)
            conn.commit()
    
    def _create_tables(self, cursor: sqlite3.Cursor):
        """Crea todas las tablas de la base de datos"""
        
        # Tabla Relojes
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS relojes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT UNIQUE NOT NULL,
                empleado_id INTEGER,
                rol TEXT,
                nombre TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabla Usuarios
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                contraseña TEXT NOT NULL,
                pin INTEGER NOT NULL,
                rol TEXT NOT NULL,
                puesto TEXT NOT NULL,
                imagen TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabla Historial
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS historial (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                id_dueño INTEGER NOT NULL,
                hora_ini TIME,
                hora_fin TIME,
                fecha DATE NOT NULL,
                puntos INTEGER,
                estatus TEXT,
                completadaPor INTEGER,
                disponible_para_rol TEXT DEFAULT 'todos',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabla Tareas de la Semana
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tareas_semana (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                id_dueño INTEGER NOT NULL,
                hora_ini TIME,
                hora_fin TIME,
                fecha TEXT NOT NULL,
                puntos INTEGER,
                estatus TEXT,
                completadaPor INTEGER,
                disponible_para_rol TEXT DEFAULT 'todos',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_dueño) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (completadaPor) REFERENCES usuarios(id) ON DELETE SET NULL
            )
        ''')

        # Tabla de control de cortes/backups
        # Registra qué cortes ya se ejecutaron en cada fecha real para:
        #   - evitar duplicados en historial
        #   - decirle al actualizador automático qué tareas ya están cerradas
        # Columnas:
        #   fecha_real   : fecha YYYY-MM-DD del backup
        #   dia_semana   : nombre del día (Lunes … Domingo)
        #   corte        : 'morning' o 'final'
        #   estado       : 'running' | 'done' | 'failed'
        #   started_at   : timestamp de inicio
        #   finished_at  : timestamp de fin (NULL si no terminó)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS backup_control (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha_real  TEXT NOT NULL,
                dia_semana  TEXT NOT NULL,
                corte       TEXT NOT NULL CHECK(corte IN ('morning', 'final')),
                estado      TEXT NOT NULL DEFAULT 'running' CHECK(estado IN ('running', 'done', 'failed')),
                started_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                finished_at TIMESTAMP,
                UNIQUE(fecha_real, dia_semana, corte)
            )
        ''')



