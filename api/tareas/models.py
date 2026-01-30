"""
modelo de datos para las tareas
"""

from pydantic import BaseModel
from typing import Optional

class TareaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    id_dueño: int
    hora_ini: Optional[str] = None  # Formato HH:MM:SS
    hora_fin: Optional[str] = None  # Formato HH:MM:SS
    fecha: str  # Formato YYYY-MM-DD
    puntos: Optional[int] = 0
    estatus: Optional[str] = "sin iniciar"
    completadaPor: Optional[int] = None
