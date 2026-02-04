from datetime import datetime
from database.database import DatabaseManager
from database.db_historial import HistorialManager
from database.db_tareas import TareasManager
from conexiones import conexiones

class Tareas():
    def __init__(self, eventManager):
        self.tareas_del_dia = []
        self.eventManager = eventManager

        self.dias = [
            "Lunes", "Martes", "Miércoles",
            "Jueves", "Viernes", "Sábado", "Domingo"
        ]

        
        # Inicializar DB para historial
        try:
            self.db_manager = DatabaseManager("relojes.db")
            self.tareas_manager = TareasManager(self.db_manager)
            print("✓ TareasManager inicializado correctamente en Tareas")
        except Exception as e:
            print(f"✗ Error al inicializar TareasManager: {e}")
            self.tareas_manager = None

        self.comandos = {
            "crear_tarea": self.CrearTarea,
            "obtener_tareas": self.ObtenerTareas,
            "completar_tarea": self.actualizar_tarea,
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

        print(self.tareas_manager.listar_todos())

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
    
    async def actualizar_tarea(self, mensaje, uuid = None):
        """
        Actualiza el estado de una tarea a completada
        Esperado: {"tipo": "tareas", "comando":"completar_tarea", "tarea":{"id":id, "id_empleado":id_empleado, "tipo":tipo}, "uuid":uuid}
        """
        try:
            # Validar que tareas_manager esté inicializado
            if not self.tareas_manager:
                print(f" Error: TareasManager no inicializado")
                respuesta = {
                    "tipo": "respuesta",
                    "comando": "completar_tarea",
                    "status": "error",
                    "mensaje": "Error interno del servidor"
                }
                if uuid:
                    conexion = conexiones.obtener_conexion(uuid)
                    if conexion:
                        await conexion.send_json(respuesta)
                return
            
            # Extraer datos del mensaje
            tarea_data = mensaje.get('tarea', {})
            tarea_id = tarea_data.get('id')
            comando = mensaje.get('comando')
            id_empleado = tarea_data.get('id_empleado')
            tipo_tarea = tarea_data.get('tipo')
            
            print(f"Actualizando tarea (tareas_semana): id={tarea_id}, empleado={id_empleado}, tipo={tipo_tarea}")
            
            if not tarea_id or not id_empleado:
                print(f"Error: Faltan datos de tarea (id o id_empleado)")
                respuesta = {
                    "tipo": "respuesta",
                    "comando": "completar_tarea",
                    "status": "error",
                    "mensaje": "Datos insuficientes para completar tarea"
                }
            else:
                estatus = ""
                if comando == "completar_tarea":
                    estatus = "completada"    
                # Actualizar en la base de datos tareas_semana
                actualizado = self.tareas_manager.tareas_dao.actualizar(
                    tareas_semana_id=tarea_id,
                    estatus=estatus,
                    completadaPor=id_empleado
                )
                
                if actualizado:
                    print(f"tarea {tarea_id} completada por empleado {id_empleado} (tareas_semana)")
                    respuesta = {
                        "tipo": "respuesta",
                        "comando": "completar_tarea",
                        "status": "exitoso",
                        "mensaje": "Tarea completada exitosamente",
                        "tarea_id": tarea_id
                    }
                else:
                    print(f"rror: No se pudo actualizar la tarea {tarea_id} (tareas_semana)")
                    respuesta = {
                        "tipo": "respuesta",
                        "comando": "completar_tarea",
                        "status": "error",
                        "mensaje": "No se pudo actualizar la tarea"
                    }
            
            # Enviar respuesta al reloj que lo solicitó
            if uuid:
                conexion = conexiones.obtener_conexion(uuid)
                if conexion:
                    print(f"Enviando respuesta al UUID: {uuid}")
                    await conexion.send_json(respuesta)
                else:
                    print(f"Error: No hay conexión activa para el UUID {uuid}")
            
        except KeyError as e:
            print(f"Error: campo '{e.args[0]}' no encontrado al actualizar tarea")
            respuesta = {
                "tipo": "respuesta",
                "comando": "completar_tarea",
                "status": "error",
                "mensaje": f"Campo faltante: {e.args[0]}"
            }
            if uuid:
                conexion = conexiones.obtener_conexion(uuid)
                if conexion:
                    await conexion.send_json(respuesta)
        except Exception as e:
            print(f"Error al actualizar tarea: {e}")
            import traceback
            traceback.print_exc()
            respuesta = {
                "tipo": "respuesta",
                "comando": "completar_tarea",
                "status": "error",
                "mensaje": str(e)
            }
            if uuid:
                conexion = conexiones.obtener_conexion(uuid)
                if conexion:
                    await conexion.send_json(respuesta)
        return
     
    async def EliminarTarea(self, tarea, uuid = None):
        try:
            self.tareas_del_dia = [tarea for tarea in self.tareas_del_dia if tarea['id'] != tarea['id']]
            print(f"Tarea eliminada: {tarea['tarea']}")
        except Exception as e:
            print(f"Error al eliminar tarea: {e}")
        return

    async def Actualizar(self):
        lista_modificaciones = []
        lista_notificaciones = []

        ahora = datetime.now()
        dia = self.dias[ahora.weekday()]

        lista_tareas = self.tareas_manager.listar_por_fecha(dia)

        for tarea in lista_tareas['registros']:
            hubo_cambios = False

            hora_inicio = datetime.strptime(tarea['hora_ini'], "%H:%M").replace(
                year=ahora.year, month=ahora.month, day=ahora.day
            )

            hora_fin = datetime.strptime(tarea['hora_fin'], "%H:%M").replace(
                year=ahora.year, month=ahora.month, day=ahora.day
            )


            if tarea['estatus'] in ['completada', 'extra', 'vencida', 'futura']:
                continue

            # Tarea vencida
            if ahora > hora_fin:
                tarea['estatus'] = 'vencida'
                hubo_cambios = True
                # print(f"Tarea vencida: {tarea['nombre']}")

            # En progreso
            elif hora_inicio <= ahora <= hora_fin and tarea['estatus'] == 'sin_iniciar':
                tarea['estatus'] = 'en_progreso'
                hubo_cambios = True
                # print(f"Tarea en progreso: {tarea['nombre']}")

            if hubo_cambios:
                lista_modificaciones.append(tarea)
                lista_notificaciones.append(tarea['id_dueño'])

            
        if lista_modificaciones:
            resultado = self.tareas_manager.actualizar_varios(lista_modificaciones)
            print(resultado)
            await self.eventManager.emit("tareas_actualizadas", {
                "source": "tareas",
                "target": "individual",
                "action": "update_tareas",
                "notification": lista_notificaciones,
                "data": resultado
            })