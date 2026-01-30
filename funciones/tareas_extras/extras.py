
from datetime import datetime, timedelta


class Extras():
    def __init__(self):
        self.lista_extras = []

        self.tiempoParaExtra = timedelta(hours=1)
        pass

    def AnalizarMensaje(self, data):
        print(f"Analizando mensaje en Extras: {data}")
        return
    
    def Actualizar(self):
        print("Actualizando Extras...")

        hora_actual = datetime.now()

        for tarea in self.lista_extras:
            # Estados a ignorar
            if tarea['estado'] in ['en_progreso','completada', 'sin_iniciar']:
                continue
            else:
                hora_fin = datetime.strptime(tarea['hora_fin'], "%H:%M").replace(year=hora_actual.year, month=hora_actual.month, day=hora_actual.day)
                
                # Cambiar estado de vencida a extra
                if hora_actual >= hora_fin and hora_actual < hora_fin + timedelta(self.tiempoParaExtra) and tarea['estado'] == 'vencida':
                    tarea['estado'] = 'extra'
                    print(f"Cambio a extra: {tarea['titulo']}")
                elif hora_actual >= hora_fin + timedelta(self.tiempoParaExtra) and tarea['estado'] == 'extra':
                    tarea['estado'] = 'vencida'
                    print(f"Extra vencida: {tarea['titulo']}")
        return