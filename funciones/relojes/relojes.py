from database.database import DatabaseManager
from database.db_relojes import RelojManager
from conexiones import conexiones


class Relojes():
    def __init__(self):
        self.db_manager = DatabaseManager("relojes.db")
        self.reloj_manager = RelojManager(self.db_manager)

    async def AnalizarMensaje(self, data, uuid):
        """
        Analiza mensajes de relojes
        Formatos esperados:
        - Registro: {"tipo":"relojes", "comando":"registro"}
        - Inicio: {"tipo":"relojes", "comando":"inicio", "uuid":"uuid-value"}
        """
        print(f"Analizando mensaje en relojes: {data}")
        
        comando = data.get("comando")
        
        #dos opciones por mientras registro e inicio
        if comando == "registro":
            return await self._registrar_reloj_nuevo(data)
        
        elif comando == "inicio":
            if not uuid:
                return {"status": "error", "mensaje": "UUID requerido para inicio"}
            return await self._iniciar_reloj(uuid)
        
        else:
            return {"status": "error", "mensaje": f"Comando desconocido: {comando}"}
    
    def conexion(self, uuid):
        try:
            return conexiones.obtener_conexion(uuid)
        except KeyError:
            print(f"Error: No se encontró conexión para UUID: {uuid}")
            return None


    async def _registrar_reloj_nuevo(self, data):
        """Maneja el registro de un reloj nuevo"""
        resultado = self.reloj_manager.registrar_reloj_nuevo()
        print(f"Respuesta de registro en relojes: {resultado}")
        uuid = resultado.get("uuid")
        
        # Obtener la conexión actual (registrada por server.py con request.remote)
        # y re-registrarla con el UUID que acabamos de obtener
        cone = None
        # Buscar en todas las conexiones la más reciente sin UUID
        todas_conexiones = conexiones.obtener_conexiones()
        if todas_conexiones:
            # Tomar la última conexión registrada (que debería ser la del cliente actual)
            cone = list(todas_conexiones.values())[-1] if todas_conexiones else None
        
        # Re-registrar con el UUID
        if cone:
            # Eliminar el registro anterior con IP
            for key in list(todas_conexiones.keys()):
                if todas_conexiones[key] == cone:
                    conexiones.eliminar_conexion(key)
                    break
            # Registrar con UUID
            conexiones.agregar_conexion(uuid, cone)
            await cone.send_json(resultado)
        
        return resultado 

    async def _iniciar_reloj(self, uuid):
        """Maneja el inicio de sesión de un reloj"""
        resultado = self.reloj_manager.iniciar_sesion_reloj(uuid)
        print(f"Respuesta inicio en relojes: {resultado}")
        cone = self.conexion(uuid)
        conexiones.agregar_conexion(uuid, cone)
        if cone:
            await cone.send_json({"status": "ok", "mensaje": "Reloj iniciado correctamente", "data": resultado})
        return 