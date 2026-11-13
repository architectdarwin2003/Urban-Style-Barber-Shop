#!/usr/bin/env python3
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.domain.exceptions import ConvergenceError, InvalidFinancialDataError
from app.domain.financial_engine import (
    calculate_tir_newton_raphson,
    calculate_van,
    get_viability_verdict,
)

CASOS_PRECARGADOS = {
    "1": {
        "nombre": "Adecuacion de estaciones y equipos de barberia",
        "inversion_inicial": 12_000_000.0,
        "tasa_descuento": 0.12,
        "flujos": [4_500_000.0, 5_200_000.0, 6_100_000.0],
    },
    "2": {
        "nombre": "Compra mayorista de cuchillas, ceras e insumos",
        "inversion_inicial": 4_200_000.0,
        "tasa_descuento": 0.12,
        "flujos": [1_850_000.0, 1_950_000.0, 2_100_000.0],
    },
    "3": {
        "nombre": "Optimizacion de tiempos de atencion y agenda",
        "inversion_inicial": 6_500_000.0,
        "tasa_descuento": 0.12,
        "flujos": [2_900_000.0, 3_200_000.0, 3_600_000.0],
    },
}


def format_cop_cli(amount: float) -> str:
    sign = "-$ " if amount < 0 else "$ "
    formatted = f"{round(abs(amount)):,}".replace(",", ".")
    return f"{sign}{formatted} COP"


def evaluar_escenario(nombre: str, inversion: float, tasa: float, flujos: list[float], forzar_biseccion: bool = False) -> None:
    print("\n" + "=" * 72)
    print(f"ESCENARIO: {nombre}")
    print("=" * 72)
    try:
        van = calculate_van(inversion, flujos, tasa)
        dictamen = get_viability_verdict(van)
        tir_res = calculate_tir_newton_raphson(
            inversion,
            flujos,
            tolerance=1e-6,
            force_zero_derivative_check=forzar_biseccion,
        )
        tir_pct = round(tir_res["tir"] * 100, 4)

        print(f"- Inversion Inicial      : {format_cop_cli(inversion)}")
        print(f"- Tasa de Descuento      : {tasa * 100:.2f} %")
        print(f"- Flujos de Caja         : {[format_cop_cli(f) for f in flujos]}")
        print("-" * 72)
        print(f"- Valor Actual Neto (VAN): {format_cop_cli(van)}")
        print(f"- Dictamen               : {dictamen.upper()}")
        print(f"- Tasa Interna (TIR)     : {tir_pct:.4f} %")
        print(f"- Metodo Numerico        : {tir_res['method']}")
        print(f"- Iteraciones            : {tir_res['iterations']}")
        print("=" * 72 + "\n")
    except (InvalidFinancialDataError, ConvergenceError) as exc:
        print(f"[ERROR]: {exc}\n")


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        for key in ("1", "2", "3"):
            caso = CASOS_PRECARGADOS[key]
            evaluar_escenario(caso["nombre"], caso["inversion_inicial"], caso["tasa_descuento"], caso["flujos"])
        return

    print("EVALUADOR FINANCIERO - URBAN STYLE BARBER SHOP")
    print("1. Adecuacion de estaciones ($12.000.000 COP, 12%)")
    print("2. Compra mayorista de insumos ($4.200.000 COP, 12%)")
    print("3. Optimizacion de agenda ($6.500.000 COP, 12%)")
    print("4. Respaldo por Biseccion")
    print("5. Ejecutar todos")

    opcion = input("\nOpcion [1-5, Enter=1]: ").strip() or "1"
    if opcion in ("1", "2", "3"):
        c = CASOS_PRECARGADOS[opcion]
        evaluar_escenario(c["nombre"], c["inversion_inicial"], c["tasa_descuento"], c["flujos"])
    elif opcion == "4":
        c = CASOS_PRECARGADOS["1"]
        evaluar_escenario("Respaldo por Biseccion", c["inversion_inicial"], c["tasa_descuento"], c["flujos"], forzar_biseccion=True)
    else:
        for key in ("1", "2", "3"):
            c = CASOS_PRECARGADOS[key]
            evaluar_escenario(c["nombre"], c["inversion_inicial"], c["tasa_descuento"], c["flujos"])


if __name__ == "__main__":
    main()
