import asyncio
import funciones
from conexiones import conexiones
from database.database import DatabaseManager
from database.db_relojes import RelojManager
from database.db_usuarios import UsuarioManager


class Manager():
    def __init__(self, eventManager):
        self.eventManager = eventManager

        self.funciones = {
            "usuarios": funciones.Usuarios(),
            "relojes": funciones.Relojes(eventManager),
            "tareas": funciones.Tareas(eventManager),
            "extras": funciones.Extras(eventManager),
            "notificacion": funciones.Notificaciones(eventManager)
        }

        self.db_manager = DatabaseManager("relojes.db")
        self.reloj_manager = RelojManager(self.db_manager)
        self.usuario_manager = UsuarioManager(self.db_manager)

        self.event_buffer = {}
        self.buffer_lock = asyncio.Lock()


    async def AnalizarMensaje(self, data, uuid):
        try:
            tipo = data["tipo"]
            if tipo not in self.funciones:
                print(f"Tipo desconocido: {tipo}")
                return

            await self.funciones[tipo].AnalizarMensaje(data, uuid)

        except KeyError as e:
            print(f"Falta campo: {e.args[0]}")
        except Exception as e:
            print(f"Error procesando mensaje: {e}")

    async def event_listener(self):
        async for event in self.eventManager.listen():
            # print(f"listener {event}")
            asyncio.create_task(self._buffer_event(event))

    # Acumular eventos
    async def _buffer_event(self, event):
        # print(f"buffer {event}")
        key = (event["type"], event["payload"].get("action"))

        async with self.buffer_lock:
            if key not in self.event_buffer:
                self.event_buffer[key] = {
                    "events": [],
                    "timer": asyncio.create_task(self._gestionar_mensajes(key))
                }

            self.event_buffer[key]["events"].append(event)

    # Acumular todos los mensajes y reenviar uno solo
    async def _gestionar_mensajes(self, key):
        await asyncio.sleep(0.2)

        async with self.buffer_lock:
            group = self.event_buffer.pop(key, None)

        if not group:
            return

        eventos = group["events"]

        criterios = {
            "individual": set(),
            "roles": set(),
            "global": False,
            "web": False,
            "reloj": False
        }

        data_acumulada = []

        for e in eventos:
            payload = e["payload"]
            target = payload.get("target")

            if target == "individual":
                criterios["individual"].update(payload.get("notification", []))

            elif target == "rol":
                criterios["roles"].update(payload.get("notification", []))

            elif target == "global":
                criterios["global"] = True

            elif target == "web":
                criterios["web"] = True

            elif target == "reloj":
                criterios["reloj"] = True

            data_acumulada.append(payload.get("action"))

        # print("data acumulada",data_acumulada)
        destinatarios_finales = await self._resolver_destinatarios(criterios)

        mensaje = {
            "tipo": "notificacion",
            "comando": key[1],
            "data": data_acumulada
        }

        # 📡 3. Enviar ya con UUIDs reales
        await self._enviar_notificacion(destinatarios_finales, mensaje)


    async def _resolver_destinatarios(self, criterios):
        destinatarios = set()

        # Individual
        if criterios["individual"]:
            empleados_ids = list(criterios["individual"])
            uuids = self.reloj_manager.obtener_uuids_por_empleados(empleados_ids)

            for uuid in uuids:
                if conexiones.obtener_conexion(uuid):
                    print(uuid)
                    destinatarios.add(uuid)

        # Roles 
        if criterios["roles"]:
            roles = list(criterios["roles"])
            if "todos" in criterios['roles']:
                roles = ["empleado","supervisor"]
            # print("Roles",roles)
            empleados_ids = self.usuario_manager.obtener_ids_por_roles(roles)
            # print("empleados ids",empleados_ids)
            uuids = self.reloj_manager.obtener_uuids_por_empleados(empleados_ids)
            for uuid in uuids:
                if conexiones.obtener_conexion(uuid):
                    destinatarios.add(uuid)

        # Global
        if criterios["global"]:
            destinatarios.update(conexiones.obtener_todos_los_uuids())

        # Solo Web
        if criterios["web"]:
            destinatarios.update(conexiones.obtener_uuids_por_tipo("web"))

        # Solo Reloj
        if criterios["reloj"]:
            destinatarios.update(conexiones.obtener_uuids_por_tipo("reloj"))

        print(f"Destinatarios finales: {destinatarios}")
        return destinatarios


    # Envio de mensaje
    async def _enviar_notificacion(self, destinatarios, mensaje):
        lista_mensajes = []
        
        # relojes específicos
        for uuid in destinatarios:
            ws = conexiones.obtener_conexion(uuid)
            if ws:
                lista_mensajes.append(ws['ws'].send_json(mensaje))

        # web siempre recibe
        for ws in conexiones.obtener_web():
            lista_mensajes.append(ws.send_json(mensaje))

        # print(f"mensajes enviados: {lista_mensajes}")
        await asyncio.gather(*lista_mensajes,return_exceptions=True)


    async def Actualizar(self):
        # print("Actualizando funciones...")
        for funcion in self.funciones.values():
            if hasattr(funcion, 'Actualizar'):
                await funcion.Actualizar()
