# syntax=docker/dockerfile:1

# prizma-portfolio · api  (FastAPI + SQLite)
#
# uv kullanılıyor: pip'ten belirgin hızlı ve kilit dosyasını kendisi yönetiyor.

FROM python:3.12-slim AS base
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

# Önce yalnızca bağımlılık tanımı: kaynak değişince katman önbelleği bozulmasın.
COPY pyproject.toml ./
RUN uv venv && uv pip install -r pyproject.toml

COPY app ./app

EXPOSE 8000

# --- Geliştirme: yeniden yükleme açık ---
FROM base AS dev
RUN uv pip install --group dev -r pyproject.toml
CMD ["fastapi", "dev", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]

# --- Yayın ---
FROM base AS prod
CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
