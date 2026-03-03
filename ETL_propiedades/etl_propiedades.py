"""
etl_propiedades.py
------------------
Pipeline ETL — Propiedades Medellin.
Carga simulada: genera las sentencias SQL (INSERT INTO) necesarias
para alimentar el modelo relacional disenado.

Uso:
    python etl_propiedades.py ruta/al/archivo.csv


En produccion, se remplaza la seccion de print por psycopg2:

    import psycopg2
    from psycopg2.extras import execute_batch

    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'), dbname=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'), password=os.getenv('DB_PASSWORD'),
        sslmode='require'
    )
    cur = conn.cursor()
    execute_batch(cur, "INSERT INTO propiedad (...) VALUES (%s,...) ON CONFLICT ...", registros)
    conn.commit()
"""

import os
import sys
import re
import math
import unicodedata
from datetime import datetime
import pandas as pd


# ── Catalogos maestros ────────────────────────────────────────────────────────

MUNICIPIOS = {
    1: {"nombre": "Medellin",  "departamento": "Antioquia"},
    2: {"nombre": "Sabaneta",  "departamento": "Antioquia"},
    3: {"nombre": "Envigado",  "departamento": "Antioquia"},
}

ZONAS = {
    1: {"nombre": "El Poblado",  "id_municipio": 1},
    2: {"nombre": "Laureles",    "id_municipio": 1},
    3: {"nombre": "Belen",       "id_municipio": 1},
    4: {"nombre": "Robledo",     "id_municipio": 1},
    5: {"nombre": "Centro",      "id_municipio": 1},
    6: {"nombre": "El Hueco",    "id_municipio": 1},
    7: {"nombre": "Sabaneta",    "id_municipio": 2},
    8: {"nombre": "Envigado",    "id_municipio": 3},
}

TIPOS_INMUEBLE = {
    1: "Casa", 2: "Apartamento", 3: "Apartestudio",
    4: "Finca", 5: "Sin clasificar",
}
TIPO_ID = {v: k for k, v in TIPOS_INMUEBLE.items()}

ESTRATOS = {
    1: {"numero": 1, "descripcion": "Estrato 1"},
    2: {"numero": 2, "descripcion": "Estrato 2"},
    3: {"numero": 3, "descripcion": "Estrato 3"},
    4: {"numero": 4, "descripcion": "Estrato 4"},
    5: {"numero": 5, "descripcion": "Estrato 5"},
    6: {"numero": 6, "descripcion": "Estrato 6"},
    7: {"numero": 0, "descripcion": "Sin estrato"},
}


# ── Mappings de limpieza ──────────────────────────────────────────────────────

TIPO_MAPPING = {
    "casa":         "Casa",
    "apartamento":  "Apartamento",
    "apartestudio": "Apartestudio",
    "finca":        "Finca",
}

ZONA_MAPPING = {
    "el poblado": 1, "poblado": 1,
    "laureles": 2, "laureles - estadio": 2, "laureles estadio": 2,
    "belen": 3, "belen": 3,
    "robledo": 4,
    "centro": 5, "centro - medellin": 5,
    "el hueco": 6,
    "sabaneta": 7,
    "envigado": 8,
}

FORMATOS_FECHA = [
    "%b %d, %Y",   # Oct 15, 2023
    "%d/%m/%Y",    # 15/10/2023
    "%Y.%m.%d",    # 2023.10.15
    "%Y-%m-%d",    # 2023-10-15
]


# ── Funciones de limpieza ─────────────────────────────────────────────────────

def normalizar(texto):
    """Lowercase + strip + colapsa espacios."""
    return re.sub(r"\s+", " ", str(texto).strip().lower())

def quitar_tildes(texto):
    return "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )

def limpiar_tipo(val):
    if pd.isna(val) or str(val).strip() in ("", "?"):
        return "Sin clasificar"
    return TIPO_MAPPING.get(str(val).strip().lower(), "Sin clasificar")


