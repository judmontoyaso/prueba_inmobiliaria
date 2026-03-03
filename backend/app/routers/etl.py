"""
routers/etl.py — Endpoints del pipeline ETL de propiedades.

POST /etl/upload       → sube CSV, transforma y carga a Supabase
GET  /etl/propiedades  → lista propiedades almacenadas
GET  /etl/anuncios     → lista anuncios almacenados
GET  /etl/reporte      → último reporte de calidad
"""
import io
import re
import math
import logging
import unicodedata
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException

from ..database import get_db

log = logging.getLogger(__name__)
router = APIRouter(prefix="/etl", tags=["ETL Propiedades"])

# ── Catálogos (idénticos a etl_propiedades.py) ───────────────────────────────

TIPO_MAPPING = {
    "casa": "Casa", "apartamento": "Apartamento",
    "apartestudio": "Apartestudio", "finca": "Finca",
}
TIPO_ID = {
    "Casa": 1, "Apartamento": 2, "Apartestudio": 3,
    "Finca": 4, "Sin clasificar": 5,
}

ZONA_MAPPING = {
    "el poblado": 1, "poblado": 1,
    "laureles": 2, "laureles - estadio": 2, "laureles estadio": 2,
    "belen": 3, "belén": 3,
    "robledo": 4,
    "centro": 5, "centro - medellin": 5,
    "el hueco": 6,
    "sabaneta": 7,
    "envigado": 8,
}

FORMATOS_FECHA = ["%b %d, %Y", "%d/%m/%Y", "%Y.%m.%d", "%Y-%m-%d"]

# ── Funciones de limpieza ─────────────────────────────────────────────────────

def _normalizar(t):
    return re.sub(r"\s+", " ", str(t).strip().lower())

def _sin_tildes(t):
    return "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn")

def limpiar_tipo(v):
    if pd.isna(v) or str(v).strip() in ("", "?"):
        return "Sin clasificar"
    return TIPO_MAPPING.get(str(v).strip().lower(), "Sin clasificar")

def limpiar_zona(v):
    if pd.isna(v) or str(v).strip() == "":
        return None
    n = _normalizar(v)
    if n in ZONA_MAPPING:
        return ZONA_MAPPING[n]
    s = _sin_tildes(n)
    if s in ZONA_MAPPING:
        return ZONA_MAPPING[s]
    for k, z in ZONA_MAPPING.items():
        if _sin_tildes(k) in s or s in _sin_tildes(k):
            return z
    return None

def limpiar_estrato(v):
    try:
        n = int(float(v))
        return n if 1 <= n <= 6 else 7
    except (ValueError, TypeError):
        return 7

