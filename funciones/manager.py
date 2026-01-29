import funciones

class Manager():
    def __init__(self):
        self.funciones = {
            "usuarios": funciones.Usuarios(),
            "relojes": funciones.Relojes(),
        }

    def AnalizarMensaje(self, data, uuid):
        print(f"Procesando mensaje: {data}")
        
        try:
            tipo = data["tipo"]
            if not tipo in self.funciones: 
                print(f"Tipo de mensaje desconocido: {tipo}")
                return
            
            self.funciones[tipo].AnalizarMensaje(data, uuid) #entra al mensaje del tipo corresponsinte
            return
        
        except KeyError as e:
            print(f"Error: campo '{e.args[0]}' no encontrado en el mensaje") #en caso de no enviar tipo
            return
        
        except Exception as e:
            print(f"Error al procesar mensaje: {e}")
            return

    
    def Actualizar(self):
        print("Actualizando Manager y sus funciones...")
        for funcion in self.funciones.values():
            if hasattr(funcion, 'Actualizar'):
                funcion.Actualizar()
        return