def limpiar_zona(val):
    if pd.isna(val) or str(val).strip() == "":
        return None
    norm = normalizar(val)
    if norm in ZONA_MAPPING:
        return ZONA_MAPPING[norm]
    sin_tildes = quitar_tildes(norm)
    if sin_tildes in ZONA_MAPPING:
        return ZONA_MAPPING[sin_tildes]
    # coincidencia parcial
    for clave, id_zona in ZONA_MAPPING.items():
        if quitar_tildes(clave) in sin_tildes or sin_tildes in quitar_tildes(clave):
            return id_zona
    return None


def limpiar_estrato(val):
    """Estratos 1-6. Cualquier otro valor o nulo pasa a id 7 (Sin estrato)."""
    try:
        numero = int(float(val))
        return numero if 1 <= numero <= 6 else 7
    except (ValueError, TypeError):
        return 7


def limpiar_fecha(val):
    """
    Parsea con 4 patrones conocidos. Retorna string YYYY-MM-DD o None.
    None por campo vacio y None por formato desconocido se distinguen
    en el reporte.
    """
    if pd.isna(val) or str(val).strip() == "":
        return None
    for fmt in FORMATOS_FECHA:
        try:
            return datetime.strptime(str(val).strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def limpiar_metraje(val):
    """
    Metraje <= 1 pasa a None.
    El EDA mostro que no existe ningun valor entre 2 y 20 m2 —
    el umbral no es arbitrario.
    """
    try:
        v = float(val)
        return v if v > 1 else None
    except (ValueError, TypeError):
        return None


def limpiar_precio(val):
    """
    Limpia formato '$ 2.441.000.000' antes de castear.
    El EDA detecto 357 valores con este formato que pd.to_numeric
    convierte a NaN aunque el dato existe.
    Precio <= 0 pasa a None — el anuncio se descarta.
    """
    try:
        limpio = re.sub(r"[\$\.\s]", "", str(val).strip())
        v = int(limpio)
        return v if v > 0 else None
    except (ValueError, TypeError):
        return None


# ── Helper SQL ────────────────────────────────────────────────────────────────

def sql_val(v):
    """Convierte un valor Python a su representacion SQL segura."""
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return "NULL"
    if isinstance(v, str):
        return "'" + v.replace("'", "''") + "'"
    if isinstance(v, float):
        return f"{v:.2f}"
    return str(v)


# ── Extraccion ────────────────────────────────────────────────────────────────

def extraer(csv_path):
    print(f"Leyendo {csv_path}...")
    df = pd.read_csv(csv_path, encoding="utf-8-sig")
    print(f"  {df.shape[0]:,} filas, {df.shape[1]} columnas")
    return df


# ── Transformacion ────────────────────────────────────────────────────────────

def transformar(df_raw):
    df = df_raw.copy()

    # Limpieza por columna
    df["tipo_inmueble_clean"] = df["tipo_inmueble"].apply(limpiar_tipo)
    df["id_zona"]             = df["ubicacion"].apply(limpiar_zona)
    df["id_estrato"]          = df["estrato_socioeconomico"].apply(limpiar_estrato)
    df["fecha_clean"]         = df["fecha_publicacion"].apply(limpiar_fecha)
    df["metraje_clean"]       = df["metraje_m2"].apply(limpiar_metraje)
    df["precio_clean"]        = df["precio_venta"].apply(limpiar_precio)

    # Dataset transformado completo — sin eliminar duplicados todavia
    df_clean = df[[
        "id_propiedad", "tipo_inmueble_clean", "id_zona", "id_estrato",
        "precio_clean", "metraje_clean", "fecha_clean",
    ]].copy()

    # PROPIEDAD----: unicidad por id_propiedad — atributos fisicos estables
    # Los duplicados del CSV son exactos — se descarta la copia
    # id_zona NOT NULL: sin zona la propiedad no es ubicable, se rechaza
    df_propiedad = (
        df_clean
        .drop_duplicates(subset=["id_propiedad"], keep="first")
        [["id_propiedad", "tipo_inmueble_clean", "id_zona", "id_estrato", "metraje_clean"]]
        .reset_index(drop=True)
    )
    df_propiedad_validas    = df_propiedad[df_propiedad["id_zona"].notna()].reset_index(drop=True)
    df_propiedad_rechazadas = df_propiedad[df_propiedad["id_zona"].isna()].reset_index(drop=True)

    # Mapear tipo a id para el INSERT
    df_propiedad_validas = df_propiedad_validas.copy()
    df_propiedad_validas["id_tipo"] = df_propiedad_validas["tipo_inmueble_clean"].map(TIPO_ID)

    # ANUNCIO-----: unicidad por (id_propiedad, fecha_clean)
    # si mismo (id, fecha) llega con precio distinto, el ultimo gana
    # Sin fecha o sin precio — el anuncio se descarta
    df_anuncio = (
        df_clean[
            df_clean["fecha_clean"].notna() &
            df_clean["precio_clean"].notna()
        ]
        .drop_duplicates(subset=["id_propiedad", "fecha_clean"], keep="last")
        [["id_propiedad", "precio_clean", "fecha_clean"]]
        .reset_index(drop=True)
    )
    
    
    ##_______________________
    # Validacion FK: anuncios cuya propiedad no esta en esta carga
    # En produccion la BD lo rechaza por la FK — aqui se reporta como advertencia
    ids_validos         = set(df_propiedad_validas["id_propiedad"])
    df_anuncio_ok       = df_anuncio[df_anuncio["id_propiedad"].isin(ids_validos)].reset_index(drop=True)
    df_anuncio_sin_prop = df_anuncio[~df_anuncio["id_propiedad"].isin(ids_validos)].reset_index(drop=True)

    sin_fecha_vacio   = int(df["fecha_publicacion"].isna().sum())
    sin_fecha_formato = int(df_clean["fecha_clean"].isna().sum()) - sin_fecha_vacio
    ##_______________________
    
    reporte = {
        "raw":               len(df_raw),
        "duplicados":        int(df_raw.duplicated().sum()),
        "prop_validas":      len(df_propiedad_validas),
        "prop_rechazadas":   len(df_propiedad_rechazadas),
        "anuncios_ok":       len(df_anuncio_ok),
        "anuncios_sin_prop": len(df_anuncio_sin_prop),
        "metraje_null":      int(df_clean["metraje_clean"].isna().sum()),
        "precio_null":       int(df_clean["precio_clean"].isna().sum()),
        "sin_fecha_vacio":   sin_fecha_vacio,
        "sin_fecha_formato": sin_fecha_formato,
        "sin_tipo":          int((df_propiedad_validas["tipo_inmueble_clean"] == "Sin clasificar").sum()),
    }

    return {
        "df_propiedad_validas":    df_propiedad_validas,
        "df_propiedad_rechazadas": df_propiedad_rechazadas,
        "df_anuncio_ok":           df_anuncio_ok,
        "df_anuncio_sin_prop":     df_anuncio_sin_prop,
        "reporte":                 reporte,
    }


# ── Carga simulada — genera sentencias SQL ────────────────────────────────────

def generar_sql(resultado):
    df_prop   = resultado["df_propiedad_validas"]
    df_anuncio = resultado["df_anuncio_ok"]

    # Tablas maestras
    #  solo se corren una sola vez en el setup inicial en produccion, no en cada ejecucion

    print("-- TABLAS MAESTRAS")
    print()
    for id_m, d in MUNICIPIOS.items():
        print(f"INSERT INTO municipio (id_municipio, nombre, departamento) "
              f"VALUES ({id_m}, {sql_val(d['nombre'])}, {sql_val(d['departamento'])}) "
              f"ON CONFLICT DO NOTHING;")
    print()
    for id_z, d in ZONAS.items():
        print(f"INSERT INTO zona (id_zona, id_municipio, nombre, nombre_normalizado) "
              f"VALUES ({id_z}, {d['id_municipio']}, {sql_val(d['nombre'])}, {sql_val(d['nombre'].lower())}) "
              f"ON CONFLICT DO NOTHING;")
    print()
    for id_t, desc in TIPOS_INMUEBLE.items():
        print(f"INSERT INTO tipo_inmueble (id_tipo_inmueble, descripcion) "
              f"VALUES ({id_t}, {sql_val(desc)}) ON CONFLICT DO NOTHING;")
    print()
    for id_e, d in ESTRATOS.items():
        print(f"INSERT INTO estrato (id_estrato, numero, descripcion) "
              f"VALUES ({id_e}, {d['numero']}, {sql_val(d['descripcion'])}) ON CONFLICT DO NOTHING;")

    # Propiedad
    print()
    print("-- PROPIEDAD")
    print("-- ON CONFLICT (id_propiedad) DO NOTHING")
    print()
    for _, row in df_prop.iterrows():
        print(
            f"INSERT INTO propiedad "
            f"(id_propiedad, id_tipo_inmueble, id_zona, id_estrato, metraje_m2) VALUES ("
            f"{int(row['id_propiedad'])}, "
            f"{int(row['id_tipo'])}, "
            f"{int(row['id_zona'])}, "
            f"{sql_val(None if pd.isna(row['id_estrato']) else int(row['id_estrato']))}, "
            f"{sql_val(row['metraje_clean'])}"
            f") ON CONFLICT (id_propiedad) DO NOTHING;"
        )

    # Anuncio
    print()
    print("-- ANUNCIO")
    print("-- ON CONFLICT (id_propiedad, fecha_publicacion) DO UPDATE precio")
    print()
    for _, row in df_anuncio.iterrows():
        print(
            f"INSERT INTO anuncio "
            f"(id_propiedad, precio_venta, fecha_publicacion) VALUES ("
            f"{int(row['id_propiedad'])}, "
            f"{sql_val(row['precio_clean'])}, "
            f"{sql_val(row['fecha_clean'])}"
            f") ON CONFLICT (id_propiedad, fecha_publicacion) "
            f"DO UPDATE SET precio_venta = EXCLUDED.precio_venta;"
        )


# ── Reporte de calidad ────────────────────────────────────────────────────────

def imprimir_reporte(r):
    print(f"Procesados: {r['raw']:,} registros\n")

    print("Limpieza:")
    print(f"- Duplicados eliminados: {r['duplicados']}")
    print(f"- Metrajes inválidos → nulo: {r['metraje_null']}")
    print(f"- Sin tipo reconocido: {r['sin_tipo']}")

    print("\nDescartados:")
    print(f"- Sin zona: {r['prop_rechazadas']}")
    print(f"- Sin precio: {r['precio_null']}")
    print(f"- Sin fecha: {r['sin_fecha_vacio']}")

    print("\nListos para insertar:")
    print(f"- Propiedades: {r['prop_validas']:,}")
    print(f"- Anuncios: {r['anuncios_ok']:,}")

    if r["sin_fecha_formato"]:
        print(f"Fechas con formato no reconocido: {r['sin_fecha_formato']}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Uso: python etl_propiedades.py ruta/al/archivo.csv")
        sys.exit(1)

    csv_path = sys.argv[1]
    if not os.path.exists(csv_path):
        print(f"Archivo no encontrado: {csv_path}")
        sys.exit(1)

    df_raw    = extraer(csv_path)
    resultado = transformar(df_raw)
    generar_sql(resultado)
    print()
    print("-- " + "-" * 50)
    print()
    imprimir_reporte(resultado["reporte"])


if __name__ == "__main__":
    main()
