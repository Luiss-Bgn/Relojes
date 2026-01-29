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

    async def AnalizarMensaje(self, mensaje):
        # print(f"Analizando mensaje en Tareas: {mensaje}")
        try:
            comando = mensaje["comando"]
            if comando in self.comandos:
                await self.comandos[comando](mensaje)
        except KeyError as e:
            print(f"Error: campo '{e.args[0]}' no encontrado en el mensaje de Tareas")
        except Exception as e:
            print(f"Error al procesar mensaje en Tareas: {e}")

        return
    
    async def ObtenerTareas(self,mensaje = None):
        # print("Obteniendo tareas del día...")
        # print(f"Tareas del día: {self.tareas_del_dia}")
        conectados = conexiones.obtener_conexiones()
        for uuid, ws in conectados.items():
            await ws.send_json({"tipo": "tareas","tareas": self.tareas_del_dia})
        return
    
    async def CrearTarea(self, tarea):
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
    
    async def Actualizar(self):
        print("Actualizando Tareas...")
        hora_actual = datetime.now().strftime('%H:%M')

        # Revisar tareas y actualizar su estado
        for tarea in self.tareas_del_dia:
            # print(f"Revisando tarea: {tarea['titulo']} - Estado: {tarea['estado']}")
            if tarea['estado'] == 'completada' or tarea['estado'] == 'extra' or tarea['estado'] == 'vencida':
                # Ignorar tareas ya completadas, extras o vencidas
                continue
            else:
                if hora_actual > tarea['hora_fin'] and tarea['estado'] != 'vencida':
                    tarea['estado'] = 'vencida'
                    print(f"Tarea vencida: {tarea['titulo']}")
                elif hora_actual >= tarea['hora_inicio'] and hora_actual <= tarea['hora_fin'] and tarea['estado'] == 'sin_inicar':
                    tarea['estado'] = 'en_progreso'
                    print(f"Tarea en progreso: {tarea['titulo']}")
        return