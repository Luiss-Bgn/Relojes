"""
Rutas (endpoints) para tareas de la semana
"""
import asyncio
from fastapi import APIRouter, HTTPException, status
from database.database import DatabaseManager
from database.db_tareas import TareasManager
from .models import TareasCrear, TareasActualizar
import logging
from conexiones import conexiones

from .utils import construir_panel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tareas", tags=["Tareas"])
db_manager = DatabaseManager("relojes.db")  # Inicializamos manager con la db real
tareas_manager = TareasManager(db_manager)


async def _emitir_update_tareas_rest(origen: str) -> None:
    """Emite aviso websocket update_tareas tras mutaciones REST exitosas."""
    mensaje = {
        "tipo": "notificacion",
        "comando": "update_tareas",
        "data": ["update_tareas"],
        "vibrar": True
    }

    conexiones_activas = conexiones.obtener_conexiones()
    if not conexiones_activas:
        logger.info("REST->WS update_tareas omitido: sin conexiones activas (origen=%s)", origen)
        return

    envios = []
    meta = []
    for uuid, conn_data in conexiones_activas.items():
        ws = conn_data.get("ws")
        if ws:
            envios.append(ws.send_json(mensaje))
            meta.append((uuid, conn_data.get("tipo", "desconocido")))

    resultados = await asyncio.gather(*envios, return_exceptions=True)

    ok = 0
    fail = 0
    for (uuid, tipo), resultado in zip(meta, resultados):
        if isinstance(resultado, Exception):
            fail += 1
            logger.error(
                "REST->WS envio fallido: origen=%s uuid=%s tipo=%s error=%s",
                origen,
                uuid,
                tipo,
                resultado,
            )
            conexiones.eliminar_conexion(uuid)
            logger.warning("Conexion eliminada tras fallo REST->WS: uuid=%s", uuid)
        else:
            ok += 1

    logger.info(
        "REST->WS update_tareas emitido: origen=%s total=%s ok=%s fail=%s",
        origen,
        len(envios),
        ok,
        fail,
    )


@router.post( "", response_model=dict, status_code =status.HTTP_201_CREATED)
async def crear_registro(registro: TareasCrear):
    #Crea un nuevo registro en el TAREAS
    #aqui se agregaran condiciones por cada endpoint
    for fecha in registro.fecha:
        # print("Fecha recibida para la tarea:", fecha)
        
        # print("Datos de la tarea:", registro)
        # print("Creando tarea de:", registro.nombre)
        resultado = tareas_manager.crear_registro(
            nombre=registro.nombre,
            descripcion=registro.descripcion,
            id_dueño=registro.id_dueño,
            hora_ini=registro.hora_ini,
            hora_fin=registro.hora_fin,
            fecha=fecha,
            puntos=registro.puntos,
            estatus=registro.estatus,
            disponible_para_rol=registro.disponible_para_rol
        )
    
    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=resultado.get("mensaje")
        )

    try:
        await _emitir_update_tareas_rest("crear_tarea")
    except Exception as e:
        logger.error("Fallo emitiendo update_tareas tras crear tarea: %s", e)
    
    
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

