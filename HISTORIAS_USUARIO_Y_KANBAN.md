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

---

## 4. Product Backlog Completo del Entregable 2 (21 Historias de Usuario: US-01 a US-21)

Fuente oficial: **Segunda Entrega · De la Viabilidad al Primer Sprint Backlog · SEFI-TI** (`SEFI-TI-USBS-2026-01`, Total: **75 puntos de historia** distribuidos en 5 epicas).

### Epicas del Product Backlog (Entregable 2)

| Epica | Alcance | Historias |
| :--- | :--- | :--- |
| **EP-01 Motor financiero SEFI-TI** | VAN, TIR con Newton-Raphson, biseccion y validaciones (Hito 1) | US-01 a US-04 |
| **EP-02 Turnos y disponibilidad** | Persistencia, agendamiento y panel en tiempo real (Hito 2) | US-08, US-12, US-13, US-15 |
| **EP-03 Acceso, tarifas y notificaciones** | RBAC, matriz tarifaria, WhatsApp y registro de ingresos (Hito 2) | US-09, US-10, US-14, US-16 |
| **EP-04 Validacion y herramientas visuales** | Casos reales y herramientas de decision financiera (Hito 3) | US-07, US-11, US-17, US-18, US-21 |
| **EP-05 Calidad, gobernanza y despliegue** | Pruebas, Git Flow y CI, Habeas Data y despliegue (Hito 4) | US-05, US-06, US-19, US-20 |

### Catalogo de las 21 Historias de Usuario (US-01 a US-21)

#### US-01 · VAN con dictamen de viabilidad (`EP-01` · Prioridad: 1 · Valor: Alto · 3 pts)
- **Como** administrador de la barberia,
- **Quiero** ingresar la inversion inicial ($I_0$), la tasa de descuento ($r$) y los flujos de caja ($FC_t$) para obtener el VAN con su dictamen (Viable / Indiferente / No viable) y decidir si una inversion vale la pena antes de comprometer capital.
- **Criterios de aceptacion:**
  - Dado un caso con resultado calculado manualmente, cuando se calcula, entonces el VAN coincide con una tolerancia de `0,01`.
  - El dictamen sigue el criterio de la seccion 3-C del Acta: Viable si el VAN es positivo, Indiferente si es cero y No viable si es negativo.
  - La funcion `calcular_van()` no depende de como se ingresan los datos (teclado o CSV).

#### US-02 · TIR con Newton-Raphson (`EP-01` · Prioridad: 2 · Valor: Alto · 5 pts)
- **Como** administrador de la barberia,
- **Quiero** obtener la TIR de una inversion calculada con el metodo de Newton-Raphson ($\varepsilon = 10^{-6}$) para conocer la rentabilidad real del capital y compararla con mi tasa de descuento.
- **Criterios de aceptacion:**
  - Dado un flujo con TIR conocida, cuando se calcula, entonces el resultado difiere menos de $10^{-6}$ del valor esperado.
  - La iteracion se detiene al cumplir la tolerancia $\varepsilon$ o al llegar al maximo de iteraciones configurado.
  - El resultado informa la TIR y el numero de iteraciones; si no converge, lo indica de forma explicita.

#### US-03 · Respaldo por biseccion (`EP-01` · Prioridad: 3 · Valor: Alto · 3 pts)
- **Como** administrador de la barberia,
- **Quiero** que el sistema use biseccion cuando Newton-Raphson no converge para obtener un resultado confiable con cualquier flujo de caja valido.
- **Criterios de aceptacion:**
  - Si Newton-Raphson supera el maximo de iteraciones o la derivada es casi cero, el sistema cambia a biseccion sin intervencion del usuario.
  - Con un flujo donde Newton-Raphson no converge, la biseccion entrega la TIR con error menor a $10^{-6}$.
  - Si no hay cambio de signo en los flujos, el sistema informa que la TIR no esta definida y no lanza errores no controlados.

