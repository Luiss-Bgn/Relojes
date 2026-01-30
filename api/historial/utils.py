#funcioens auxiliares ára resgistro de tareas en el historial
import logging
logger = logging.getLogger(__name__)

def calcular_dia_semana(fecha: str) -> str:
    #Calcula el día de la semana a partir de una fecha para su uso en Tareas de lka semana
    
    try:
        from datetime import datetime
        
        dias = {
            0: "lunes",
            1: "martes",
            2: "miércoles",
            3: "jueves",
            4: "viernes",
            5: "sábado",
            6: "domingo"
        }
        
        fecha_obj = datetime.strptime(fecha, "%Y-%m-%d")
        return dias[fecha_obj.weekday()]
    except Exception as e:
        logger.error(f"Error obteniendo el dia semana: {e}")
        return "desconocido"


def enriquecer_historial(registro: dict) -> dict:
    #calcula el dia de la semana y lo agrega a ese reg de hist para tener mas facil el dia y manejarlo en el futuro con tareas de la semana
   
    if isinstance(registro, dict) and 'fecha' in registro:
        registro['dia_semana'] = calcular_dia_semana(registro['fecha'])
    
    return registro
