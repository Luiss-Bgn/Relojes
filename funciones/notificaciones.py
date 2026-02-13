
class Notificaciones:
    def __init__(self,eventManager):
        self.eventManager = eventManager
        pass

    async def AnalizarMensaje(self, mensaje, uuid):
        await self.eventManager.emit("tareas_actualizadas", {
            "source": "notificaciones",
            "target": "global",
            "action": "update_tareas",
            "notification": "todos",
            "data": mensaje,
            "vibrar": False
        })

