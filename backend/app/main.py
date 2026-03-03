"""
main.py — Punto de entrada FastAPI.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import get_db, seed_catalogos
from .routers import etl, clima

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Al arrancar: conecta a Supabase y siembra catálogos maestros."""
    log.info("Iniciando backend…")
    db = get_db()
    seed_catalogos(db)
    yield
    log.info("Backend detenido.")


app = FastAPI(
    title="Inmobiliaria Medellín — API",
    description="ETL de propiedades + clima del Valle de Aburrá",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ────────────────────────────────────────────────────────────────
app.include_router(etl.router)
app.include_router(clima.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


