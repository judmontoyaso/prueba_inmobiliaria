# clima/__main__.py
#
#   python -m clima                          # todos
#   python -m clima Medellín                 # uno
#   python -m clima Medellín Envigado Bello  # varios
#   python -m clima --csv otra_ruta.csv      # CSV personalizado

import sys
import logging
import argparse
from .api import obtener_clima, CSV_DEFAULT

log = logging.getLogger("clima")


def main():
    parser = argparse.ArgumentParser(
        description="Consulta el clima del área metropolitana y actualiza el CSV."
    )
    parser.add_argument(
        "municipios",
        nargs="*",
        help="Nombres a consultar. Si se omite, consulta el csv.",
    )
    parser.add_argument(
        "--csv",
        default=CSV_DEFAULT,
        help=f"Ruta del CSV (default: {CSV_DEFAULT})",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    nombres = args.municipios if args.municipios else None

    log.info("Consultando clima → %s", args.csv)
    resultados = obtener_clima(nombres, csv=args.csv)

    if not resultados:
        sys.exit(1)

    log.info("Total: %d municipio(s) procesado(s)", len(resultados))


if __name__ == "__main__":
    main()
