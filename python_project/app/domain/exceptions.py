"""
Excepciones de negocio tipadas para el dominio SEFI-TI.
No depende de librerías externas ni de frameworks HTTP.
"""


class DomainError(Exception):
    """Excepción base para errores de reglas de negocio en SEFI-TI."""
    pass


class InvalidFinancialDataError(DomainError):
    """Lanzada cuando los parámetros financieros (tasa, inversión o flujos) son inválidos."""
    pass


class ConvergenceError(DomainError):
    """Lanzada cuando ni Newton-Raphson ni Bisección logran converger hacia una TIR real."""
    pass


class OutOfBusinessHoursError(DomainError):
    """Lanzada cuando una cita se intenta agendar fuera de la jornada hábil (08:00 - 20:00)."""
    pass


class BookingOverlapError(DomainError):
    """Lanzada cuando un turno colisiona con otra cita activa o bloqueo del mismo barbero."""
    pass


class CancellationWindowError(DomainError):
    """Lanzada cuando se intenta cancelar o reprogramar con menos de 2 horas de anticipación."""
    pass


class UnauthorizedRoleError(DomainError):
    """Lanzada cuando un rol intenta acceder a un recurso o acción sin privilegios suficientes."""
    pass