@router.get("/estadisticas", response_model=dict)
async def estadisticas_hoy_por_empleado():
    from database.database import DatabaseManager
    from database.db_usuarios import UsuarioManager
    from database.db_tareas import TareasManager
    from datetime import datetime

    db = DatabaseManager("relojes.db")
    usuario_manager = UsuarioManager(db)
    tareas_manager = TareasManager(db)

    # Día de la semana actual (en minúsculas como lo usas en tus consultas)
    dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    dia_hoy = dias[datetime.now().weekday()]

    empleados = [
        u for u in usuario_manager.listar_usuarios()["usuarios"]
        if str(u.get("rol", "")).lower() != "admin"
    ]

    resultado = []

    for emp in empleados:
        emp_id = emp["id"]

        puntos_asignados = 0
        puntos_ganados = 0          
        puntos_perdidos = 0         
        puntos_extras = 0           

        # --- TAREAS DEL EMPLEADO (como dueño) ---
        tareas_propias_hoy = tareas_manager.listar_por_usuario_y_fecha(emp_id, dia_hoy)["registros"]
        # print(tareas_propias_hoy)

        for tarea in tareas_propias_hoy:
            estatus = str(tarea.get("estatus", "")).lower()
            puntos = tarea.get("puntos", 0) or 0
            completada_por = tarea.get("completadaPor", None)

            # Ignorar estados que no cuentan
            if estatus in ["futura", "sin_iniciar"]:
                continue

            # Asignadas: en_progreso, completada, extra, vencidas
            if estatus in ["en_progreso", "completada", "vencida"]:
                puntos_asignados += puntos

            # Ganadas: solo completadas propias
            if estatus == "completada":
                puntos_ganados += puntos

            # Perdidas:
            if estatus in ["en_progreso", "vencida"]:
                puntos_perdidos += puntos

            # Extras
            if estatus == "extra":
                if tarea.get("id_dueño") == emp_id:
                    puntos_asignados += puntos
                    puntos_perdidos += puntos
                elif completada_por == emp_id:
                    puntos_extras += tarea.get("puntos", 0) or 0

        # Efectividad (sin extras)
        efectividad = round((puntos_ganados / puntos_asignados) * 100, 2) if puntos_asignados else 0

        resultado.append({
            "empleado_id": emp_id,
            "nombre": emp["nombre"],
            "puesto": emp["puesto"],
            "dia": dia_hoy,
            "puntos_asignados": puntos_asignados,
            "puntos_obtenidos": puntos_ganados,   # (ganados sin extras)
            "puntos_extras": puntos_extras,
            "puntos_perdidos": puntos_perdidos,
            "efectividad": efectividad
        })

    # opcional: ranking por efectividad
    resultado.sort(key=lambda x: x["efectividad"], reverse=True)

    # ===== TOTALES DEL EQUIPO =====
    totales = {
        "puntos_asignados": 0,
        "puntos_obtenidos": 0,
        "puntos_extras": 0,
        "puntos_perdidos": 0
    }

    for emp in resultado:
        totales["puntos_asignados"] += emp["puntos_asignados"]
        totales["puntos_obtenidos"] += emp["puntos_obtenidos"]
        totales["puntos_extras"] += emp["puntos_extras"]
        totales["puntos_perdidos"] += emp["puntos_perdidos"]

    # Efectividad del equipo (sin contar extras)
    efectividad_equipo = (
        round((totales["puntos_obtenidos"] / totales["puntos_asignados"]) * 100, 2)
        if totales["puntos_asignados"] > 0
        else 0
    )

    return {"status": "success","dia": dia_hoy,"equipo": {**totales,"efectividad_equipo": efectividad_equipo},"empleados": resultado}


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
    print("datos recibidos para actualizar tarea:", datos)
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

    try:
        await _emitir_update_tareas_rest("actualizar_tarea")
    except Exception as e:
        logger.error("Fallo emitiendo update_tareas tras actualizar tarea: %s", e)
    
    print("Resultado de la actualización:", resultado)
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

    try:
        await _emitir_update_tareas_rest("eliminar_tarea")
    except Exception as e:
        logger.error("Fallo emitiendo update_tareas tras eliminar tarea: %s", e)
    
    return resultado

@router.get("/panel/obtener", response_model=dict)
async def obtener_panel():
    # print("Obteniendo panel de tareas para fecha:")

    resultado = await construir_panel()

    if resultado.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail= resultado.get("mensaje")
        )
    
    return resultado

