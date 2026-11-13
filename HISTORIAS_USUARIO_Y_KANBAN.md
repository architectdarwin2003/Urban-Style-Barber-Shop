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

### Sprint 1: Evaluacion Financiera y Reglas Base

#### US-01: Calculo del Valor Actual Neto (VAN) y Dictamen de Viabilidad
- **Como** Administrador de Urban Style Barber Shop,
- **Quiero** calcular el Valor Actual Neto (VAN) ingresando la inversion inicial, la tasa de descuento y los flujos de caja anuales en pesos colombianos (COP),
- **Para** conocer si una inversion en el local es financieramente viable.
- **Estimacion:** 5 Puntos · **Prioridad:** Alta
- **Criterios de Aceptacion (Gherkin):**
  - **Escenario 1:** *Dado* que ingreso una inversion inicial de `$12.000.000 COP`, tasa del `12%` y flujos de `$4.500.000`, `$5.200.000` y `$6.100.000`, *Cuando* ejecuto el calculo, *Entonces* el sistema retorna un VAN de `$505.785,35 COP` y dictamen `"Viable"`.
  - **Escenario 2:** *Dado* que se ingresa una tasa menor o igual a `-100%` o una lista de flujos vacia, *Cuando* se invoca el motor, *Entonces* lanza `InvalidFinancialDataError`.

#### US-02: Calculo de la Tasa Interna de Retorno (TIR) con Newton-Raphson
- **Como** Administrador,
- **Quiero** calcular la Tasa Interna de Retorno (TIR) con precision de `1e-6` mediante el metodo numerico de Newton-Raphson,
- **Para** comparar la rentabilidad porcentual del proyecto frente al costo de capital.
- **Estimacion:** 5 Puntos · **Prioridad:** Alta
- **Criterios de Aceptacion (Gherkin):**
  - **Escenario 1:** *Dado* el flujo del caso base (`I0 = $12.000.000`, flujos `$4.5M, $5.2M, $6.1M`), *Cuando* se calcula la TIR, *Entonces* converge en menos de 15 iteraciones a `14,35%`.

#### US-03: Conmutacion Automatica al Metodo de Biseccion
- **Como** Administrador,
- **Quiero** que el motor financiero conmute automaticamente al metodo de Biseccion cuando la derivada de Newton-Raphson sea cercana a cero (`|VAN'(r)| < 1e-9`),
- **Para** evitar divisiones por cero y garantizar siempre el calculo de la TIR.
- **Estimacion:** 5 Puntos · **Prioridad:** Alta
- **Criterios de Aceptacion (Gherkin):**
  - **Escenario 1:** *Dado* un escenario con derivada nula, *Cuando* se invoca el calculo de TIR, *Entonces* el sistema activa `"Bisección (Respaldo)"` y entrega la raiz convergente.

#### US-04: Validacion de Horario Laboral y Prevencion de Cruces de Citas
- **Como** Barbero de Urban Style Barber Shop,
- **Quiero** que el sistema valide que toda reserva este dentro de la jornada (`08:00` a `20:00`) y no se cruce con otra cita activa,
- **Para** evitar sobrecupos en mi agenda diaria.
- **Estimacion:** 3 Puntos · **Prioridad:** Alta
- **Criterios de Aceptacion (Gherkin):**
  - **Escenario 1:** *Dado* que `barber-mateo` tiene una cita de `10:00` a `11:05`, *Cuando* un cliente intenta agendar a las `10:30` con el mismo barbero, *Entonces* el sistema rechaza la solicitud con `BookingOverlapError`.

---

### Sprint 2: Reservas de Clientes, Agenda de Barberos y Finanzas del Local

#### US-05: Reserva de Cita con Corte Principal y Servicios Adicionales
- **Como** Cliente de Urban Style Barber Shop,
- **Quiero** seleccionar un corte principal (*Corte Degradado (Fade)*, *Corte Clasico*, *Corte y Barba Completa* o *Corte Infantil*) y sumar servicios adicionales (*Arreglo de Barba*, *Limpieza de Cejas*, *Mascarilla Facial*, *Sombreado de Barba*),
- **Para** conocer al instante el precio total en COP y la duracion exacta de mi cita antes de confirmar, recibiendo una notificacion que desaparece automaticamente tras unos segundos.
- **Estimacion:** 5 Puntos · **Prioridad:** Alta
- **Criterios de Aceptacion (Gherkin):**
  - **Escenario 1:** *Dado* que selecciono *Corte Degradado (Fade)* (`$35.000`, `35 min`) mas *Arreglo de Barba* (`$15.000`, `20 min`) y *Limpieza de Cejas* (`$8.000`, `10 min`), *Cuando* reviso el resumen, *Entonces* el sistema muestra `$58.000 COP` y `65 min`, y al confirmar muestra un aviso temporal que se oculta automaticamente tras 3.5 segundos.

