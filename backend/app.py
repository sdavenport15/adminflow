import json
import logging
import os
import threading
from datetime import datetime, timedelta
from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor

import stripe
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from jose import JWTError, jwt
from passlib.context import CryptContext

from invoice_service import create_payment_link, generate_invoice_pdf
from email_service import (
    send_welcome_email,
    send_invoice_email,
    send_onboarding_email,
    send_invoice_reminder,
)

logger = logging.getLogger("adminflow")

# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="AdminFlow API", version="0.3.0")

# CORS: In production the frontend is served from the same origin, so this is
# only needed for local dev where frontend runs on :3000 and backend on :8000.
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth config ───────────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── PostgreSQL connection ─────────────────────────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL")  # set by Railway Postgres plugin
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")


def _get_conn():
    return psycopg2.connect(DATABASE_URL)


def _init_db():
    if not DATABASE_URL:
        logger.warning("DATABASE_URL not set — database features will be unavailable.")
        return
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                # Beta signups (existing)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS beta_signups (
                        id        SERIAL PRIMARY KEY,
                        name      TEXT NOT NULL,
                        email     TEXT NOT NULL UNIQUE,
                        signed_up TEXT NOT NULL
                    )
                """)

                # Users
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id              SERIAL PRIMARY KEY,
                        name            TEXT NOT NULL,
                        email           TEXT NOT NULL UNIQUE,
                        hashed_password TEXT NOT NULL,
                        plan            TEXT NOT NULL DEFAULT 'free',
                        created_at      TEXT NOT NULL
                    )
                """)

                # Clients
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS clients (
                        id         SERIAL PRIMARY KEY,
                        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        name       TEXT NOT NULL,
                        contact    TEXT,
                        email      TEXT,
                        status     TEXT NOT NULL DEFAULT 'Active',
                        notes      TEXT,
                        created_at TEXT NOT NULL
                    )
                """)

                # Invoices — create new schema or migrate old schema
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS invoices (
                        id           SERIAL PRIMARY KEY,
                        client_name  TEXT NOT NULL,
                        amount       REAL NOT NULL,
                        status       TEXT NOT NULL DEFAULT 'Pending',
                        notes        TEXT,
                        due_date     TEXT,
                        payment_url  TEXT,
                        created_at   TEXT NOT NULL
                    )
                """)
                # Migrate: add columns if they don't exist yet
                for col_sql in [
                    "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE",
                    "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_email TEXT",
                    # Rename legacy 'client' column to 'client_name' if still present
                    "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='client') THEN ALTER TABLE invoices RENAME COLUMN client TO client_name; END IF; END $$",
                ]:
                    cur.execute(col_sql)

                # Appointments
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS appointments (
                        id         SERIAL PRIMARY KEY,
                        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        title      TEXT NOT NULL,
                        client     TEXT,
                        day        INTEGER,
                        hour       INTEGER,
                        created_at TEXT NOT NULL
                    )
                """)

            conn.commit()

        # Seed demo account if it doesn't already exist
        _seed_demo_user()

    except Exception as exc:
        logger.error("DB init failed: %s", exc)


def _seed_demo_user():
    """Insert the demo account on startup if absent."""
    if not DATABASE_URL:
        return
    try:
        hashed = pwd_context.hash("demo1234")
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (name, email, hashed_password, plan, created_at)
                    VALUES (%s, %s, %s, 'free', %s)
                    ON CONFLICT (email) DO NOTHING
                    """,
                    ("Demo User", "demo@adminflow.app", hashed, datetime.now().isoformat()),
                )
            conn.commit()
    except Exception as exc:
        logger.error("Demo user seed failed: %s", exc)


_init_db()

_beta_signups_mem: list[dict] = []  # fallback when DB is absent

# ── Admin key ─────────────────────────────────────────────────────────────────

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "dev-secret-change-me")


def _require_admin(x_api_key: Optional[str] = Header(None)):
    if x_api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


# ── JWT helpers ───────────────────────────────────────────────────────────────

