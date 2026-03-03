# api.py
# Lógica de consulta a Open-Meteo.
# obtener_clima() consulta, imprime y guarda en CSV en una sola llamada.
import logging
import unicodedata
from datetime import datetime

import requests

from .constantes import URL_API, MUNICIPIOS, WMO_CODES
from .storage    import cargar_csv, upsert, guardar_csv

log = logging.getLogger(__name__)

CSV_DEFAULT = "clima_municipios.csv"


def _normalizar(texto: str) -> str:
    """Lowercase + sin tildes para matching flexible."""
    texto = texto.strip().lower()
    return "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )


def decode_weather(code: int) -> str:
    """Convierte un código WMO al texto descriptivo en español."""
    return WMO_CODES.get(int(code), f"Código desconocido ({code})")


def fetch_municipio(session: requests.Session, municipio: dict) -> dict:
    """
    Realiza una petición a la API por municipio.
    Retorna dict con los campos listos para el CSV.
    """
    params = {
        "latitude"     : municipio["lat"],
        "longitude"    : municipio["lon"],
        "current"      : "temperature_2m,weather_code",
        "timezone"     : "America/Bogota",
        "forecast_days": 1,
    }
    resp = session.get(URL_API, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    cur  = data["current"]
    code = int(cur["weather_code"])

    return {
        "municipio"           : municipio["nombre"],
        "latitud"             : round(data["latitude"], 4),
        "longitud"            : round(data["longitude"], 4),
        "temperatura_c"       : round(cur["temperature_2m"], 1),
        "weather_code"        : code,
        "descripcion_clima"   : decode_weather(code),
        "ultima_actualizacion": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def obtener_clima(nombres: list[str] | None = None, csv: str = CSV_DEFAULT) -> list[dict]:
    """
    Consulta el clima actual, imprime cada resultado y actualiza el CSV.
    Si el CSV no existe lo crea. Si ya existe hace upsert por municipio.

    Parámetros:
        nombres : municipios a consultar. None = los 10 del área metropolitana.
                  Ej: ['Medellín', 'Envigado']
        csv     : ruta del CSV (default: clima_municipios.csv)

    Retorna:
        list[dict] con los resultados exitosos.

    Ejemplo:
        from clima import obtener_clima
        obtener_clima()
        obtener_clima(['Medellín', 'Bello'])
        obtener_clima(['Medellín'], csv='otro.csv')
    """
    import pandas as pd

    # Índice normalizado para matching flexible (case + accent insensitive)
    indice_norm = {_normalizar(m["nombre"]): m for m in MUNICIPIOS}

    if nombres is None:
        seleccion = MUNICIPIOS
    else:
        seleccion = []
        for n in nombres:
            clave = _normalizar(n)
            if clave in indice_norm:
                seleccion.append(indice_norm[clave])
            else:
                log.warning("Municipio no encontrado: '%s'", n)

        if not seleccion:
            log.info("Disponibles: %s", sorted(m["nombre"] for m in MUNICIPIOS))

    if not seleccion:
        log.error("Ningún municipio válido para consultar.")
        return []

    # Cargar CSV existente (o vacío si no existe)
    db = cargar_csv(csv)

    resultados = []
    with requests.Session() as session:
        for mun in seleccion:
            try:
                # Verificar si ya existe ANTES del upsert
                ya_existe = mun["nombre"] in db["municipio"].values

                fila = fetch_municipio(session, mun)

                # Upsert inmediato en el CSV
                df_nuevo = pd.DataFrame([fila])
                db = upsert(db, df_nuevo)
                guardar_csv(db, csv)

                resultados.append(fila)

                accion = "actualizado" if ya_existe else "insertado"
                log.info(
                    "  %-15s %5.1f °C  %-35s → CSV %s",
                    fila["municipio"],
                    fila["temperatura_c"],
                    fila["descripcion_clima"],
                    accion,
                )

            except requests.RequestException as e:
                log.error("  %s: %s — se omite", mun["nombre"], e)

    return resultados
