@echo off
echo === CyberGuard Backend Setup ===

cd /d "%~dp0backend"

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt -q

if not exist data mkdir data

echo.
echo Starting backend server on http://localhost:8000
echo API docs: http://localhost:8000/docs
echo.

python main.py
pause