def _create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """FastAPI dependency — validates Bearer JWT and returns the user dict."""
    credentials_exc = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not authorization or not authorization.startswith("Bearer "):
        raise credentials_exc
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")

    try:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, name, email, plan FROM users WHERE id = %s",
                    (int(user_id),),
                )
                user = cur.fetchone()
        if user is None:
            raise credentials_exc
        return dict(user)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("get_current_user DB error: %s", exc)
        raise credentials_exc


# ── Pydantic models ───────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ClientCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class AppointmentCreate(BaseModel):
    title: str
    client: Optional[str] = None
    day: Optional[int] = None
    hour: Optional[int] = None

class InvoiceCreate(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    amount: float
    notes: Optional[str] = None
    due_date: Optional[str] = None

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[str] = None

class BetaSignup(BaseModel):
    name: str
    email: str

class EmailPayload(BaseModel):
    to: str
    subject: str
    body: str


# ── Health / root ─────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# ── Auth endpoints ────────────────────────────────────────────────────────────

@app.post("/api/auth/register", status_code=201)
def register(data: RegisterRequest):
    name = data.name.strip()
    email = data.email.strip().lower()
    if not name or not email or not data.password:
        raise HTTPException(status_code=422, detail="name, email, and password are required")

    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")

    hashed = pwd_context.hash(data.password)
    try:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO users (name, email, hashed_password, plan, created_at)
                    VALUES (%s, %s, %s, 'free', %s)
                    RETURNING id, name, email, plan
                    """,
                    (name, email, hashed, datetime.now().isoformat()),
                )
                user = dict(cur.fetchone())
            conn.commit()
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="Email already registered")
    except Exception as exc:
        logger.error("register error: %s", exc)
        raise HTTPException(status_code=500, detail="Registration failed")

    token = _create_access_token({"sub": user["id"]})
    return {"token": token, "user": user}


@app.post("/api/auth/login")
def login(data: LoginRequest):
    email = data.email.strip().lower()

    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")

    try:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, name, email, plan, hashed_password FROM users WHERE email = %s",
                    (email,),
                )
                row = cur.fetchone()
    except Exception as exc:
        logger.error("login DB error: %s", exc)
        raise HTTPException(status_code=500, detail="Login failed")

    if row is None or not pwd_context.verify(data.password, row["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = {"id": row["id"], "name": row["name"], "email": row["email"], "plan": row["plan"]}
    token = _create_access_token({"sub": row["id"]})
    return {"token": token, "user": user}


@app.get("/api/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}


# ── Clients ───────────────────────────────────────────────────────────────────

@app.get("/api/clients")
def list_clients(current_user: dict = Depends(get_current_user)):
    if not DATABASE_URL:
        logger.warning("DATABASE_URL not set — returning empty clients list")
        return {"clients": [], "count": 0}
    try:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM clients WHERE user_id = %s ORDER BY id DESC",
                    (current_user["id"],),
                )
                rows = [dict(r) for r in cur.fetchall()]
        return {"clients": rows, "count": len(rows)}
    except Exception as exc:
        logger.error("list_clients error: %s", exc)
        return {"clients": [], "count": 0}


@app.post("/api/clients", status_code=201)
def create_client(data: ClientCreate, current_user: dict = Depends(get_current_user)):
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO clients (user_id, name, contact, email, status, notes, created_at)
                    VALUES (%s, %s, %s, %s, 'Active', %s, %s)
                    RETURNING *
                    """,
                    (
                        current_user["id"],
                        data.name,
                        data.contact or data.name,
                        data.email or "",
                        data.notes or "",
                        datetime.now().isoformat(),
                    ),
                )
                client = dict(cur.fetchone())
            conn.commit()
        return {"message": "Client created", "client": client}
    except Exception as exc:
        logger.error("create_client error: %s", exc)
        raise HTTPException(status_code=500, detail="Could not create client")


