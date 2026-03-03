# api.py
# Lógica de consulta a Open-Meteo.
# obtener_clima() consulta, imprime y guarda en CSV en una sola llamada.
from datetime import datetime

import requests

from .constantes import URL_API, MUNICIPIOS, WMO_CODES
from .storage    import cargar_csv, upsert, guardar_csv

CSV_DEFAULT = "clima_municipios.csv"


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

    nombres_disponibles = {m["nombre"] for m in MUNICIPIOS}

    if nombres is None:
        seleccion = MUNICIPIOS
    else:
        desconocidos = [n for n in nombres if n not in nombres_disponibles]
        if desconocidos:
            print(f"[AVISO] Municipios no encontrados: {desconocidos}")
            print(f"        Disponibles: {sorted(nombres_disponibles)}")
        seleccion = [m for m in MUNICIPIOS if m["nombre"] in nombres]

    if not seleccion:
        print("[ERROR] Ningún municipio válido para consultar.")
        return []

    # Cargar CSV existente (o vacío si no existe)
    db = cargar_csv(csv)

    resultados = []
    with requests.Session() as session:
        for mun in seleccion:
            try:
                fila = fetch_municipio(session, mun)

                # Upsert inmediato en el CSV
                df_nuevo = pd.DataFrame([fila])
                db = upsert(db, df_nuevo)
                guardar_csv(db, csv)

                resultados.append(fila)

                # Print en tiempo real
                accion = "actualizado" if mun["nombre"] in db["municipio"].values else "insertado"
                print(
                    f"  {fila['municipio']:<15} "
                    f"{fila['temperatura_c']:>5.1f} °C  "
                    f"{fila['descripcion_clima']:<35} "
                    f"→ CSV {accion}"
                )

            except requests.RequestException as e:
                print(f"  [ERROR] {mun['nombre']}: {e} — se omite")

    return resultados
