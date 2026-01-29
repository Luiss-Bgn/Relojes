from aiohttp import web
import asyncio
import json

from funciones import manager
from database import db_manager
import conexiones
import time_manager

Manager = manager.Manager()
Conexiones = conexiones.Conexiones()

# Manejar base de datos
iniciar_db = db_manager.IniciarDB()
cerrar_db = db_manager.CerrarDB()

# Manejo de tiempo
async def iniciar_chequeo_hora(app):
    app['tiempo_task'] = asyncio.create_task(time_manager.chequeo_hora())

async def detener_chequeo_hora(app):
    app['tiempo_task'].cancel()
    await app['tiempo_task']


async def ws_handler(request):
    ws = web.WebSocketResponse(protocols=['arduino', 'web-client'])
    await ws.prepare(request)
    Conexiones.agregar_conexion(request.remote, ws)

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                data = msg.json()
                print(f"Mensaje recibido: {data}")

                # Obtener respuesta del manejador para ver si es valido el mensaje
                uuid = data.get("uuid", "desconocid")
                Manager.AnalizarMensaje(data, uuid)
                # Enviar respuesta real al reloj
                await ws.send_json({"status": "ok", "mensaje": "Mensaje procesado"})
                conexiones = Conexiones.obtener_conexiones()
                print(f"Conexiones activas: {list(conexiones.keys())}")
    finally:
        print("Cliente desconectado")
        Conexiones.eliminar_conexion(request.remote)

    return ws

app = web.Application()
app.router.add_get('/ws', ws_handler)

# app.on_startup.append(iniciar_db)
# app.on_cleanup.append(cerrar_db)

# Arrancar manejo de tiempo
app.on_startup.append(iniciar_chequeo_hora)
app.on_cleanup.append(detener_chequeo_hora)

web.run_app(app, host="0.0.0.0", port=8000)
