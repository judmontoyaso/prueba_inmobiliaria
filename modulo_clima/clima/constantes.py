# constantes.py
# Códigos WMO y carga de municipios desde CSV.

import os
import csv

URL_API = "https://api.open-meteo.com/v1/forecast"

# ── Municipios: se leen desde municipios.csv ─────────────────────────────────
# El CSV debe tener columnas: municipio, latitud, longitud
# Editar el CSV para agregar o quitar municipios (sin tocar código).

_CSV_MUNICIPIOS = os.path.join(os.path.dirname(__file__), "..", "municipios.csv")


def _cargar_municipios(ruta: str = _CSV_MUNICIPIOS) -> list[dict]:
    """Lee municipios.csv y retorna lista de dicts con nombre/lat/lon."""
    municipios = []
    with open(ruta, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            municipios.append({
                "nombre": row["municipio"].strip(),
                "lat":    float(row["latitud"]),
                "lon":    float(row["longitud"]),
            })
    return municipios


MUNICIPIOS = _cargar_municipios()

# Campos que se actualizan en cada ejecución (no se tocan latitud/longitud)
CAMPOS_CLIMA = [
    "temperatura_c",
    "weather_code",
    "descripcion_clima",
    "ultima_actualizacion",
]

# Códigos WMO → descripción en español
# Fuente: https://open-meteo.com/en/docs#weather_variable_documentation
WMO_CODES = {
    0 : "Cielo despejado",
    1 : "Principalmente despejado",
    2 : "Parcialmente nublado",
    3 : "Nublado",
    45: "Niebla",
    48: "Niebla con escarcha depositante",
    51: "Llovizna ligera",
    53: "Llovizna moderada",
    55: "Llovizna densa",
    56: "Llovizna helada ligera",
    57: "Llovizna helada densa",
    61: "Lluvia ligera",
    63: "Lluvia moderada",
    65: "Lluvia fuerte",
    66: "Lluvia helada ligera",
    67: "Lluvia helada fuerte",
    71: "Nevada ligera",
    73: "Nevada moderada",
    75: "Nevada fuerte",
    77: "Granos de nieve",
    80: "Aguacero ligero",
    81: "Aguacero moderado",
    82: "Aguacero fuerte",
    85: "Nevada en aguacero ligera",
    86: "Nevada en aguacero fuerte",
    95: "Tormenta eléctrica",
    96: "Tormenta eléctrica con granizo ligero",
    99: "Tormenta eléctrica con granizo fuerte",
}
