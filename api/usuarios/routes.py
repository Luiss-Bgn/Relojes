"""
Rutas  para usuarios 
"""

from fastapi import APIRouter, HTTPException, status, File, UploadFile, Form
from database.database import DatabaseManager
from database.db_usuarios import UsuarioManager
from .models import UsuarioCrear, UsuarioActualizar, AutenticarRequest
from .utils import notificar_relojes_async
from pathlib import Path
from typing import Optional
import shutil

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])
# Inicializamos db
db_manager = DatabaseManager("relojes.db")
usuario_manager = UsuarioManager(db_manager)

# Ruta donde se guardan las imágenes
BASE_DIR = Path(__file__).resolve().parent.parent.parent
IMAGES_DIR = BASE_DIR / "web" / "Images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)


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
    
    # 🔥 Si hay imagen, guardarla en /web/Images/
    imagen_filename = None
    if imagen and imagen.filename:
        # Validar que sea imagen
        if not imagen.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo debe ser una imagen"
            )
        
        # 🔥 Usar formato canónico: <username>.<extension>
        ext = Path(imagen.filename).suffix  # Obtener extensión (.jpg, .png, etc.)
        if not ext:
            ext = '.jpg'  # Extensión por defecto si no se detecta
        
        filename = f"{username}{ext}"  # Ejemplo: adrian.jpg
        file_path = IMAGES_DIR / filename
        
        # Guardar archivo (sobrescribe si ya existe)
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(imagen.file, buffer)
            imagen_filename = filename
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al guardar imagen: {str(e)}"
            )
    
    # Crear usuario con el nombre de la imagen
    resultado = usuario_manager.crear_usuario(
        nombre=nombre,
        username=username,
        contraseña=contraseña,
        pin=pin,
        rol=rol,
        puesto=puesto,
        imagen=imagen_filename
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
    
    if not resultado or resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail= resultado.get("mensaje")
        )
    
    return resultado