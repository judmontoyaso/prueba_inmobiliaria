# Prueba Técnica — Ingeniero de Datos

Proyecto compuesto por dos módulos independientes para el tratamiento de datos inmobiliarios y climáticos del Área Metropolitana del Valle de Aburrá.

## Estructura

```
├── ETL_propiedades/          # Parte 1: Pipeline ETL de propiedades
│   ├── etl_propiedades.py    # Script CLI del pipeline
│   └── propiedades_medellin_raw.csv
├── modulo_clima/             # Parte 2: Módulo de clima (Open-Meteo)
│   ├── clima/                # Paquete Python instalable
│   │   ├── __main__.py       # CLI: python -m clima
│   │   ├── api.py            # Consultas a la API
│   │   ├── constantes.py     # Códigos WMO
│   │   └── storage.py        # Lectura/escritura CSV con upsert
│   ├── municipios.csv        # Maestro de municipios (lat/lon)
│   └── clima_municipios.csv  # Salida: clima actual
├── notebooks/                # Análisis exploratorio
│   ├── EDA.ipynb             # EDA del CSV crudo
│   ├── ETL_propiedades.ipynb # Walkthrough interactivo del ETL
│   └── exploracion_openmeteo.ipynb
└── schema.sql                # DDL del modelo relacional
```

## Requisitos

```
pip install -r requirements.txt
```

Dependencias: `pandas >= 1.5.0`, `requests >= 2.28.0`

## Parte 1 — ETL Propiedades

Pipeline que limpia, transforma y normaliza un CSV crudo de propiedades en Medellín hacia un modelo relacional (6 tablas). La carga es simulada: genera sentencias SQL `INSERT ... ON CONFLICT`.

```bash
cd ETL_propiedades
python etl_propiedades.py propiedades_medellin_raw.csv
```

**Modelo relacional:** ver [schema.sql](schema.sql) para los DDL completos.

| Tabla | Descripción |
|---|---|
| `municipio` | Catálogo de municipios |
| `zona` | Zonas/barrios por municipio |
| `tipo_inmueble` | Casa, Apartamento, etc. |
| `estrato` | Estratos socioeconómicos 1-6 |
| `propiedad` | Inmueble físico (dedup por id) |
| `anuncio` | Publicación comercial (precio + fecha) |

## Parte 2 — Módulo Clima

Paquete Python que consulta la API de Open-Meteo para los 10 municipios del Valle de Aburrá y almacena los resultados en CSV con lógica de upsert.

```bash
cd modulo_clima

# Todos los municipios
python -m clima

# Municipios específicos
python -m clima Medellín Envigado

# CSV personalizado
python -m clima --csv otra_ruta.csv
```

Como librería:

```python
from clima import obtener_clima
obtener_clima()
obtener_clima(["Medellín", "Bello"])
```
