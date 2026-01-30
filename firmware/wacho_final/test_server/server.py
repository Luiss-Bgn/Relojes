import asyncio
import json
import uuid

from aiohttp import web

EMPLOYEES = [
    {"id": "1", "nombre": "Juan Perez"},
    {"id": "2", "nombre": "Maria Lopez"},
    {"id": "3", "nombre": "Carlos Ruiz"},
]

TASKS = [
    {"id": "101", "tarea": "Revisar Inventario ññ", "estado": "No Completada", "hora_inicio": "08:00"},
    {"id": "102", "tarea": "Limpiar Vitrinas", "estado": "En Progreso", "hora_inicio": "09:00"},
    {"id": "103", "tarea": "Atender Proveedores", "estado": "Sin Iniciar", "hora_inicio": "10:00"},
]

EXTRA_TASKS = [
    {"id": "201", "tarea": "Limpieza Extra", "estado": "Extra", "hora_inicio": "14:00"},
]

REGISTERED_UUIDS: set[str] = set()


async def send_employee_list(ws):
    payload = {"lista_usuarios": EMPLOYEES, "vibrar": True}
    await ws.send_str(json.dumps(payload))


async def send_tasks(ws, extras=False, vibrar=True):
    tasks = EXTRA_TASKS if extras else TASKS
    comando = "tareas_extras" if extras else "tareas"
    payload = {"comando": comando, "tareas": tasks, "vibrar": vibrar}
    await ws.send_str(json.dumps(payload))


async def handler(request: web.Request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    print(f"Cliente conectado: {request.remote}")

    async for msg in ws:
        if msg.type != web.WSMsgType.TEXT:
            continue

        print(f"Recibido: {msg.data}")
        try:
            data = json.loads(msg.data)
        except json.JSONDecodeError:
            print("Error decodificando JSON")
            continue

        tipo = data.get("tipo")
        comando = data.get("comando")

        if tipo != "relojes":
            print("Mensaje ignorado (tipo distinto de relojes)")
            continue

        if comando == "registro":
            new_uuid = str(uuid.uuid4())
            REGISTERED_UUIDS.add(new_uuid)
            await ws.send_str(json.dumps({"uuid": new_uuid}))
            continue

        if comando == "inicio":
            incoming_uuid = data.get("uuid", "")
            if incoming_uuid:
                REGISTERED_UUIDS.add(incoming_uuid)
            await send_employee_list(ws)
            continue

        if comando == "empleado_seleccionado":
            print(f"Empleado seleccionado: {data.get('nombre')} ({data.get('id')})")
            await send_tasks(ws, extras=False, vibrar=True)
            await send_tasks(ws, extras=True, vibrar=False)
            continue

        if comando in ("tareas", "tareas_extras"):
            await send_tasks(ws, extras=(comando == "tareas_extras"), vibrar=data.get("vibrar", False))
            continue

        if comando == "completar_tarea":
            tarea = data.get("tarea", {})
            tarea_id = tarea.get("id")
            tarea_tipo = tarea.get("tipo", "tarea")
            pool = EXTRA_TASKS if tarea_tipo == "extra" else TASKS
            pool[:] = [t for t in pool if t.get("id") != tarea_id]
            print(f"Tarea completada: {tarea_id} ({tarea_tipo})")
            await send_tasks(ws, extras=(tarea_tipo == "extra"), vibrar=False)
            continue

        if comando == "ping":
            await ws.send_str(json.dumps({"comando": "pong"}))

    print("Cliente desconectado")
    return ws


def create_app():
    app = web.Application()
    app.router.add_get("/ws", handler)
    return app


def main():
    print("Iniciando servidor...")
    web.run_app(create_app(), host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
