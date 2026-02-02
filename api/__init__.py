"""
API - Inicialización de módulos (usuarios, historial, tareas)
"""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from api.usuarios.routes import router as usuarios_router
from api.historial.routes import router as historial_router
from api.tareas.routes import router as tareas_router

# Ruta base del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = BASE_DIR / "web"

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
app.include_router(tareas_router)


# ==================== RUTAS DE INFORMACIÓN ====================

@app.get("/", tags=["Info"], include_in_schema=False)
async def root():
    """Redirecciona a la página de Actividades (inicio)"""
    return RedirectResponse(url="/actividades")


@app.get("/endpoints", tags=["Info"])
async def endpoints_info():
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
            },
            "tareas": {
                "crear": "POST /tareas",
                "listar": "GET /tareas",
                "obtener": "GET /tareas/{id}",
                "por_usuario": "GET /tareas/usuario/{usuario_id}",
                "por_dia": "GET /tareas/fecha/{dia_semana}",
                "actualizar": "PUT /tareas/{id}",
                "eliminar": "DELETE /tareas/{id}",
                "panel": "GET /tareas/panel"
            }
        }
    }


@app.get("/health", tags=["Info"])
async def health():
    """Health check"""
    return {
        "status": "ok",
        "mensaje": "API Relojes funcionando correctamente",
        "endpoints_disponibles": ["usuarios", "historial", "tareas"]
    }


# ==================== RUTAS DE VISTAS HTML ====================

@app.get("/actividades", tags=["Vistas"], include_in_schema=False)
async def actividades_view():
    """Sirve la página de Actividades Diarias"""
    return FileResponse(WEB_DIR / "Actividades" / "actividades.html")


@app.get("/informes", tags=["Vistas"], include_in_schema=False)
async def informes_view():
    """Sirve la página de Informes"""
    return FileResponse(WEB_DIR / "Informes" / "informes.html")


@app.get("/gestion", tags=["Vistas"], include_in_schema=False)
async def gestion_view():
    """Sirve la página de Gestión de Empleados"""
    return FileResponse(WEB_DIR / "Gestion" / "gestion.html")


@app.get("/top", tags=["Vistas"], include_in_schema=False)
async def top_view():
    """Sirve la página de Top"""
    return FileResponse(WEB_DIR / "TopEmpleados" / "top.html")


@app.get("/login", tags=["Vistas"], include_in_schema=False)
async def login_view():
    """Sirve la página de Login"""
    return FileResponse(WEB_DIR / "Login" / "login.html")


@app.get("/logout", tags=["Vistas"], include_in_schema=False)
async def logout_view():
    """
    Endpoint de logout - redirige a login
    El localStorage ya fue limpiado en el frontend
    """
    return RedirectResponse(url="/login")


# Montar archivos estáticos (CSS, JS, imágenes)
app.mount("/web", StaticFiles(directory=WEB_DIR), name="static")


__all__ = ['app']
