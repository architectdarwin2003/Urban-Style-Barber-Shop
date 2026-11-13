from typing import List, Dict, Any
from app.domain.exceptions import (
    DomainError,
    OutOfBusinessHoursError,
    BookingOverlapError,
    CancellationWindowError,
    UnauthorizedRoleError,
)


OPENING_MINUTE: int = 8 * 60
CLOSING_MINUTE: int = 20 * 60
MIN_SELF_SERVICE_HOURS: float = 2.0
MAX_DAILY_BREAKS: int = 2


def parse_time_to_minutes(time_str: str) -> int:
    if not isinstance(time_str, str) or ":" not in time_str:
        raise OutOfBusinessHoursError("Formato de hora invalido.")
    parts = time_str.strip().split(":")
    if len(parts) != 2:
        raise OutOfBusinessHoursError("Formato de hora invalido.")
    try:
        hours, minutes = int(parts[0]), int(parts[1])
    except ValueError as exc:
        raise OutOfBusinessHoursError("La hora y los minutos deben ser enteros.") from exc

    if hours < 0 or hours > 23 or minutes < 0 or minutes > 59:
        raise OutOfBusinessHoursError("Hora fuera de rango.")
    return hours * 60 + minutes


def format_minutes_to_time(total_minutes: int) -> str:
    return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"


def validate_booking_business_hours(start_time: str, duration_minutes: int) -> Dict[str, Any]:
    if not isinstance(duration_minutes, int) or duration_minutes <= 0:
        raise OutOfBusinessHoursError("La duracion debe ser mayor a 0 minutos.")

    start_min = parse_time_to_minutes(start_time)
    end_min = start_min + duration_minutes

    if start_min < OPENING_MINUTE or end_min > CLOSING_MINUTE:
        raise OutOfBusinessHoursError(
            f"El horario solicitado ({start_time} - {format_minutes_to_time(end_min)}) esta fuera de servicio (08:00 a 20:00)."
        )

    return {
        "start_time": format_minutes_to_time(start_min),
        "end_time": format_minutes_to_time(end_min),
        "start_minutes": start_min,
        "end_minutes": end_min,
        "duration_minutes": duration_minutes,
    }


def check_no_overlap(
    barber_id: str,
    date_str: str,
    start_time: str,
    duration_minutes: int,
    existing_bookings: List[Dict[str, Any]],
    ignore_booking_id: str = "",
) -> bool:
    window = validate_booking_business_hours(start_time, duration_minutes)
    new_start, new_end = window["start_minutes"], window["end_minutes"]

    for booking in existing_bookings:
        if ignore_booking_id and str(booking.get("id", "")) == str(ignore_booking_id):
            continue
        if str(booking.get("barber_id", "")) != str(barber_id):
            continue
        if str(booking.get("date", "")) != str(date_str):
            continue
        status = str(booking.get("status", "CONFIRMADA")).upper()
        if status in ("CANCELADA", "COMPLETADA"):
            continue

        existing_start = parse_time_to_minutes(str(booking["start_time"]))
        existing_end = existing_start + int(booking["duration_minutes"])

        if new_start < existing_end and existing_start < new_end:
            raise BookingOverlapError(
                f"El horario {window['start_time']}-{window['end_time']} ya esta ocupado."
            )

    return True


def validate_self_service_modification(hours_until_appointment: float) -> bool:
    if hours_until_appointment < MIN_SELF_SERVICE_HOURS:
        raise CancellationWindowError(
            "Solo puedes cancelar o cambiar la hora con al menos 2 horas de anticipacion."
        )
    return True


def validate_barber_break_limit(
    barber_id: str,
    date_str: str,
    existing_bookings: List[Dict[str, Any]],
) -> int:
    breaks_today = [
        b for b in existing_bookings
        if str(b.get("barber_id", "")) == str(barber_id)
        and str(b.get("date", "")) == str(date_str)
        and str(b.get("status", "")).upper() == "PAUSA"
    ]
    if len(breaks_today) >= MAX_DAILY_BREAKS:
        raise DomainError("Limite alcanzado: el barbero solo puede tomar maximo 2 descansos de 30 minutos al dia.")
    return len(breaks_today)


def validate_barber_schedule_ownership(actor_role: str, actor_barber_id: str, target_barber_id: str) -> bool:
    norm_role = str(actor_role or "").strip().upper()
    if norm_role != "BARBERO":
        raise UnauthorizedRoleError("Solo el barbero titular puede modificar el estado de su agenda.")
    if not actor_barber_id or str(actor_barber_id).strip() != str(target_barber_id).strip():
        raise UnauthorizedRoleError("Modo lectura: solo puedes modificar tu propia agenda y tiempos.")
    return True


def validate_booking_ownership_action(
    actor_role: str,
    booking: Dict[str, Any],
    actor_barber_id: str = "",
    actor_username: str = "",
    actor_name: str = "",
) -> bool:
    norm_role = str(actor_role or "CLIENTE").strip().upper()
    if norm_role == "ADMIN":
        return True
    if norm_role == "BARBERO":
        if not actor_barber_id or str(booking.get("barber_id", "")) != str(actor_barber_id):
            raise UnauthorizedRoleError("Solo puedes cancelar o modificar reservas de tus propios clientes.")
        return True
    if norm_role == "CLIENTE":
        bk_user = str(booking.get("client_username", "")).strip().lower()
        bk_name = str(booking.get("client_name", "")).strip().lower()
        act_user = str(actor_username or "").strip().lower()
        act_name = str(actor_name or "").strip().lower()
        if (act_user and bk_user == act_user) or (act_name and bk_name == act_name):
            return True
        raise UnauthorizedRoleError("No tienes permiso para cancelar o modificar la reserva de otra persona.")
    raise UnauthorizedRoleError("Rol no autorizado para gestionar reservas.")
