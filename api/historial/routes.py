"""
Rutas (endpoints) para historial
"""
from fastapi import APIRouter, HTTPException, status, Query
from database.database import DatabaseManager
from database.db_historial import HistorialManager
from .models import HistorialCrear, HistorialActualizar
from .utils import enriquecer_historial
from typing import Optional
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
        estatus=registro.estatus,
        disponible_para_rol=registro.disponible_para_rol
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


@router.get("/quincenas-disponibles", response_model=dict)
async def obtener_quincenas_disponibles():
    """
    Obtiene las quincenas que tienen datos en el historial
    
    Este endpoint retorna todas las quincenas que contienen al menos un registro
    en la base de datos, ordenadas de la más reciente a la más antigua.
    
    **Retorna:**
    - Lista de quincenas con año, mes, número de quincena y label formateado
    
    **Ejemplo de uso:**
    - `/historial/quincenas-disponibles`
    """
    resultado = historial_manager.obtener_quincenas_disponibles()
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=resultado.get("mensaje")
        )
    
    return resultado


@router.get("/vencidas", response_model=dict)
async def obtener_actividades_vencidas(
    solo_quincena_actual: bool = Query(
        default=True,
        description="Si es true, solo devuelve las vencidas de la quincena actual"
    )
):
    """
    Obtiene actividades vencidas

    - Por defecto: solo quincena actual
    - solo_quincena_actual=false → todas las vencidas históricas

    Ejemplos:
    - /historial/vencidas
    - /historial/vencidas?solo_quincena_actual=false
    """

    resultado = historial_manager.obtener_actividades_vencidas(
        solo_quincena_actual=solo_quincena_actual
    )

    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=resultado.get("mensaje")
        )

    if "registros" in resultado:
        resultado["registros"] = [
            enriquecer_historial(r) for r in resultado["registros"]
        ]

    return resultado

@router.get("/top-vencidas", response_model=dict)
async def obtener_top_tareas_vencidas(
    limite: int = Query(default=10, ge=1, le=50),
    solo_quincena_actual: bool = Query(default=True)
):
    """
    Top de tareas más vencidas

    Ejemplos:
    - /historial/top-vencidas
    - /historial/top-vencidas?limite=5
    - /historial/top-vencidas?solo_quincena_actual=false
    """

    resultado = historial_manager.obtener_top_tareas_vencidas(
        solo_quincena_actual=solo_quincena_actual,
        limite=limite
    )

    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=resultado.get("mensaje")
        )

    return resultado



@router.get("/top-empleados", response_model=dict)
async def obtener_top_empleados(
    limite: int = Query(default=10, ge=1, le=100, description="Número de empleados a retornar"),
    fecha_inicio: Optional[str] = Query(default=None, description="Fecha de inicio personalizada (YYYY-MM-DD)"),
    fecha_fin: Optional[str] = Query(default=None, description="Fecha de fin personalizada (YYYY-MM-DD)"),
    año: Optional[int] = Query(default=None, description="Año para filtro por quincena"),
    mes: Optional[int] = Query(default=None, ge=1, le=12, description="Mes para filtro por quincena (1-12)"),
    quincena: Optional[int] = Query(default=None, ge=1, le=2, description="Número de quincena (1 o 2)")
):
    """
    Obtiene el top de empleados con mayor puntaje en tareas regulares
    
    Excluye tareas con estatus 'extra'
    
    **Modos de uso:**
    
    1. **Histórico general**: No enviar ningún parámetro de fecha
       - Ejemplo: `/historial/top-empleados?limite=10`
    
    2. **Por quincena**: Enviar año, mes y quincena
       - Ejemplo: `/historial/top-empleados?año=2026&mes=1&quincena=2`
       - Q1 de cada mes: del día 28 del mes anterior al día 12 del mes actual
       - Q2 de cada mes: del día 13 al día 27 del mes actual
    
    3. **Rango personalizado**: Enviar fecha_inicio y fecha_fin
       - Ejemplo: `/historial/top-empleados?fecha_inicio=2026-01-01&fecha_fin=2026-01-31`
    
    **Parámetros:**
    - limite: Número de empleados a retornar (default: 10, máx: 100)
    - año: Año para filtro por quincena
    - mes: Mes para filtro por quincena (1-12)
    - quincena: Número de quincena (1 o 2)
    - fecha_inicio: Fecha de inicio personalizada (formato YYYY-MM-DD)
    - fecha_fin: Fecha de fin personalizada (formato YYYY-MM-DD)
    """
    # Validar que no se mezclen los modos de filtro
    if (año or mes or quincena) and (fecha_inicio or fecha_fin):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede combinar filtro por quincena con rango de fechas personalizado"
        )
    
    # Si se usa filtro por quincena, validar que estén todos los parámetros
    if (año or mes or quincena) and not (año and mes and quincena):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Para filtrar por quincena se requieren los parámetros: año, mes y quincena"
        )
    
    # Obtener top de empleados
    resultado = historial_manager.obtener_top_empleados(
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        año=año,
        mes=mes,
        quincena=quincena,
        limite=limite
    )
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=resultado.get("mensaje")
        )
    
    return resultado