#### US-06: Estado de Caja, Punto de Equilibrio y Comisiones de Barberos
- **Como** Administrador,
- **Quiero** visualizar el estado mensual del punto de equilibrio (`Rentable`, `En punto de equilibrio`, `Por debajo de costos`) y las comisiones ganadas por cada barbero,
- **Para** controlar los gastos fijos del local y liquidar los pagos del equipo.
- **Estimacion:** 3 Puntos · **Prioridad:** Alta
- **Criterios de Aceptacion (Gherkin):**
  - **Escenario 1:** *Dado* que los ingresos acumulados (`$14.850.000 COP`) superan los gastos fijos (`$11.800.000 COP`), *Cuando* abro *Caja y Finanzas*, *Entonces* el indicador muestra estado `VERDE (Rentable)` con cobertura del `125,85%`.

#### US-07: Evaluacion de Compra de Insumos y Mejora de Agenda
- **Como** Administrador,
- **Quiero** simular escenarios preconfigurados de compra mayorista de insumos y mejora de tiempos de atencion en la vista *Evaluar Inversion*,
- **Para** tomar decisiones de inversion respaldadas por VAN y TIR.
- **Estimacion:** 3 Puntos · **Prioridad:** Media
- **Criterios de Aceptacion (Gherkin):**
  - **Escenario 1:** *Dado* que selecciono el escenario *Compra de Insumos al por Mayor* (`$4.200.000 COP`), *Cuando* presiono calcular, *Entonces* el sistema actualiza automaticamente el VAN, la TIR y la decision recomendada.

#### US-08: Agenda de Barberos con Permisos Rigurosos, Cancelacion Propia y Limite de 2 Descansos Diarios
- **Como** Barbero de Urban Style Barber Shop,
- **Quiero** visualizar mi agenda y la de mis companeros, pudiendo finalizar cortes, cancelar citas de mis propios clientes o registrar hasta 2 descansos de 30 minutos al dia unicamente en mi propia agenda,
- **Para** gestionar mis turnos sin alterar ni cancelar las citas de otros barberos y asegurando que todo corte terminado desaparezca de la consulta activa del cliente.
- **Estimacion:** 5 Puntos · **Prioridad:** Alta
- **Criterios de Aceptacion (Gherkin):**
  - **Escenario 1:** *Dado* que inicio sesion como `mateo` (`barber-mateo`), *Cuando* selecciono ver la agenda de `Santiago Cano`, *Entonces* veo sus citas en modo solo lectura sin botones de modificacion ni cancelacion.
  - **Escenario 2:** *Dado* que estoy en mi propia agenda, *Cuando* confirmo *Terminar corte en curso* o *Cancelar reserva* de un cliente mio, *Entonces* la cita se cierra con confirmacion previa y desaparece de la consulta activa del cliente.
  - **Escenario 3:** *Dado* que ya tome 2 descansos de 30 minutos en el dia, *Cuando* intento registrar un tercer descanso, *Entonces* el sistema bloquea la accion indicando que el limite diario es de 2 descansos.

---

### Sprint 3: Autenticacion por Perfiles, Seguridad en Eventos y CI/CD

#### US-09: Privacidad en Reservas del Cliente y Cancelacion Exclusiva por Admin o Barbero Titular
- **Como** Cliente,
- **Quiero** consultar exclusivamente mis propias reservas activas por numero de reserva o nombre sin que otros clientes puedan ver ni cancelar mis citas,
- **Para** proteger mis turnos agendados, dejando la cancelacion de reservas a cargo del Administrador o de mi Barbero asignado.
- **Estimacion:** 3 Puntos · **Prioridad:** Alta
- **Criterios de Aceptacion (Gherkin):**
  - **Escenario 1:** *Dado* que inicio sesion como cliente (`Juan Pablo Montoya`), *Cuando* entro a *Mis Reservas*, *Entonces* solo visualizo mis citas activas (`bk-1002`) y nunca puedo ver ni cancelar las reservas de otros clientes.