#### US-04 · Validacion de entradas del motor (`EP-01` · Prioridad: 4 · Valor: Alto · 2 pts)
- **Como** administrador de la barberia,
- **Quiero** que el sistema valide montos, tasas y flujos antes de calcular para evitar resultados erroneos por datos invalidos.
- **Criterios de aceptacion:**
  - Flujos vacios, valores no numericos o inversion negativa producen un mensaje de error claro, no un fallo del programa.
  - Una tasa de descuento menor o igual a `-100 %` es rechazada.
  - Cada regla de validacion tiene al menos una prueba unitaria.

#### US-05 · Suite de pruebas pytest con cobertura de ramas >= 90 % (`EP-05` · Prioridad: 5 · Valor: Alto · 5 pts)
- **Como** integrante del Development Team (QA),
- **Quiero** una suite de pruebas con pytest para el motor financiero para garantizar la exactitud del calculo y detectar regresiones.
- **Criterios de aceptacion:**
  - La suite cubre VAN, TIR, biseccion, dictamen y validaciones con casos calculados manualmente.
  - La cobertura de ramas del motor es de al menos `90 %` (`pytest-cov` con cobertura de ramas).
  - Todas las pruebas pasan en local y en el pipeline de integracion continua.

#### US-06 · Git Flow y CI en GitHub Actions (`EP-05` · Prioridad: 6 · Valor: Medio · 5 pts)
- **Como** integrante del Development Team,
- **Quiero** un repositorio con Git Flow y un pipeline de integracion continua con la rama `main` protegida para integrar codigo de forma segura y trazable.
- **Criterios de aceptacion:**
  - Existen las ramas `main`, `develop` y `feature/*`; `main` no admite push directo y solo recibe Pull Requests con al menos una aprobacion.
  - Cada Pull Request ejecuta pytest con cobertura en GitHub Actions y no se puede fusionar si falla.
  - El README documenta el flujo de ramas, la convencion de commits y la ejecucion en Colab y VS Code.

#### US-07 · Caso real: ahorro por compras en lote (`EP-04` · Prioridad: 7 · Valor: Alto · 2 pts)
- **Como** administrador de la barberia,
- **Quiero** evaluar con el motor financiero el ahorro generado por comprar insumos en lote para saber si me conviene cambiar mi forma de comprar.
- **Criterios de aceptacion:**
  - Con precios reales por unidad y por lote se arman $I_0$, $r$ y los flujos, y se calculan VAN y TIR.
  - El administrador valida los supuestos (tasa, horizonte y precios) y quedan documentados.
  - El resultado muestra el dictamen en lenguaje claro para una persona no tecnica.

#### US-08 · Modelo de datos y persistencia (`EP-02` · Prioridad: 8 · Valor: Alto · 3 pts)
- **Como** integrante del Development Team,
- **Quiero** una capa de persistencia con el modelo de datos de clientes, barberos, servicios, turnos y pagos para guardar la informacion con un unico punto de origen por dato.
- **Criterios de aceptacion:**
  - El modelo incluye clientes (nombre, telefono, correo), barberos, servicios, turnos y pagos, con migraciones versionadas.
  - El dominio accede a los datos mediante interfaces, sin acoplarse a frameworks de persistencia (restriccion de la seccion 8 del Acta).
  - El procedimiento de respaldo periodico queda documentado y probado una vez.

#### US-09 · Autenticacion y control de acceso por roles (`EP-03` · Prioridad: 9 · Valor: Alto · 3 pts)
- **Como** administrador de la barberia,
- **Quiero** ingresar con credenciales y que los barberos tengan permisos distintos a los mios para proteger la informacion financiera y de gestion.
- **Criterios de aceptacion:**
  - Existen los roles Administrador y Barbero; el Barbero recibe acceso denegado en la matriz tarifaria y en los modulos financieros.
  - Las contrasenas se guardan con hash y la sesion expira por inactividad.
  - Pruebas automaticas verifican el acceso permitido y el denegado por cada rol.

#### US-10 · Matriz tarifaria del administrador (`EP-03` · Prioridad: 10 · Valor: Medio · 3 pts)
- **Como** administrador de la barberia,
- **Quiero** definir los servicios con su precio y su duracion para que los turnos y los calculos financieros usen tarifas oficiales.
- **Criterios de aceptacion:**
  - Puedo crear, editar y desactivar servicios con nombre, precio en COP y duracion en minutos.
  - Un cambio de tarifa no altera turnos ya agendados ni pagos historicos.
  - Solo el rol Administrador accede al modulo.

