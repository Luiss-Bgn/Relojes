"""
Modelos para la tabla del Tareas
"""

from pydantic import BaseModel
from typing import Optional


class TareasBase(BaseModel):
    nombre: str
    descripcion: str
    id_dueño: int
    hora_ini: str
    hora_fin: str
    fecha: list[str]
    puntos: int
    estatus: str
    disponible_para_rol: Optional[str] = "todos"


class TareasCrear(TareasBase):
    pass


class TareasActualizar(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    hora_ini: Optional[str] = None
    hora_fin: Optional[str] = None
    puntos: Optional[int] = None
    estatus: Optional[str] = None
    completadaPor: Optional[int] = None
    disponible_para_rol: Optional[str] = None


class TareasResponse(TareasBase):
    id: int
    completadaPor: Optional[int] = None
    disponible_para_rol: Optional[str] = "todos"

    class Config:
        from_attributes = True
