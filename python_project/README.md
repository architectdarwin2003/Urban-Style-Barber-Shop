# SEFI-TI Backend · Python 3.11 + FastAPI + SQLite3 (Arquitectura Hexagonal)

Backend determinístico para **Urban Style Barber Shop (Medellín)** diseñado bajo **Clean Architecture (Hexagonal)** y **TDD Estricto**.

## Estructura de Capas
- `app/domain/`: Lógica pura de negocio (VAN, TIR por Newton-Raphson con $\varepsilon=10^{-6}$ y respaldo por Bisección, Semáforo de Punto de Equilibrio, horarios 08:00–20:00, detección de solapamientos y RBAC). Cero dependencias externas.
- `app/ports/`: Contratos e interfaces de persistencia.
- `app/adapters/`: Persistencia transaccional ACID en **SQLite3 nativo** (`urban_style.db`).
- `app/api/`: Controladores REST en FastAPI y esquemas Pydantic v2.

## Ejecución de las 10 Pruebas Unitarias Nativas (`unittest`)
```bash
cd python_project
python3 -m unittest discover -s tests -p "test_*.py" -v
```
