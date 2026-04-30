import asyncio
from datetime import datetime
from conexiones import conexiones
import time
import logging

logger = logging.getLogger(__name__)

async def ping_relojes():
    relojes = conexiones.obtener_conexiones()

    for uuid, data in list(relojes.items()):
        if data["tipo"] == "reloj":
            try:
                await data["ws"].send_json({"comando": "ping"})
            except:
                conexiones.eliminar_conexion(uuid)


async def chequeo_hora(Manager):
    ultimo_minuto = None
    ultimo_ping = 0
    ultimo_check_timeout = 0

    while True:
        ahora = datetime.now()

        # Actualización cada minuto
        if ahora.minute != ultimo_minuto:
            ultimo_minuto = ahora.minute
            logger.info("Actualizador por minuto ejecutado: %s", ahora.strftime("%Y-%m-%d %H:%M"))
            await Manager.Actualizar()

        # Ping cada 15 s
        if time.time() - ultimo_ping > 15:
            await ping_relojes()
            ultimo_ping = time.time()

        # Limpiar conexiones muertas cada 10 s
        if time.time() - ultimo_check_timeout > 10:
            conexiones.limpiar_conexiones_muertas(timeout=40)
            ultimo_check_timeout = time.time()

        await asyncio.sleep(0.5)
