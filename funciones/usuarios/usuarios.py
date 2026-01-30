

from database.database import DatabaseManager
from database.db_usuarios import UsuarioManager


class Usuarios():
    def __init__(self):
        self.db_manager = DatabaseManager("relojes.db")
        self.usuario_manager = UsuarioManager(self.db_manager)

    async def AnalizarMensaje(self, data, uuid):
        """
        Analiza mensajes WebSocket de usuarios
        Casos soportados:
        1. obtener_lista: Obtiene lista de empleados
        2. seleccionar_empleado: Obtiene datos de un empleado específico
        """
        print(f"Analizando mensaje en Usuarios: {data}")
        
        comando = data.get("comando")
        
        if comando == "obtener_lista":
            return await self._obtener_lista_empleados()
        elif comando == "seleccionar_empleado":
            return await self._seleccionar_empleado(data)
        else:
            return {"status": "error", "mensaje": f"Comando desconocido: {comando}"}
    
    async def _obtener_lista_empleados(self):
        """
        Caso 1: Reloj se conecta y solicita lista de empleados
        """
        try:
            resultado = self.usuario_manager.listar_usuarios()
            
            if resultado.get("status") == "success":
                empleados = resultado.get("usuarios", [])
                return {
                    "tipo": "usuarios",
                    "accion": "lista_empleados",
                    "empleados": empleados,
                    "total": len(empleados),
                    "status": "success"
                }
            else:
                return {
                    "status": "error",
                    "mensaje": resultado.get("mensaje")
                }
        except Exception as e:
            print(f"Error en obtener lista de empleados: {e}")
            return {"status": "error", "mensaje": str(e)}
    
    async def _seleccionar_empleado(self, data):
        """
        Caso 2: Reloj selecciona un empleado de la lista
        Se envían los datos del empleado al reloj
        """
        try:
            usuario_id = data.get("usuario_id")
            
            if not usuario_id:
                return {
                    "status": "error",
                    "mensaje": "usuario_id requerido"
                }
            
            resultado = self.usuario_manager.obtener_usuario(usuario_id)
            #falta enviar las tareas del empleado seleccionado desde aqui al reloj 
            if resultado.get("status") == "success":
                usuario = resultado.get("usuario", {})
                return {
                    "tipo": "usuarios",
                    "accion": "empleado_seleccionado",
                    "usuario": usuario,
                    "status": "success"
                }
            else:
                return {
                    "status": "error",
                    "mensaje": resultado.get("mensaje")
                }
        except Exception as e:
            print(f"Error en seleccionar empleado: {e}")
            return {"status": "error", "mensaje": str(e)}
    
    async def Actualizar(self):
        """Se ejecuta periódicamente por el Manager"""
        print("Actualizando Usuarios...")
        return

