"""
API - Inicialización de módulos (usuarios, historial, tareas)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.usuarios.routes import router as usuarios_router
from api.historial.routes import router as historial_router

# Crear aplicación principal que integra todos los módulos
app = FastAPI(
    title="API Relojes - Integrada",
    description="API REST integrada con usuarios, historial y tareas",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers (no montar sub-aplicaciones)
app.include_router(usuarios_router)
app.include_router(historial_router)


# ==================== RUTAS DE INFORMACIÓN ====================

@app.get("/", tags=["Info"])
async def root():
    """Información general de la API"""
    return {
        "nombre": "API Relojes - rutas",
        "endpoints": {
            "usuarios": {
                "crear": "POST /usuarios",
                "listar": "GET /usuarios",
                "obtener": "GET /usuarios/{id}",
                "actualizar": "PUT /usuarios/{id}",
                "eliminar": "DELETE /usuarios/{id}",
                "autenticar": "POST /usuarios/autenticar"
            },
            "historial": {
                "crear": "POST /historial",
                "listar": "GET /historial",
                "obtener": "GET /historial/{id}",
                "por_usuario": "GET /historial/usuario/{usuario_id}",
                "por_fecha": "GET /historial/fecha/{fecha}",
                "actualizar": "PUT /historial/{id}",
                "eliminar": "DELETE /historial/{id}"
            }
        }
    }


@app.get("/health", tags=["Info"])
async def health():
    """Health check"""
    return {
        "status": "ok",
        "mensaje": "API Relojes funcionando correctamente",
        "endpoints_disponibles": ["usuarios", "historial"]
    }


__all__ = ['app']
