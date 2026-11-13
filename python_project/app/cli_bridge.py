import json
import sys
import uuid
from pathlib import Path
from typing import Dict, Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.domain.exceptions import DomainError, UnauthorizedRoleError
from app.domain.financial_engine import (
    calculate_van,
    get_viability_verdict,
    calculate_tir_newton_raphson,
    calculate_break_even_semaphore,
)
from app.domain.booking_rules import (
    validate_booking_business_hours,
    check_no_overlap,
    validate_self_service_modification,
    validate_barber_break_limit,
    validate_barber_schedule_ownership,
    validate_booking_ownership_action,
)
from app.domain.rbac_rules import verify_role_access
from app.adapters.sqlite_repository import SQLiteBarberShopRepository


def handle_command(action: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    repo = SQLiteBarberShopRepository()

    if action == "bootstrap":
        services = repo.list_services()
        barbers = repo.list_barbers()
        bookings = repo.list_bookings()
        baseline = repo.get_financial_baseline()
        fixed_total = sum(float(v) for v in baseline.get("fixed_costs", {}).values())
        semaphore = calculate_break_even_semaphore(
            float(baseline.get("monthly_revenue_accumulated", 14850000)),
            fixed_total,
            0.0,
        )
        return {
            "ok": True,
            "services": services,
            "barbers": barbers,
            "bookings": bookings,
            "financial_baseline": baseline,
            "semaphore": semaphore,
            "can_register_admin": repo.can_register_admin(),
        }

    if action == "login":
        user = repo.authenticate_user(
            str(payload.get("username", "")),
            str(payload.get("password", "")),
        )
        if not user:
            raise DomainError("Credenciales invalidas. Verifica tu usuario y contrasena.")
        return {
            "ok": True,
            "user": user,
            "can_register_admin": repo.can_register_admin(),
        }

    if action == "register":
        username = str(payload.get("username", "")).strip()
        name = str(payload.get("name", "")).strip()
        password = str(payload.get("password", "")).strip()
        role = str(payload.get("role", "CLIENTE")).strip().upper()
        phone = str(payload.get("phone", "")).strip()
        if not username or not name or len(password) < 4:
            raise DomainError("Completa nombre, usuario y una contrasena de al menos 4 caracteres.")
        user = repo.register_user(username, name, password, role, phone)
        return {
            "ok": True,
            "user": user,
            "can_register_admin": repo.can_register_admin(),
        }

    if action == "delete_admin_account":
        role = str(payload.get("role", "")).strip().upper()
        verify_role_access(role, "finance:sefi_lab")
        username = str(payload.get("username", "admin")).strip()
        deleted = repo.delete_admin_account(username)
        return {
            "ok": True,
            "deleted": deleted,
            "can_register_admin": repo.can_register_admin(),
        }

    if action == "evaluate_finance":
        role = payload.get("role", "ADMIN")
        verify_role_access(role, "finance:sefi_lab")
        initial_investment = float(payload["initial_investment"])
        discount_rate = float(payload["discount_rate"])
        cash_flows = [float(x) for x in payload["cash_flows"]]

        van_val = calculate_van(initial_investment, cash_flows, discount_rate)
        verdict = get_viability_verdict(van_val)
        tir_data = calculate_tir_newton_raphson(
            initial_investment,
            cash_flows,
            force_zero_derivative_check=bool(payload.get("force_bisection", False)),
        )
        return {
            "ok": True,
            "result": {
                "van": van_val,
                "verdict": verdict,
                "tir": tir_data["tir"],
                "tir_percentage": round(tir_data["tir"] * 100.0, 4),
                "iterations": tir_data["iterations"],
                "method": tir_data["method"],
                "tolerance": "1e-6",
                "initial_investment": initial_investment,
                "discount_rate": discount_rate,
                "cash_flows": cash_flows,
            },
        }

    if action == "evaluate_breakeven":
        role = payload.get("role", "ADMIN")
        verify_role_access(role, "finance:break_even")
        monthly_revenue = float(payload["monthly_revenue"])
        fixed_costs_map = payload.get("fixed_costs", {})
        if isinstance(fixed_costs_map, dict):
            fixed_total = sum(float(v) for v in fixed_costs_map.values())
            repo.update_financial_baseline({
                "monthly_revenue_accumulated": monthly_revenue,
                "fixed_costs": fixed_costs_map,
            })
        else:
            fixed_total = float(fixed_costs_map)
        variable_costs = float(payload.get("variable_costs", 0.0))
        sem = calculate_break_even_semaphore(monthly_revenue, fixed_total, variable_costs)
        return {"ok": True, "semaphore": sem}

    if action == "upsert_service":
        role = payload.get("role", "ADMIN")
        verify_role_access(role, "tariffs:manage")
        srv = payload["service"]
        if not srv.get("id"):
            srv["id"] = f"srv-{uuid.uuid4().hex[:6]}"
        saved = repo.upsert_service(srv)
        return {"ok": True, "service": saved, "services": repo.list_services()}

    if action == "delete_service":
        role = payload.get("role", "ADMIN")
        verify_role_access(role, "tariffs:manage")
        deleted = repo.delete_service(payload["service_id"])
        return {"ok": True, "deleted": deleted, "services": repo.list_services()}

    if action == "upsert_barber":
        role = payload.get("role", "ADMIN")
        verify_role_access(role, "tariffs:manage")
        barber = payload["barber"]
        if not barber.get("id"):
            barber["id"] = f"barber-{uuid.uuid4().hex[:6]}"
        saved = repo.upsert_barber(barber)
        return {"ok": True, "barber": saved, "barbers": repo.list_barbers()}

    if action == "delete_barber":
        role = payload.get("role", "ADMIN")
        verify_role_access(role, "tariffs:manage")
        barber_id = str(payload["barber_id"])
        deleted = repo.delete_barber(barber_id)
        return {"ok": True, "deleted": deleted, "barbers": repo.list_barbers()}

    if action == "create_booking":
        services = {s["id"]: s for s in repo.list_services()}
        barbers = {b["id"]: b for b in repo.list_barbers()}
        base_id = payload["base_service_id"]
        if base_id not in services:
            raise DomainError("El servicio seleccionado no existe.")
        base_srv = services[base_id]
        addon_ids = payload.get("addon_ids", [])
        total_cop = int(base_srv["price_cop"])
        total_duration = int(base_srv["duration_minutes"])
        addon_names = []
        for aid in addon_ids:
            if aid in services:
                total_cop += int(services[aid]["price_cop"])
                total_duration += int(services[aid]["duration_minutes"])
                addon_names.append(services[aid]["name"])

        date_str = str(payload.get("date", "2026-11-11"))
        start_time = str(payload["start_time"])
        existing = repo.list_bookings(date_str=date_str)
        window = validate_booking_business_hours(start_time, total_duration)

        requested_barber_id = str(payload.get("barber_id", "auto"))
        selected_barber = None
        if requested_barber_id == "auto" or requested_barber_id not in barbers:
            for candidate in barbers.values():
                try:
                    check_no_overlap(candidate["id"], date_str, start_time, total_duration, existing)
                    selected_barber = candidate
                    break
                except DomainError:
                    continue
            if not selected_barber:
                raise DomainError(f"No hay disponibilidad entre {window['start_time']} y {window['end_time']}.")
        else:
            selected_barber = barbers[requested_barber_id]
            check_no_overlap(selected_barber["id"], date_str, start_time, total_duration, existing)

        record = {
            "id": f"bk-{uuid.uuid4().hex[:6]}",
            "client_name": str(payload["client_name"]).strip(),
            "client_phone": str(payload["client_phone"]).strip(),
            "client_username": str(payload.get("client_username", "")).strip().lower(),
            "barber_id": selected_barber["id"],
            "barber_name": selected_barber["name"],
            "base_service_id": base_srv["id"],
            "base_service_name": base_srv["name"],
            "addon_ids": addon_ids,
            "addon_names": addon_names,
            "date": date_str,
            "start_time": window["start_time"],
            "end_time": window["end_time"],
            "duration_minutes": total_duration,
            "total_cop": total_cop,
            "payment_method": str(payload.get("payment_method", "EFECTIVO")).upper(),
            "status": "CONFIRMADA",
            "hours_until": float(payload.get("hours_until", 24.0)),
        }
        repo.create_booking(record)
        return {"ok": True, "booking": record, "bookings": repo.list_bookings()}

    if action == "cancel_booking":
        booking_id = str(payload["booking_id"])
        all_bookings = repo.list_bookings()
        target = next((b for b in all_bookings if b["id"] == booking_id), None)
        if not target:
            raise DomainError("La reserva no existe.")

        actor_role = str(payload.get("actor_role", "CLIENTE")).strip().upper()
        actor_barber_id = str(payload.get("actor_barber_id", "")).strip()
        actor_username = str(payload.get("actor_username", "")).strip()
        actor_name = str(payload.get("actor_name", "")).strip()
        validate_booking_ownership_action(actor_role, target, actor_barber_id, actor_username, actor_name)

        if actor_role == "CLIENTE":
            hours_until = float(payload.get("hours_until", 24.0))
            validate_self_service_modification(hours_until)

        updated = repo.update_booking_status(booking_id, "CANCELADA")
        return {"ok": True, "booking": updated, "bookings": repo.list_bookings()}

    if action == "reschedule_booking":
        booking_id = str(payload["booking_id"])
        new_start = str(payload["start_time"])
        all_bookings = repo.list_bookings()
        target = next((b for b in all_bookings if b["id"] == booking_id), None)
        if not target:
            raise DomainError("La reserva no existe.")

        actor_role = str(payload.get("actor_role", "CLIENTE")).strip().upper()
        actor_barber_id = str(payload.get("actor_barber_id", "")).strip()
        actor_username = str(payload.get("actor_username", "")).strip()
        actor_name = str(payload.get("actor_name", "")).strip()
        validate_booking_ownership_action(actor_role, target, actor_barber_id, actor_username, actor_name)

        if actor_role == "CLIENTE":
            hours_until = float(payload.get("hours_until", 24.0))
            validate_self_service_modification(hours_until)

        duration = int(target["duration_minutes"])
        window = validate_booking_business_hours(new_start, duration)
        check_no_overlap(target["barber_id"], target["date"], new_start, duration, all_bookings, ignore_booking_id=booking_id)
        updated = repo.update_booking_status(booking_id, "CONFIRMADA", start_time=window["start_time"], end_time=window["end_time"])
        return {"ok": True, "booking": updated, "bookings": repo.list_bookings()}

    if action == "complete_chair_cut":
        barber_id = str(payload.get("barber_id", "barber-mateo"))
        actor_role = str(payload.get("actor_role", "BARBERO"))
        actor_barber_id = str(payload.get("actor_barber_id", barber_id))
        validate_barber_schedule_ownership(actor_role, actor_barber_id, barber_id)

        bookings = repo.list_bookings()
        in_chair = next((b for b in bookings if b["barber_id"] == barber_id and b["status"] == "EN_SILLA"), None)
        if in_chair:
            repo.update_booking_status(in_chair["id"], "COMPLETADA")

        refreshed = repo.list_bookings()
        next_up = next((b for b in refreshed if b["barber_id"] == barber_id and b["status"] == "CONFIRMADA"), None)
        if next_up:
            repo.update_booking_status(next_up["id"], "EN_SILLA")

        return {"ok": True, "bookings": repo.list_bookings()}

    if action == "pause_barber_break":
        barber_id = str(payload.get("barber_id", "barber-mateo"))
        actor_role = str(payload.get("actor_role", "BARBERO"))
        actor_barber_id = str(payload.get("actor_barber_id", barber_id))
        validate_barber_schedule_ownership(actor_role, actor_barber_id, barber_id)

        start_time = str(payload.get("start_time", "13:00"))
        date_str = str(payload.get("date", "2026-11-11"))
        barbers = {b["id"]: b for b in repo.list_barbers()}
        barber_name = barbers.get(barber_id, {}).get("name", "Mateo Restrepo")
        existing = repo.list_bookings(date_str=date_str)
        validate_barber_break_limit(barber_id, date_str, existing)
        window = validate_booking_business_hours(start_time, 30)
        check_no_overlap(barber_id, date_str, start_time, 30, existing)

        pause_record = {
            "id": f"brk-{uuid.uuid4().hex[:6]}",
            "client_name": "Descanso de 30 min",
            "client_phone": "0000000000",
            "client_username": "",
            "barber_id": barber_id,
            "barber_name": barber_name,
            "base_service_id": "break-30",
            "base_service_name": "Tiempo de descanso",
            "addon_ids": [],
            "addon_names": [],
            "date": date_str,
            "start_time": window["start_time"],
            "end_time": window["end_time"],
            "duration_minutes": 30,
            "total_cop": 0,
            "payment_method": "N/A",
            "status": "PAUSA",
            "hours_until": 0.0,
        }
        repo.create_booking(pause_record)
        return {"ok": True, "booking": pause_record, "bookings": repo.list_bookings()}

    raise DomainError(f"Operacion no soportada: {action}")


def main() -> None:
    try:
        raw_input = sys.stdin.read()
        request = json.loads(raw_input) if raw_input.strip() else {"action": "bootstrap", "payload": {}}
        action = request.get("action", "bootstrap")
        payload = request.get("payload", {})
        response = handle_command(action, payload)
        sys.stdout.write(json.dumps(response, ensure_ascii=False))
    except UnauthorizedRoleError as exc:
        sys.stdout.write(json.dumps({"ok": False, "status": 403, "error": str(exc)}, ensure_ascii=False))
    except DomainError as exc:
        sys.stdout.write(json.dumps({"ok": False, "status": 400, "error": str(exc)}, ensure_ascii=False))
    except Exception as exc:
        sys.stdout.write(json.dumps({"ok": False, "status": 500, "error": str(exc)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
