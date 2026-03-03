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

# Reverse maps para el preview (id → nombre legible)
ZONA_ID_NOMBRE = {
    1: "El Poblado", 2: "Laureles", 3: "Belén",
    4: "Robledo",   5: "Centro",   6: "El Hueco",
    7: "Sabaneta",  8: "Envigado",
}
ESTRATO_ID_DESC = {
    1: "Estrato 1", 2: "Estrato 2", 3: "Estrato 3",
    4: "Estrato 4", 5: "Estrato 5", 6: "Estrato 6",
    7: "Sin estrato",
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
        # Algunos CSV envuelven filas enteras en comillas externas cuando el campo
        # fecha contiene coma (ej. "Oct 19, 2023"). Normalizar antes de parsear.
        texto = contenido.decode("utf-8-sig")
        lineas = texto.splitlines()
        normalizadas = [lineas[0]]  # encabezado
        for linea in lineas[1:]:
            linea = linea.strip()
            if linea.startswith('"') and linea.endswith('"'):
                linea = linea[1:-1].replace('""', '"')
            normalizadas.append(linea)
        df_raw = pd.read_csv(io.StringIO("\n".join(normalizadas)))
    except Exception as e:
        raise HTTPException(400, f"Error leyendo CSV: {e}")

    log.info("CSV recibido: %s (%d filas)", file.filename, len(df_raw))

    resultado = _transformar(df_raw)
    dp = resultado["propiedades"]
    da = resultado["anuncios"]

    # ── Cargar a Supabase en lotes de 500 (límite de Supabase) ──────────
    db = get_db()
    CHUNK = 500

    # Detectar cuáles IDs ya existen — consultando en lotes
    ids_validas: list[int] = [int(r["id_propiedad"]) for _, r in dp.iterrows()]
    ids_en_db: set[int] = set()
    for i in range(0, len(ids_validas), CHUNK):
        chunk_ids = ids_validas[i : i + CHUNK]
        resp = db.table("propiedad").select("id_propiedad").in_("id_propiedad", chunk_ids).execute()
        ids_en_db.update(int(r["id_propiedad"]) for r in resp.data)  # normalizar a int Python

    ids_set: set[int] = set(ids_validas)
    n_nuevas   = len(ids_set - ids_en_db)
    n_omitidas = len(ids_set & ids_en_db)  # ya existen, no se tocan
    log.info("IDs en CSV: %d | en BD: %d | nuevas: %d | omitidas: %d",
             len(ids_set), len(ids_en_db), n_nuevas, n_omitidas)

    # INSERT propiedades nuevas — las existentes se omiten (ON CONFLICT DO NOTHING)
    prop_rows = [
        {
            "id_propiedad":     int(r["id_propiedad"]),
            "id_tipo_inmueble": int(r["id_tipo"]),
            "id_zona":          int(r["id_zona"]),
            "id_estrato":       int(r["id_estrato"]),
            "metraje_m2":       _safe(r["metraje_clean"]),
        }
        for _, r in dp.iterrows()
    ]
    for i in range(0, len(prop_rows), CHUNK):
        db.table("propiedad").upsert(
            prop_rows[i : i + CHUNK],
            on_conflict="id_propiedad",
            ignore_duplicates=True,
        ).execute()
    log.info("Propiedades nuevas: %d | omitidas (ya existen): %d", n_nuevas, n_omitidas)

    # Upsert anuncios via función SQL (lógica de negocio en la BD)
    anun_candidatos = [
        {
            "id_propiedad":      int(r["id_propiedad"]),
            "precio_venta":      int(r["precio_clean"]),
            "fecha_publicacion": r["fecha_clean"],
        }
        for _, r in da.iterrows()
    ]

    n_anun_nuevos = 0
    n_anun_actualizados = 0
    n_anun_rechazados = 0
    for i in range(0, len(anun_candidatos), CHUNK):
        chunk = anun_candidatos[i : i + CHUNK]
        res = db.rpc("upsert_anuncios", {"rows": chunk}).execute()
        if res.data:
            n_anun_nuevos      += res.data.get("nuevos", 0)
            n_anun_actualizados += res.data.get("actualizados", 0)
            n_anun_rechazados  += res.data.get("identicos", 0)

    log.info("Anuncios → nuevos: %d | actualizados: %d | idénticos: %d",
             n_anun_nuevos, n_anun_actualizados, n_anun_rechazados)

    # ── Preview para el frontend (IDs raw) ───────────────────────────────
    preview_prop = dp.head(20).rename(columns={
        "tipo_clean":    "tipo_inmueble",
        "metraje_clean": "metraje_m2",
        "id_tipo":       "id_tipo_inmueble",
    }).fillna("").to_dict(orient="records")
    preview_anun = da.head(20).rename(columns={
        "precio_clean":  "precio_venta",
        "fecha_clean":   "fecha_publicacion",
    }).fillna("").to_dict(orient="records")

    return {
        "reporte": {
            **resultado["reporte"],
            "propiedades_nuevas":       n_nuevas,
            "propiedades_omitidas":    n_omitidas,
            "anuncios_nuevos":          n_anun_nuevos,
            "anuncios_actualizados":    n_anun_actualizados,
            "anuncios_rechazados":      n_anun_rechazados,
        },
        "preview_propiedades": preview_prop,
        "preview_anuncios":    preview_anun,
    }


@router.get("/propiedades")
async def listar_propiedades(limit: int = 20, offset: int = 0):
    """Lista propiedades desde Supabase con paginación (campos planos)."""
    db = get_db()
    resp = (db.table("propiedad")
              .select("id_propiedad, metraje_m2, id_estrato, tipo_inmueble(descripcion), zona(nombre), estrato(descripcion)")
              .order("id_propiedad")
              .range(offset, offset + limit - 1)
              .execute())
    # Aplanar objetos anidados
    flat = []
    for r in resp.data:
        flat.append({
            "id_propiedad": r["id_propiedad"],
            "tipo":         (r.get("tipo_inmueble") or {}).get("descripcion", ""),
            "zona":         (r.get("zona")          or {}).get("nombre", ""),
            "estrato":      (r.get("estrato")        or {}).get("descripcion", ""),
            "metraje_m2":   r["metraje_m2"],
        })
    return {"data": flat, "count": len(flat)}


@router.get("/anuncios")
async def listar_anuncios(limit: int = 20, offset: int = 0):
    """Lista anuncios desde Supabase con paginación."""
    db = get_db()
    resp = (db.table("anuncio")
              .select("id_anuncio, id_propiedad, precio_venta, fecha_publicacion")
              .order("fecha_publicacion", desc=True)
              .range(offset, offset + limit - 1)
              .execute())
    return {"data": resp.data, "count": len(resp.data)}


@router.delete("/reset")
async def reset_tablas():
    """Elimina todos los registros de anuncio y propiedad para empezar de cero."""
    db = get_db()
    # anuncio primero por FK
    db.table("anuncio").delete().neq("id_propiedad", -1).execute()
    db.table("propiedad").delete().neq("id_propiedad", -1).execute()
    log.info("Tablas propiedad y anuncio vaciadas.")
    return {"ok": True, "mensaje": "Tablas propiedad y anuncio vaciadas."}
