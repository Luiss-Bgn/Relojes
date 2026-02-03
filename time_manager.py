import asyncio
from datetime import datetime


async def chequeo_hora(Manager):
    # print("Iniciando chequeo de hora...")
    ultimo_minuto = None

    while True:
        ahora = datetime.now()
        if ahora.minute != ultimo_minuto:
            ultimo_minuto = ahora.minute
            if ahora.second == 0:
                # print(f"[{ahora.strftime('%H:%M:%S')}] Minuto nuevo detectado.")
                # Actualizar todo cada minuto
                await Manager.Actualizar()
        await asyncio.sleep(0.5)