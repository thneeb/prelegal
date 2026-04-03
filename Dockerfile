# Stage 1: Build the Next.js frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --prefer-offline

COPY frontend/ ./
RUN npm run build


# Stage 2: Python backend with static frontend
FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app/backend

# Install Python dependencies via uv
COPY backend/pyproject.toml ./
RUN uv sync --no-dev

# Copy backend source
COPY backend/ ./

# Copy built frontend static files into backend/static/
COPY --from=frontend-builder /app/frontend/out ./static

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 8000

ENV DB_PATH=/data/prelegal.db

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
