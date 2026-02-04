import funciones
from conexiones import conexiones
from database.database import DatabaseManager
from database.db_relojes import RelojManager

class Manager():
    def __init__(self, eventManager):
        self.eventManager = eventManager
        self.funciones = {
            "usuarios": funciones.Usuarios(),
            "relojes": funciones.Relojes(),
            "tareas": funciones.Tareas(eventManager),
            "extras": funciones.Extras(),
        }

        self.db_manager = DatabaseManager("relojes.db")
        self.reloj_manager = RelojManager(self.db_manager)

    async def AnalizarMensaje(self, data, uuid):
        print(f"Procesando mensaje: {data}")
        
        try:
            tipo = data["tipo"]
            if not tipo in self.funciones: 
                print(f"Tipo de mensaje desconocido: {tipo}")
                return
            
            await self.funciones[tipo].AnalizarMensaje(data, uuid) #entra al mensaje del tipo corresponsinte
            return
        
        except KeyError as e:
            print(f"Error: campo '{e.args[0]}' no encontrado en el mensaje") #en caso de no enviar tipo
            return
        
        except Exception as e:
            print(f"Error al procesar mensaje: {e}")
            return

    async def event_listener(self):
        async for event in self.eventManager.listen():

            tipo = event.get("type")
            payload = event.get("payload", {})

            source = payload.get("source")
            target = payload.get("target")
            action = payload.get("action")
            data = payload.get("data", {})

            print(event)

            mensaje = {
                "tipo": "notificacion",
                "comando": action,
                "data": data
            }

            try:
                # Falta continuar con obtener cada reloj por su id de dueño si es que esta conectado
                if target == "invidual":
                    print(payload.get("notification"))
                    for ws in conexiones.obtener_relojes():
                        print(ws)
                        await ws.send_json(mensaje)
                # Falta terminar esta parte para filtrar el envio de comandos a los relojes por rol
                elif target == "rol":
                    print(payload.get("notification"))
                    for ws in conexiones.obtener_relojes():
                        print(ws)
                        await ws.send_json(mensaje)
                elif target == "todos":
                    for ws in conexiones.obtener_conexiones().values():
                        await ws['ws'].send_json(mensaje)

                # Siempre notificar a la web
                for ws in conexiones.obtener_web():
                        await ws.send_json(mensaje)

            except Exception as e:
                print(f"Error enviando evento {tipo}: {e}")


    
    async def Actualizar(self):
        print("Actualizando Manager y sus funciones...")
        for funcion in self.funciones.values():
            if hasattr(funcion, 'Actualizar'):
                await funcion.Actualizar()
        return

