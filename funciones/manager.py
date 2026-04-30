import asyncio
import funciones
from conexiones import conexiones
from database.database import DatabaseManager
from database.db_relojes import RelojManager
from database.db_usuarios import UsuarioManager
import logging

logger = logging.getLogger(__name__)


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
            "data": data_acumulada,
            "vibrar": payload.get("vibrar")
        }

        logger.info(
            "Evento WS: comando=%s destinatarios_resueltos=%s",
            key[1],
            len(destinatarios_finales)
        )

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

        # print(f"Destinatarios finales: {destinatarios}")
        return destinatarios


    # Envio de mensaje
    async def _enviar_notificacion(self, destinatarios, mensaje):
        envios = []

        # relojes/específicos por UUID
        for uuid in destinatarios:
            conn_data = conexiones.obtener_conexion(uuid)
            if conn_data:
                envios.append({
                    "uuid": uuid,
                    "tipo": conn_data.get("tipo", "desconocido"),
                    "ws": conn_data["ws"],
                    "task": conn_data["ws"].send_json(mensaje)
                })

        # web siempre recibe
        for ws in conexiones.obtener_web():
            envios.append({
                "uuid": None,
                "tipo": "web",
                "ws": ws,
                "task": ws.send_json(mensaje)
            })

        if not envios:
            logger.info("Envio WS omitido: sin destinatarios para comando=%s", mensaje.get("comando"))
            return

        resultados = await asyncio.gather(
            *[item["task"] for item in envios],
            return_exceptions=True
        )

        exitosos = 0
        fallidos = 0
        for item, resultado in zip(envios, resultados):
            if isinstance(resultado, Exception):
                fallidos += 1
                uuid = item["uuid"]
                logger.error(
                    "Envio WS fallido: comando=%s uuid=%s tipo=%s error=%s",
                    mensaje.get("comando"),
                    uuid,
                    item["tipo"],
                    resultado
                )

                # Limpiar sockets muertos por fallo de envío
                if uuid:
                    conexiones.eliminar_conexion(uuid)
                    logger.warning("Conexion eliminada por error de envio: uuid=%s", uuid)
                else:
                    uuid_web = None
                    for conn_uuid, conn_data in conexiones.obtener_conexiones().items():
                        if conn_data.get("tipo") == "web" and conn_data.get("ws") is item["ws"]:
                            uuid_web = conn_uuid
                            break
                    if uuid_web:
                        conexiones.eliminar_conexion(uuid_web)
                        logger.warning("Conexion web eliminada por error de envio: uuid=%s", uuid_web)
            else:
                exitosos += 1

        logger.info(
            "Envio WS completado: comando=%s total=%s ok=%s fail=%s",
            mensaje.get("comando"),
            len(envios),
            exitosos,
            fallidos,
        )


    async def Actualizar(self):
        # print("Actualizando funciones...")
        for funcion in self.funciones.values():
            if hasattr(funcion, 'Actualizar'):
                await funcion.Actualizar()
