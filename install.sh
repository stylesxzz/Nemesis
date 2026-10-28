#!/usr/bin/env bash
set -euo pipefail

if ! command -v python3 >/dev/null 2>&1; then
  echo "Erro: instale Python 3.11+ primeiro."
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "Erro: instale Node.js 20+ (npm incluso) primeiro."
  exit 1
fi

python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
if [ ! -f .env ]; then cp .env.example .env; fi
npm install

echo
echo "Instalação concluída."
echo "1) Edite .env e defina NVIDIA_API_KEY."
echo "2) Terminal 1: source .venv/bin/activate && uvicorn backend.app:app --host 127.0.0.1 --port 8765"
echo "3) Terminal 2: npm run dev"
