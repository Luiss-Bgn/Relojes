
from datetime import datetime, timedelta
from database.database import DatabaseManager
from database.db_tareas import TareasManager
from conexiones import conexiones


class Extras():
    def __init__(self):
        self.tareas_del_dia = []
        self.tiempo_para_extra = timedelta(minutes=5)

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
            "completar_tarea": self.actualizar_tarea,
        }
        pass


    async def AnalizarMensaje(self, data, uuid):
        try:
            comando = data["comando"]
            if comando in self.comandos:
                await self.comandos[comando](data, uuid)
        except KeyError as e:
            print(f"Error: campo '{e.args[0]}' no encontrado en el mensaje de Tareas")
        except Exception as e:
            print(f"Error al procesar mensaje en Tareas: {e}")

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
                    estatus = "extra"    
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
    
    async def Actualizar(self):
        # print("Actualizando estado de tareas extras...")
        ahora = datetime.now()
        dia = self.dias[ahora.weekday()]

        lista_tareas = self.tareas_manager.listar_por_fecha(dia)
        hubo_cambios = False

        for tarea in lista_tareas['registros']:

            hora_fin = datetime.strptime(tarea['hora_fin'], "%H:%M").replace(
                year=ahora.year, month=ahora.month, day=ahora.day
            )

            if tarea['estatus'] in ['completada', 'en_progreso', 'sin_iniciar']:
                continue

            if ahora >= hora_fin and tarea['estatus'] == 'vencida' and ahora < hora_fin + self.tiempo_para_extra:
                tarea['estatus'] = 'extra'
                hubo_cambios = True
                # print(f"Tarea extra: {tarea['nombre']}")
        
            elif ahora >= hora_fin + self.tiempo_para_extra and tarea['estatus'] == 'extra' and tarea['completadaPor'] is None:
                tarea['estatus'] = 'vencida'
                hubo_cambios = True
                # print(f"Tarea caduco: {tarea['nombre']}")

        if hubo_cambios:
            resultado = self.tareas_manager.actualizar_varios(lista_tareas['registros'])
            webs = conexiones.obtener_web()
            for ws in webs:
                await ws.send_json({"status": "update_tareas"})