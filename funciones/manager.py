import funciones

class Manager():
    def __init__(self):
        self.funciones = {
            "usuarios": funciones.Usuarios(),
            "relojes": funciones.Relojes(),
            "tareas": funciones.Tareas(),
        }

<<<<<<< HEAD
    async def AnalizarMensaje(self, data):
=======
    def AnalizarMensaje(self, data, uuid):
>>>>>>> 0964c4f567a3ae5337859b9f597259923f5bb063
        print(f"Procesando mensaje: {data}")
        
        try:
            tipo = data["tipo"]
            if not tipo in self.funciones: 
                print(f"Tipo de mensaje desconocido: {tipo}")
                return
            
<<<<<<< HEAD
            await self.funciones[tipo].AnalizarMensaje(data) #entra al mensaje del tipo corresponsinte
=======
            self.funciones[tipo].AnalizarMensaje(data, uuid) #entra al mensaje del tipo corresponsinte
>>>>>>> 0964c4f567a3ae5337859b9f597259923f5bb063
            return
        
        except KeyError as e:
            print(f"Error: campo '{e.args[0]}' no encontrado en el mensaje") #en caso de no enviar tipo
            return
        
        except Exception as e:
            print(f"Error al procesar mensaje: {e}")
            return

    
    async def Actualizar(self):
        print("Actualizando Manager y sus funciones...")
        for funcion in self.funciones.values():
            if hasattr(funcion, 'Actualizar'):
                await funcion.Actualizar()
        return

