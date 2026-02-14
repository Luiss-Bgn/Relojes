"""
Rutas  para usuarios 
"""

from fastapi import APIRouter, HTTPException, status, File, UploadFile, Form, Request
from database.database import DatabaseManager
from database.db_usuarios import UsuarioManager
from .models import UsuarioCrear, UsuarioActualizar, AutenticarRequest
from .utils import notificar_relojes_async
from pathlib import Path
from typing import Optional
import shutil
import os

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])
# Inicializamos db
db_manager = DatabaseManager("relojes.db")
usuario_manager = UsuarioManager(db_manager)

# Ruta donde se guardan las imágenes
BASE_DIR = Path(__file__).resolve().parent.parent.parent
IMAGES_DIR = BASE_DIR / "web" / "Images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)


def eliminar_imagen_usuario(imagen_filename: str):
    """Elimina la imagen de un usuario del sistema de archivos"""
    if imagen_filename:
        try:
            file_path = IMAGES_DIR / imagen_filename
            if file_path.exists():
                os.remove(file_path)
                return True
        except Exception as e:
            print(f"Error al eliminar imagen {imagen_filename}: {e}")
    return False


# ENdpoints crud

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    nombre: str = Form(...),
    username: str = Form(...),
    contraseña: str = Form(...),
    pin: int = Form(...),
    rol: str = Form(...),
    puesto: str = Form(...),
    imagen: Optional[UploadFile] = File(None)
):
    """
    Crea un nuevo usuario.
    Acepta FormData con campos de texto y archivo de imagen opcional.
    """
    
    # Crear usuario primero para obtener el ID
    resultado = usuario_manager.crear_usuario(
        nombre=nombre,
        username=username,
        contraseña=contraseña,
        pin=pin,
        rol=rol,
        puesto=puesto,
        imagen=None  # Temporalmente None
    )
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=resultado.get("mensaje")
        )
    
    # Obtener el ID del usuario recién creado
    usuario_id = resultado.get("usuario", {}).get("id")
    
    # 🔥 Si hay imagen, guardarla con el ID del usuario
    imagen_filename = None
    if imagen and imagen.filename and usuario_id:
        # Validar que sea imagen
        if not imagen.content_type.startswith('image/'):
            # Si falla, eliminar el usuario creado
            usuario_manager.eliminar_usuario(usuario_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo debe ser una imagen"
            )
        
        # 🔥 Usar formato canónico: <id_user>.<extension>
        ext = Path(imagen.filename).suffix  # Obtener extensión (.jpg, .png, etc.)
        if not ext:
            ext = '.jpg'  # Extensión por defecto si no se detecta
        
        filename = f"{usuario_id}{ext}"  # Ejemplo: 5.jpg
        file_path = IMAGES_DIR / filename
        
        # Guardar archivo (sobrescribe si ya existe)
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(imagen.file, buffer)
            imagen_filename = filename
            
            # Actualizar usuario con el nombre de la imagen
            usuario_manager.actualizar_usuario(usuario_id, imagen=imagen_filename)
            resultado = usuario_manager.obtener_usuario(usuario_id)
            
        except Exception as e:
            # Si falla al guardar la imagen, eliminar el usuario
            usuario_manager.eliminar_usuario(usuario_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al guardar imagen: {str(e)}"
            )
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=resultado.get("mensaje")
        )
    
    # Notificar relojes de la actualización
    notificar_relojes_async(usuario_manager)
    
    return resultado


@router.get("", response_model=dict)
async def listar_usuarios():
#    Listae todos los usuarios
    resultado = usuario_manager.listar_usuarios()
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=resultado.get("mensaje")
        )
    
    return resultado


@router.get("/{usuario_id}", response_model=dict)
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
async def actualizar_usuario(
    request: Request,
    usuario_id: int,
    nombre: Optional[str] = Form(None),
    username: Optional[str] = Form(None),
    contraseña: Optional[str] = Form(None),
    pin: Optional[str] = Form(None),
    rol: Optional[str] = Form(None),
    puesto: Optional[str] = Form(None),
    imagen: Optional[UploadFile] = File(None)
):
    """
    Actualiza un usuario.
    Permite actualizar datos normales y opcionalmente la imagen.
    Recibe multipart/form-data.
    """

    # 🔎 Verificar que el usuario exista
    usuario_resultado = usuario_manager.obtener_usuario(usuario_id)

    if usuario_resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    usuario_actual = usuario_resultado["usuario"]

    # 📦 Construir diccionario dinámico de actualización
    datos_actualizar = {}

    if nombre is not None:
        datos_actualizar["nombre"] = nombre

    if username is not None:
        datos_actualizar["username"] = username

    if contraseña is not None:
        datos_actualizar["contraseña"] = contraseña

    if pin is not None:
        datos_actualizar["pin"] = pin

    if rol is not None:
        datos_actualizar["rol"] = rol

    if puesto is not None:
        datos_actualizar["puesto"] = puesto

    # 🖼 Manejo de imagen
    if imagen and imagen.filename:

        # Validar tipo
        if not imagen.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo debe ser una imagen válida"
            )

        # Eliminar imagen anterior si existe
        imagen_anterior = usuario_actual.get("imagen")
        if imagen_anterior:
            eliminar_imagen_usuario(imagen_anterior)

        # Guardar nueva imagen con nombre canónico
        ext = Path(imagen.filename).suffix or ".jpg"
        filename = f"{usuario_id}{ext}"
        file_path = IMAGES_DIR / filename

        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(imagen.file, buffer)

            datos_actualizar["imagen"] = filename

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al guardar imagen: {str(e)}"
            )

    # 🚀 Delegar actualización al Manager (NO tocamos DAO directo)
    resultado = usuario_manager.actualizar_usuario(usuario_id, **datos_actualizar)

    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=resultado.get("mensaje")
        )

    # 🔔 Notificar relojes
    notificar_relojes_async(usuario_manager)

    return resultado



@router.delete("/{usuario_id}", response_model=dict)
async def eliminar_usuario(usuario_id: int):
    """Elimina un usuario y su imagen asociada"""
    
    # Obtener usuario para saber qué imagen eliminar
    usuario_resultado = usuario_manager.obtener_usuario(usuario_id)
    
    if usuario_resultado.get("status") == "success":
        usuario = usuario_resultado.get("usuario", {})
        imagen_filename = usuario.get("imagen")
        
        # Eliminar usuario de la base de datos
        resultado = usuario_manager.eliminar_usuario(usuario_id)
        
        if resultado.get("status") != "success":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=resultado.get("mensaje")
            )
        
        # 🔥 Eliminar imagen del sistema de archivos
        if imagen_filename:
            eliminar_imagen_usuario(imagen_filename)
        
        notificar_relojes_async(usuario_manager)
        
        return resultado
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )


# Authenticiación

@router.post("/autenticar", response_model=dict)
async def autenticar(datos: AutenticarRequest):
    
    #Autentica un usuario y retorna datos del usuario si es exitosa la autenticación
    
    # print("datos recibidos para autenticar:", datos)
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

@router.get("/pin/{pin}", response_model=dict)
async def buscar_usuario_por_pin(pin: str):
    
    resultado = usuario_manager.buscar_por_pin(pin)
    
    # if not resultado or resultado.get("status") != "success":
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail= resultado.get("mensaje")
    #     )
    
    return resultado

@router.get("/usuario/{usuario}", response_model=dict)
async def buscar_usuario_por_usuario(usuario: str):
    
    resultado = usuario_manager.buscar_por_usuario(usuario)
    
    # if not resultado or resultado.get("status") != "success":
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail= resultado.get("mensaje")
    #     )
    
    return resultado