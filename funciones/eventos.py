import asyncio

class EventManager:
    def __init__(self):
        self.loop = None
        self.fila_comandos = asyncio.Queue()

    def set_loop(self):
        self.loop = asyncio.get_running_loop()

    async def emit(self, tipo_evento, payload):
        # Si estamos en otro thread, usamos call_soon_threadsafe

        current_loop = asyncio.get_running_loop()

        # print(f"eventos {self.loop} | {current_loop} | {tipo_evento} | {payload}")

        if current_loop != self.loop:
            self.loop.call_soon_threadsafe(
                self.fila_comandos.put_nowait,
                {"type": tipo_evento, "payload": payload}
            )
        else:
            await self.fila_comandos.put({
                "type": tipo_evento,
                "payload": payload
            })

    async def listen(self):
        while True:
            event = await self.fila_comandos.get()
            yield event
