"""
Rutas (endpoints) para tareas de la semana
"""
from fastapi import APIRouter, HTTPException, status
from database.database import DatabaseManager
from database.db_tareas import TareasManager
from .models import TareasCrear, TareasActualizar
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tareas", tags=["Tareas"])
db_manager = DatabaseManager("relojes.db")  # Inicializamos manager con la db real
tareas_manager = TareasManager(db_manager)


@router.post( "", response_model=dict, status_code =status.HTTP_201_CREATED)
async def crear_registro(registro: TareasCrear):
    #Crea un nuevo registro en el TAREAS
    #aqui se agregaran condiciones por cada endpoint
    resultado = tareas_manager.crear_registro(
        nombre=registro.nombre,
        descripcion=registro.descripcion,
        id_dueño=registro.id_dueño,
        hora_ini=registro.hora_ini,
        hora_fin=registro.hora_fin,
        fecha=registro.fecha,
        puntos=registro.puntos,
        estatus=registro.estatus
    )
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=resultado.get("mensaje")
        )
    
    
    return resultado

@router.get("", response_model=dict)
async def listar_tareas():
    #get todo
    resultado = tareas_manager.listar_todos()
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=resultado.get("mensaje")
        )
    return resultado


@router.get("/{registro_id}", response_model=dict)
async def obtener_registro(registro_id: int):
    #get por id 
    resultado = tareas_manager.obtener_registro(registro_id)
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=resultado.get("mensaje")
        )
    return resultado


@router.get("/usuario/{usuario_id}", response_model=dict)
async def listar_por_usuario(usuario_id : int):
    #obtener lista de tareas por usuario
    resultado = tareas_manager.listar_por_usuario(usuario_id)
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail = resultado.get("mensaje")
        )
    
    return resultado


@router.get("/fecha/{fecha}", response_model=dict)
async def listar_por_fecha(fecha: str):
    #obtiene toda la lista de tareas segun la fecha 
    resultado = tareas_manager.listar_por_fecha(fecha)
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=resultado.get("mensaje")
        )
    
    
    return resultado


@router.put("/{registro_id}", response_model=dict)
async def actualizar_registro(registro_id: int, datos: TareasActualizar):
    #Update de tarea
    #Filtra los campos que vienen
    datos_dict = {k: v for k, v in datos.dict().items() if v is not None}
    
    if not datos_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere al menos un campo para actualizar"
        )
    
    resultado = tareas_manager.actualizar_registro(registro_id, **datos_dict)
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=resultado.get("mensaje")
        )
    
    return resultado


@router.delete("/{registro_id}", response_model=dict)
async def eliminar_registro(registro_id: int):
    #Elimina una tarea de TAREAS
    resultado = tareas_manager.eliminar_registro(registro_id)
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail= resultado.get("mensaje")
        )
    
    return resultado
