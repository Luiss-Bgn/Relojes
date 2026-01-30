"""
Rutas  para usuarios 
"""

from fastapi import APIRouter, HTTPException, status
from database.database import DatabaseManager
from database.db_usuarios import UsuarioManager
from .models import UsuarioCrear, UsuarioActualizar, AutenticarRequest
from .utils import notificar_relojes_async

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])
# Inicializamos db
db_manager = DatabaseManager("relojes.db")
usuario_manager = UsuarioManager(db_manager)


# ENdpoints crud

@router.post("" , response_model=dict, status_code=status.HTTP_201_CREATED)
async def crear_usuario(usuario: UsuarioCrear):

    resultado = usuario_manager.crear_usuario(
        nombre=usuario.nombre,
        username=usuario.username,
        contraseña=usuario.contraseña,
        pin=usuario.pin,
        rol=usuario.rol,
        puesto=usuario.puesto
    )
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=resultado.get("mensaje")
        )
    
    # Notificar relojes de la actualización
    notificar_relojes_async(usuario_manager)
    
    return resultado


@router.get("" , response_model=dict)
async def listar_usuarios():
#    Listae todos los usuarios
    resultado = usuario_manager.listar_usuarios()
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=resultado.get("mensaje")
        )
    
    return resultado


@router.get("/{usuario_id}" , response_model=dict)
async def obtener_usuario(usuario_id: int):
    #usuaerio en especifico
    resultado = usuario_manager.obtener_usuario(usuario_id)
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=resultado.get("mensaje")
        )
    
    return resultado


@router.put("/{usuario_id}", response_model=dict)
async def actualizar_usuario(usuario_id: int, datos: UsuarioActualizar):
    
    #Actualiza datos de un usuario
    # Filtrar solo los campos que se van a actualizar
    datos_dict = {k: v for k, v in datos.dict().items() if v is not None}
    
    if not datos_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail= "Se requiere al menos un campo para actualizar"
        )
    
    resultado = usuario_manager.actualizar_usuario(usuario_id, **datos_dict)
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code= status.HTTP_404_NOT_FOUND,
            detail =resultado.get("mensaje")
        )
    
    #  actualización a relojes
    notificar_relojes_async(usuario_manager)
    
    return resultado


@router.delete("/{usuario_id}", response_model=dict)
async def eliminar_usuario(usuario_id: int):
    #Elimina un usuario
    
    resultado = usuario_manager.eliminar_usuario(usuario_id)
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail= resultado.get("mensaje")
        )
    notificar_relojes_async(usuario_manager)
    
    return resultado


# Authenticiación

@router.post("/autenticar", response_model=dict)
async def autenticar(datos: AutenticarRequest):
    
    #Autentica un usuario y retorna datos del usuario si es exitosa la autenticación
    
    resultado = usuario_manager.autenticar(
        username =datos.username,
        contraseña =datos.contraseña
    )
    

    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail= resultado.get("mensaje")
        )
    
    return resultado