#### US-11 · Caso real: ingreso incremental por optimizacion de tiempos de corte (`EP-04` · Prioridad: 11 · Valor: Alto · 2 pts)
- **Como** administrador de la barberia,
- **Quiero** evaluar el ingreso incremental de reducir los tiempos de corte para saber cuanto valor adicional genera atender mas turnos por dia.
- **Criterios de aceptacion:**
  - Con las duraciones actuales y las optimizadas de la matriz tarifaria se estiman los turnos extra por dia y los flujos incrementales mensuales.
  - El motor entrega VAN, TIR y dictamen del escenario, con supuestos validados por el administrador.
  - El caso queda documentado y reproducible con datos de ejemplo en el repositorio.

#### US-12 · Agendar turno (`EP-02` · Prioridad: 12 · Valor: Alto · 5 pts)
- **Como** cliente de la barberia,
- **Quiero** agendar un turno eligiendo servicio, barbero y horario disponible para evitar esperas y llamadas.
- **Criterios de aceptacion:**
  - Solo se muestran horarios libres del barbero segun la duracion del servicio; no se permiten turnos solapados.
  - Antes de confirmar, el cliente acepta la autorizacion de tratamiento de datos (Ley 1581 de 2012) con su finalidad.
  - Al confirmar se muestra el resumen del turno y queda registrado como Confirmado.

#### US-13 · Disponibilidad en tiempo real (`EP-02` · Prioridad: 13 · Valor: Alto · 5 pts)
- **Como** barbero,
- **Quiero** ver en tiempo real mi agenda y la ocupacion de todos los barberos para gestionar los huecos y evitar sobrecarga.
- **Criterios de aceptacion:**
  - El panel muestra por barbero los turnos del dia con su estado (libre, ocupado, en curso) y se actualiza solo.
  - Un turno nuevo o cancelado se refleja en el panel en 10 segundos o menos.
  - Sin conexion, el panel muestra la ultima informacion guardada en cache con un aviso visible.

#### US-14 · Recordatorios por WhatsApp (`EP-03` · Prioridad: 14 · Valor: Alto · 5 pts)
- **Como** cliente de la barberia,
- **Quiero** recibir recordatorios por WhatsApp antes de mi turno para no olvidarlo ni perder el cupo.
- **Criterios de aceptacion:**
  - Al confirmar el turno se envia una confirmacion, y un recordatorio automatico antes de la hora con anticipacion configurable.
  - Si falla la WhatsApp Cloud API, el sistema registra el error y muestra confirmacion visual en pantalla.
  - Solo se envian mensajes a clientes con autorizacion de tratamiento de datos.

#### US-15 · Cancelar o reprogramar turno (`EP-02` · Prioridad: 15 · Valor: Medio · 2 pts)
- **Como** cliente de la barberia,
- **Quiero** cancelar o reprogramar mi turno para liberar el cupo y reducir las inasistencias.
- **Criterios de aceptacion:**
  - Puedo cancelar o reprogramar hasta dos horas antes del turno.
  - Al cancelar, el horario queda libre de inmediato para otros clientes.
  - Se registra el estado del turno (cancelado, reprogramado o inasistencia) para llevar estadisticas.

#### US-16 · Registro de pagos e ingresos del dia (`EP-03` · Prioridad: 16 · Valor: Medio · 3 pts)
- **Como** administrador de la barberia,
- **Quiero** registrar los pagos recibidos en el local y ver los ingresos del dia para tener trazabilidad de mis ingresos.
- **Criterios de aceptacion:**
  - Cada turno atendido permite registrar el pago (valor y medio: efectivo o transferencia), sin pasarela transaccional.
  - El resumen diario muestra los ingresos totales y por barbero.
  - Los valores salen de la matriz tarifaria y no se duplican.

