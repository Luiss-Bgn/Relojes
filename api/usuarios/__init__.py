from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router as usuarios_router

# Crear aplicacion FastAPI
app = FastAPI(
    title="API Relojes - Usuarios",
    description="API REST para gestión de usuarios",
    version="1.0.0"
)

# CORS pa permitir requests desde cualquier origen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
#se necedita para agregar las rutas
app.include_router(usuarios_router)

#auxiliar solo para ver las rutas que existen

@app.get("/", tags=["Info"])
async def root():
    """Información general de la API"""
    return {
        "nombre": "API Relojes - Usuarios",
        "versión": "1.0.0",
        "endpoints": {
            "usuarios": {
                "crear": "POST /usuarios",
                "listar": "GET /usuarios",
                "obtener": "GET /usuarios/{id}",
                "actualizar": "PUT /usuarios/{id}",
                "eliminar": "DELETE /usuarios/{id}",
                "autenticar": "POST /usuarios/autenticar"
            }
        }
    }


@app.get("/health", tags=["Info"])
async def health():
    """Health check"""
    return {
        "status": "ok",
        "mensaje": "API funcionando correctamente"
    }


__all__ = ['app']
