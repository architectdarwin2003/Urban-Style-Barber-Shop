-- ============================================================================
-- VISTA LEGIBLE DE LA BASE DE DATOS SQLITE (urban_style.db)
-- Este archivo se actualiza automaticamente para poder ver las tablas en texto
-- ============================================================================

BEGIN TRANSACTION;
CREATE TABLE barbers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    specialty TEXT NOT NULL,
                    status_label TEXT NOT NULL,
                    commission_pct REAL NOT NULL,
                    next_free_slot TEXT NOT NULL,
                    username TEXT DEFAULT ''
                );
INSERT INTO "barbers" VALUES('barber-mateo','Mateo Restrepo','Degradados y Diseno','Disponible hoy',0.55,'12:30','mateo');
INSERT INTO "barbers" VALUES('barber-santiago','Santiago Cano','Corte Clasico y Barba','Disponible hoy',0.5,'10:30','santiago');
INSERT INTO "barbers" VALUES('barber-alejandro','Alejandro Mejia','Tijera y Estilo Clasico','Disponible 11:30',0.5,'11:30','alejandro');
CREATE TABLE bookings (
                    id TEXT PRIMARY KEY,
                    client_name TEXT NOT NULL,
                    client_phone TEXT NOT NULL,
                    client_username TEXT DEFAULT '',
                    barber_id TEXT NOT NULL,
                    barber_name TEXT NOT NULL,
                    base_service_id TEXT NOT NULL,
                    base_service_name TEXT NOT NULL,
                    addon_ids_json TEXT NOT NULL,
                    addon_names_json TEXT NOT NULL,
                    date TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    total_cop INTEGER NOT NULL,
                    payment_method TEXT NOT NULL,
                    status TEXT NOT NULL,
                    hours_until REAL DEFAULT 24.0
                );
INSERT INTO "bookings" VALUES('bk-1001','Camilo Echeverri','3004128890','camilo','barber-mateo','Mateo Restrepo','srv-corte-signature','Corte Degradado (Fade)','["add-barba", "add-cejas"]','["Arreglo de Barba", "Limpieza de Cejas"]','2026-11-11','10:00','11:05',65,58000,'NEQUI','EN_SILLA',0.0);
INSERT INTO "bookings" VALUES('bk-1002','Juan Pablo Montoya','3116549012','cliente','barber-mateo','Mateo Restrepo','srv-corte-signature','Corte Degradado (Fade)','["add-barba"]','["Arreglo de Barba"]','2026-11-11','11:30','12:25',55,50000,'EFECTIVO','CONFIRMADA',6.0);
INSERT INTO "bookings" VALUES('bk-1003','Sebastian Gomez','3147892211','sebastian','barber-santiago','Santiago Cano','srv-ritual-imperial','Corte y Barba Completa','["add-mascarilla"]','["Mascarilla Facial"]','2026-11-11','09:00','10:05',65,60000,'BANCOLOMBIA','COMPLETADA',0.0);
INSERT INTO "bookings" VALUES('bk-1004','Andres Felipe Rios','3209914450','andres','barber-mateo','Mateo Restrepo','srv-corte-ejecutivo','Corte Clasico','[]','[]','2026-11-11','08:30','09:00',30,30000,'EFECTIVO','COMPLETADA',0.0);
INSERT INTO "bookings" VALUES('bk-1005','Daniel Quintero','3015523389','daniel','barber-alejandro','Alejandro Mejia','srv-corte-signature','Corte Degradado (Fade)','["add-cejas", "add-pigmentacion"]','["Limpieza de Cejas", "Sombreado de Barba"]','2026-11-11','14:00','15:00',60,57000,'DAVIPLATA','CONFIRMADA',8.0);
CREATE TABLE services (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL CHECK(category IN ('BASE', 'ADDON')),
                    price_cop INTEGER NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    description TEXT DEFAULT ''
                );
INSERT INTO "services" VALUES('srv-corte-signature','Corte Degradado (Fade)','BASE',35000,35,'Degradado con maquina y navaja, lavado y peinado');
INSERT INTO "services" VALUES('srv-corte-ejecutivo','Corte Clasico','BASE',30000,30,'Corte tradicional a tijera o maquina y acabado natural');
INSERT INTO "services" VALUES('srv-ritual-imperial','Corte y Barba Completa','BASE',48000,50,'Corte completo mas arreglo de barba con toalla caliente');
INSERT INTO "services" VALUES('srv-corte-kids','Corte Infantil','BASE',25000,25,'Corte para ninos hasta los 12 anos');
INSERT INTO "services" VALUES('add-barba','Arreglo de Barba','ADDON',15000,20,'Perfilado con navaja, toalla caliente y balsamo');
INSERT INTO "services" VALUES('add-cejas','Limpieza de Cejas','ADDON',8000,10,'Perfilado limpio con navaja');
INSERT INTO "services" VALUES('add-mascarilla','Mascarilla Facial','ADDON',12000,15,'Limpieza de puntos negros e hidratacion');
INSERT INTO "services" VALUES('add-pigmentacion','Sombreado de Barba','ADDON',14000,15,'Definicion natural de linea de barba y contornos');
CREATE TABLE shop_settings (
                    key TEXT PRIMARY KEY,
                    value_json TEXT NOT NULL
                );
INSERT INTO "shop_settings" VALUES('financial_baseline','{"monthly_revenue_accumulated": 14850000, "fixed_costs": {"arriendo_local_poblado": 4800000, "servicios_epm_fibra": 1150000, "insumos_cuchillas_tonicos": 1650000, "nomina_base_seguridad_social": 4200000}}');
CREATE TABLE users (
                    username TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    barber_id TEXT DEFAULT '',
                    phone TEXT DEFAULT '',
                    password_hash TEXT NOT NULL,
                    is_seed INTEGER DEFAULT 0
                );
INSERT INTO "users" VALUES('admin','Darwin Salgado (Administrador)','ADMIN','','3000000001','240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',1);
INSERT INTO "users" VALUES('mateo','Mateo Restrepo','BARBERO','barber-mateo','3004128890','dd5b9f55350bf6b19a25746eb6534fd3022406e8dc297e96951ebd2c35e3a545',1);
INSERT INTO "users" VALUES('santiago','Santiago Cano','BARBERO','barber-santiago','3147892211','dd5b9f55350bf6b19a25746eb6534fd3022406e8dc297e96951ebd2c35e3a545',1);
INSERT INTO "users" VALUES('alejandro','Alejandro Mejia','BARBERO','barber-alejandro','3015523389','dd5b9f55350bf6b19a25746eb6534fd3022406e8dc297e96951ebd2c35e3a545',1);
INSERT INTO "users" VALUES('cliente','Juan Pablo Montoya','CLIENTE','','3116549012','09a31a7001e261ab1e056182a71d3cf57f582ca9a29cff5eb83be0f0549730a9',1);
COMMIT;
