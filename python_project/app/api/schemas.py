"""
Esquemas de validación Pydantic v2 para los adaptadores primarios REST de SEFI-TI.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ServiceSchema(BaseModel):
    id: str
    name: str = Field(..., min_length=2)
    category: str = Field(..., pattern="^(BASE|ADDON)$")
    price_cop: int = Field(..., ge=0)
    duration_minutes: int = Field(..., gt=0)
    description: Optional[str] = ""


class BookingCreateSchema(BaseModel):
    client_name: str = Field(..., min_length=2)
    client_phone: str = Field(..., min_length=7)
    barber_id: str
    base_service_id: str
    addon_ids: List[str] = Field(default_factory=list)
    date: str
    start_time: str
    payment_method: str = "EFECTIVO"


class BookingRescheduleSchema(BaseModel):
    start_time: str
    hours_until: float = 24.0


class FinancialEvaluationInputSchema(BaseModel):
    initial_investment: float = Field(..., ge=0)
    discount_rate: float = Field(..., gt=-1.0)
    cash_flows: List[float] = Field(..., min_length=1)


class BreakEvenInputSchema(BaseModel):
    monthly_revenue: float = Field(..., ge=0)
    fixed_costs: float = Field(..., ge=0)
    variable_costs: float = Field(default=0.0, ge=0)
