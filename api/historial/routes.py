"""
Rutas (endpoints) para historial
"""
from fastapi import APIRouter, HTTPException, status
from database.database import DatabaseManager
from database.db_historial import HistorialManager
from .models import HistorialCrear, HistorialActualizar
from .utils import enriquecer_historial
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/historial", tags=["Historial"])
db_manager = DatabaseManager("relojes.db") #iniciaizamos manager ocn la db real
historial_manager = HistorialManager(db_manager)


@router.post( "", response_model=dict, status_code =status.HTTP_201_CREATED)
async def crear_registro(registro: HistorialCrear):
    #Crea un nuevo registro en el historial
    #aqui se agregaran condiciones por cada endpoint
    resultado = historial_manager.crear_registro(
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
    resultado["registro"] = enriquecer_historial(resultado.get("registro", {}))
    
    return resultado

@router.get("", response_model=dict)
async def listar_historial():
    #get todo
    resultado = historial_manager.listar_todos()
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=resultado.get("mensaje")
        )
    
    # Enriquecer cada registro
    if "registros" in resultado:
        resultado["registros"] = [enriquecer_historial(r) for r in resultado["registros"]]
    
    return resultado


@router.get("/{registro_id}", response_model=dict)
async def obtener_registro(registro_id: int):
    #get por id 
    resultado = historial_manager.obtener_registro(registro_id)
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=resultado.get("mensaje")
        )
    resultado["registro"] = enriquecer_historial(resultado.get("registro", {}))
    
    return resultado


@router.get("/usuario/{usuario_id}", response_model=dict)
async def listar_por_usuario(usuario_id : int):
    #obtener lista de tareas por usuario
    resultado = historial_manager.listar_por_usuario(usuario_id)
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail = resultado.get("mensaje")
        )
    if "registros" in resultado:
        resultado["registros"] = [enriquecer_historial(r) for r in resultado["registros"]]
    
    return resultado


@router.get("/fecha/{fecha}", response_model=dict)
async def listar_por_fecha(fecha: str):
    #obtiene toda la lista de tareas segun la fecha 
    resultado = historial_manager.listar_por_fecha(fecha)
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=resultado.get("mensaje")
        )
    
    if "registros" in resultado:
        resultado["registros"] = [enriquecer_historial(r) for r in resultado["registros"]]
    
    return resultado


@router.put("/{registro_id}", response_model=dict)
async def actualizar_registro(registro_id: int, datos: HistorialActualizar):
    #Update de tarea
    #Filtra los campos que vienen
    datos_dict = {k: v for k, v in datos.dict().items() if v is not None}
    
    if not datos_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere al menos un campo para actualizar"
        )
    
    resultado = historial_manager.actualizar_registro(registro_id, **datos_dict)
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=resultado.get("mensaje")
        )
    resultado["registro"] = enriquecer_historial(resultado.get("registro", {}))
    
    return resultado


@router.delete("/{registro_id}", response_model=dict)
async def eliminar_registro(registro_id: int):
    #Elimina una tarea del historial
    resultado = historial_manager.eliminar_registro(registro_id)
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail= resultado.get("mensaje")
        )
    
    return resultado
