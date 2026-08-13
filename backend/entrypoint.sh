#!/bin/sh
set -e

echo "Waiting for postgres at ${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}..."
until nc -z "${POSTGRES_HOST:-postgres}" "${POSTGRES_PORT:-5432}"; do
  sleep 1
done
echo "Postgres is up."

alembic upgrade head

if [ "${APP_ENV:-development}" = "production" ]; then
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${UVICORN_WORKERS:-2}"
else
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
fi