def limpiar_fecha(v):
    if pd.isna(v) or str(v).strip() == "":
        return None
    for fmt in FORMATOS_FECHA:
        try:
            return datetime.strptime(str(v).strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def limpiar_metraje(v):
    try:
        x = float(v)
        return x if x > 1 else None
    except (ValueError, TypeError):
        return None

def limpiar_precio(v):
    try:
        limpio = re.sub(r"[\$\.\s]", "", str(v).strip())
        x = int(limpio)
        return x if x > 0 else None
    except (ValueError, TypeError):
        return None


# ── Pipeline ──────────────────────────────────────────────────────────────────

def _transformar(df_raw: pd.DataFrame) -> dict:
    """Ejecuta el pipeline de limpieza. Retorna DataFrames + reporte."""
    df = df_raw.copy()
    df["tipo_clean"]    = df["tipo_inmueble"].apply(limpiar_tipo)
    df["id_zona"]       = df["ubicacion"].apply(limpiar_zona)
    df["id_estrato"]    = df["estrato_socioeconomico"].apply(limpiar_estrato)
    df["fecha_clean"]   = df["fecha_publicacion"].apply(limpiar_fecha)
    df["metraje_clean"] = df["metraje_m2"].apply(limpiar_metraje)
    df["precio_clean"]  = df["precio_venta"].apply(limpiar_precio)

    dc = df[["id_propiedad", "tipo_clean", "id_zona", "id_estrato",
             "precio_clean", "metraje_clean", "fecha_clean"]].copy()

    # Propiedades
    dp = (dc.drop_duplicates("id_propiedad", keep="first")
            [["id_propiedad", "tipo_clean", "id_zona", "id_estrato", "metraje_clean"]]
            .reset_index(drop=True))
    dp_ok  = dp[dp["id_zona"].notna()].copy().reset_index(drop=True)
    dp_bad = dp[dp["id_zona"].isna()].reset_index(drop=True)
    dp_ok["id_tipo"] = dp_ok["tipo_clean"].map(TIPO_ID)

    # Anuncios
    da = (dc[dc["fecha_clean"].notna() & dc["precio_clean"].notna()]
            .drop_duplicates(["id_propiedad", "fecha_clean"], keep="last")
            [["id_propiedad", "precio_clean", "fecha_clean"]]
            .reset_index(drop=True))
    ids_ok = set(dp_ok["id_propiedad"])
    da_ok  = da[da["id_propiedad"].isin(ids_ok)].reset_index(drop=True)

    reporte = {
        "filas_crudas":        len(df_raw),
        "duplicados":          int(df_raw.duplicated().sum()),
        "propiedades_validas": len(dp_ok),
        "propiedades_rechazadas": len(dp_bad),
        "anuncios_validos":    len(da_ok),
        "metraje_nulo":        int(dc["metraje_clean"].isna().sum()),
        "precio_nulo":         int(dc["precio_clean"].isna().sum()),
        "sin_tipo":            int((dp_ok["tipo_clean"] == "Sin clasificar").sum()),
    }

    return {"propiedades": dp_ok, "anuncios": da_ok, "reporte": reporte}


def _safe(v):
    """Convierte NaN / NaT a None para JSON / Supabase."""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    """
    Sube un CSV crudo, ejecuta el ETL y carga propiedades + anuncios a Supabase.
    Retorna el reporte de calidad + primera preview de los datos.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Solo se aceptan archivos .csv")

    contenido = await file.read()
    try:
        df_raw = pd.read_csv(io.BytesIO(contenido), encoding="utf-8-sig")
    except Exception as e:
        raise HTTPException(400, f"Error leyendo CSV: {e}")

    log.info("CSV recibido: %s (%d filas)", file.filename, len(df_raw))

    resultado = _transformar(df_raw)
    dp = resultado["propiedades"]
    da = resultado["anuncios"]

    # ── Cargar a Supabase ─────────────────────────────────────────────────
    db = get_db()

    # Propiedades
    prop_rows = []
    for _, r in dp.iterrows():
        prop_rows.append({
            "id_propiedad":     int(r["id_propiedad"]),
            "id_tipo_inmueble": int(r["id_tipo"]),
            "id_zona":          int(r["id_zona"]),
            "id_estrato":       int(r["id_estrato"]),
            "metraje_m2":       _safe(r["metraje_clean"]),
        })
    if prop_rows:
        db.table("propiedad").upsert(prop_rows, on_conflict="id_propiedad").execute()
        log.info("Propiedades cargadas: %d", len(prop_rows))

    # Anuncios
    anun_rows = []
    for _, r in da.iterrows():
        anun_rows.append({
            "id_propiedad":      int(r["id_propiedad"]),
            "precio_venta":      int(r["precio_clean"]),
            "fecha_publicacion": r["fecha_clean"],
        })
    if anun_rows:
        db.table("anuncio").upsert(
            anun_rows,
            on_conflict="id_propiedad,fecha_publicacion"
        ).execute()
        log.info("Anuncios cargados: %d", len(anun_rows))

    # ── Preview para el frontend ──────────────────────────────────────────
    preview_prop = dp.head(20).fillna("").to_dict(orient="records")
    preview_anun = da.head(20).fillna("").to_dict(orient="records")

    return {
        "reporte": resultado["reporte"],
        "preview_propiedades": preview_prop,
        "preview_anuncios":    preview_anun,
    }


@router.get("/propiedades")
async def listar_propiedades(limit: int = 100, offset: int = 0):
    """Lista propiedades desde Supabase con paginación."""
    db = get_db()
    resp = (db.table("propiedad")
              .select("*, tipo_inmueble(descripcion), zona(nombre), estrato(descripcion)")
              .order("id_propiedad")
              .range(offset, offset + limit - 1)
              .execute())
    return {"data": resp.data, "count": len(resp.data)}


@router.get("/anuncios")
async def listar_anuncios(limit: int = 100, offset: int = 0):
    """Lista anuncios desde Supabase con paginación."""
    db = get_db()
    resp = (db.table("anuncio")
              .select("*, propiedad(id_propiedad)")
              .order("fecha_publicacion", desc=True)
              .range(offset, offset + limit - 1)
              .execute())
    return {"data": resp.data, "count": len(resp.data)}