@app.put("/api/clients/{client_id}")
def update_client(
    client_id: int,
    data: ClientUpdate,
    current_user: dict = Depends(get_current_user),
):
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id FROM clients WHERE id = %s AND user_id = %s",
                    (client_id, current_user["id"]),
                )
                if cur.fetchone() is None:
                    raise HTTPException(status_code=404, detail="Client not found")

                fields = {k: v for k, v in data.model_dump().items() if v is not None}
                if not fields:
                    raise HTTPException(status_code=422, detail="No fields to update")

                set_clause = ", ".join(f"{k} = %s" for k in fields)
                values = list(fields.values()) + [client_id, current_user["id"]]
                cur.execute(
                    f"UPDATE clients SET {set_clause} WHERE id = %s AND user_id = %s RETURNING *",
                    values,
                )
                client = dict(cur.fetchone())
            conn.commit()
        return {"message": "Client updated", "client": client}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("update_client error: %s", exc)
        raise HTTPException(status_code=500, detail="Could not update client")


@app.delete("/api/clients/{client_id}", status_code=204)
def delete_client(client_id: int, current_user: dict = Depends(get_current_user)):
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM clients WHERE id = %s AND user_id = %s",
                    (client_id, current_user["id"]),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Client not found")
            conn.commit()
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("delete_client error: %s", exc)
        raise HTTPException(status_code=500, detail="Could not delete client")


# ── Schedule ──────────────────────────────────────────────────────────────────

@app.get("/api/schedule")
def list_appointments(current_user: dict = Depends(get_current_user)):
    if not DATABASE_URL:
        logger.warning("DATABASE_URL not set — returning empty appointments list")
        return {"appointments": [], "count": 0}
    try:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM appointments WHERE user_id = %s ORDER BY day, hour",
                    (current_user["id"],),
                )
                rows = [dict(r) for r in cur.fetchall()]
        return {"appointments": rows, "count": len(rows)}
    except Exception as exc:
        logger.error("list_appointments error: %s", exc)
        return {"appointments": [], "count": 0}


@app.post("/api/schedule", status_code=201)
def create_appointment(data: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO appointments (user_id, title, client, day, hour, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        current_user["id"],
                        data.title,
                        data.client or "",
                        data.day,
                        data.hour,
                        datetime.now().isoformat(),
                    ),
                )
                appt = dict(cur.fetchone())
            conn.commit()
        return {"message": "Appointment scheduled", "appointment": appt}
    except Exception as exc:
        logger.error("create_appointment error: %s", exc)
        raise HTTPException(status_code=500, detail="Could not create appointment")


@app.delete("/api/schedule/{appointment_id}", status_code=204)
def delete_appointment(appointment_id: int, current_user: dict = Depends(get_current_user)):
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM appointments WHERE id = %s AND user_id = %s",
                    (appointment_id, current_user["id"]),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Appointment not found")
            conn.commit()
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("delete_appointment error: %s", exc)
        raise HTTPException(status_code=500, detail="Could not delete appointment")


# ── Invoices ──────────────────────────────────────────────────────────────────

@app.get("/api/invoices")
def list_invoices(current_user: dict = Depends(get_current_user)):
    if not DATABASE_URL:
        logger.warning("DATABASE_URL not set — returning empty invoices list")
        return {"invoices": [], "count": 0}
    try:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM invoices WHERE user_id = %s ORDER BY id DESC",
                    (current_user["id"],),
                )
                rows = [dict(r) for r in cur.fetchall()]
        return {"invoices": rows, "count": len(rows)}
    except Exception as exc:
        logger.error("list_invoices error: %s", exc)
        return {"invoices": [], "count": 0}


@app.post("/api/invoices", status_code=201)
def create_invoice(data: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO invoices
                        (user_id, client_name, client_email, amount, status, notes, due_date, created_at)
                    VALUES (%s, %s, %s, %s, 'Pending', %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        current_user["id"],
                        data.client_name,
                        data.client_email or "",
                        data.amount,
                        data.notes or "",
                        data.due_date or "",
                        datetime.now().isoformat(),
                    ),
                )
                invoice = dict(cur.fetchone())
            conn.commit()

        # Fire invoice email if client email is available
        if data.client_email:
            threading.Thread(
                target=send_invoice_email,
                args=(
                    data.client_email,
                    data.client_name,
                    invoice["id"],
                    data.amount,
                    data.due_date or "upon receipt",
                    data.notes or "",
                    "AdminFlow",
                ),
                daemon=True,
            ).start()

        return {"message": "Invoice created", "invoice": invoice}
    except Exception as exc:
        logger.error("create_invoice error: %s", exc)
        raise HTTPException(status_code=500, detail="Could not create invoice")


