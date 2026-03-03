"""
database.py — Singleton del cliente Supabase.
"""
import logging
from supabase import create_client, Client
from .config import SUPABASE_URL, SUPABASE_KEY

log = logging.getLogger(__name__)

_client: Client | None = None


def get_db() -> Client:
    """Retorna (y cachea) el cliente Supabase."""
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError(
                "Faltan SUPABASE_URL / SUPABASE_KEY. "
                "Copia backend/.env.example → backend/.env y completa los valores."
            )
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
        log.info("Conectado a Supabase: %s", SUPABASE_URL)
    return _client


def seed_catalogos(db: Client) -> None:
    """
    Inserta catálogos maestros si están vacíos.
    Idempotente: usa upsert con on_conflict.
    """
    # Municipios
    municipios = [
        {"id_municipio": 1, "nombre": "Medellin",  "departamento": "Antioquia"},
        {"id_municipio": 2, "nombre": "Sabaneta",  "departamento": "Antioquia"},
        {"id_municipio": 3, "nombre": "Envigado",  "departamento": "Antioquia"},
    ]
    db.table("municipio").upsert(municipios, on_conflict="id_municipio").execute()

    # Zonas
    zonas = [
        {"id_zona": 1, "id_municipio": 1, "nombre": "El Poblado",  "nombre_normalizado": "el poblado"},
        {"id_zona": 2, "id_municipio": 1, "nombre": "Laureles",    "nombre_normalizado": "laureles"},
        {"id_zona": 3, "id_municipio": 1, "nombre": "Belén",       "nombre_normalizado": "belen"},
        {"id_zona": 4, "id_municipio": 1, "nombre": "Robledo",     "nombre_normalizado": "robledo"},
        {"id_zona": 5, "id_municipio": 1, "nombre": "Centro",      "nombre_normalizado": "centro"},
        {"id_zona": 6, "id_municipio": 1, "nombre": "El Hueco",    "nombre_normalizado": "el hueco"},
        {"id_zona": 7, "id_municipio": 2, "nombre": "Sabaneta",    "nombre_normalizado": "sabaneta"},
        {"id_zona": 8, "id_municipio": 3, "nombre": "Envigado",    "nombre_normalizado": "envigado"},
    ]
    db.table("zona").upsert(zonas, on_conflict="id_zona").execute()

    # Tipos de inmueble
    tipos = [
        {"id_tipo_inmueble": 1, "descripcion": "Casa"},
        {"id_tipo_inmueble": 2, "descripcion": "Apartamento"},
        {"id_tipo_inmueble": 3, "descripcion": "Apartestudio"},
        {"id_tipo_inmueble": 4, "descripcion": "Finca"},
        {"id_tipo_inmueble": 5, "descripcion": "Sin clasificar"},
    ]
    db.table("tipo_inmueble").upsert(tipos, on_conflict="id_tipo_inmueble").execute()

    # Estratos
    estratos = [
        {"id_estrato": 1, "numero": 1, "descripcion": "Estrato 1"},
        {"id_estrato": 2, "numero": 2, "descripcion": "Estrato 2"},
        {"id_estrato": 3, "numero": 3, "descripcion": "Estrato 3"},
        {"id_estrato": 4, "numero": 4, "descripcion": "Estrato 4"},
        {"id_estrato": 5, "numero": 5, "descripcion": "Estrato 5"},
        {"id_estrato": 6, "numero": 6, "descripcion": "Estrato 6"},
        {"id_estrato": 7, "numero": 0, "descripcion": "Sin estrato"},
    ]
    db.table("estrato").upsert(estratos, on_conflict="id_estrato").execute()

    log.info("Catálogos maestros verificados/insertados.")
