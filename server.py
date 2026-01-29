from aiohttp import web
import json

async def ws_handler(request):
    ws = web.WebSocketResponse(protocols=['arduino', 'web-client'])
    await ws.prepare(request)

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                data = msg.json()
                print(f"Mensaje recibido: {data}")
                await ws.send_json({"status": "recibido", "data": data})

    finally:
        print("Cliente desconectado")

    return ws

app = web.Application()
app.router.add_get('/ws', ws_handler)

app.on_startup.append(iniciar_db)
app.on_cleanup.append(cerrar_db)

web.run_app(app, host="0.0.0.0", port=8000)
