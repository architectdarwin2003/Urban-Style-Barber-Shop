# SEFI-TI Frontend · Vanilla JS Modular (ES Modules) + Tailwind CSS

Frontend desacoplado de **Urban Style Barber Shop (Medellín)** sin dependencias de frameworks pesados (Cero React en el cliente), listo para desplegar en `/var/www/html/` sobre Apache2.

## Módulos Puros Testeables (`src/`)
- `financial_formatter.js`: Formateo de pesos colombianos (`formatCOP`) y porcentajes (`formatPercentage`).
- `booking_calculator.js`: Cálculo inteligente en tiempo real de Servicio Base + Adicionales (`calculateBookingTotals`) y comisiones diarias por barbero.
- `schedule_manager.js`: Filtrado de disponibilidad horaria (`filterAvailableSlots`) y persistencia offline en `localStorage` (`syncOfflineSchedule`).
- `rbac_guard.js`: Guardas de navegación por rol (`evaluateViewAccess`).

## Ejecución de las 10 Pruebas Unitarias Nativas (`node --test`)
```bash
cd javascript_project
npm test
```
