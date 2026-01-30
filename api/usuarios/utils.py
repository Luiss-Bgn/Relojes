"""
Funciones auxiliares para usuarios
"""

from conexiones import conexiones
from database.db_usuarios import UsuarioManager
import asyncio


async def enviar_lista_empleados(usuario_manager: UsuarioManager):
   
    #Envia la lista actualizada de empleados a todos los relojes conectados
    
   # Se ejecuta automáticamente después de crear, actualizar o eliminar usuarios
   
    try:
        resultado = usuario_manager.listar_usuarios()
        if resultado.get("status") == "success":
            empleados = resultado.get("usuarios", [])
            mensaje = {
                "tipo": "usuarios",
                "accion": "lista_empleados",
                "empleados": empleados,
                "total": len(empleados)
            }
            
            # Enviar a todos los relojes conectados
            conexiones_activas = conexiones.obtener_conexiones()
            for uuid, ws in conexiones_activas.items(): #aqui no saseguramos de envoar a cada reloj por lña lista
                try:
                    await ws.send_json(mensaje)
                    print(f"Lista de empleados enviada a reloj: {uuid}")
                except Exception as e:
                    print(f"Error enviando a reloj {uuid}: {e}")
    except Exception as e:
        print(f"Error en enviar_lista_empleados: {e}")


def notificar_relojes_async(usuario_manager: UsuarioManager):
    
    #enviar notificación sin bloquear
    
    asyncio.create_task(enviar_lista_empleados(usuario_manager))
