# SEFI-TI - Urban Style Barber Shop (Medellin)

**Sistema de Evaluacion Financiera y Turnos Inteligentes**  
**Institucion Universitaria Tecnologico de Antioquia** · Gestion Agil de Proyectos (2026-2)  
**Integrantes:** Darwin Salgado Martinez, Brayan Jaramillo, Adrian David Sanchez, Bryam Hoyos  
**Docente:** Jaime Eduardo Montoya Montoya

---

## 1. Descripcion General

Aplicacion web full-stack disenada para **Urban Style Barber Shop (El Poblado, Medellin)** bajo **Arquitectura Hexagonal** en **Python 3** (Backend y persistencia SQLite3) y **JavaScript Modular (ES Modules)** en el Frontend, aplicando **Desarrollo Guiado por Pruebas (TDD)** e **Integracion y Despliegue Continuo (CI/CD)** con GitHub Actions.

### Reglas de Autenticacion y Perfiles de Usuario

El sistema cuenta con un modulo de autenticacion de inicio de sesion y registro que valida credenciales y redirige segun el rol asignado:

| Perfil | Usuario | Contrasena | Permisos y Reglas de Negocio |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `admin123` | Acceso a **Caja y Finanzas**, **Evaluar Inversion**, **Precios y Servicios**, **Barberos (CRUD completo)** y **Agendas de Barberos** (puede supervisar y cancelar cualquier reserva). No ingresa a la vista de reserva de clientes. Solo puede crearse una cuenta de Administrador (a menos que la actual sea eliminada). |
| **Barbero (Mateo Restrepo)** | `mateo` | `barbero123` | Acceso a **Agenda de Barberos**. Puede finalizar cortes, cancelar reservas de sus propios clientes y tomar hasta **2 descansos de 30 minutos al dia** unicamente en su propia agenda; puede consultar las agendas de otros barberos en modo solo lectura. |
| **Barbero (Santiago Cano)** | `santiago` | `barbero123` | Acceso a **Agenda de Barberos** con control exclusivo sobre sus propios clientes y consulta en solo lectura de los demas barberos. |
| **Barbero (Alejandro Mejia)** | `alejandro` | `barbero123` | Acceso a **Agenda de Barberos** con control exclusivo sobre sus propios clientes y consulta en solo lectura de los demas barberos. |
| **Cliente** | `cliente` | `cliente123` | Acceso a **Reservar Cita** y **Mis Reservas**. Solo visualiza sus propias reservas activas (buscando por codigo o nombre) y no puede ver ni cancelar reservas de otras personas. Cuando el barbero termina un corte, este desaparece inmediatamente de las reservas activas. |

---

## 2. Estructura del Repositorio

```text
.
├── .github/workflows/ci.yml              # Pipeline CI/CD (Pruebas Python + Node.js y Despliegue Apache)
├── HISTORIAS_USUARIO_Y_KANBAN.md         # Historias de Usuario (INVEST), Criterios Gherkin y Tablero Kanban
├── docs/HISTORIAS_DE_USUARIO_Y_KANBAN.md # Copia documental en carpeta docs/
├── python_project/                       # Backend Python 3 (Arquitectura Hexagonal + SQLite3)
│   ├── app/
│   │   ├── domain/                       # Reglas puras (VAN, TIR, Biseccion, Equilibrio, Turnos, RBAC)
│   │   ├── ports/                        # Interfaces de repositorio
│   │   ├── adapters/                     # Persistencia SQLite3 (urban_style.db)
│   │   └── cli_bridge.py                 # Puente transaccional JSON
│   ├── motor_financiero_van.py           # CLI financiero independiente
│   └── tests/                            # 10 pruebas unitarias nativas (unittest)
└── javascript_project/                   # Frontend Vanilla JS Modular (ES Modules)
    ├── src/                              # Modulos puros (Moneda COP, Calculadora, Agenda, RBAC)
    ├── public/                           # Interfaz web (HTML5 + Tailwind CSS + app.js)
    └── tests/                            # 10 pruebas unitarias nativas (node --test)
```

---

## 3. Matriz de las 20 Pruebas Unitarias (10 Python + 10 JavaScript)

### 3.1 Suite Backend (`python_project/tests/`) - 10 Pruebas con `unittest`

| ID | Nombre del Test | Modulo Evaluado | Resultado |
| :--- | :--- | :--- | :--- |
| **PY-01** | `test_01_calculate_van_standard` | `financial_engine.py` | PASS |
| **PY-02** | `test_02_get_viability_verdict` | `financial_engine.py` | PASS |
| **PY-03** | `test_03_boundary_negative_rate` | `financial_engine.py` | PASS |
| **PY-04** | `test_04_empty_flows_rejection` | `financial_engine.py` | PASS |
| **PY-05** | `test_05_tir_newton_raphson_convergence` | `financial_engine.py` | PASS |
| **PY-06** | `test_06_tir_fallback_to_bisection` | `financial_engine.py` | PASS |
| **PY-07** | `test_07_break_even_semaphore_logic` | `financial_engine.py` | PASS |
| **PY-08** | `test_08_booking_window_business_hours` | `booking_rules.py` | PASS |
| **PY-09** | `test_09_check_no_overlap_conflict` | `booking_rules.py` | PASS |
| **PY-10** | `test_10_rbac_privilege_restriction` | `rbac_rules.py` | PASS |

### 3.2 Suite Frontend (`javascript_project/tests/`) - 10 Pruebas con `node --test`

| ID | Nombre del Test | Modulo Evaluado | Resultado |
| :--- | :--- | :--- | :--- |
| **JS-01** | `test_01_formatCOP_standard` | `financial_formatter.js` | PASS |
| **JS-02** | `test_02_formatCOP_invalid_input` | `financial_formatter.js` | PASS |
| **JS-03** | `test_03_formatPercentage` | `financial_formatter.js` | PASS |
| **JS-04** | `test_04_calculate_service_totals_base_only` | `booking_calculator.js` | PASS |
| **JS-05** | `test_05_calculate_service_totals_with_addons` | `booking_calculator.js` | PASS |
| **JS-06** | `test_06_calculate_service_totals_invalid_data` | `booking_calculator.js` | PASS |
| **JS-07** | `test_07_schedule_filter_available_slots` | `schedule_manager.js` | PASS |
| **JS-08** | `test_08_schedule_offline_cache_serialization` | `schedule_manager.js` | PASS |
| **JS-09** | `test_09_rbac_guard_allow_admin` | `rbac_guard.js` | PASS |
| **JS-10** | `test_10_rbac_guard_restrict_barber` | `rbac_guard.js` | PASS |

---

## 4. Comandos de Ejecucion Local

### 4.1 Ejecutar las 10 pruebas unitarias de Python
```bash
python3 -m unittest discover -s python_project/tests -p "test_*.py" -v
```

### 4.2 Ejecutar las 10 pruebas unitarias de JavaScript
```bash
node --test javascript_project/tests/test_*.js
```

### 4.3 Iniciar la aplicacion web completa
```bash
npm install
npm run dev
```
La aplicacion queda disponible en `http://localhost:3000`.
