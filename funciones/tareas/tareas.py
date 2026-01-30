from datetime import datetime
from database import db_tareas

from conexiones import conexiones

class Tareas():
    def __init__(self):
        self.tareas_del_dia = []

        self.comandos = {
            "crear_tarea": self.CrearTarea,
            "obtener_tareas": self.ObtenerTareas,
        }
        pass

    async def IniciarTareas(self):
        print("Iniciando Tareas...")
        self.tareas_del_dia = await self.ObtenerTodasLasTareas()
        print(f"Tareas cargadas: {len(self.tareas_del_dia)} tareas")
        return

    async def AnalizarMensaje(self, mensaje, uuid):
        # print(f"Analizando mensaje en Tareas: {mensaje}")
        try:
            comando = mensaje["comando"]
            if comando in self.comandos:
                await self.comandos[comando](mensaje, uuid)
        except KeyError as e:
            print(f"Error: campo '{e.args[0]}' no encontrado en el mensaje de Tareas")
        except Exception as e:
            print(f"Error al procesar mensaje en Tareas: {e}")

        return
    
    async def ObtenerTodasLasTareas(self,mensaje = None, uuid = None):
        conectados = conexiones.obtener_conexiones()

        tareas = {"tipo": "tareas","tareas": self.tareas_del_dia}

        if uuid in conectados:
            ws = conectados[uuid]
            await ws.send_json(tareas)
        return

    
    async def ObtenerTareas(self,mensaje = None, uuid = None):
        conectados = conexiones.obtener_conexiones()

        tareas = {"tipo": "tareas","tareas": self.tareas_del_dia}

        if uuid in conectados:
            ws = conectados[uuid]
            await ws.send_json(tareas)
        return
    

    async def CrearTarea(self, tarea, uuid = None):
        try:
            tareas = tarea['tareas']
            for tarea in tareas:
                self.tareas_del_dia.append(tarea)

            self.tareas_del_dia.sort(key=lambda x: datetime.strptime(x['hora_inicio'], '%H:%M'))

            print(f"Tareas: {len(self.tareas_del_dia)} tareas")
        except KeyError as e:
            print(f"Error: campo '{e.args[0]}' no encontrado al crear tarea")
        except Exception as e:
            print(f"Error al crear tarea: {e}")
        return
    
    async def actualizar_tarea(self, tarea, uuid = None):
        try:
            print(f"Actualizando tarea: {tarea['tarea']}")
        except Exception as e:
            print(f"Error al actualizar tarea: {e}")
        return
    
    async def EliminarTarea(self, tarea, uuid = None):
        try:
            self.tareas_del_dia = [tarea for tarea in self.tareas_del_dia if tarea['id'] != tarea['id']]
            print(f"Tarea eliminada: {tarea['tarea']}")
        except Exception as e:
            print(f"Error al eliminar tarea: {e}")
        return
    

    async def Actualizar(self):
        print("Actualizando Tareas...")
        hora_actual = datetime.now().strftime('%H:%M')

        # Revisar tareas y actualizar su estado
        for tarea in self.tareas_del_dia:
            # print(f"Revisando tarea: {tarea['titulo']} - Estado: {tarea['estado']}")
            hora_inicio = datetime.strptime(tarea['hora_inicio'], "%H:%M").replace(year=hora_actual.year, month=hora_actual.month, day=hora_actual.day)
            hora_fin = datetime.strptime(tarea['hora_fin'], "%H:%M").replace(year=hora_actual.year, month=hora_actual.month, day=hora_actual.day)
            
            if tarea['estado'] == 'completada' or tarea['estado'] == 'extra' or tarea['estado'] == 'vencida':
                # Ignorar tareas ya completadas, extras o vencidas
                continue
            else:
                # Tarea vencida
                if hora_actual > hora_fin and tarea['estado'] != 'vencida':
                    tarea['estado'] = 'vencida'
                    print(f"Tarea vencida: {tarea['titulo']}")
                    
                # Tarea en progreso
                elif hora_actual >= hora_inicio and hora_actual <= hora_fin and tarea['estado'] == 'sin_iniciar':
                    tarea['estado'] = 'en_progreso'
                    print(f"Tarea en progreso: {tarea['titulo']}")
        return