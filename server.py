"""
Iniciar ambos servidores:
- Puerto 8000: WebSocket (aiohttp) para los websocka
- Puerto 8001: API REST (FastAPI) para la api
- Backup automático: Tareas semana -> Historial (diario a las 9 PM)

"""

import uuid
from aiohttp import web
import asyncio
import json
import threading
import uvicorn
import schedule
import time

from funciones import manager
from conexiones import conexiones
from funciones.eventos import EventManager
import time_manager
from backup_scheduler import BackupManager

# Importar API REST (ahora ambos: usuarios + historial )
from api import app as api_app

event_Manager = EventManager()
Manager = manager.Manager(event_Manager)

# Manejo de tiempo
async def iniciar_chequeo_hora(app):
    app['tiempo_task'] = asyncio.create_task(time_manager.chequeo_hora(Manager))

async def detener_chequeo_hora(app):
    app['tiempo_task'].cancel()
    await app['tiempo_task']

async def inicar_eventListener(app):
    event_Manager.set_loop()
    app['event_task'] = asyncio.create_task(Manager.event_listener())



async def ws_handler(request):
    ws = web.WebSocketResponse(protocols=['arduino', 'web-client'])
    await ws.prepare(request)

    # Detectar si es cliente web o dispositivo
    user_agent = request.headers.get("User-Agent", "")
    es_web = "Mozilla" in user_agent

    if es_web:
        uuid_cliente = f"web_{uuid.uuid4().hex[:8]}"
        conexiones.agregar_conexion(uuid_cliente, ws, "web")
    else:
        uuid_cliente = None 

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                data = msg.json()
                if not es_web:
                    uuid_cliente = data.get("uuid")
                
                # Si es la primera vez que recibimos el UUID, registrar la conexión
                if not uuid_cliente:
                    data['ip'] = request.remote
                    conexiones.agregar_registro(request.remote, ws)
                else:
                    conexiones.agregar_conexion(uuid_cliente, ws, "web" if es_web else "reloj")
                    
                await Manager.AnalizarMensaje(data, uuid_cliente)

                conectados = conexiones.obtener_conexiones()
                print(f"Conexiones activas: {list(conectados.keys())}")
    finally:
        print("Cliente desconectado")
        # Eliminar con el UUID correcto
        conexiones.eliminar_conexion(uuid_cliente)

    return ws

app = web.Application()
app.router.add_get('/ws', ws_handler)


# Arrancar manejo de tiempo
app.on_startup.append(iniciar_chequeo_hora)
app.on_cleanup.append(detener_chequeo_hora)
app.on_startup.append(inicar_eventListener)


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


def run_backup_scheduler():
    """Ejecuta el scheduler de backup automático"""
    print("\n" + "="*60)
    print("INICIANDO SCHEDULER DE BACKUP")
    print("="*60)
    print("Backup programado: Diario a las 00:10 (00:01 AM)")
    print("Función: Copiar tareas_semana -> historial")
    print("="*60 + "\n")
    
    backup_manager = BackupManager()
    
    # Programar backup diario a las 00:10 (12:10 AM)
    schedule.every().day.at("00:01").do(backup_manager.realizar_backup_diario)
    
    print(f"⏰ Próximo backup: {schedule.next_run().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Loop infinito para ejecutar tareas programadas
    while True:
        schedule.run_pending()
        time.sleep(60)  # Verificar cada minuto


#corremos servidor api y el ws
if __name__ == "__main__":
    print("\n" + "="*60)
    print("SERVIDOR RELOJES - INICIO COMPLETO")
    print("="*60)
    print("Iniciando WebSocket + API REST + Backup Scheduler...\n")
    
    # Crear threads para cada servidor
    ws_thread = threading.Thread(target=run_websocket, daemon=False)
    api_thread = threading.Thread(target=run_rest_api, daemon=False)
    backup_thread = threading.Thread(target=run_backup_scheduler, daemon=True)
    
    # Iniciar todos
    ws_thread.start()
    api_thread.start()
    backup_thread.start()
    
    print("✅ Todos los servicios iniciados correctamente\n")
    
    # Esperar a que los servidores principales terminen
    ws_thread.join()
    api_thread.join()