@app.put("/api/invoices/{invoice_id}")
def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    current_user: dict = Depends(get_current_user),
):
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id FROM invoices WHERE id = %s AND user_id = %s",
                    (invoice_id, current_user["id"]),
                )
                if cur.fetchone() is None:
                    raise HTTPException(status_code=404, detail="Invoice not found")

                fields = {k: v for k, v in data.model_dump().items() if v is not None}
                if not fields:
                    raise HTTPException(status_code=422, detail="No fields to update")

                set_clause = ", ".join(f"{k} = %s" for k in fields)
                values = list(fields.values()) + [invoice_id, current_user["id"]]
                cur.execute(
                    f"UPDATE invoices SET {set_clause} WHERE id = %s AND user_id = %s RETURNING *",
                    values,
                )
                invoice = dict(cur.fetchone())
            conn.commit()
        return {"message": "Invoice updated", "invoice": invoice}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("update_invoice error: %s", exc)
        raise HTTPException(status_code=500, detail="Could not update invoice")


@app.delete("/api/invoices/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: int, current_user: dict = Depends(get_current_user)):
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM invoices WHERE id = %s AND user_id = %s",
                    (invoice_id, current_user["id"]),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Invoice not found")
            conn.commit()
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("delete_invoice error: %s", exc)
        raise HTTPException(status_code=500, detail="Could not delete invoice")


def _get_invoice_db(invoice_id: int, user_id: int) -> dict:
    """Retrieve an invoice from DB by ID + user_id. Raises 404 if not found."""
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM invoices WHERE id = %s AND user_id = %s",
                    (invoice_id, user_id),
                )
                row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")
        return dict(row)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("_get_invoice_db error: %s", exc)
        raise HTTPException(status_code=500, detail="Could not fetch invoice")


@app.post("/api/invoices/{invoice_id}/pay-link")
def create_invoice_pay_link(
    invoice_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Generate a Stripe Payment Link for an invoice."""
    invoice = _get_invoice_db(invoice_id, current_user["id"])
    payment_url = create_payment_link(
        amount=invoice["amount"],
        description=invoice["notes"] or "Professional Services",
        client_email=invoice.get("client_email", ""),
        invoice_id=invoice_id,
    )
    if payment_url is None:
        raise HTTPException(status_code=503, detail="Stripe is not configured. Set STRIPE_SECRET_KEY.")
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE invoices SET payment_url = %s WHERE id = %s AND user_id = %s",
                    (payment_url, invoice_id, current_user["id"]),
                )
            conn.commit()
    except Exception as exc:
        logger.error("pay-link DB update error: %s", exc)
    return {"payment_url": payment_url}


@app.get("/api/invoices/{invoice_id}/pdf")
def get_invoice_pdf(
    invoice_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Generate and return a PDF for an invoice."""
    invoice = _get_invoice_db(invoice_id, current_user["id"])
    from_name = os.getenv("COMPANY_NAME", "AdminFlow")
    pdf_bytes = generate_invoice_pdf(
        invoice_id=invoice["id"],
        client_name=invoice["client_name"],
        amount=invoice["amount"],
        due_date=invoice.get("due_date", ""),
        notes=invoice.get("notes", ""),
        from_name=from_name,
        payment_url=invoice.get("payment_url"),
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice-{invoice_id}.pdf"},
    )


@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature")
    else:
        # No secret configured — parse without verification (dev/test only)
        event = json.loads(payload)

    if event.get("type") == "checkout.session.completed":
        session = event["data"]["object"]
        invoice_id_str = (session.get("metadata") or {}).get("invoice_id")
        if invoice_id_str:
            try:
                invoice_id = int(invoice_id_str)
                if DATABASE_URL:
                    with _get_conn() as conn:
                        with conn.cursor() as cur:
                            cur.execute(
                                "UPDATE invoices SET status = 'Paid' WHERE id = %s",
                                (invoice_id,),
                            )
                        conn.commit()
            except (ValueError, TypeError, Exception) as exc:
                logger.error("stripe_webhook update error: %s", exc)

    return {"received": True}


@app.post("/api/invoices/{invoice_id}/remind")
def remind_invoice(invoice_id: int, current_user: dict = Depends(get_current_user)):
    """Send a payment reminder to the client for the given invoice."""
    invoice = _get_invoice_db(invoice_id, current_user["id"])

    client_email = invoice.get("client_email")
    if not client_email:
        raise HTTPException(status_code=422, detail="No email address on file for this client")

    threading.Thread(
        target=send_invoice_reminder,
        args=(
            client_email,
            invoice["client_name"],
            invoice_id,
            invoice["amount"],
            invoice.get("due_date") or "upon receipt",
            "AdminFlow",
        ),
        daemon=True,
    ).start()

    return {"message": "Reminder queued", "invoice_id": invoice_id, "to": client_email}

# ── Onboarding ────────────────────────────────────────────────────────────────

@app.post("/api/onboard/{client_id}")
def onboard_client(client_id: int, current_user: dict = Depends(get_current_user)):
    client = None
    if DATABASE_URL:
        try:
            with _get_conn() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "SELECT * FROM clients WHERE id = %s AND user_id = %s",
                        (client_id, current_user["id"]),
                    )
                    row = cur.fetchone()
                    client = dict(row) if row else None
        except Exception as exc:
            logger.error("onboard_client DB error: %s", exc)

    if client and client.get("email"):
        threading.Thread(
            target=send_onboarding_email,
            args=(client["email"], client["name"]),
            daemon=True,
        ).start()

    return {
        "client_id": client_id,
        "status": "triggered",
        "message": "Onboarding sequence queued",
    }

