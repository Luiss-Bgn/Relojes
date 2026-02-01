"""
Script para testear el flujo de completar_tarea EXTRA por WebSocket
Simula un reloj enviando el comando para marcar una tarea extra como completada
"""

import asyncio
import json
import aiohttp
import sys

async def test_completar_tarea_extra():
    """Prueba completar una tarea extra por WebSocket"""
    
    # Parámetros de prueba
    WS_URL = "ws://localhost:8000/ws"
    UUID_RELOJ = "test-reloj-extra-001"
    
    print("="*60)
    print("TEST WEBSOCKET - COMPLETAR TAREA EXTRA")
    print("="*60)
    print(f"URL: {WS_URL}")
    print(f"UUID del reloj: {UUID_RELOJ}\n")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(WS_URL, protocols=['arduino', 'web-client']) as ws:
                print("✓ Conectado al servidor WebSocket\n")
                
                # Mensaje para completar la tarea extra con id=1 (ajusta el id según tu base)
                mensaje_completar = {
                    "tipo": "tareas_extras",  # IMPORTANTE: debe coincidir con el tipo que enruta a Extras()
                    "comando": "completar_tarea",
                    "tarea": {
                        "id": 1,                    # ID de la tarea en tareas_semana
                        "id_empleado": 1,           # ID del empleado que la completa
                        "tipo": "extra"             # Tipo de tarea
                    },
                    "uuid": UUID_RELOJ
                }
                
                print("Enviando mensaje:")
                print(json.dumps(mensaje_completar, indent=2))
                print("\n" + "-"*60 + "\n")
                
                # Enviar el mensaje
                await ws.send_json(mensaje_completar)
                print("✓ Mensaje enviado\n")
                
                # Esperar respuesta (con timeout de 10 segundos)
                try:
                    msg = await asyncio.wait_for(ws.receive(), timeout=10.0)
                    
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        respuesta = msg.json()
                        print("Respuesta del servidor:")
                        print(json.dumps(respuesta, indent=2))
                        print("\n" + "-"*60)
                        
                        if respuesta.get("status") == "exitoso":
                            print("✓ ÉXITO: Tarea extra completada correctamente")
                        else:
                            print("✗ ERROR: " + respuesta.get("mensaje", "Error desconocido"))
                    
                    elif msg.type == aiohttp.WSMsgType.ERROR:
                        print("✗ Error en WebSocket:", ws.exception())
                    
                    elif msg.type == aiohttp.WSMsgType.CLOSED:
                        print("✗ Conexión cerrada")
                        
                except asyncio.TimeoutError:
                    print("✗ TIMEOUT: No se recibió respuesta del servidor (10 segundos)")
                    print("\nPosibles causas:")
                    print("1. El comando 'completar_tarea' no llegó a Extras.actualizar_tarea()")
                    print("2. Hay un error en la función actualizar_tarea()")
                    print("3. Revisa los logs del servidor para más detalles")
                    print("\nVerifica que el servidor esté corriendo en puerto 8000")
                    
    except aiohttp.ClientConnectorError:
        print("✗ ERROR: No se pudo conectar al servidor")
        print("Asegúrate de que el servidor esté corriendo en ws://localhost:8000/ws")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error inesperado: {e}")
        sys.exit(1)
    
    print("\n" + "="*60)
    print("Test completado")
    print("="*60)

if __name__ == "__main__":
    print("\nEsperando a que el servidor esté listo...\n")
    asyncio.run(test_completar_tarea_extra())