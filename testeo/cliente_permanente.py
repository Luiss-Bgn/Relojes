import asyncio
import json
from aiohttp import ClientSession, WSMsgType

URL = "http://192.168.1.64:8000/ws"

async def escuchar(ws):
    async for msg in ws:
        if msg.type == WSMsgType.TEXT:
            respuesta = json.loads(msg.data)
            print("📥 Respuesta del servidor:", respuesta)

            if respuesta.get("comando") == "ping":
                print("🏓 Ping recibido (app), enviando pong...")
                
                mensaje = {
                    "tipo": "relojes",
                    "uuid": "56b87e25-cc10-4cbe-b2c6-7f71c7e166e3",
                    "comando": "pong"}
                await ws.send_json(mensaje)
            
            if respuesta.get("comando") == "update_tareas":
                print("💥 actualizando")
                mensaje = {
                    "tipo": "relojes",
                    "uuid": "56b87e25-cc10-4cbe-b2c6-7f71c7e166e3",
                    "comando": "actualizar_tareas",
                    "id": 3
                    }
                await ws.send_json(mensaje)

        elif msg.type == WSMsgType.ERROR:
            print("💥 Error en la conexión:", ws.exception())
            break

        elif msg.type == WSMsgType.CLOSED:
            print("🔌 Conexión cerrada por el servidor")
            break


async def enviar_comandos():
    async with ClientSession() as session:
        async with session.ws_connect(URL, protocols=["web-client"]) as ws:
            print("✅ Conectado al servidor WebSocket")

            comando = {
                "tipo": "relojes",
                "comando": "empleado_seleccionado",
                "uuid": "56b87e25-cc10-4cbe-b2c6-7f71c7e166e3",
                "id": 3
            }

            print("📤 Enviando:", comando)
            await ws.send_json(comando)

            # Mantener conexión abierta escuchando indefinidamente
            await escuchar(ws)


if __name__ == "__main__":
    try:
        asyncio.run(enviar_comandos())
    except KeyboardInterrupt:
        print("\n🛑 Cliente detenido manualmente")
