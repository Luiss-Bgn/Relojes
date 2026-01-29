from database.database import DatabaseManager
from database.db_relojes import RelojManager
from conexiones import Conexiones
Conexiones = Conexiones()


class Relojes():
    def _init_(self):
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
            return Conexiones.obtener_conexion(uuid)
        except KeyError:
            print(f"Error: No se encontró conexión para UUID: {uuid}")
            return None


    async def _registrar_reloj_nuevo(self, data):
        """Maneja el registro de un reloj nuevo"""
        resultado = self.reloj_manager.registrar_reloj_nuevo()
        print(f"Respuesta de registro en relojes: {resultado}")
        uuid = resultado.get("uuid")
        cone = self.conexion(uuid)
        if cone:
            await cone.send_json(resultado)
        return 

    async def _iniciar_reloj(self, uuid):
        """Maneja el inicio de sesión de un reloj"""
        resultado = self.reloj_manager.iniciar_sesion_reloj(uuid)
        print(f"Respuesta inicio en relojes: {resultado}")
        cone = self.conexion(uuid)
        if cone:
            await cone.send_json({"status": "ok", "mensaje": "Reloj iniciado correctamente", "data": resultado})
        return 