@router.post("/{empleado_id}", response_model=dict, status_code=status.HTTP_201_CREATED)
async def asignar_tareas_empleado(empleado_id: int, datos: dict):
    """
    Asigna múltiples tareas a un empleado específico.
    
    Este endpoint recibe un objeto con la estructura:
    {
        "tareas_asignadas": {
            "lunes": [
                {
                    "nombre": "Tarea 1",
                    "descripcion": "Descripción",
                    "hora": "08:00",
                    "hora_fin": "09:00",
                    "estatus": "en_progreso",
                    "puntaje": 5,
                    "esExtra": false,
                    "fecha_inicio": "2026-02-01",
                    "disponible_para_rol": "todos"
                }
            ],
            "martes": [...],
            ...
        }
    }
    
    Args:
        empleado_id: ID del empleado al que se asignan las tareas
        datos: Diccionario con las tareas organizadas por día
        
    Returns:
        Dict con información de las tareas creadas
    """
    from datetime import datetime, timedelta
    
    try:
        tareas_asignadas = datos.get("tareas_asignadas", {})
        
        if not tareas_asignadas:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se proporcionaron tareas para asignar"
            )
        
        tareas_creadas = []
        dias_semana = {
            "domingo": 0, "lunes": 1, "martes": 2, "miércoles": 3,
            "miercoles": 3, "jueves": 4, "viernes": 5, "sábado": 6, "sabado": 6
        }
        
        # Obtener fecha actual
        hoy = datetime.now()
        fecha_inicio_str = hoy.strftime("%Y-%m-%d")
        
        # Procesar cada día
        for dia_nombre, tareas_dia in tareas_asignadas.items():
            dia_numero = dias_semana.get(dia_nombre.lower())
            
            if dia_numero is None:
                logger.warning(f"Día inválido: {dia_nombre}")
                continue
            
            # Calcular la fecha del próximo día correspondiente
            dias_diferencia = (dia_numero - hoy.weekday()) % 7
            if dias_diferencia == 0 and hoy.hour >= 23:  # Si es hoy y ya es tarde
                dias_diferencia = 7
            
            fecha_tarea = hoy + timedelta(days=dias_diferencia)
            fecha_str = fecha_tarea.strftime("%Y-%m-%d")
            
            # Validar si hay tareas existentes en ese horario
            tareas_existentes = tareas_manager.tareas_dao.obtener_por_usuario(empleado_id)
            
            for tarea_data in tareas_dia:
                hora_ini = tarea_data.get("hora")
                hora_fin = tarea_data.get("hora_fin", "")
                
                # Verificar conflictos de horario
                hay_conflicto = False
                for tarea_existente in tareas_existentes:
                    if tarea_existente.get("fecha") == fecha_str:
                        if tarea_existente.get("hora_ini") == hora_ini:
                            hay_conflicto = True
                            break
                
                if hay_conflicto:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"CONFLICTO: Ya existe una tarea para {dia_nombre} a las {hora_ini}"
                    )
                
                # Crear la tarea
                resultado = tareas_manager.crear_registro(
                    nombre=tarea_data.get("nombre"),
                    descripcion=tarea_data.get("descripcion", ""),
                    id_dueño=empleado_id,
                    hora_ini=hora_ini,
                    hora_fin=hora_fin,
                    fecha=fecha_str,
                    puntos=tarea_data.get("puntaje", 1),
                    estatus=str(tarea_data.get("estatus", "en_progreso")),
                    disponible_para_rol=tarea_data.get("disponible_para_rol", "todos")
                )
                
                if resultado.get("status") == "success":
                    tarea_info = resultado.get("registro")
                    
                    # Calcular cuándo es la tarea
                    cuando = ""
                    if dias_diferencia == 0:
                        cuando = "hoy"
                    elif dias_diferencia == 1:
                        cuando = "mañana"
                    elif dias_diferencia < 7:
                        cuando = f"en {dias_diferencia} días"
                    else:
                        cuando = "próxima semana"
                    
                    tareas_creadas.append({
                        "id": tarea_info.get("id"),
                        "nombre": tarea_info.get("nombre"),
                        "dia": dia_nombre,
                        "fecha": fecha_str,
                        "hora": hora_ini,
                        "cuando": cuando
                    })
                else:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=resultado.get("mensaje", "Error al crear tarea")
                    )
        
        try:
            await _emitir_update_tareas_rest("asignacion_masiva")
        except Exception as e:
            logger.error("Fallo emitiendo update_tareas tras asignacion masiva: %s", e)

        return {
            "status": "success",
            "mensaje": f"{len(tareas_creadas)} tarea(s) asignada(s) correctamente",
            "tareas": tareas_creadas
        }

        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al asignar tareas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al asignar tareas: {str(e)}"
        )


    