# ── Email ─────────────────────────────────────────────────────────────────────

@app.post("/api/send-email")
def send_email(data: EmailPayload, current_user: dict = Depends(get_current_user)):
    print(f"[EMAIL] To: {data.to} | Subject: {data.subject}")
    return {"message": "Email queued", "status": "queued", "to": data.to}

# ── Beta signup ───────────────────────────────────────────────────────────────

@app.post("/api/beta-signup")
def beta_signup(data: BetaSignup):
    name = data.name.strip()
    email = data.email.strip().lower()
    if not name or not email:
        raise HTTPException(status_code=422, detail="Name and email are required")

    if DATABASE_URL:
        try:
            with _get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO beta_signups (name, email, signed_up) VALUES (%s, %s, %s)",
                        (name, email, datetime.now().isoformat()),
                    )
                conn.commit()
        except psycopg2.errors.UniqueViolation:
            pass  # already signed up, treat as success
        except Exception as exc:
            logger.error("beta_signup DB error: %s", exc)
    else:
        if not any(s["email"] == email for s in _beta_signups_mem):
            _beta_signups_mem.append({"name": name, "email": email, "signed_up": datetime.now().isoformat()})

    # Fire welcome email in background (non-blocking)
    threading.Thread(
        target=send_welcome_email,
        args=(email, name),
        daemon=True,
    ).start()

    return {"success": True, "message": "You're on the list!"}


@app.get("/api/beta-signups")
def list_beta_signups(x_api_key: Optional[str] = Header(None)):
    """Admin-only endpoint. Pass X-Api-Key header matching ADMIN_API_KEY env var."""
    _require_admin(x_api_key)
    if DATABASE_URL:
        try:
            with _get_conn() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT id, name, email, signed_up FROM beta_signups ORDER BY id DESC")
                    rows = cur.fetchall()
            return {"count": len(rows), "signups": [dict(r) for r in rows]}
        except Exception as exc:
            logger.error("list_beta_signups error: %s", exc)
            return {"count": 0, "signups": []}
    else:
        return {"count": len(_beta_signups_mem), "signups": list(reversed(_beta_signups_mem))}

# ── Static frontend (production) ──────────────────────────────────────────────
# In production the Dockerfile runs `npm run build` and places dist/ next to
# this file. The block below serves the SPA; comment it out for local dev.

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/", include_in_schema=False)
    def serve_root():
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index)

# ── Dev entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
