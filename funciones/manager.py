import funciones

class Manager():
    def __init__(self):
        self.funciones = {
            "usuarios": funciones.Usuarios(),
            "relojes": funciones.Relojes(),
        }

    def AnalizarMensaje(self, data):
        print(f"Procesando mensaje: {data}")

        if "tipo" in data:
            tipo = data["tipo"]
            if tipo in self.funciones: #buscamos si el tipo existe en las operacioens validas de la clasew
                # Obtener respuesta del módulo específico
                respuesta = self.funciones[tipo].AnalizarMensaje(data) #entra al mensaje del tipo corresponsinte
                return respuesta
            else:
                print(f"Tipo de mensaje desconocido: {tipo}") #tipo erroneo 
                return {"status": "error", "mensaje": f"Tipo desconocido: {tipo}"}
        else:
            print(f"Mensaje sin 'tipo'") #en caso de no enviar tipo
            return {"status": "error", "mensaje": "Campo 'tipo' requerido"}