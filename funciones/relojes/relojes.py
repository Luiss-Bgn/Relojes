from database.database import DatabaseManager
from database.db_relojes import RelojManager
from database.db_usuarios import UsuarioManager
from database.db_tareas import TareasManager
from conexiones import conexiones

from datetime import datetime

class Relojes():
    def __init__(self):
        self.db_manager = DatabaseManager("relojes.db")
        self.reloj_manager = RelojManager(self.db_manager)
        self.usuario_manager = UsuarioManager(self.db_manager)
        self.tareas_manager = TareasManager(self.db_manager)

        self.comandos = {
            "registro": self._registrar_reloj_nuevo,
            "inicio": self._iniciar_reloj,
            "empleado_seleccionado": self._actualizar_reloj,
            "actualizar_tareas": self._actualizar_reloj
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

        await conexion['ws'].send_json(mensaje)

    async def _actualizar_reloj(self, mensaje, uuid):
        usuario_elegido = self.usuario_manager.obtener_usuario(mensaje['id'])
        rol = usuario_elegido['usuario']['rol']

        if mensaje['comando'] == "empleado_seleccionado":
            resultado = self.reloj_manager.iniciar_sesion_reloj(uuid, mensaje['id'], rol)

        lista_tareas = await self.obtenerTareas(mensaje['id'])
        lista_extras = await self.obtenerExtras(rol,mensaje['id'])
        
        conexion = conexiones.obtener_conexion(uuid)
        mensaje = {
            "comando": "tareas",
            "tareas": lista_tareas['registros'],
            "vibrar": True
        }
        await conexion['ws'].send_json(mensaje)

        mensaje = {
            "comando": "extras",
            "tareas": lista_extras['registros'],
            "vibrar": False
        }
        await conexion['ws'].send_json(mensaje)
