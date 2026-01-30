"""
rutas para las tareras
"""


from fastapi import APIRouter, HTTPException, status
from database.database import DatabaseManager
from database.db_tareas import TareaManager
from .models import TareaCreate, TareaUpdate
from .utils import auxTarea


router = APIRouter(prefix="/tareas", tags=["tareas"])
db_manager = DatabaseManager("relojes.db")
tarea_manager = TareaManager(db_manager)



@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def crear_tarea(tarea: TareaCreate):
    """Crear una nueva tarea"""
    resultado = tarea_manager.crear_tarea(tarea)
    if resultado.get("status") == "success":
        return resultado.get("tarea")
    else:
        raise HTTPException(status_code=400, detail=resultado.get("mensaje"))