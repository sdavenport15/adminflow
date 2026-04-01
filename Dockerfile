# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-slim AS frontend-build

WORKDIR /app/frontend

# Install dependencies first for better layer caching
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build
# Output: /app/frontend/dist


# ── Stage 2: Python backend + compiled frontend ───────────────────────────────
FROM python:3.12-slim AS final

WORKDIR /app

# Install Python deps
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend so FastAPI can serve it as static files
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Expose the port Railway / Cloud Run expects
EXPOSE 8000

# Set working dir to backend so relative paths resolve correctly
WORKDIR /app/backend

# Production start command
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
