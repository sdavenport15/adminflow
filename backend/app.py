import os
import threading
from datetime import datetime
from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor

import uvicorn
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr

# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="AdminFlow API", version="0.2.0")

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

# ── In-memory stores (replace with DB in production) ─────────────────────────

_clients: list[dict] = []
_clients_lock = threading.Lock()

# ── PostgreSQL for beta signups (persists across Railway deploys) ─────────────

DATABASE_URL = os.getenv("DATABASE_URL")  # set by Railway Postgres plugin

def _get_conn():
    return psycopg2.connect(DATABASE_URL)

def _init_db():
    if not DATABASE_URL:
        return  # skip in local dev without Postgres
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS beta_signups (
                    id        SERIAL PRIMARY KEY,
                    name      TEXT NOT NULL,
                    email     TEXT NOT NULL UNIQUE,
                    signed_up TEXT NOT NULL
                )
            """)
        conn.commit()

_init_db()

_beta_signups_mem: list[dict] = []  # fallback for local dev

# ── Admin key ─────────────────────────────────────────────────────────────────

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "dev-secret-change-me")

def _require_admin(x_api_key: Optional[str] = Header(None)):
    if x_api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

# ── Pydantic models ───────────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    email: Optional[str] = None

class AppointmentCreate(BaseModel):
    title: str
    client: Optional[str] = None
    day: Optional[int] = None
    hour: Optional[int] = None

class InvoiceCreate(BaseModel):
    client: str
    amount: float
    notes: Optional[str] = None

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

# ── Clients ───────────────────────────────────────────────────────────────────

@app.get("/api/clients")
def list_clients():
    with _clients_lock:
        return {"clients": list(_clients), "count": len(_clients)}

@app.post("/api/clients", status_code=201)
def create_client(data: ClientCreate):
    with _clients_lock:
        new_id = len(_clients) + 1
        client = {
            "id": new_id,
            "name": data.name,
            "contact": data.contact or data.name,
            "email": data.email or "",
            "status": "Active",
            "created_at": datetime.now().isoformat(),
        }
        _clients.append(client)
        return {"message": "Client created", "client": client}

# ── Schedule ──────────────────────────────────────────────────────────────────

@app.post("/api/schedule", status_code=201)
def create_appointment(data: AppointmentCreate):
    return {
        "message": "Appointment scheduled",
        "appointment": {
            "id": int(datetime.now().timestamp()),
            "title": data.title,
            "client": data.client,
            "day": data.day,
            "hour": data.hour,
        },
    }

# ── Invoices ──────────────────────────────────────────────────────────────────

@app.post("/api/invoices", status_code=201)
def create_invoice(data: InvoiceCreate):
    return {
        "message": "Invoice created",
        "invoice": {
            "id": int(datetime.now().timestamp()),
            "client": data.client,
            "amount": data.amount,
            "status": "Pending",
            "created_at": datetime.now().isoformat(),
        },
    }

# ── Onboarding ────────────────────────────────────────────────────────────────

@app.post("/api/onboard/{client_id}")
def onboard_client(client_id: int):
    # TODO: trigger email workflow via SendGrid / Resend
    return {
        "client_id": client_id,
        "status": "triggered",
        "message": "Onboarding sequence queued",
    }

# ── Email (stub) ──────────────────────────────────────────────────────────────

@app.post("/api/send-email")
def send_email(data: EmailPayload):
    # TODO: integrate SendGrid / Resend
    print(f"[EMAIL STUB] To: {data.to} | Subject: {data.subject}")
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
    else:
        if not any(s["email"] == email for s in _beta_signups_mem):
            _beta_signups_mem.append({"name": name, "email": email, "signed_up": datetime.now().isoformat()})

    return {"success": True, "message": "You're on the list!"}


@app.get("/api/beta-signups")
def list_beta_signups(x_api_key: Optional[str] = Header(None)):
    """Admin-only endpoint. Pass X-Api-Key header matching ADMIN_API_KEY env var."""
    _require_admin(x_api_key)
    if DATABASE_URL:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id, name, email, signed_up FROM beta_signups ORDER BY id DESC")
                rows = cur.fetchall()
        return {"count": len(rows), "signups": [dict(r) for r in rows]}
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
