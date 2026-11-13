import hashlib
import json
import os
import sqlite3
from typing import List, Dict, Any, Optional
from app.domain.exceptions import DomainError
from app.ports.repositories import BarberShopRepositoryPort


DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "urban_style.db",
)
DEFAULT_SQL_DUMP_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "base_de_datos_legible.sql",
)


def hash_password(raw_password: str) -> str:
    return hashlib.sha256(raw_password.strip().encode("utf-8")).hexdigest()


class SQLiteBarberShopRepository(BarberShopRepositoryPort):
    def __init__(self, db_path: str = DEFAULT_DB_PATH) -> None:
        self.db_path = db_path
        self._init_database()
        self._export_readable_sql()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _export_readable_sql(self) -> None:
        try:
            with self._get_connection() as conn:
                lines = [
                    "-- ============================================================================",
                    "-- VISTA LEGIBLE DE LA BASE DE DATOS SQLITE (urban_style.db)",
                    "-- Este archivo se actualiza automaticamente para poder ver las tablas en texto",
                    "-- ============================================================================\n",
                ]
                for line in conn.iterdump():
                    lines.append(line)
                with open(DEFAULT_SQL_DUMP_PATH, "w", encoding="utf-8") as f:
                    f.write("\n".join(lines) + "\n")
        except Exception:
            pass

    def _init_database(self) -> None:
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS services (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL CHECK(category IN ('BASE', 'ADDON')),
                    price_cop INTEGER NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    description TEXT DEFAULT ''
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS barbers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    specialty TEXT NOT NULL,
                    status_label TEXT NOT NULL,
                    commission_pct REAL NOT NULL,
                    next_free_slot TEXT NOT NULL,
                    username TEXT DEFAULT ''
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS bookings (
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
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS shop_settings (
                    key TEXT PRIMARY KEY,
                    value_json TEXT NOT NULL
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    username TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    barber_id TEXT DEFAULT '',
                    phone TEXT DEFAULT '',
                    password_hash TEXT NOT NULL,
                    is_seed INTEGER DEFAULT 0
                )
                """
            )

            cur.execute("SELECT COUNT(*) AS cnt FROM services")
            if cur.fetchone()["cnt"] == 0:
                cur.executemany(
                    "INSERT INTO services (id, name, category, price_cop, duration_minutes, description) VALUES (?, ?, ?, ?, ?, ?)",
                    [
                        ("srv-corte-signature", "Corte Degradado (Fade)", "BASE", 35000, 35, "Degradado con maquina y navaja, lavado y peinado"),
                        ("srv-corte-ejecutivo", "Corte Clasico", "BASE", 30000, 30, "Corte tradicional a tijera o maquina y acabado natural"),
                        ("srv-ritual-imperial", "Corte y Barba Completa", "BASE", 48000, 50, "Corte completo mas arreglo de barba con toalla caliente"),
                        ("srv-corte-kids", "Corte Infantil", "BASE", 25000, 25, "Corte para ninos hasta los 12 anos"),
                        ("add-barba", "Arreglo de Barba", "ADDON", 15000, 20, "Perfilado con navaja, toalla caliente y balsamo"),
                        ("add-cejas", "Limpieza de Cejas", "ADDON", 8000, 10, "Perfilado limpio con navaja"),
                        ("add-mascarilla", "Mascarilla Facial", "ADDON", 12000, 15, "Limpieza de puntos negros e hidratacion"),
                        ("add-pigmentacion", "Sombreado de Barba", "ADDON", 14000, 15, "Definicion natural de linea de barba y contornos"),
                    ],
                )

            cur.execute("SELECT COUNT(*) AS cnt FROM barbers")
            if cur.fetchone()["cnt"] == 0:
                cur.executemany(
                    "INSERT INTO barbers (id, name, specialty, status_label, commission_pct, next_free_slot, username) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [
                        ("barber-mateo", "Mateo Restrepo", "Degradados y Diseno", "Disponible hoy", 0.55, "12:30", "mateo"),
                        ("barber-santiago", "Santiago Cano", "Corte Clasico y Barba", "Disponible hoy", 0.50, "10:30", "santiago"),
                        ("barber-alejandro", "Alejandro Mejia", "Tijera y Estilo Clasico", "Disponible 11:30", 0.50, "11:30", "alejandro"),
                    ],
                )

            cur.execute("SELECT COUNT(*) AS cnt FROM bookings")
            if cur.fetchone()["cnt"] == 0:
                cur.executemany(
                    """
                    INSERT INTO bookings (
                        id, client_name, client_phone, client_username, barber_id, barber_name,
                        base_service_id, base_service_name, addon_ids_json, addon_names_json,
                        date, start_time, end_time, duration_minutes, total_cop,
                        payment_method, status, hours_until
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    [
                        ("bk-1001", "Camilo Echeverri", "3004128890", "camilo", "barber-mateo", "Mateo Restrepo", "srv-corte-signature", "Corte Degradado (Fade)", json.dumps(["add-barba", "add-cejas"]), json.dumps(["Arreglo de Barba", "Limpieza de Cejas"]), "2026-11-11", "10:00", "11:05", 65, 58000, "NEQUI", "EN_SILLA", 0.0),
                        ("bk-1002", "Juan Pablo Montoya", "3116549012", "cliente", "barber-mateo", "Mateo Restrepo", "srv-corte-signature", "Corte Degradado (Fade)", json.dumps(["add-barba"]), json.dumps(["Arreglo de Barba"]), "2026-11-11", "11:30", "12:25", 55, 50000, "EFECTIVO", "CONFIRMADA", 6.0),
                        ("bk-1003", "Sebastian Gomez", "3147892211", "sebastian", "barber-santiago", "Santiago Cano", "srv-ritual-imperial", "Corte y Barba Completa", json.dumps(["add-mascarilla"]), json.dumps(["Mascarilla Facial"]), "2026-11-11", "09:00", "10:05", 65, 60000, "BANCOLOMBIA", "COMPLETADA", 0.0),
                        ("bk-1004", "Andres Felipe Rios", "3209914450", "andres", "barber-mateo", "Mateo Restrepo", "srv-corte-ejecutivo", "Corte Clasico", json.dumps([]), json.dumps([]), "2026-11-11", "08:30", "09:00", 30, 30000, "EFECTIVO", "COMPLETADA", 0.0),
                        ("bk-1005", "Daniel Quintero", "3015523389", "daniel", "barber-alejandro", "Alejandro Mejia", "srv-corte-signature", "Corte Degradado (Fade)", json.dumps(["add-cejas", "add-pigmentacion"]), json.dumps(["Limpieza de Cejas", "Sombreado de Barba"]), "2026-11-11", "14:00", "15:00", 60, 57000, "DAVIPLATA", "CONFIRMADA", 8.0),
                    ],
                )

            cur.execute("SELECT COUNT(*) AS cnt FROM shop_settings")
            if cur.fetchone()["cnt"] == 0:
                baseline = {
                    "monthly_revenue_accumulated": 14850000,
                    "fixed_costs": {
                        "arriendo_local_poblado": 4800000,
                        "servicios_epm_fibra": 1150000,
                        "insumos_cuchillas_tonicos": 1650000,
                        "nomina_base_seguridad_social": 4200000,
                    },
                }
                cur.execute(
                    "INSERT INTO shop_settings (key, value_json) VALUES (?, ?)",
                    ("financial_baseline", json.dumps(baseline)),
                )

            cur.execute("SELECT COUNT(*) AS cnt FROM users")
            if cur.fetchone()["cnt"] == 0:
                cur.executemany(
                    "INSERT INTO users (username, name, role, barber_id, phone, password_hash, is_seed) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [
                        ("admin", "Darwin Salgado (Administrador)", "ADMIN", "", "3000000001", hash_password("admin123"), 1),
                        ("mateo", "Mateo Restrepo", "BARBERO", "barber-mateo", "3004128890", hash_password("barbero123"), 1),
                        ("santiago", "Santiago Cano", "BARBERO", "barber-santiago", "3147892211", hash_password("barbero123"), 1),
                        ("alejandro", "Alejandro Mejia", "BARBERO", "barber-alejandro", "3015523389", hash_password("barbero123"), 1),
                        ("cliente", "Juan Pablo Montoya", "CLIENTE", "", "3116549012", hash_password("cliente123"), 1),
                    ],
                )
            conn.commit()

    def can_register_admin(self) -> bool:
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS cnt FROM users WHERE role = 'ADMIN' AND is_seed = 0"
            ).fetchone()
            total_admins = conn.execute(
                "SELECT COUNT(*) AS cnt FROM users WHERE role = 'ADMIN'"
            ).fetchone()["cnt"]
            if total_admins == 0:
                return True
            return row["cnt"] == 0

    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        clean_user = username.strip().lower().split("@")[0]
        pwd_hash = hash_password(password)
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT username, name, role, barber_id, phone FROM users WHERE username = ? AND password_hash = ?",
                (clean_user, pwd_hash),
            ).fetchone()
            return dict(row) if row else None

    def register_user(self, username: str, name: str, password: str, role: str = "CLIENTE", phone: str = "") -> Dict[str, Any]:
        clean_user = username.strip().lower().split("@")[0]
        norm_role = role.strip().upper()
        if norm_role not in ("CLIENTE", "ADMIN"):
            raise DomainError("El registro de cuentas solo esta habilitado para Clientes y Administrador.")

        with self._get_connection() as conn:
            existing = conn.execute(
                "SELECT username FROM users WHERE username = ?",
                (clean_user,),
            ).fetchone()

            if norm_role == "ADMIN":
                if not self.can_register_admin():
                    raise DomainError(
                        "Ya se creo la cuenta unica de Administrador. No es posible registrar otra a menos que la actual sea eliminada."
                    )
                conn.execute("DELETE FROM users WHERE role = 'ADMIN'")
            elif existing:
                raise DomainError("El nombre de usuario ya esta en uso. Elige otro distinto.")

            conn.execute(
                """
                INSERT INTO users (username, name, role, barber_id, phone, password_hash, is_seed)
                VALUES (?, ?, ?, '', ?, ?, 0)
                """,
                (clean_user, name.strip(), norm_role, phone.strip(), hash_password(password)),
            )
            conn.commit()
        return {
            "username": clean_user,
            "name": name.strip(),
            "role": norm_role,
            "barber_id": "",
            "phone": phone.strip(),
        }

    def delete_admin_account(self, username: str) -> bool:
        clean_user = username.strip().lower()
        with self._get_connection() as conn:
            cur = conn.execute(
                "DELETE FROM users WHERE role = 'ADMIN' AND (username = ? OR role = 'ADMIN')",
                (clean_user,),
            )
            conn.commit()
            return cur.rowcount > 0

    def list_services(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            rows = conn.execute("SELECT * FROM services ORDER BY category DESC, price_cop ASC").fetchall()
            return [dict(r) for r in rows]

    def upsert_service(self, service_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO services (id, name, category, price_cop, duration_minutes, description)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    category = excluded.category,
                    price_cop = excluded.price_cop,
                    duration_minutes = excluded.duration_minutes,
                    description = excluded.description
                """,
                (
                    service_data["id"],
                    service_data["name"],
                    service_data["category"],
                    int(service_data["price_cop"]),
                    int(service_data["duration_minutes"]),
                    service_data.get("description", ""),
                ),
            )
            conn.commit()
        return service_data

    def delete_service(self, service_id: str) -> bool:
        with self._get_connection() as conn:
            cur = conn.execute("DELETE FROM services WHERE id = ?", (service_id,))
            conn.commit()
            return cur.rowcount > 0

    def list_barbers(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            rows = conn.execute("SELECT * FROM barbers").fetchall()
            return [dict(r) for r in rows]

    def upsert_barber(self, barber_data: Dict[str, Any]) -> Dict[str, Any]:
        barber_id = str(barber_data["id"]).strip()
        name = str(barber_data["name"]).strip()
        specialty = str(barber_data.get("specialty", "Corte y Barba")).strip()
        status_label = str(barber_data.get("status_label", "Disponible hoy")).strip()
        commission_pct = float(barber_data.get("commission_pct", 0.50))
        next_free_slot = str(barber_data.get("next_free_slot", "09:00")).strip()
        username = str(barber_data.get("username", "")).strip().lower()
        raw_password = str(barber_data.get("password", "")).strip()

        if not username:
            username = name.lower().split()[0]

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO barbers (id, name, specialty, status_label, commission_pct, next_free_slot, username)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    specialty = excluded.specialty,
                    status_label = excluded.status_label,
                    commission_pct = excluded.commission_pct,
                    next_free_slot = excluded.next_free_slot,
                    username = excluded.username
                """,
                (barber_id, name, specialty, status_label, commission_pct, next_free_slot, username),
            )
            existing_user = conn.execute(
                "SELECT username, password_hash FROM users WHERE barber_id = ? OR username = ?",
                (barber_id, username),
            ).fetchone()
            pwd_hash = hash_password(raw_password) if raw_password else (existing_user["password_hash"] if existing_user else hash_password("barbero123"))
            conn.execute("DELETE FROM users WHERE barber_id = ? AND username != ?", (barber_id, username))
            conn.execute(
                """
                INSERT INTO users (username, name, role, barber_id, phone, password_hash, is_seed)
                VALUES (?, ?, 'BARBERO', ?, '', ?, 0)
                ON CONFLICT(username) DO UPDATE SET
                    name = excluded.name,
                    role = 'BARBERO',
                    barber_id = excluded.barber_id,
                    password_hash = excluded.password_hash
                """,
                (username, name, barber_id, pwd_hash),
            )
            conn.commit()
        return {
            "id": barber_id,
            "name": name,
            "specialty": specialty,
            "status_label": status_label,
            "commission_pct": commission_pct,
            "next_free_slot": next_free_slot,
            "username": username,
        }

    def delete_barber(self, barber_id: str) -> bool:
        with self._get_connection() as conn:
            conn.execute("DELETE FROM users WHERE barber_id = ?", (barber_id,))
            cur = conn.execute("DELETE FROM barbers WHERE id = ?", (barber_id,))
            conn.commit()
            return cur.rowcount > 0

    def list_bookings(self, date_str: Optional[str] = None, phone: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT * FROM bookings WHERE 1=1"
        params: List[Any] = []
        if date_str:
            query += " AND date = ?"
            params.append(date_str)
        if phone:
            query += " AND client_phone = ?"
            params.append(phone.strip())
        query += " ORDER BY start_time ASC"

        with self._get_connection() as conn:
            rows = conn.execute(query, params).fetchall()
            results = []
            for r in rows:
                d = dict(r)
                d["addon_ids"] = json.loads(d.pop("addon_ids_json", "[]"))
                d["addon_names"] = json.loads(d.pop("addon_names_json", "[]"))
                results.append(d)
            return results

    def create_booking(self, booking_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO bookings (
                    id, client_name, client_phone, client_username, barber_id, barber_name,
                    base_service_id, base_service_name, addon_ids_json, addon_names_json,
                    date, start_time, end_time, duration_minutes, total_cop,
                    payment_method, status, hours_until
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    booking_data["id"],
                    booking_data["client_name"],
                    booking_data["client_phone"],
                    booking_data.get("client_username", ""),
                    booking_data["barber_id"],
                    booking_data["barber_name"],
                    booking_data["base_service_id"],
                    booking_data["base_service_name"],
                    json.dumps(booking_data.get("addon_ids", [])),
                    json.dumps(booking_data.get("addon_names", [])),
                    booking_data["date"],
                    booking_data["start_time"],
                    booking_data["end_time"],
                    int(booking_data["duration_minutes"]),
                    int(booking_data["total_cop"]),
                    booking_data.get("payment_method", "EFECTIVO"),
                    booking_data.get("status", "CONFIRMADA"),
                    float(booking_data.get("hours_until", 24.0)),
                ),
            )
            conn.commit()
        return booking_data

    def update_booking_status(self, booking_id: str, new_status: str, start_time: Optional[str] = None, end_time: Optional[str] = None) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            if start_time and end_time:
                conn.execute(
                    "UPDATE bookings SET status = ?, start_time = ?, end_time = ? WHERE id = ?",
                    (new_status, start_time, end_time, booking_id),
                )
            else:
                conn.execute(
                    "UPDATE bookings SET status = ? WHERE id = ?",
                    (new_status, booking_id),
                )
            conn.commit()
            row = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
            if not row:
                return None
            d = dict(row)
            d["addon_ids"] = json.loads(d.pop("addon_ids_json", "[]"))
            d["addon_names"] = json.loads(d.pop("addon_names_json", "[]"))
            return d

    def get_financial_baseline(self) -> Dict[str, Any]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT value_json FROM shop_settings WHERE key = 'financial_baseline'").fetchone()
            if not row:
                return {"monthly_revenue_accumulated": 14850000, "fixed_costs": {}}
            return json.loads(row["value_json"])

    def update_financial_baseline(self, baseline: Dict[str, Any]) -> Dict[str, Any]:
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO shop_settings (key, value_json) VALUES ('financial_baseline', ?)
                ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json
                """,
                (json.dumps(baseline),),
            )
            conn.commit()
        return baseline
