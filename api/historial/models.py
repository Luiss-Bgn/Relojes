"""
Modelos para la tabla del historial
"""

from pydantic import BaseModel
from typing import Optional


class HistorialBase(BaseModel):
    nombre: str
    descripcion: str
    id_dueño: int
    hora_ini: str
    hora_fin: str
    fecha: str
    puntos: int
    estatus: str
    disponible_para_rol: Optional[str] = "todos"


class HistorialCrear(HistorialBase):
    pass


class HistorialActualizar(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    hora_ini: Optional[str] = None
    hora_fin: Optional[str] = None
    puntos: Optional[int] = None
    estatus: Optional[str] = None
    completadaPor: Optional[int] = None
    disponible_para_rol: Optional[str] = None


class HistorialResponse(HistorialBase):
    id: int
    completadaPor: Optional[int] = None
    disponible_para_rol: Optional[str] = "todos"

    class Config:
        from_attributes = True
