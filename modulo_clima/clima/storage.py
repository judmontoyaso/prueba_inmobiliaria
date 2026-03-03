# storage.py
# Lectura y escritura del CSV.

import os
import pandas as pd
from .constantes import CAMPOS_CLIMA

COLUMNAS = [
    "municipio",
    "latitud",
    "longitud",
    "temperatura_c",
    "weather_code",
    "descripcion_clima",
    "ultima_actualizacion",
]


def cargar_csv(ruta: str) -> pd.DataFrame:
    """Lee el CSV existente. Si no existe retorna DataFrame vacío."""
    if os.path.exists(ruta):
        return pd.read_csv(ruta)
    return pd.DataFrame(columns=COLUMNAS)


def upsert(db: pd.DataFrame, nuevos: pd.DataFrame) -> pd.DataFrame:
    """
    Upsert por nombre de municipio.
    - Existe  : actualiza solo campos de clima y fecha
    - No existe: inserta fila completa

    En producción (PostgreSQL):
        INSERT INTO clima_municipios (...)
        VALUES (...)
        ON CONFLICT (municipio) DO UPDATE SET
            temperatura_c        = EXCLUDED.temperatura_c,
            weather_code         = EXCLUDED.weather_code,
            descripcion_clima    = EXCLUDED.descripcion_clima,
            ultima_actualizacion = EXCLUDED.ultima_actualizacion;
    """
    db     = db.set_index("municipio").copy()
    nuevos = nuevos.set_index("municipio")

    for municipio, row in nuevos.iterrows():
        if municipio in db.index:
            db.loc[municipio, CAMPOS_CLIMA] = row[CAMPOS_CLIMA]
        else:
            db.loc[municipio] = row

    return db.reset_index()


def guardar_csv(df: pd.DataFrame, ruta: str) -> None:
    """Guarda el DataFrame en el CSV. Crea el directorio si no existe."""
    os.makedirs(os.path.dirname(os.path.abspath(ruta)), exist_ok=True)
    df.to_csv(ruta, index=False)
