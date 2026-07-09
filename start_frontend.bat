@echo off
echo === CyberGuard Frontend Setup ===

cd /d "%~dp0frontend"

if not exist node_modules (
    echo Installing npm packages...
    npm install
)

echo.
echo Starting frontend dev server on http://localhost:5173
echo.

npm run dev
pause
