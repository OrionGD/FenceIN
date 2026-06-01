@echo off
title FenceIn Advanced Biometric Engine [Python / FastAPI]
color 0E

echo ==================================================================
echo   FENCEIN ADVANCED BIOMETRIC ENGINE INITIALIZER
echo   ==================================================================
echo.
echo   [SYSTEM DATE]: %date%
echo   [SYSTEM TIME]: %time%
echo.

cd /d "%~dp0"

:: 1. Check Python installation
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Python is not installed or not in your PATH.
    echo   Please install Python 3.10+ from python.org and try again.
    pause
    exit /b 1
)

:: 2. Setup Virtual Environment
if not exist venv (
    echo   [%date% %time%] [INFO] Isolated virtual environment not detected. Creating 'venv'...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo   [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo   [%date% %time%] [SUCCESS] Virtual environment created successfully!
)

:: 3. Activate Virtual Environment & Install Dependencies
echo   [%date% %time%] [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

echo   [%date% %time%] [INFO] Checking / installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo   [ERROR] Dependency installation failed. Please check your internet connection.
    pause
    exit /b 1
)
echo   [%date% %time%] [SUCCESS] All dependencies are ready.

:: 4. Start Server
echo.
echo   [%date% %time%] [ACTION] Starting FastAPI server on http://localhost:8000
echo   ------------------------------------------------------------------
uvicorn app:app --host 127.0.0.1 --port 8000 --reload --reload-exclude venv <nul
if %errorlevel% neq 0 (
    echo   [ERROR] FastAPI server terminated unexpectedly.
    pause
    exit /b 1
)
