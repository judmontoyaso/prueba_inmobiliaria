#!/bin/bash
# deploy.sh — Despliegue directo en Droplet (sin Docker)
# Uso: bash deploy.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/produccion/backend"
VENV="$PROJECT_DIR/.venv"

echo "==> Actualizando código..."
git -C "$PROJECT_DIR" pull

echo "==> Instalando dependencias Python..."
python3 -m venv "$VENV"
source "$VENV/bin/activate"
pip install --quiet --upgrade pip
pip install --quiet -r "$BACKEND_DIR/requirements.txt"

echo "==> Verificando .env..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "ERROR: Crea $BACKEND_DIR/.env con SUPABASE_URL y SUPABASE_KEY"
  exit 1
fi

echo "==> Deteniendo instancia anterior (si existe)..."
pkill -f "uvicorn produccion.backend.app.main" || true

echo "==> Iniciando servidor en puerto 8000..."
nohup "$VENV/bin/uvicorn" produccion.backend.app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --app-dir "$PROJECT_DIR/produccion" \
  --log-level info \
  > "$PROJECT_DIR/server.log" 2>&1 &

echo ""
echo "Servidor iniciado. PID: $!"
echo "Logs: tail -f $PROJECT_DIR/server.log"
echo "App:  http://$(hostname -I | awk '{print $1}'):8000"
