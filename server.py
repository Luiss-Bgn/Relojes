"""
Iniciar ambos servidores:
- Puerto 8000: WebSocket (aiohttp) para los websocka
- Puerto 8001: API REST (FastAPI) para la api

"""

from aiohttp import web
import asyncio
import json
import threading
import uvicorn

from funciones import manager
from database import db_manager
from conexiones import conexiones
import time_manager

# Importar API REST (ahora ambos: usuarios + historial )
from api import app as api_app

Manager = manager.Manager()

# Manejar base de datos
iniciar_db = db_manager.IniciarDB()
cerrar_db = db_manager.CerrarDB()

# Manejo de tiempo
async def iniciar_chequeo_hora(app):
    app['tiempo_task'] = asyncio.create_task(time_manager.chequeo_hora(Manager))

async def detener_chequeo_hora(app):
    app['tiempo_task'].cancel()
    await app['tiempo_task']


async def ws_handler(request):
    ws = web.WebSocketResponse(protocols=['arduino', 'web-client'])
    await ws.prepare(request)
    
    uuid_cliente = None  

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                data = msg.json()
                uuid = data.get("uuid", "desconocido")
                
                # Si es la primera vez que recibimos el UUID, registrar la conexión
                if uuid_cliente is None and uuid != "desconocido":
                    uuid_cliente = uuid
                    conexiones.agregar_conexion(uuid, ws)
                    print(f"Conexión registrada con UUID: {uuid}")
                
                conectados = conexiones.obtener_conexiones()
                await Manager.AnalizarMensaje(data, uuid)

                print(f"Conexiones activas: {list(conectados.keys())}")
    finally:
        print("Cliente desconectado")
        # Eliminar con el UUID correcto
        if uuid_cliente:
            conexiones.eliminar_conexion(uuid_cliente)

    return ws

app = web.Application()
app.router.add_get('/ws', ws_handler)

# app.on_startup.append(iniciar_db)
# app.on_cleanup.append(cerrar_db)

# Arrancar manejo de tiempo
app.on_startup.append(iniciar_chequeo_hora)
app.on_cleanup.append(detener_chequeo_hora)


#funciones para correr ambos servidores

def run_websocket():
    """Ejecuta el servidor WebSocket en puerto 8000"""
    print("\n" + "="*60)
    print("INICIANDO SERVIDOR WEBSOCKET")
    print("="*60)
    print("Puerto: 8000")
    print("URL: ws://localhost:8000/ws")
    print("="*60 + "\n")
    
    web.run_app(app, host="0.0.0.0", port=8000)


def run_rest_api():
    """Ejecuta la API REST en puerto 8001"""
    print("\n" + "="*60)
    print("INICIANDO API REST (FastAPI)")
    print("="*60)
    print("Puerto: 8001")
    print("URL: http://localhost:8001")
    print("Documentación: http://localhost:8001/docs")
    print("="*60 + "\n")
    
    uvicorn.run(
        api_app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )

#corremos servidor api y el ws
if __name__ == "__main__":
    print("\n" + "="*60)
    print("SERVIDOR RELOJES - INICIO DUAL")
    print("="*60)
    print("Iniciando WebSocket + API REST...\n")
    
    # Crear threads para cada servidor
    ws_thread = threading.Thread(target=run_websocket, daemon=False)
    api_thread = threading.Thread(target=run_rest_api, daemon=False)
    
    # Iniciar ambos
    ws_thread.start()
    api_thread.start()
    
    # Esperar a que ambos terminen
    ws_thread.join()
    api_thread.join()