#### US-17 · Semaforo financiero de punto de equilibrio (`EP-04` · Prioridad: 17 · Valor: Medio · 3 pts)
- **Como** administrador de la barberia,
- **Quiero** un semaforo de punto de equilibrio para saber de un vistazo si el negocio cubre sus costos.
- **Criterios de aceptacion:**
  - El semaforo es verde, amarillo o rojo segun los ingresos del periodo frente a los costos fijos y variables, con umbrales visibles.
  - Los ingresos provienen del registro de pagos y los costos los captura el administrador como parametros.
  - El calculo tiene pruebas con casos de cada color.

#### US-18 · Flujo de caja segun el calendario colombiano (`EP-04` · Prioridad: 18 · Valor: Medio · 5 pts)
- **Como** administrador de la barberia,
- **Quiero** una prediccion de flujos de caja que considere festivos y dias habiles de Colombia para anticipar los meses de alta y baja demanda.
- **Criterios de aceptacion:**
  - La proyeccion usa el historial de ingresos y el calendario de festivos de Colombia.
  - Muestra flujos mensuales y puede alimentar el calculo de VAN y TIR del motor.
  - Con datos insuficientes, informa la limitacion en lugar de proyectar.

#### US-19 · Derechos de Habeas Data (`EP-05` · Prioridad: 19 · Valor: Medio · 3 pts)
- **Como** cliente de la barberia,
- **Quiero** consultar y pedir la eliminacion de mis datos personales para ejercer mis derechos bajo la Ley 1581 de 2012.
- **Criterios de aceptacion:**
  - La politica de tratamiento es visible y cada autorizacion queda registrada con fecha y finalidad.
  - El cliente puede solicitar la consulta o la eliminacion de sus datos y el administrador la ejecuta con registro.
  - Los datos eliminados no aparecen en listados ni reciben notificaciones.

#### US-20 · Despliegue en la sede piloto y capacitacion (`EP-05` · Prioridad: 20 · Valor: Alto · 5 pts)
- **Como** administrador de la barberia,
- **Quiero** el sistema desplegado en la sede piloto y mi equipo capacitado para usarlo en la operacion diaria.
- **Criterios de aceptacion:**
  - La aplicacion web responsiva queda accesible desde los dispositivos de la sede, con datos reales.
  - Se realiza una capacitacion de 20 minutos a barberos y administrador, con un manual de uso de una pagina.
  - El administrador firma una lista de verificacion de pruebas finales antes de la sustentacion.

#### US-21 · Visualizador de gastos (`EP-04` · Prioridad: 21 · Valor: Bajo · 3 pts)
- **Como** administrador de la barberia,
- **Quiero** un visualizador de gastos por categoria y mes para identificar en que se va el dinero.
- **Criterios de aceptacion:**
  - Puedo registrar gastos (categoria, valor y fecha) y verlos agrupados por categoria y mes en graficos.
  - Los totales coinciden con los registros, verificado con datos conocidos.
  - Puedo filtrar por rango de fechas.

### Definition of Done (DoD) del Equipo (Entregable 2)

1. El codigo esta en una rama `feature/*` y se integra a `develop` mediante un Pull Request aprobado por al menos otro integrante (revision por pares).
2. El codigo ejecuta sin errores ni advertencias criticas, cumple PEP 8 y los commits tienen mensajes descriptivos.
3. Hay pruebas unitarias escritas y aprobadas para la logica nueva, con cobertura de ramas de al menos `90 %` en el motor financiero.
4. El pipeline de GitHub Actions esta en verde en el Pull Request y no quedan errores criticos ni bloqueantes abiertos.
5. La logica de dominio no depende de frameworks de persistencia ni de vistas (arquitectura hexagonal, seccion 8 del Acta); las entradas se validan y las excepciones se controlan.
6. La funcionalidad queda desplegada o ejecutable en el ambiente de pruebas (rama `develop`; CLI en Colab o VS Code, o aplicacion web de pruebas) sin fallos en el flujo principal.
7. Los criterios de aceptacion se verifican en una demostracion y el Product Owner acepta la historia en el Sprint Review.
8. La documentacion esta actualizada (README, docstrings y notas de uso) y, si se manejan datos personales, se cumple la Ley 1581 de 2012.
9. Todas las subtareas estan cerradas y la historia aparece como Done en Jira.

