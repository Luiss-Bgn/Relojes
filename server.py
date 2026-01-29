from aiohttp import web
import json

from funciones import manager
from database import db_manager

Manager = manager.Manager()

# Manejar base de datos
iniciar_db = db_manager.IniciarDB()
cerrar_db = db_manager.CerrarDB()

async def ws_handler(request):
    ws = web.WebSocketResponse(protocols=['arduino', 'web-client'])
    await ws.prepare(request)

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                data = msg.json()
                print(f"Mensaje recibido: {data}")

                # Obtener respuesta del manejador para ver si es valido el mensaje
                respuesta = Manager.AnalizarMensaje(data)
                
                # Enviar respuesta real al reloj
                await ws.send_json(respuesta if respuesta else {"status": "error", "mensaje": "Sin respuesta"})
    finally:
        print("Cliente desconectado")

    return ws

app = web.Application()
app.router.add_get('/ws', ws_handler)

# app.on_startup.append(iniciar_db)
# app.on_cleanup.append(cerrar_db)

web.run_app(app, host="0.0.0.0", port=8000)
