import funciones

class Manager():
    def __init__(self):
        self.funciones = {
            "usuarios": funciones.Usuarios(),
            "relojes": funciones.Relojes(),
        }

    def AnalizarMensaje(self, data):
        print(f"Procesando mensaje en Manager: {data}")

        if "tipo" in data:
            tipo = data["tipo"]
            if tipo in self.funciones:
                self.funciones[tipo].AnalizarMensaje(data)
            else:
                print(f"Tipo de mensaje desconocido: {tipo}")
        return