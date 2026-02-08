import time

class Conexiones():
    def __init__(self):
        self.conexiones_activas = {}
        self.conexiones_a_registrar = {}

    def agregar_conexion(self, uuid, conexion, tipo):
        self.conexiones_activas[uuid] = {
            "ws": conexion,
            "tipo": tipo,
            "last_seen": time.time()
        }
        print(f"Conexión agregada. Total conexiones: {len(self.conexiones_activas)}")

    def agregar_registro(self, ip, conexion):
        self.conexiones_a_registrar[ip] = {
            "ws": conexion
        }
    
    def obtener_registro(self, ip):
        return self.conexiones_a_registrar[ip]
    
    def eliminar_registro(self,ip):
        try:
            del self.conexiones_a_registrar[ip]
            # print("Conexion eliminada")
        except:
            print("Error eliminando la conexion del registro")


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
    
    def actualizar_latido(self, uuid):
        if uuid in self.conexiones_activas:
            self.conexiones_activas[uuid]["last_seen"] = time.time()

    def limpiar_conexiones_muertas(self, timeout=30):
        ahora = time.time()
        muertos = []

        for uuid, data in list(self.conexiones_activas.items()):
            if ahora - data["last_seen"] > timeout and data["tipo"] != "web":
                muertos.append(uuid)

        for uuid in muertos:
            print(f"Conexión expirada: {uuid}")
            self.eliminar_conexion(uuid)


    
conexiones = Conexiones()
