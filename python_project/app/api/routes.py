"""
Controladores REST primarios en FastAPI para SEFI-TI.
Conecta los casos de uso del Dominio Puro con el repositorio SQLite3.
"""

import uuid
from fastapi import APIRouter, Header, HTTPException
from app.api.schemas import (
    ServiceSchema,
    BookingCreateSchema,
    BookingRescheduleSchema,
    FinancialEvaluationInputSchema,
    BreakEvenInputSchema,
)
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
)
from app.domain.rbac_rules import verify_role_access
from app.adapters.sqlite_repository import SQLiteBarberShopRepository


router = APIRouter()
repo = SQLiteBarberShopRepository()


@router.get("/services")
def get_services():
    return {"services": repo.list_services(), "barbers": repo.list_barbers()}


@router.post("/services")
def save_service(payload: ServiceSchema, x_role: str = Header(default="ADMIN")):
    try:
        verify_role_access(x_role, "tariffs:manage")
        saved = repo.upsert_service(payload.model_dump())
        return {"status": "ok", "service": saved}
    except UnauthorizedRoleError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except DomainError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/services/{service_id}")
def remove_service(service_id: str, x_role: str = Header(default="ADMIN")):
    try:
        verify_role_access(x_role, "tariffs:manage")
        deleted = repo.delete_service(service_id)
        return {"status": "ok", "deleted": deleted}
    except UnauthorizedRoleError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.get("/bookings")
def get_bookings(date: str = "", phone: str = ""):
    bookings = repo.list_bookings(date_str=date or None, phone=phone or None)
    return {"bookings": bookings}


@router.post("/bookings")
def create_new_booking(payload: BookingCreateSchema):
    try:
        services = {s["id"]: s for s in repo.list_services()}
        barbers = {b["id"]: b for b in repo.list_barbers()}
        if payload.base_service_id not in services:
            raise HTTPException(status_code=400, detail="Servicio base no encontrado.")

        base_srv = services[payload.base_service_id]
        total_cop = int(base_srv["price_cop"])
        total_duration = int(base_srv["duration_minutes"])
        addon_names = []

        for add_id in payload.addon_ids:
            if add_id in services:
                total_cop += int(services[add_id]["price_cop"])
                total_duration += int(services[add_id]["duration_minutes"])
                addon_names.append(services[add_id]["name"])

        barber_id = payload.barber_id
        if barber_id == "auto" or barber_id not in barbers:
            barber_id = "barber-mateo"
        barber_name = barbers[barber_id]["name"]

        existing = repo.list_bookings(date_str=payload.date)
        window = validate_booking_business_hours(payload.start_time, total_duration)
        check_no_overlap(barber_id, payload.date, payload.start_time, total_duration, existing)

        booking_record = {
            "id": f"bk-{uuid.uuid4().hex[:6]}",
            "client_name": payload.client_name,
            "client_phone": payload.client_phone,
            "barber_id": barber_id,
            "barber_name": barber_name,
            "base_service_id": base_srv["id"],
            "base_service_name": base_srv["name"],
            "addon_ids": payload.addon_ids,
            "addon_names": addon_names,
            "date": payload.date,
            "start_time": window["start_time"],
            "end_time": window["end_time"],
            "duration_minutes": total_duration,
            "total_cop": total_cop,
            "payment_method": payload.payment_method,
            "status": "CONFIRMADA",
            "hours_until": 24.0,
        }
        created = repo.create_booking(booking_record)
        return {"status": "ok", "booking": created}
    except DomainError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: str, hours_until: float = 24.0):
    try:
        validate_self_service_modification(hours_until)
        updated = repo.update_booking_status(booking_id, "CANCELADA")
        return {"status": "ok", "booking": updated}
    except DomainError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/bookings/{booking_id}/reschedule")
def reschedule_booking(booking_id: str, payload: BookingRescheduleSchema):
    try:
        validate_self_service_modification(payload.hours_until)
        all_bookings = repo.list_bookings()
        target = next((b for b in all_bookings if b["id"] == booking_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Reserva no encontrada.")
        window = validate_booking_business_hours(payload.start_time, int(target["duration_minutes"]))
        check_no_overlap(
            target["barber_id"],
            target["date"],
            payload.start_time,
            int(target["duration_minutes"]),
            all_bookings,
            ignore_booking_id=booking_id,
        )
        updated = repo.update_booking_status(
            booking_id, "CONFIRMADA", start_time=window["start_time"], end_time=window["end_time"]
        )
        return {"status": "ok", "booking": updated}
    except DomainError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/finance/evaluate")
def evaluate_investment(payload: FinancialEvaluationInputSchema, x_role: str = Header(default="ADMIN")):
    try:
        verify_role_access(x_role, "finance:sefi_lab")
        van_val = calculate_van(
            payload.initial_investment, payload.cash_flows, payload.discount_rate
        )
        verdict = get_viability_verdict(van_val)
        tir_result = calculate_tir_newton_raphson(
            payload.initial_investment, payload.cash_flows
        )
        return {
            "van": van_val,
            "verdict": verdict,
            "tir": tir_result["tir"],
            "tir_percentage": round(tir_result["tir"] * 100.0, 4),
            "iterations": tir_result["iterations"],
            "method": tir_result["method"],
            "tolerance": "1e-6",
        }
    except UnauthorizedRoleError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except DomainError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/finance/breakeven")
def evaluate_break_even(payload: BreakEvenInputSchema, x_role: str = Header(default="ADMIN")):
    try:
        verify_role_access(x_role, "finance:break_even")
        return calculate_break_even_semaphore(
            payload.monthly_revenue, payload.fixed_costs, payload.variable_costs
        )
    except UnauthorizedRoleError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except DomainError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
