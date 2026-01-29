import asyncio
import json
from aiohttp import ClientSession, WSMsgType

URL = "http://192.168.1.64:8000/ws"

async def enviar_comandos():
    async with ClientSession() as session:
        async with session.ws_connect(URL, protocols=["web-client"]) as ws:
            print("✅ Conectado al servidor WebSocket")

            # ===== EJEMPLO DE COMANDO =====

            # comando = {
            #     "tipo": "tareas",
            #     "comando": "crear_tarea",
            #     "tareas": [{
            #         "titulo": "Revisar inventario",
            #         "descripcion": "Verificar el stock de productos en el almacén",
            #         "prioridad": "alta",
            #         "fecha_vencimiento": "2024-06-10",
            #         "hora_inicio": "13:00",
            #         "hora_fin": "13:20",
            #         "estado": "sin_inicar"
            #     }, 
            #     {
            #         "titulo": "Llamar al proveedor",
            #         "descripcion": "Contactar al proveedor para negociar precios",
            #         "prioridad": "media",
            #         "fecha_vencimiento": "2024-06-12",
            #         "hora_inicio": "11:00",
            #         "hora_fin": "15:30",
            #         "estado": "sin_inicar"
            #     }]
            # }
            comando = {
                "tipo": "tareas",
                "comando": "obtener_tareas"
            }

            print("📤 Enviando:", comando)
            await ws.send_json(comando)

            # Esperar respuesta del servidor
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    respuesta = json.loads(msg.data)
                    print("📥 Respuesta del servidor:", respuesta)
                    break

                elif msg.type == WSMsgType.ERROR:
                    print("💥 Error en la conexión:", ws.exception())
                    break

asyncio.run(enviar_comandos())
