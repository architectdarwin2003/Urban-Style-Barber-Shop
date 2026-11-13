# Historias de Usuario, Criterios de Aceptacion y Tablero Kanban
**Proyecto:** SEFI-TI (Sistema de Evaluacion Financiera y Turnos Inteligentes)  
**Cliente Piloto:** Urban Style Barber Shop (Medellin)  
**Asignatura:** Gestion Agil de Proyectos · Entregable 3  
**Autores:** Darwin Salgado Martinez, Brayan Jaramillo, Adrian David Sanchez, Bryam Hoyos  
**Docente:** Jaime Eduardo Montoya Montoya

---

## 1. Epicas del Proyecto

| Codigo | Epica | Objetivo de Negocio |
| :--- | :--- | :--- |
| **EP-01** | Evaluacion Financiera (VAN, TIR y Punto de Equilibrio) | Evaluar inversiones en remodelacion, equipos e insumos y monitorear el punto de equilibrio mensual del local en COP. |
| **EP-02** | Reservas de Citas y Consulta de Clientes | Permitir al cliente reservar su corte con servicios adicionales y consultar sus citas activas por numero de reserva o nombre. |
| **EP-03** | Agenda de Barberos y Control de Descansos | Facilitar al barbero la gestion de su propia silla, el cierre de cortes terminados y el control de hasta 2 descansos diarios de 30 minutos. |
| **EP-04** | Autenticacion por Perfiles, Seguridad y CI/CD | Garantizar inicio de sesion por rol (Cliente, Barbero, Administrador unico), confirmaciones de seguridad, pruebas TDD y despliegue continuo. |

---

## 2. Catalogo de 12 Historias de Usuario (INVEST + Gherkin)

- **US-01:** Calculo del Valor Actual Neto (VAN) y Dictamen de Viabilidad (`financial_engine.py` -> `test_01`, `test_02`).
- **US-02:** Calculo de la Tasa Interna de Retorno (TIR) con Newton-Raphson (`financial_engine.py` -> `test_05`).
- **US-03:** Conmutacion Automatica al Metodo de Biseccion (`financial_engine.py` -> `test_06`).
- **US-04:** Validacion de Horario Laboral y Prevencion de Cruces (`booking_rules.py` -> `test_08`, `test_09`).
- **US-05:** Reserva de Cita con Corte Principal, Adicionales y Aviso Temporal Auto-Ocultable (`booking_calculator.js` -> `test_04`, `test_05`, `test_06`).
- **US-06:** Estado de Caja, Punto de Equilibrio y Comisiones (`financial_engine.py` -> `test_07`).
- **US-07:** Evaluacion de Compra de Insumos y Mejora de Agenda (`financial_formatter.js` -> `test_01`, `test_02`, `test_03`).
- **US-08:** Agenda de Barberos (Lectura de otros barberos, cancelacion y modificacion exclusiva de sus propios clientes y maximo 2 descansos diarios de 30 min) (`schedule_manager.js` -> `test_07`).
- **US-09:** Privacidad en Consulta de Reservas del Cliente (solo ve sus propias citas; cancelacion exclusiva por Admin o Barbero titular) (`booking_rules.py` -> `test_08`).
- **US-10:** Autenticacion por Rol (Cliente, Barbero, Administrador unico sin vista de reserva de cliente) (`rbac_rules.py` -> `test_10`, `rbac_guard.js` -> `test_09`, `test_10`).
- **US-11:** CRUD de Precios/Servicios y CRUD de Barberos con confirmacion de seguridad (`sqlite_repository.py`).
- **US-12:** Modo Claro/Oscuro (Sol/Luna), Cache Offline y Pipeline CI/CD (`schedule_manager.js` -> `test_08`).

---

## 3. Tablero Kanban del Proyecto

| Por Hacer (Backlog) | En Progreso (WIP) | En Revision / Pruebas TDD | Completado (Done) |
| :--- | :--- | :--- | :--- |
| *Sin elementos pendientes* | *Monitoreo de Pipeline CI/CD en GitHub Actions* | **20 Pruebas Unitarias Automatizadas:**<br>- 10 Python (`unittest`)<br>- 10 JavaScript (`node --test`) | **12 Historias de Usuario Completadas:**<br>`US-01` a `US-12` verificadas e integradas en `main`. |
