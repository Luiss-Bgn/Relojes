
class Conexiones():
    def __init__(self):
        self.conexiones_activas = {}

    def agregar_conexion(self, uuid, conexion):
        if uuid in self.conexiones_activas:
            print("La conexión ya existe.")
            return
        self.conexiones_activas[uuid] = conexion
        print(f"Conexión agregada. Total conexiones: {len(self.conexiones_activas)}")

    def eliminar_conexion(self, uuid):
        if uuid in self.conexiones_activas:
            del self.conexiones_activas[uuid]
        print(f"Conexión eliminada. Total conexiones: {len(self.conexiones_activas)}")

    def obtener_conexiones(self):
        print(self.conexiones_activas)
        return self.conexiones_activas
    
    def obtener_conexion(self, uuid):
        return self.conexiones_activas.get(uuid)