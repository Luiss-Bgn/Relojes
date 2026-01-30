from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router as tareas_router