@router.get("/top-extras", response_model=dict)
async def obtener_top_extras(
    limite: int = Query(default=10, ge=1, le=100, description="Número de empleados a retornar"),
    fecha_inicio: Optional[str] = Query(default=None, description="Fecha de inicio personalizada (YYYY-MM-DD)"),
    fecha_fin: Optional[str] = Query(default=None, description="Fecha de fin personalizada (YYYY-MM-DD)"),
    año: Optional[int] = Query(default=None, description="Año para filtro por quincena"),
    mes: Optional[int] = Query(default=None, ge=1, le=12, description="Mes para filtro por quincena (1-12)"),
    quincena: Optional[int] = Query(default=None, ge=1, le=2, description="Número de quincena (1 o 2)")
):
    """
    Obtiene el top de empleados con mayor puntaje en tareas EXTRAS
    
    Solo incluye tareas con estatus 'extra'
    
    **Modos de uso:**
    
    1. **Histórico general**: No enviar ningún parámetro de fecha
       - Ejemplo: `/historial/top-extras?limite=10`
    
    2. **Por quincena**: Enviar año, mes y quincena
       - Ejemplo: `/historial/top-extras?año=2026&mes=1&quincena=2`
       - Q1 de cada mes: del día 28 del mes anterior al día 12 del mes actual
       - Q2 de cada mes: del día 13 al día 27 del mes actual
    
    3. **Rango personalizado**: Enviar fecha_inicio y fecha_fin
       - Ejemplo: `/historial/top-extras?fecha_inicio=2026-01-01&fecha_fin=2026-01-31`
    
    **Parámetros:**
    - limite: Número de empleados a retornar (default: 10, máx: 100)
    - año: Año para filtro por quincena
    - mes: Mes para filtro por quincena (1-12)
    - quincena: Número de quincena (1 o 2)
    - fecha_inicio: Fecha de inicio personalizada (formato YYYY-MM-DD)
    - fecha_fin: Fecha de fin personalizada (formato YYYY-MM-DD)
    """
    # Validar que no se mezclen los modos de filtro
    if (año or mes or quincena) and (fecha_inicio or fecha_fin):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede combinar filtro por quincena con rango de fechas personalizado"
        )
    
    # Si se usa filtro por quincena, validar que estén todos los parámetros
    if (año or mes or quincena) and not (año and mes and quincena):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Para filtrar por quincena se requieren los parámetros: año, mes y quincena"
        )
    
    # Obtener top de empleados en extras
    resultado = historial_manager.obtener_top_extras(
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        año=año,
        mes=mes,
        quincena=quincena,
        limite=limite
    )
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=resultado.get("mensaje")
        )
    
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

