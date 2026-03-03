# clima/__main__.py
#
#   python -m clima                          # todos
#   python -m clima Medellín                 # uno
#   python -m clima Medellín Envigado Bello  # varios
#   python -m clima --csv otra_ruta.csv      # CSV personalizado

import sys
import argparse
from .api import obtener_clima, CSV_DEFAULT


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

    nombres = args.municipios if args.municipios else None

    print(f"Consultando clima → {args.csv}\n")
    resultados = obtener_clima(nombres, csv=args.csv)

    if not resultados:
        sys.exit(1)

    print(f"\nTotal: {len(resultados)} municipio(s) procesado(s)")


if __name__ == "__main__":
    main()
