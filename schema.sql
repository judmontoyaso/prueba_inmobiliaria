-- schema.sql
-- DDL del modelo relacional — Propiedades Medellín
-- Motor: PostgreSQL

-- ── Catálogos maestros ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS municipio (
    id_municipio  SERIAL      PRIMARY KEY,
    nombre        VARCHAR(60) NOT NULL UNIQUE,
    departamento  VARCHAR(60) NOT NULL
);

CREATE TABLE IF NOT EXISTS zona (
    id_zona             SERIAL      PRIMARY KEY,
    id_municipio        INT         NOT NULL REFERENCES municipio(id_municipio),
    nombre              VARCHAR(80) NOT NULL,
    nombre_normalizado  VARCHAR(80) NOT NULL,
    UNIQUE (id_municipio, nombre_normalizado)
);

CREATE TABLE IF NOT EXISTS tipo_inmueble (
    id_tipo_inmueble  SERIAL      PRIMARY KEY,
    descripcion       VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS estrato (
    id_estrato   SERIAL     PRIMARY KEY,
    numero       SMALLINT   NOT NULL,
    descripcion  VARCHAR(30) NOT NULL
);

-- ── Entidades principales ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS propiedad (
    id_propiedad      INT     PRIMARY KEY,
    id_tipo_inmueble  INT     NOT NULL REFERENCES tipo_inmueble(id_tipo_inmueble),
    id_zona           INT     NOT NULL REFERENCES zona(id_zona),
    id_estrato        INT     NOT NULL REFERENCES estrato(id_estrato),
    metraje_m2        NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS anuncio (
    id_propiedad       INT         NOT NULL REFERENCES propiedad(id_propiedad),
    precio_venta       BIGINT      NOT NULL,
    fecha_publicacion  DATE        NOT NULL,
    UNIQUE (id_propiedad, fecha_publicacion)
);

-- ── Índices sugeridos ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_propiedad_zona    ON propiedad(id_zona);
CREATE INDEX IF NOT EXISTS idx_propiedad_tipo    ON propiedad(id_tipo_inmueble);
CREATE INDEX IF NOT EXISTS idx_anuncio_propiedad ON anuncio(id_propiedad);
CREATE INDEX IF NOT EXISTS idx_anuncio_fecha     ON anuncio(fecha_publicacion);

-- ── Clima (módulo 2) ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clima_municipio (
    municipio             VARCHAR(60) PRIMARY KEY,
    latitud               NUMERIC(8,4)  NOT NULL,
    longitud              NUMERIC(8,4)  NOT NULL,
    temperatura_c         NUMERIC(5,1),
    weather_code          SMALLINT,
    descripcion_clima     VARCHAR(80),
    ultima_actualizacion  TIMESTAMP
);
