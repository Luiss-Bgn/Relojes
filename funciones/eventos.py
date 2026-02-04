import asyncio
class EventManager:
    def __init__(self):
        self.fila_comandos = asyncio.Queue()

    async def emit(self, tipo_evento, payload):
        await self.fila_comandos.put({
            "type": tipo_evento,
            "payload": payload
        })


    async def listen(self):
        while True:
            event = await self.fila_comandos.get()
            yield event

