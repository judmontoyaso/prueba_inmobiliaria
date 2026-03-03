"""
clima.py
--------
Módulo de gestión climática — Área Metropolitana de Medellín.

Conecta con la API Open-Meteo (https://open-meteo.com/en/docs) para obtener,
por cada municipio del área metropolitana, la temperatura actual (°C) y el
código de estado del tiempo (weather_code), y traduce ese código numérico
a una descripción legible en español para los asesores.

Lógica de almacenamiento (Upsert):
    - Si el municipio ya existe en clima_data.csv, solo actualiza los campos
      climáticos y la "fecha_ultima_actualizacion" (sin duplicar filas).
    - Si el municipio es nuevo, agrega una fila al archivo.

Uso:
    python clima.py

Programación diaria a las 6:00 AM (cron):
    0 6 * * * /usr/bin/python3 /ruta/modulo_clima/clima.py

    GitHub Actions (.github/workflows/clima.yml):
        on:
          schedule:
            - cron: "0 6 * * *"

En producción, reemplazar el upsert CSV por psycopg2:

    import psycopg2
    from psycopg2.extras import execute_batch

    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'), dbname=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'), password=os.getenv('DB_PASSWORD'),
        sslmode='require'
    )
    cur = conn.cursor()
    execute_batch(
        cur,
        \"\"\"
        INSERT INTO clima_municipio
            (municipio, latitud, longitud, temperatura_c, weather_code,
             descripcion_clima, fecha_ultima_actualizacion)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (municipio)
        DO UPDATE SET
            temperatura_c             = EXCLUDED.temperatura_c,
            weather_code              = EXCLUDED.weather_code,
            descripcion_clima         = EXCLUDED.descripcion_clima,
            fecha_ultima_actualizacion = EXCLUDED.fecha_ultima_actualizacion;
        \"\"\",
        registros
    )
    conn.commit()
"""

import os
from datetime import datetime

import pandas as pd
import requests


# ── Rutas ─────────────────────────────────────────────────────────────────────

_DIR = os.path.dirname(os.path.abspath(__file__))
MUNICIPIOS_CSV = os.path.join(_DIR, "municipios.csv")
CLIMA_DATA_CSV = os.path.join(_DIR, "clima_data.csv")

# ── API Open-Meteo ─────────────────────────────────────────────────────────────

API_URL = "https://api.open-meteo.com/v1/forecast"

# ── Tabla WMO — códigos de estado del tiempo (español) ──────────────────────

WMO_CODES: dict[int, str] = {
    0:  "Cielo despejado",
    1:  "Mayormente despejado",
    2:  "Parcialmente nublado",
    3:  "Nublado",
    45: "Niebla",
    48: "Niebla con escarcha",
    51: "Llovizna ligera",
    53: "Llovizna moderada",
    55: "Llovizna intensa",
    56: "Llovizna engelante ligera",
    57: "Llovizna engelante intensa",
    61: "Lluvia ligera",
    63: "Lluvia moderada",
    65: "Lluvia intensa",
    66: "Lluvia engelante ligera",
    67: "Lluvia engelante intensa",
    71: "Nevada ligera",
    73: "Nevada moderada",
    75: "Nevada intensa",
    77: "Granizo fino",
    80: "Chubascos ligeros",
    81: "Chubascos moderados",
    82: "Chubascos violentos",
    85: "Chubascos de nieve ligeros",
    86: "Chubascos de nieve intensos",
    95: "Tormenta eléctrica moderada",
    96: "Tormenta eléctrica con granizo ligero",
    99: "Tormenta eléctrica con granizo intenso",
}


def describir_codigo(code: int) -> str:
    """Devuelve la descripción en español de un código WMO.

    Si el código no está en la tabla, retorna una cadena genérica
    en lugar de lanzar una excepción, para no interrumpir el flujo.
    """
    return WMO_CODES.get(code, f"Condición desconocida (código {code})")


# ── Consumo de API ─────────────────────────────────────────────────────────────

