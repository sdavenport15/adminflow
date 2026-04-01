# AdminFlow

Professional services automation for coaches, consultants, and freelancers.

## Stack

| Layer    | Tech                                    |
|----------|-----------------------------------------|
| Frontend | React 18 + React Router 6 + Vite 5     |
| Backend  | FastAPI 0.111 + Uvicorn + Pydantic v2  |
| Database | PostgreSQL (beta signups) / in-memory lists |
| Deploy   | Railway (Docker, single service)        |

---

## Local Development

### Prerequisites
- Node 20+
- Python 3.12+

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Swagger docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.
Vite proxies `/api` requests to `http://localhost:8000` (see `vite.config.js`).

---

## Environment Variables

| Variable          | Default                        | Description                                      |
|-------------------|-------------------------------|--------------------------------------------------|
| `ALLOWED_ORIGINS` | `http://localhost:3000`       | Comma-separated CORS origins (dev only)          |
| `ADMIN_API_KEY`   | `dev-secret-change-me`        | Key for `GET /api/beta-signups` admin endpoint   |
| `DATABASE_URL`    | *(none)*                      | Auto-set by Railway PostgreSQL plugin            |
| `PORT`            | `8000`                        | Port (Railway injects this automatically)        |

**Set these in Railway's environment variable panel before deploying.**

---

## API Endpoints

| Method | Path                   | Auth         | Description                          |
|--------|------------------------|--------------|--------------------------------------|
| GET    | `/health`              | None         | Health check                         |
| GET    | `/api/clients`         | None         | List all clients                     |
| POST   | `/api/clients`         | None         | Create a client                      |
| POST   | `/api/schedule`        | None         | Create an appointment                |
| POST   | `/api/invoices`        | None         | Create an invoice                    |
| POST   | `/api/onboard/{id}`    | None         | Trigger onboarding for a client      |
| POST   | `/api/send-email`      | None         | Send email (stub, logs only)         |
| POST   | `/api/beta-signup`     | None         | Join beta waitlist                   |
| GET    | `/api/beta-signups`    | X-Api-Key    | Admin: list all beta signups         |

### Beta signup admin example

```bash
curl -H "X-Api-Key: your-secret-key" https://your-app.railway.app/api/beta-signups
```

---

## Deployment (Railway)

1. Push to GitHub.
2. Connect repo to Railway — it detects `railway.json` and uses the Dockerfile.
3. Add a **PostgreSQL plugin** from the Railway dashboard (New Service → Database → PostgreSQL). Railway will automatically inject `DATABASE_URL` into your service.
4. Set the required environment variables in Railway's dashboard.
5. Railway builds the Docker image (frontend + backend in one container) and deploys.

The Dockerfile:
1. Builds the React app (`npm run build`) in a Node 20 stage.
2. Copies `dist/` into the Python image.
3. FastAPI serves the SPA from `/frontend/dist` and handles all `/api/*` routes.

---

## Project Structure

```
adminflow/
├── backend/
│   ├── app.py             # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.jsx       # Router + entry point
│   │   ├── index.css      # Global styles (dark theme)
│   │   ├── services/
│   │   │   └── api.js     # Axios API client
│   │   ├── components/
│   │   │   └── Layout.jsx # Sidebar + topbar shell
│   │   └── pages/
│   │       ├── Landing.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Clients.jsx
│   │       ├── Schedule.jsx
│   │       ├── Invoices.jsx
│   │       └── Settings.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── Dockerfile
├── railway.json
├── landing.md             # Landing page copy reference
└── README.md
```
