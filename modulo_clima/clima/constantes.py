# constantes.py
# Archivo maestro de municipios y códigos WMO.
# Editar aquí para agregar o quitar municipios.

URL_API = "https://api.open-meteo.com/v1/forecast"

# Municipios del Área Metropolitana del Valle de Aburrá
MUNICIPIOS = [
    {"nombre": "Medellín",    "lat":  6.2442, "lon": -75.5812},
    {"nombre": "Envigado",    "lat":  6.1720, "lon": -75.5872},
    {"nombre": "Itagüí",      "lat":  6.1847, "lon": -75.5996},
    {"nombre": "La Estrella", "lat":  6.1564, "lon": -75.6433},
    {"nombre": "Bello",       "lat":  6.3367, "lon": -75.5569},
    {"nombre": "Copacabana",  "lat":  6.3488, "lon": -75.5100},
    {"nombre": "Sabaneta",    "lat":  6.1514, "lon": -75.6167},
    {"nombre": "Caldas",      "lat":  6.0940, "lon": -75.6371},
    {"nombre": "Girardota",   "lat":  6.3797, "lon": -75.4461},
    {"nombre": "Barbosa",     "lat":  6.4394, "lon": -75.3328},
]

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
