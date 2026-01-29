from database.database import DatabaseManager
from database.db_relojes import RelojManager


class Relojes():
    def __init__(self):
        self.db_manager = DatabaseManager("relojes.db")
        self.reloj_manager = RelojManager(self.db_manager)

    def AnalizarMensaje(self, data):
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
            return self._registrar_reloj_nuevo(data)
        
        elif comando == "inicio":
            uuid_reloj = data.get("uuid")
            if not uuid_reloj:
                return {"status": "error", "mensaje": "UUID requerido para inicio"}
            return self._iniciar_reloj(uuid_reloj)
        
        else:
            return {"status": "error", "mensaje": f"Comando desconocido: {comando}"}
    
    def _registrar_reloj_nuevo(self, data):
        """Maneja el registro de un reloj nuevo"""
        resultado = self.reloj_manager.registrar_reloj_nuevo()
        print(f"Respuesta de registro en relojes: {resultado}")
        return resultado
    
    def _iniciar_reloj(self, uuid_reloj):
        """Maneja el inicio de sesión de un reloj"""
        resultado = self.reloj_manager.iniciar_sesion_reloj(uuid_reloj)
        print(f"Respuesta inicio en relojes: {resultado}")
        return resultado