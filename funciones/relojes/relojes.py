from database.database import DatabaseManager
from database.db_relojes import RelojManager
from database.db_usuarios import UsuarioManager
from database.db_tareas import TareasManager
from conexiones import conexiones

from datetime import datetime
import unicodedata

class Relojes():
    def __init__(self, eventManager):
        self.db_manager = DatabaseManager("relojes.db")
        self.reloj_manager = RelojManager(self.db_manager)
        self.usuario_manager = UsuarioManager(self.db_manager)
        self.tareas_manager = TareasManager(self.db_manager)

        self.eventManager = eventManager

        self.comandos = {
            "registro": self._registrar_reloj_nuevo,
            "inicio": self._iniciar_reloj,
            "empleado_seleccionado": self._actualizar_reloj,
            "actualizar_tareas": self._actualizar_reloj,
            "completar_tarea": self._completar_tarea,
            "completar_extra": self._completar_extra,
            "pong": self._ping
        }

        self.dias = [
            "Lunes", "Martes", "Miércoles",
            "Jueves", "Viernes", "Sábado", "Domingo"
        ]

    async def AnalizarMensaje(self, mensaje, uuid):
        # print(f"Analizando mensaje en Relojes: {mensaje}")
        try:
            comando = mensaje["comando"]
            if comando in self.comandos:
                await self.comandos[comando](mensaje, uuid)
        except KeyError as e:
            print(f"Error: campo '{e.args[0]}' no encontrado en el mensaje de Relojes")
        except Exception as e:
            print(f"Error al procesar mensaje en Relojes: {e}")

        return
    
    async def _ping(self,mensaje,uuid):
        conexiones.actualizar_latido(uuid)
    
    async def obtenerTareas(self,id_empleado):
        hoy = datetime.now()
        dia = self.dias[hoy.weekday()]
        lista_tareas = self.tareas_manager.listar_por_usuario_y_fecha(id_empleado, dia)

        return lista_tareas
    
    async def obtenerExtras(self,rol,id_empleado):
        hoy = datetime.now()
        dia = self.dias[hoy.weekday()]
        lista_tareas = self.tareas_manager.listar_extras_por_fecha_y_rol(dia,rol,id_empleado)

        return lista_tareas
    
    def adaptar_para_arduino(self, obj):
        if isinstance(obj, dict):
            nuevo = {}
            for k, v in obj.items():
                if k == "id_dueño":
                    k = "id_dueno"

                nuevo[k] = self.adaptar_para_arduino(v)
            return nuevo

        elif isinstance(obj, list):
            return [self.adaptar_para_arduino(i) for i in obj]

        elif isinstance(obj, str):
            # Quita tildes y caracteres raros
            return unicodedata.normalize("NFKD", obj)\
                .encode("ascii", "ignore")\
                .decode("ascii")

        else:
            return obj
        
    async def _completar_tarea(self, mensaje, uuid):
        tarea_id = mensaje['tarea']['id']
        tarea = self.tareas_manager.obtener_registro(tarea_id)

        conexion = conexiones.obtener_conexion(uuid)
        if not tarea or tarea['registro']['estatus'] != "en_progreso": 
            # print("No se puede completar la tarea")
            await conexion["ws"].send_json(self.adaptar_para_arduino({"comando":"update_tareas"}))
            return

        resultado = self.tareas_manager.actualizar_registro(
            tarea_id,
            estatus="completada",
        )

        respuesta = {
            "comando": "update_tareas",
            "vibrar": False
        }

        await conexion["ws"].send_json(self.adaptar_para_arduino(respuesta))

        await self.eventManager.emit("tareas_actualizadas", {
                "source": "tareas",
                "target": "web",
                "action": "update_tareas",
                "notification": [],
                "data": resultado
        })

    async def _completar_extra(self, mensaje, uuid):
        tarea_id = mensaje['tarea']['id']
        tarea = self.tareas_manager.obtener_registro(tarea_id)

        conexion = conexiones.obtener_conexion(uuid)
        if not tarea or tarea['registro']['estatus'] != "extra":
            await conexion["ws"].send_json(self.adaptar_para_arduino({"comando":"update_tareas"}))
            return
        
        resultado = self.tareas_manager.actualizar_registro(
            tarea_id,
            completadaPor=mensaje['tarea']['id_empleado'],
        )

        respuesta = {
            "comando": "update_tareas",
            "vibrar": False
        }

        await conexion["ws"].send_json(self.adaptar_para_arduino(respuesta))

        await self.eventManager.emit("tareas_actualizadas", {
            "source": "tareas",
            "target": "rol",
            "action": "update_tareas",
            "notification": tarea['registro']['disponible_para_rol'],
            "data": resultado
        })

        

    async def _registrar_reloj_nuevo(self, mensaje, uuid):
        """Maneja el registro de un reloj nuevo"""
        resultado = self.reloj_manager.registrar_reloj_nuevo()
        # print(f"Respuesta de registro en relojes: {resultado}")
        uuid = resultado.get("uuid")
        
        conexion = conexiones.obtener_registro(mensaje['ip'])
        if conexion:
            conexiones.eliminar_registro(mensaje['ip'])

        conexiones.agregar_conexion(uuid, conexion['ws'], "reloj")
        conexion = conexiones.obtener_conexion(uuid)

        await conexion['ws'].send_json(resultado)
        
        return
    
    async def _iniciar_reloj(self, mensaje, uuid):
        lista_empleados = self.usuario_manager.obtener_usuarios_por_roles(["empleado"])

        mensaje = {
            "lista_usuarios": lista_empleados["usuarios"],
            "vibrar": True
        }
        conexion = conexiones.obtener_conexion(uuid)
        print(mensaje)
        
        await conexion['ws'].send_json(self.adaptar_para_arduino(mensaje))

    async def _actualizar_reloj(self, mensaje, uuid):
        usuario_elegido = self.usuario_manager.obtener_usuario(mensaje['id'])
        rol = usuario_elegido['usuario']['rol']
        nombre = usuario_elegido['usuario']['nombre']

        if mensaje['comando'] == "empleado_seleccionado":
            resultado = self.reloj_manager.iniciar_sesion_reloj(uuid, mensaje['id'], rol, nombre)

        lista_tareas = await self.obtenerTareas(mensaje['id'])
        lista_extras = await self.obtenerExtras(rol, mensaje['id'])
        
        conexion = conexiones.obtener_conexion(uuid)
        mensaje = {
            "comando": "tareas",
            "tareas": lista_tareas['registros'],
            "vibrar": True
        }
        await conexion['ws'].send_json(self.adaptar_para_arduino(mensaje))

        mensaje = {
            "comando": "extras",
            "tareas": lista_extras['registros'],
            "vibrar": False
        }
        await conexion['ws'].send_json(self.adaptar_para_arduino(mensaje))
