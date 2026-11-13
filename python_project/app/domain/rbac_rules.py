from typing import Set, Dict
from app.domain.exceptions import UnauthorizedRoleError


ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "CLIENTE": {
        "bookings:create",
        "bookings:self_manage",
        "services:read",
        "barbers:read",
    },
    "BARBERO": {
        "bookings:read",
        "bookings:chair_mode",
        "bookings:complete_cut",
        "bookings:pause_break",
        "commissions:read_own",
        "services:read",
        "barbers:read",
    },
    "ADMIN": {
        "bookings:create",
        "bookings:read",
        "bookings:self_manage",
        "bookings:chair_mode",
        "bookings:complete_cut",
        "bookings:pause_break",
        "commissions:read_own",
        "services:read",
        "services:write",
        "tariffs:manage",
        "finance:cash_close",
        "finance:break_even",
        "finance:sefi_lab",
        "barbers:read",
        "barbers:write",
    },
}


def verify_role_access(role: str, required_permission: str) -> bool:
    normalized_role = str(role or "").strip().upper()
    if normalized_role not in ROLE_PERMISSIONS:
        raise UnauthorizedRoleError(f"Perfil no valido: '{role}'.")

    if required_permission not in ROLE_PERMISSIONS[normalized_role]:
        raise UnauthorizedRoleError(
            f"El perfil '{normalized_role}' no tiene permiso para esta accion."
        )
    return True