#### US-10: Autenticacion por Rol y Regla de Cuenta Unica de Administrador
- **Como** Usuario del sistema (`Cliente`, `Barbero` o `Administrador`),
- **Quiero** iniciar sesion en una pantalla de acceso moderna con el logo de la barberia o registrar mi cuenta de Cliente o Administrador (permitiendo crear solo una cuenta de Administrador a menos que se elimine la actual),
- **Para** ser redirigido automaticamente a las vistas de mi perfil y proteger las funciones criticas con confirmacion de cierre de sesion.
- **Estimacion:** 5 Puntos · **Prioridad:** Alta
- **Criterios de Aceptacion (Gherkin):**
  - **Escenario 1:** *Dado* que inicio sesion como `ADMIN`, *Cuando* ingreso al sistema, *Entonces* soy redirigido a *Caja y Finanzas* y puedo supervisar o cancelar reservas en las agendas de todos los barberos, pero no tengo acceso a la vista de cliente *Reservar Cita*.
  - **Escenario 2:** *Dado* que ya se creo la cuenta unica de Administrador, *Cuando* otra persona intenta crear una segunda cuenta con rol `ADMIN`, *Entonces* el sistema bloquea el registro hasta que el Administrador actual elimine su cuenta previa confirmacion.

#### US-11: CRUD de Precios/Servicios y CRUD de Barberos para el Administrador
- **Como** Administrador,
- **Quiero** crear, editar o eliminar tanto los servicios del catalogo (*Precios y Servicios*) como el equipo de barberos y sus credenciales (*Barberos*) con confirmacion previa al eliminar,
- **Para** mantener actualizados los precios en COP y la plantilla de barberos activos del local.
- **Estimacion:** 3 Puntos · **Prioridad:** Media
- **Criterios de Aceptacion (Gherkin):**
  - **Escenario 1:** *Dado* que registro o edito un barbero o un servicio desde el panel de Administrador, *Cuando* guardo los cambios, *Entonces* se persisten en SQLite3 y quedan disponibles inmediatamente en las agendas y en el inicio de sesion.

#### US-12: Respaldo Local de Agenda, Modo Claro/Oscuro (Sol/Luna) y Pipeline CI/CD
- **Como** Usuario de Urban Style Barber Shop,
- **Quiero** alternar entre modo claro y oscuro mediante un icono de Sol y Luna, contar con respaldo local de la agenda en `localStorage` y validar cada cambio con 20 pruebas unitarias en GitHub Actions,
- **Para** asegurar disponibilidad visual y calidad continua en el despliegue.
- **Estimacion:** 3 Puntos · **Prioridad:** Media
- **Criterios de Aceptacion (Gherkin):**
  - **Escenario 1:** *Dado* un `git push` al repositorio, *Cuando* se ejecuta `.github/workflows/ci.yml`, *Entonces* corren las 10 pruebas de Python y las 10 pruebas de JavaScript antes de desplegar.

---

## 3. Tablero Kanban del Proyecto

| Por Hacer (Backlog) | En Progreso (WIP) | En Revision / Pruebas TDD | Completado (Done) |
| :--- | :--- | :--- | :--- |
| *Sin elementos pendientes (100% del alcance completado)* | *Pipeline CI/CD activo en cada push a `main`* | **Verificacion Continua (20/20 Tests):**<br>- 10 tests `unittest` (Python)<br>- 10 tests `node --test` (JS)<br>- Trazabilidad Git Red-Green-Refactor | **Sprint 1:**<br>- **US-01:** Calculo VAN y Dictamen<br>- **US-02:** Calculo TIR Newton-Raphson<br>- **US-03:** Respaldo Biseccion<br>- **US-04:** Validacion Horaria y Cruces<br><br>**Sprint 2:**<br>- **US-05:** Reserva de Citas y Adicionales<br>- **US-06:** Caja y Punto de Equilibrio<br>- **US-07:** Evaluar Inversion (VAN/TIR)<br>- **US-08:** Agenda del Barbero (Max 2 descansos)<br><br>**Sprint 3:**<br>- **US-09:** Consulta por Codigo/Nombre<br>- **US-10:** Login por Rol y Admin Unico<br>- **US-11:** Precios y Servicios<br>- **US-12:** Modo Sol/Luna y CI/CD |
