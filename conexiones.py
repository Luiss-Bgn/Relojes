
class Conexiones():
    def __init__(self):
        self.conexiones_activas = {}

    def agregar_conexion(self, uuid, conexion, tipo):
        if uuid in self.conexiones_activas:
            print("La conexión ya existe.")
            return
        self.conexiones_activas[uuid] = {
            "ws": conexion,
            "tipo": tipo
        }
        print(f"Conexión agregada. Total conexiones: {len(self.conexiones_activas)}")

    def eliminar_conexion(self, uuid):
        if uuid in self.conexiones_activas:
            del self.conexiones_activas[uuid]
        print(f"Conexión eliminada. Total conexiones: {len(self.conexiones_activas)}")

    def obtener_conexiones(self):
        return self.conexiones_activas
    
    def obtener_conexion(self, uuid):
        """Obtiene una conexión específica por UUID"""
        return self.conexiones_activas.get(uuid)
    
    def obtener_web(self):
        """Obtiene todas las conexiones web"""
        return [c["ws"] for c in self.conexiones_activas.values() if c["tipo"] == "web"]
    
    def obtener_relojes(self):
        return [c["ws"] for c in self.conexiones_activas.values() if c["tipo"] == "reloj"]
    
    def obtener_uuids_por_tipo(self, tipo):
        return [
            uuid for uuid, data in self.conexiones_activas.items()
            if data["tipo"] == tipo
        ]

    def obtener_todos_los_uuids(self):
        return list(self.conexiones_activas.keys())

    
conexiones = Conexiones()
