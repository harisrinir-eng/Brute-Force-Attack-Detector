#!/bin/bash
# Quick start script for the frontend
echo "=== CyberGuard Frontend Setup ==="

cd "$(dirname "$0")/frontend"

# Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "Installing npm packages..."
  npm install
fi

echo ""
echo "Starting frontend dev server on http://localhost:5173"
echo ""

npm run dev
