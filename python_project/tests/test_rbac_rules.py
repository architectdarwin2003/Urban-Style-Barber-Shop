from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.domain.exceptions import UnauthorizedRoleError
from app.domain.rbac_rules import verify_role_access


class TestRBACRules(unittest.TestCase):
    def test_10_rbac_privilege_restriction(self) -> None:
        self.assertTrue(verify_role_access("ADMIN", "tariffs:manage"))
        self.assertTrue(verify_role_access("ADMIN", "finance:sefi_lab"))
        self.assertTrue(verify_role_access("BARBERO", "bookings:chair_mode"))

        with self.assertRaises(UnauthorizedRoleError):
            verify_role_access("BARBERO", "tariffs:manage")

        with self.assertRaises(UnauthorizedRoleError):
            verify_role_access("BARBERO", "finance:sefi_lab")

        with self.assertRaises(UnauthorizedRoleError):
            verify_role_access("CLIENTE", "finance:cash_close")


if __name__ == "__main__":
    unittest.main()
