"""
routers/clima.py — Endpoints del módulo de clima.

GET  /clima/              → clima actual de todos los municipios (desde Supabase)
GET  /clima/{municipio}   → clima de un municipio específico
POST /clima/actualizar    → consulta Open-Meteo y actualiza Supabase
GET  /clima/municipios    → lista de municipios disponibles
"""
import logging
import unicodedata
from datetime import datetime

import requests
from fastapi import APIRouter, HTTPException, Query

from ..database import get_db

log = logging.getLogger(__name__)
router = APIRouter(prefix="/clima", tags=["Clima"])

# ── Constantes ────────────────────────────────────────────────────────────────

URL_API = "https://api.open-meteo.com/v1/forecast"

MUNICIPIOS = [
    {"nombre": "Medellín",    "lat":  6.2442, "lon": -75.5812},
    {"nombre": "Envigado",    "lat":  6.1720, "lon": -75.5872},
    {"nombre": "Itagüí",      "lat":  6.1847, "lon": -75.5996},
    {"nombre": "La Estrella", "lat":  6.1564, "lon": -75.6433},
    {"nombre": "Bello",       "lat":  6.3367, "lon": -75.5569},
    {"nombre": "Copacabana",  "lat":  6.3488, "lon": -75.5100},
    {"nombre": "Sabaneta",    "lat":  6.1514, "lon": -75.6167},
    {"nombre": "Caldas",      "lat":  6.0940, "lon": -75.6371},
    {"nombre": "Girardota",   "lat":  6.3797, "lon": -75.4461},
    {"nombre": "Barbosa",     "lat":  6.4394, "lon": -75.3328},
]

WMO_CODES = {
    0: "Cielo despejado", 1: "Principalmente despejado",
    2: "Parcialmente nublado", 3: "Nublado",
    45: "Niebla", 48: "Niebla con escarcha depositante",
    51: "Llovizna ligera", 53: "Llovizna moderada", 55: "Llovizna densa",
    56: "Llovizna helada ligera", 57: "Llovizna helada densa",
    61: "Lluvia ligera", 63: "Lluvia moderada", 65: "Lluvia fuerte",
    66: "Lluvia helada ligera", 67: "Lluvia helada fuerte",
    71: "Nevada ligera", 73: "Nevada moderada", 75: "Nevada fuerte",
    77: "Granos de nieve",
    80: "Aguacero ligero", 81: "Aguacero moderado", 82: "Aguacero fuerte",
    85: "Nevada en aguacero ligera", 86: "Nevada en aguacero fuerte",
    95: "Tormenta eléctrica",
    96: "Tormenta eléctrica con granizo ligero",
    99: "Tormenta eléctrica con granizo fuerte",
}


def _normalizar(t: str) -> str:
    t = t.strip().lower()
    return "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn")


def _find_municipio(nombre: str) -> dict | None:
    clave = _normalizar(nombre)
    for m in MUNICIPIOS:
        if _normalizar(m["nombre"]) == clave:
            return m
    return None


def _fetch(session: requests.Session, mun: dict) -> dict:
    """Consulta Open-Meteo para un municipio."""
    params = {
        "latitude": mun["lat"], "longitude": mun["lon"],
        "current": "temperature_2m,weather_code",
        "timezone": "America/Bogota", "forecast_days": 1,
    }
    resp = session.get(URL_API, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    cur = data["current"]
    code = int(cur["weather_code"])
    return {
        "municipio":            mun["nombre"],
        "latitud":              round(data["latitude"], 4),
        "longitud":             round(data["longitude"], 4),
        "temperatura_c":        round(cur["temperature_2m"], 1),
        "weather_code":         code,
        "descripcion_clima":    WMO_CODES.get(code, f"Código {code}"),
        "ultima_actualizacion": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/municipios")
async def listar_municipios():
    """Lista los 10 municipios disponibles."""
    return {"municipios": [m["nombre"] for m in MUNICIPIOS]}


@router.get("/")
async def obtener_clima_todos():
    """Retorna el clima almacenado en Supabase para todos los municipios."""
    db = get_db()
    resp = db.table("clima_municipio").select("*").order("municipio").execute()
    return {"data": resp.data}


@router.get("/{municipio}")
async def obtener_clima_municipio(municipio: str):
    """Retorna el clima almacenado para un municipio específico."""
    db = get_db()
    resp = (db.table("clima_municipio")
              .select("*")
              .ilike("municipio", f"%{municipio}%")
              .execute())
    if not resp.data:
        raise HTTPException(404, f"No hay datos para '{municipio}'. Ejecuta POST /clima/actualizar primero.")
    return {"data": resp.data}


@router.post("/actualizar")
async def actualizar_clima(
    nombres: list[str] | None = Query(default=None, description="Municipios a consultar. Vacío = todos.")
):
    """
    Consulta Open-Meteo en tiempo real y actualiza Supabase.
    Acepta nombres flexibles (case/accent insensitive).
    """
    if nombres:
        seleccion = []
        for n in nombres:
            m = _find_municipio(n)
            if m:
                seleccion.append(m)
            else:
                log.warning("Municipio no encontrado: '%s'", n)
        if not seleccion:
            raise HTTPException(400, "Ningún municipio válido.")
    else:
        seleccion = MUNICIPIOS

    db = get_db()
    resultados = []
    errores = []

    with requests.Session() as session:
        for mun in seleccion:
            try:
                fila = _fetch(session, mun)
                # Upsert en Supabase
                db.table("clima_municipio").upsert(
                    fila, on_conflict="municipio"
                ).execute()
                resultados.append(fila)
                log.info("%-15s %.1f°C  %s", fila["municipio"], fila["temperatura_c"], fila["descripcion_clima"])
            except requests.RequestException as e:
                errores.append({"municipio": mun["nombre"], "error": str(e)})
                log.error("%s: %s", mun["nombre"], e)

    return {
        "actualizados": len(resultados),
        "errores":      len(errores),
        "data":         resultados,
        "detalle_errores": errores,
    }
