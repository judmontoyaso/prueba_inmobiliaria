# Prueba Técnica — Ingeniero de Datos

Proyecto compuesto por dos módulos independientes para el tratamiento de datos inmobiliarios y climáticos del Área Metropolitana del Valle de Aburrá.

## Estructura

```
├── ETL_propiedades/          # Parte 1: Pipeline ETL de propiedades
│   ├── etl_propiedades.py    # Script CLI del pipeline
│   └── propiedades_medellin_raw.csv
├── modulo_clima/             # Parte 2: Módulo de clima (Open-Meteo)
│   ├── clima/                # Paquete Python importable
│   │   ├── __main__.py       # CLI: python -m clima
│   │   ├── api.py            # Consultas a la API
│   │   ├── constantes.py     # Códigos WMO + carga de municipios.csv
│   │   └── storage.py        # Lectura/escritura CSV con upsert
│   ├── municipios.csv        # Maestro de municipios (lat/lon)
│   └── clima_municipios.csv  # Salida: clima actual
├── backend/                  # Parte 3: API FastAPI
│   ├── app/
│   │   ├── main.py           # Punto de entrada FastAPI
│   │   ├── config.py         # Variables de entorno
│   │   ├── database.py       # Cliente Supabase + seed
│   │   └── routers/
│   │       ├── etl.py        # POST /etl/upload, GET /etl/propiedades
│   │       └── clima.py      # GET /clima/, POST /clima/actualizar
│   └── requirements.txt
├── frontend/                 # Parte 3: SPA (HTML/CSS/JS)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── deploy.sh                 # Script de despliegue en Droplet
├── notebooks/                # Análisis exploratorio
│   ├── EDA.ipynb
│   ├── ETL_propiedades.ipynb
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

Los municipios se cargan desde `municipios.csv` (editable sin tocar código).

## Parte 3 — Aplicación Web (Backend + Frontend)

Aplicación desplegable con Docker que expone ambos módulos como servicio web con almacenamiento en Supabase (PostgreSQL).

### Arquitectura

```
Internet → :8000 (uvicorn / FastAPI)
              ├── /etl/*     API ETL
              ├── /clima/*   API Clima
              ├── /docs      Swagger UI
              └── /          frontend estático (HTML/JS/CSS)
```

Un solo proceso. FastAPI sirve la API y los archivos del frontend.

### Setup local

1. Crear proyecto en [Supabase](https://supabase.com) y ejecutar `schema.sql` en el SQL Editor
2. Configurar variables:
   ```bash
   cp backend/.env.example backend/.env
   # editar SUPABASE_URL y SUPABASE_KEY
   ```
3. Instalar y correr:
   ```bash
   pip install -r backend/requirements.txt
   uvicorn backend.app.main:app --reload --port 8000
   ```
4. Abrir `http://localhost:8000` — Swagger en `http://localhost:8000/docs`

### Despliegue en Droplet (sin Docker)

```bash
# En el Droplet, una sola vez:
git clone <tu-repo> /opt/inmobiliaria
cp /opt/inmobiliaria/backend/.env.example /opt/inmobiliaria/backend/.env
nano /opt/inmobiliaria/backend/.env   # pegar SUPABASE_URL y SUPABASE_KEY

# Desplegar / actualizar:
bash /opt/inmobiliaria/deploy.sh
```

El script `deploy.sh` actualiza el código, reinstala dependencias y reinicia uvicorn en segundo plano.
