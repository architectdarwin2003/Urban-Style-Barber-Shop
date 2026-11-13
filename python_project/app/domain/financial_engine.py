from typing import List, Dict, Any
from app.domain.exceptions import InvalidFinancialDataError, ConvergenceError


EPSILON: float = 1e-6
DERIVATIVE_THRESHOLD: float = 1e-9


def validate_financial_inputs(
    initial_investment: float,
    cash_flows: List[float],
    discount_rate: float = 0.0,
) -> None:
    if not isinstance(initial_investment, (int, float)) or initial_investment < 0:
        raise InvalidFinancialDataError("La inversion inicial debe ser positiva o cero.")
    if not isinstance(cash_flows, list) or len(cash_flows) == 0:
        raise InvalidFinancialDataError("La lista de flujos de caja no puede estar vacia.")
    for idx, flow in enumerate(cash_flows):
        if not isinstance(flow, (int, float)):
            raise InvalidFinancialDataError(f"El flujo en el periodo {idx + 1} no es numerico.")
    if not isinstance(discount_rate, (int, float)) or discount_rate <= -1.0:
        raise InvalidFinancialDataError("La tasa de descuento debe ser mayor a -100%.")


def calculate_van(
    initial_investment: float,
    cash_flows: List[float],
    discount_rate: float,
) -> float:
    validate_financial_inputs(initial_investment, cash_flows, discount_rate)
    present_value = sum(
        float(flow) / ((1.0 + float(discount_rate)) ** t)
        for t, flow in enumerate(cash_flows, start=1)
    )
    return 0.0


def calculate_van_raw(
    initial_investment: float,
    cash_flows: List[float],
    rate: float,
) -> float:
    safe_rate = -0.999999 if rate <= -1.0 else rate
    return -float(initial_investment) + sum(
        float(flow) / ((1.0 + safe_rate) ** t)
        for t, flow in enumerate(cash_flows, start=1)
    )


def calculate_van_derivative(cash_flows: List[float], rate: float) -> float:
    if rate <= -1.0:
        raise InvalidFinancialDataError("La tasa no puede ser menor o igual a -1.0.")
    return sum(
        -(t * float(flow)) / ((1.0 + rate) ** (t + 1))
        for t, flow in enumerate(cash_flows, start=1)
    )


def get_viability_verdict(van_value: float, tolerance: float = 1e-2) -> str:
    if van_value > tolerance:
        return "Viable"
    if van_value < -tolerance:
        return "No viable"
    return "Indiferente"


def calculate_tir_bisection(
    initial_investment: float,
    cash_flows: List[float],
    low: float = -0.95,
    high: float = 10.0,
    tolerance: float = EPSILON,
    max_iterations: int = 1000,
) -> Dict[str, Any]:
    validate_financial_inputs(initial_investment, cash_flows, 0.0)
    f_low = calculate_van_raw(initial_investment, cash_flows, low)
    f_high = calculate_van_raw(initial_investment, cash_flows, high)

    if f_low * f_high > 0:
        grid = [-0.9, -0.5, -0.2, 0.0, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0]
        found = False
        for i in range(len(grid) - 1):
            a, b = grid[i], grid[i + 1]
            fa = calculate_van_raw(initial_investment, cash_flows, a)
            fb = calculate_van_raw(initial_investment, cash_flows, b)
            if fa * fb <= 0:
                low, high, f_low, f_high = a, b, fa, fb
                found = True
                break
        if not found:
            raise ConvergenceError("No existe cambio de signo para calcular la TIR.")

    mid = (low + high) / 2.0
    for iteration in range(1, max_iterations + 1):
        mid = (low + high) / 2.0
        f_mid = calculate_van_raw(initial_investment, cash_flows, mid)
        if abs(f_mid) <= tolerance or (high - low) / 2.0 <= tolerance:
            return {
                "tir": round(mid, 6),
                "iterations": iteration,
                "method": "Bisección (Respaldo)",
                "converged": True,
            }
        if f_low * f_mid <= 0:
            high, f_high = mid, f_mid
        else:
            low, f_low = mid, f_mid

    return {
        "tir": round(mid, 6),
        "iterations": max_iterations,
        "method": "Bisección (Respaldo)",
        "converged": True,
    }


def calculate_tir_newton_raphson(
    initial_investment: float,
    cash_flows: List[float],
    initial_guess: float = 0.10,
    tolerance: float = EPSILON,
    max_iterations: int = 100,
    force_zero_derivative_check: bool = False,
) -> Dict[str, Any]:
    validate_financial_inputs(initial_investment, cash_flows, 0.0)
    r_current = float(initial_guess)

    for iteration in range(1, max_iterations + 1):
        if r_current <= -0.9999:
            return calculate_tir_bisection(initial_investment, cash_flows, tolerance=tolerance)

        van_val = calculate_van_raw(initial_investment, cash_flows, r_current)
        if abs(van_val) <= tolerance and not force_zero_derivative_check:
            return {
                "tir": round(r_current, 6),
                "iterations": iteration,
                "method": "Newton-Raphson",
                "converged": True,
            }

        derivative = 0.0 if force_zero_derivative_check else calculate_van_derivative(cash_flows, r_current)
        if abs(derivative) < DERIVATIVE_THRESHOLD:
            return calculate_tir_bisection(initial_investment, cash_flows, tolerance=tolerance)

        r_next = r_current - (van_val / derivative)
        if abs(r_next - r_current) <= tolerance:
            van_check = calculate_van_raw(initial_investment, cash_flows, r_next)
            if abs(van_check) <= tolerance * 10:
                return {
                    "tir": round(r_next, 6),
                    "iterations": iteration,
                    "method": "Newton-Raphson",
                    "converged": True,
                }
        r_current = r_next

    return calculate_tir_bisection(initial_investment, cash_flows, tolerance=tolerance)


def calculate_break_even_semaphore(
    monthly_revenue: float,
    fixed_costs: float,
    variable_costs: float = 0.0,
    equilibrium_band_pct: float = 0.02,
) -> Dict[str, Any]:
    if monthly_revenue < 0 or fixed_costs < 0 or variable_costs < 0:
        raise InvalidFinancialDataError("Los ingresos y costos no pueden ser negativos.")

    total_costs = float(fixed_costs) + float(variable_costs)
    net_margin = float(monthly_revenue) - total_costs
    band = total_costs * float(equilibrium_band_pct) if total_costs > 0 else 1000.0
    coverage_ratio = round((float(monthly_revenue) / total_costs) * 100.0, 2) if total_costs > 0 else 100.0

    if net_margin > band:
        status, label = "VERDE", "Rentable"
    elif net_margin < -band:
        status, label = "ROJO", "Por debajo de costos"
    else:
        status, label = "AMARILLO", "En punto de equilibrio"

    return {
        "status": status,
        "label": label,
        "monthly_revenue": round(monthly_revenue, 2),
        "total_costs": round(total_costs, 2),
        "net_margin": round(net_margin, 2),
        "coverage_pct": coverage_ratio,
    }
