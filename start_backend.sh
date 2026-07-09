#!/bin/bash
# Quick start script for the backend
echo "=== CyberGuard Backend Setup ==="

cd "$(dirname "$0")/backend"

# Create virtualenv if not exists
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

# Activate
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

# Install deps
echo "Installing dependencies..."
pip install -r requirements.txt -q

# Create data dir
mkdir -p data

echo ""
echo "Starting backend server on http://localhost:8000"
echo "API docs: http://localhost:8000/docs"
echo ""

python main.py