def fetch_weather(lat: float, lon: float) -> dict:
    """Consulta Open-Meteo y retorna temperatura y weather_code actuales.

    Parámetros
    ----------
    lat : float
        Latitud WGS84 del municipio.
    lon : float
        Longitud WGS84 del municipio.

    Retorna
    -------
    dict con claves:
        temperatura_c    : float  — temperatura actual en °C
        weather_code     : int    — código WMO del estado del tiempo
        descripcion_clima: str    — descripción legible en español
    """
    params = {
        "latitude":  lat,
        "longitude": lon,
        "current":   "temperature_2m,weather_code",
        "timezone":  "auto",
    }
    try:
        response = requests.get(API_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        current = data["current"]
        code = int(current["weather_code"])
        return {
            "temperatura_c":     round(float(current["temperature_2m"]), 1),
            "weather_code":      code,
            "descripcion_clima": describir_codigo(code),
        }
    except requests.exceptions.Timeout:
        raise ConnectionError(
            f"Tiempo de espera agotado al consultar Open-Meteo "
            f"(lat={lat}, lon={lon})"
        )
    except requests.exceptions.RequestException as exc:
        raise ConnectionError(
            f"Error de red al consultar Open-Meteo: {exc}"
        )
    except (KeyError, ValueError) as exc:
        raise ValueError(
            f"Respuesta inesperada de Open-Meteo para lat={lat}, lon={lon}: {exc}"
        )


# ── Upsert CSV ─────────────────────────────────────────────────────────────────

COLUMNAS = [
    "municipio",
    "latitud",
    "longitud",
    "temperatura_c",
    "weather_code",
    "descripcion_clima",
    "fecha_ultima_actualizacion",
]


def upsert_registros(ruta_csv: str, nuevos: list[dict]) -> pd.DataFrame:
    """Actualiza o inserta filas climáticas en un archivo CSV.

    Si ``ruta_csv`` ya existe, carga su contenido y, por cada municipio
    entrante:
      - Lo actualiza en el lugar si ya existe (temperatura, weather_code,
        descripcion_clima, fecha_ultima_actualizacion).
      - Lo agrega como fila nueva si no existe.

    Finalmente guarda el DataFrame resultante en ``ruta_csv``.

    Parámetros
    ----------
    ruta_csv : str
        Ruta del archivo CSV de destino.
    nuevos : list[dict]
        Lista de registros con las claves de ``COLUMNAS``.

    Retorna
    -------
    pd.DataFrame con el estado final del archivo.
    """
    if os.path.exists(ruta_csv):
        df = pd.read_csv(ruta_csv)
        # Asegurar que existan todas las columnas esperadas
        for col in COLUMNAS:
            if col not in df.columns:
                df[col] = None
    else:
        df = pd.DataFrame(columns=COLUMNAS)

    filas_nuevas: list[dict] = []
    for rec in nuevos:
        nombre = rec["municipio"]
        mask = df["municipio"] == nombre
        if mask.any():
            # Upsert: solo actualiza campos climáticos
            df.loc[mask, "temperatura_c"]              = rec["temperatura_c"]
            df.loc[mask, "weather_code"]               = rec["weather_code"]
            df.loc[mask, "descripcion_clima"]          = rec["descripcion_clima"]
            df.loc[mask, "fecha_ultima_actualizacion"] = rec["fecha_ultima_actualizacion"]
        else:
            filas_nuevas.append(rec)

    if filas_nuevas:
        df = pd.concat(
            [df, pd.DataFrame(filas_nuevas, columns=COLUMNAS)],
            ignore_index=True,
        )

    df.to_csv(ruta_csv, index=False, encoding="utf-8-sig")
    return df


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    """Punto de entrada principal.

    1. Lee el CSV maestro de municipios.
    2. Consulta la API de Open-Meteo para cada municipio.
    3. Realiza el upsert en clima_data.csv.
    4. Imprime un resumen en pantalla.
    """
    print("=" * 70)
    print("  Módulo Climático — Área Metropolitana de Medellín")
    print(f"  Ejecución: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # 1. Cargar maestro de municipios
    if not os.path.exists(MUNICIPIOS_CSV):
        raise FileNotFoundError(
            f"Archivo maestro no encontrado: {MUNICIPIOS_CSV}"
        )
    maestro = pd.read_csv(MUNICIPIOS_CSV)

    nuevos: list[dict] = []
    errores: list[str] = []
    ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 2. Consultar API por municipio
    print(f"\n{'Municipio':<20} {'Temp (°C)':>10} {'Cód':>5}  Descripción")
    print("-" * 70)

    for _, fila in maestro.iterrows():
        nombre = str(fila["municipio"])
        lat    = float(fila["latitud"])
        lon    = float(fila["longitud"])
        try:
            clima = fetch_weather(lat, lon)
            registro = {
                "municipio":                nombre,
                "latitud":                  lat,
                "longitud":                 lon,
                "temperatura_c":            clima["temperatura_c"],
                "weather_code":             clima["weather_code"],
                "descripcion_clima":        clima["descripcion_clima"],
                "fecha_ultima_actualizacion": ahora,
            }
            nuevos.append(registro)
            print(
                f"{nombre:<20} {clima['temperatura_c']:>9.1f}°"
                f" {clima['weather_code']:>5}  {clima['descripcion_clima']}"
            )
        except (ConnectionError, ValueError) as exc:
            errores.append(f"{nombre}: {exc}")
            print(f"{nombre:<20} {'ERROR':>10}       {exc}")

    # 3. Upsert
    if nuevos:
        df_final = upsert_registros(CLIMA_DATA_CSV, nuevos)
        print(f"\n✔  {len(nuevos)} registro(s) actualizados en: {CLIMA_DATA_CSV}")
        print(f"   Total filas en archivo: {len(df_final)}")
    else:
        print("\n⚠  No se obtuvieron datos — clima_data.csv no fue modificado.")

    if errores:
        print(f"\n⚠  {len(errores)} error(es) durante la ejecución:")
        for e in errores:
            print(f"   - {e}")

    print("=" * 70)


if __name__ == "__main__":
    main()
