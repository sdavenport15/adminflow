import os
from datetime import datetime, timedelta, timezone

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
APP_URL = os.getenv("APP_URL", "https://adminflow-production.up.railway.app")
REDIRECT_URI = f"{APP_URL}/api/google-calendar/callback"

SCOPES = ["https://www.googleapis.com/auth/calendar"]

CLIENT_CONFIG = {
    "web": {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [REDIRECT_URI],
    }
}


def get_auth_url(state: str) -> str:
    """Return the Google OAuth authorization URL."""
    flow = Flow.from_client_config(CLIENT_CONFIG, scopes=SCOPES, state=state)
    flow.redirect_uri = REDIRECT_URI
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url


def exchange_code(code: str) -> dict:
    """Exchange an auth code for access + refresh tokens."""
    flow = Flow.from_client_config(CLIENT_CONFIG, scopes=SCOPES)
    flow.redirect_uri = REDIRECT_URI
    flow.fetch_token(code=code)
    creds = flow.credentials
    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_expiry": creds.expiry.isoformat() if creds.expiry else None,
    }


def _build_service(access_token: str, refresh_token: str, token_expiry: str):
    """Build an authenticated Google Calendar API service."""
    expiry = None
    if token_expiry:
        try:
            expiry = datetime.fromisoformat(token_expiry)
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
        except ValueError:
            pass

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
        expiry=expiry,
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())

    return build("calendar", "v3", credentials=creds), creds


def push_appointment(access_token: str, refresh_token: str, token_expiry: str, appointment: dict) -> tuple[str | None, dict]:
    """
    Create a Google Calendar event for an appointment.
    Returns (google_event_id, updated_tokens).
    """
    service, creds = _build_service(access_token, refresh_token, token_expiry)

    # Build a datetime from day (0=Mon) + hour
    today = datetime.now(timezone.utc)
    days_ahead = appointment.get("day", 0) - today.weekday()
    if days_ahead < 0:
        days_ahead += 7
    event_date = today + timedelta(days=days_ahead)
    hour = appointment.get("hour", 9)

    start_dt = event_date.replace(hour=hour, minute=0, second=0, microsecond=0)
    end_dt = start_dt + timedelta(hours=1)

    event_body = {
        "summary": appointment.get("title", "Appointment"),
        "description": f"Client: {appointment.get('client', '')}" if appointment.get("client") else "",
        "start": {"dateTime": start_dt.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": "UTC"},
    }

    event = service.events().insert(calendarId="primary", body=event_body).execute()

    updated_tokens = {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token or refresh_token,
        "token_expiry": creds.expiry.isoformat() if creds.expiry else token_expiry,
    }
    return event.get("id"), updated_tokens


def delete_appointment(access_token: str, refresh_token: str, token_expiry: str, google_event_id: str) -> dict:
    """Delete a Google Calendar event. Returns updated tokens."""
    service, creds = _build_service(access_token, refresh_token, token_expiry)
    try:
        service.events().delete(calendarId="primary", eventId=google_event_id).execute()
    except HttpError as e:
        if e.status_code != 410:  # 410 = already deleted, ignore
            raise
    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token or refresh_token,
        "token_expiry": creds.expiry.isoformat() if creds.expiry else token_expiry,
    }


def list_upcoming_events(access_token: str, refresh_token: str, token_expiry: str, max_results: int = 20) -> list[dict]:
    """Fetch upcoming events from the user's primary Google Calendar."""
    service, _ = _build_service(access_token, refresh_token, token_expiry)
    now = datetime.now(timezone.utc).isoformat()
    result = service.events().list(
        calendarId="primary",
        timeMin=now,
        maxResults=max_results,
        singleEvents=True,
        orderBy="startTime",
    ).execute()
    return result.get("items", [])
