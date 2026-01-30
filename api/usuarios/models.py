"""
Modelos Pydantic para usuarios, solo para etse modulo, en tareas habra otro
"""

from pydantic import BaseModel
from typing import Optional


class UsuarioBase(BaseModel):
    nombre: str
    username: str
    pin: int
    rol: str
    puesto: str


class UsuarioCrear(UsuarioBase):
    contraseña: str


class UsuarioActualizar(BaseModel):
    nombre: Optional[str] = None
    contraseña: Optional[str] = None
    pin: Optional[int] = None
    rol: Optional[str] = None
    puesto: Optional[str] = None


class UsuarioResponse(UsuarioBase):
    id: int

    class Config:
        from_attributes = True


class AutenticarRequest(BaseModel):
    username: str
    contraseña: str
