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
                "buscar_pin": "GET /usuarios/pin/{pin}",
                "obtener": "GET /usuarios/{id}",
                "actualizar": "PUT /usuarios/{id}",
                "eliminar": "DELETE /usuarios/{id}",
                "autenticar": "POST /usuarios/autenticar"
            },
            "historial": {
                "crear": "POST /historial",
                "listar": "GET /historial",
                "obtener": "GET /historial/{id}",
                "vencidas": "GET /historial/vencidas",
                "vencidas": "GET /historial/top-vencidas",
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
                "panel": "GET /tareas/panel/obtener"
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


# ==================== UTILIDADES ====================

@app.get("/check-username", tags=["Utilidades"])
async def verificar_username(username: str):
    """Verifica si un username ya está registrado"""
    from database.database import DatabaseManager
    from database.db_usuarios import UsuarioManager
    
    db_manager = DatabaseManager("relojes.db")
    usuario_manager = UsuarioManager(db_manager)
    
    usuario = usuario_manager.dao.obtener_por_username(username)
    return {
        "exists": usuario is not None,
        "username": username
    }


# ==================== ENDPOINTS PARA INFORMES ====================

@app.get("/empleados-con-tareas", tags=["Informes"])
async def obtener_empleados_con_tareas():
    """Alias de /usuarios para compatibilidad con frontend de Informes"""
    from api.usuarios.routes import listar_usuarios
    return await listar_usuarios()


@app.get("/tareas-vencidas", tags=["Informes"])
async def obtener_tareas_vencidas(quincena_actual: bool = True):
    """Obtiene tareas vencidas (no completadas) con fecha pasada"""
    from database.database import DatabaseManager
    from database.db_tareas import TareasManager
    from database.db_usuarios import UsuarioManager
    from datetime import datetime, timedelta
    
    db_manager = DatabaseManager("relojes.db")
    tareas_manager = TareasManager(db_manager)
    usuario_manager = UsuarioManager(db_manager)
    
    resultado_tareas = tareas_manager.listar_todos()
    if resultado_tareas.get("status") != "success":
        return []
    
    todas_tareas = resultado_tareas.get("registros", [])
    tareas_vencidas = []
    hoy = datetime.now().date()
    
    # Calcular quincena si es necesario
    if quincena_actual:
        dia_actual = hoy.day
        if dia_actual <= 15:
            inicio_quincena = hoy.replace(day=1)
            fin_quincena = hoy.replace(day=15)
        else:
            inicio_quincena = hoy.replace(day=16)
            siguiente_mes = hoy.replace(day=28) + timedelta(days=4)
            fin_quincena = siguiente_mes - timedelta(days=siguiente_mes.day)
    
    for tarea in todas_tareas:
        # Saltar completadas
        if tarea.get("estatus") in ["completada", "completado", "3"]:
            continue
        
        try:
            fecha_tarea = datetime.strptime(tarea.get("fecha"), "%Y-%m-%d").date()
        except:
            continue
        
        # Solo vencidas
        if fecha_tarea >= hoy:
            continue
        
        # Filtrar por quincena
        if quincena_actual and not (inicio_quincena <= fecha_tarea <= fin_quincena):
            continue
        
        # Agregar info del usuario
        usuario_id = tarea.get("id_dueño")
        resultado_usuario = usuario_manager.obtener_usuario(usuario_id)
        
        if resultado_usuario.get("status") == "success":
            usuario = resultado_usuario.get("usuario", {})
            tareas_vencidas.append({
                **tarea,
                "empleado_nombre": usuario.get("nombre"),
                "empleado_puesto": usuario.get("puesto")
            })
    
    return tareas_vencidas


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
