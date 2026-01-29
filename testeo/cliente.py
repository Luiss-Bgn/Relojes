import asyncio
import json
from aiohttp import ClientSession, WSMsgType

URL = "http://192.168.1.64:8000/ws"

async def enviar_comandos():
    async with ClientSession() as session:
        async with session.ws_connect(URL, protocols=["web-client"]) as ws:
            print("✅ Conectado al servidor WebSocket")

            # ===== EJEMPLO DE COMANDO =====
            comando = {
                "tipo": "relojes",
                "comando": "iniciar",
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
