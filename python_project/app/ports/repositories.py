"""Puertos (Interfaces) de Arquitectura Hexagonal para SEFI-TI."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class BarberShopRepositoryPort(ABC):
    """Puerto secundario para persistencia transaccional de SEFI-TI."""

    @abstractmethod
    def list_services(self) -> List[Dict[str, Any]]:
        """Retorna el catálogo de servicios base y adicionales."""

    @abstractmethod
    def upsert_service(self, service_data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea o actualiza un servicio base o adicional en la matriz tarifaria."""

    @abstractmethod
    def delete_service(self, service_id: str) -> bool:
        """Elimina un servicio del catálogo."""

    @abstractmethod
    def list_barbers(self) -> List[Dict[str, Any]]:
        """Lista los barberos registrados y su porcentaje de comisión."""

    @abstractmethod
    def list_bookings(self, date_str: Optional[str] = None, phone: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lista las reservas filtradas opcionalmente por fecha o celular."""

    @abstractmethod
    def create_booking(self, booking_data: Dict[str, Any]) -> Dict[str, Any]:
        """Persiste una nueva cita validada."""
