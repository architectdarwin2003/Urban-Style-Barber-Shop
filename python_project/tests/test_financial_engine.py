from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.domain.exceptions import InvalidFinancialDataError
from app.domain.financial_engine import (
    calculate_van,
    get_viability_verdict,
    calculate_tir_newton_raphson,
    calculate_break_even_semaphore,
)


class TestFinancialEngine(unittest.TestCase):
    def test_01_calculate_van_standard(self) -> None:
        van_zero = calculate_van(10000000.0, [5500000.0, 6050000.0], 0.10)
        self.assertAlmostEqual(van_zero, 0.0, places=4)

        van_positive = calculate_van(8500000.0, [5500000.0, 6050000.0], 0.10)
        self.assertAlmostEqual(van_positive, 1500000.0, places=4)

    def test_02_get_viability_verdict(self) -> None:
        self.assertEqual(get_viability_verdict(1250000.0), "Viable")
        self.assertEqual(get_viability_verdict(-450000.0), "No viable")
        self.assertEqual(get_viability_verdict(0.0), "Indiferente")

    def test_03_boundary_negative_rate(self) -> None:
        with self.assertRaises(InvalidFinancialDataError):
            calculate_van(5000000.0, [3000000.0, 3000000.0], -1.0)

        with self.assertRaises(InvalidFinancialDataError):
            calculate_van(5000000.0, [3000000.0, 3000000.0], -1.25)

    def test_04_empty_flows_rejection(self) -> None:
        with self.assertRaises(InvalidFinancialDataError):
            calculate_van(5000000.0, [], 0.12)

    def test_05_tir_newton_raphson_convergence(self) -> None:
        result = calculate_tir_newton_raphson(1000.0, [1200.0])
        self.assertTrue(result["converged"])
        self.assertEqual(result["method"], "Newton-Raphson")
        self.assertAlmostEqual(result["tir"], 0.20, places=5)

    def test_06_tir_fallback_to_bisection(self) -> None:
        result = calculate_tir_newton_raphson(
            10000000.0,
            [5500000.0, 6050000.0],
            force_zero_derivative_check=True,
        )
        self.assertTrue(result["converged"])
        self.assertEqual(result["method"], "Bisección (Respaldo)")
        self.assertAlmostEqual(result["tir"], 0.10, places=5)

    def test_07_break_even_semaphore_logic(self) -> None:
        green = calculate_break_even_semaphore(15000000.0, 11000000.0)
        self.assertEqual(green["status"], "VERDE")

        yellow = calculate_break_even_semaphore(11050000.0, 11000000.0)
        self.assertEqual(yellow["status"], "AMARILLO")

        red = calculate_break_even_semaphore(8500000.0, 11000000.0)
        self.assertEqual(red["status"], "ROJO")


if __name__ == "__main__":
    unittest.main()
