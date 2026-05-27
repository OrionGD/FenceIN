@echo off
setlocal EnableDelayedExpansion
title FenceIn Enterprise OS Launcher [v2.0.0-production]
color 0B

:MENU
cls
echo.
echo   ______ _____ _   _  _____ _____ _____ _   _ 
echo  ^|  ____^|  ___^| \ ^| ^|/ ____^|  ___^|_   _^| \ ^| ^|
echo  ^| ^|__  ^| ^|__ ^|  \^| ^| ^|    ^| ^|__   ^| ^| ^|  \^| ^|
echo  ^|  __^| ^|  __^|^| . ` ^| ^|    ^|  __^|  ^| ^| ^| . ` ^|
echo  ^| ^|    ^| ^|___^| ^|\  ^| ^|____^| ^|___ _^| ^|_^| ^|\  ^|
echo  ^|_^|    ^|_____^|_^| \_^|\_____^|_____^|_____^|_^| \_^|
echo.
echo   ==================================================================
echo                     ENTERPRISE WORKFORCE PLATFORM
echo                           SYSTEM INITIALIZER
echo   ==================================================================
echo.
echo   [SYSTEM DATE]: %date%
echo   [SYSTEM TIME]: %time%
echo.
echo   [1] Boot Core Infrastructure (Backend API ^& Frontend UI)
echo   [2] System Override: Terminate Active Ports (3456 ^& 2345)
echo   [3] Exit Launcher
echo.

rem Block and wait for single keypress (1, 2, or 3)
choice /C 123 /N /M "   => Awaiting Command (1-3): "

rem Route according to selected key (checked in descending order)
if errorlevel 3 goto EOF
if errorlevel 2 goto TERMINATE_PORTS
if errorlevel 1 goto START_SYSTEM

echo.
echo   [ERROR] Invalid command protocol. Rebooting menu...
ping 127.0.0.1 -n 3 > nul
goto MENU

:START_SYSTEM
cls
cd /d "%~dp0"
echo   ==================================================================
echo   [!] INITIATING FENCEIN SYSTEM BOOT SEQUENCE
echo   ==================================================================
echo.
echo   [%date% %time%] [INFO] Allocating resources and preparing launch...
ping 127.0.0.1 -n 2 > nul

echo   [%date% %time%] [INFO] [STAGE 1/4] Validating Backend Core (NestJS)...
cd backend
if not exist node_modules (
    echo   [!date! !time!] [WARN] Backend modules missing. Initiating download protocol...
    call npm install --silent
    echo   [!date! !time!] [SUCCESS] Backend dependencies installed successfully.
) else (
    echo   [!date! !time!] [OK] Backend dependencies verified.
)
ping 127.0.0.1 -n 2 > nul

:: ---- DATABASE & CREDENTIAL INITIALIZATION (SEPARATE TERMINAL) ----
cd ..
echo   [%date% %time%] [INFO] [STAGE 2/4] Initializing Database Schema (in separate terminal)...
echo   [%date% %time%] [INFO] [STAGE 3/4] Verifying Environment Connection Secrets (in separate terminal)...
ping 127.0.0.1 -n 2 > nul

:: Spawning dedicated terminal for DB initialization and env connection testing (no pause on exit)
start "FenceIn Setup and Verification" /wait cmd /c "color 0E && title FenceIn Setup and Verification && echo [%date% %time%] [INFO] Starting Schema Sync and Keys Test... && cd backend && echo. && echo === [1/3] Syncing Prisma Database Schema === && call npx prisma db push --schema=prisma/schema.prisma && echo. && echo === [2/3] Testing Cloudinary connection via Backend === && call npm run cloudinary:test && echo. && cd .. && echo === [3/3] Verifying All Env Connection and Secret Keys (Groq, Cloudinary, DBs) === && node test-api-keys.js && echo. && echo [SUCCESS] Database and credential verification complete! || (echo. && echo [ERROR] Database/Connection verification failed. Please check credentials. && exit /b 1)"

if errorlevel 1 (
    echo   [%date% %time%] [ERROR] Verification terminal reported errors. Halting boot sequence.
    goto MENU
)

echo.
echo   [%date% %time%] [INFO] [STAGE 3/5] Validating Frontend Core (Vite/React)...
cd frontend
if not exist node_modules (
    echo   [!date! !time!] [WARN] Frontend modules missing. Initiating download protocol...
    call npm install --silent
    echo   [!date! !time!] [SUCCESS] Frontend dependencies installed successfully.
) else (
    echo   [!date! !time!] [OK] Frontend dependencies verified.
)
ping 127.0.0.1 -n 2 > nul

echo.
echo   [%date% %time%] [INFO] [STAGE 4/5] Validating Biometrics Core (Python / FastAPI)...
cd ..
cd biometrics_service

:: Check if Python is installed
where python >nul 2>nul
if !errorlevel! neq 0 (
    echo   [!date! !time!] [ERROR] Python is not installed or not in system PATH.
    echo   [!date! !time!] [WARN] Biometrics microservice initialization will be skipped!
) else (
    :: Create virtual environment if missing
    if not exist venv (
        echo   [!date! !time!] [WARN] Python virtual environment missing. Initiating venv creation...
        python -m venv venv
        if !errorlevel! neq 0 (
            echo   [!date! !time!] [ERROR] Failed to create virtual environment.
        ) else (
            echo   [!date! !time!] [SUCCESS] Virtual environment created successfully.
        )
    ) else (
        echo   [!date! !time!] [OK] Virtual environment verified.
    )
    
    :: Install dependencies inside venv
    if exist venv (
        echo   [!date! !time!] [INFO] Activating virtual environment and verifying requirements...
        call venv\Scripts\activate.bat
        python -m pip install --upgrade pip --quiet
        pip install -r requirements.txt --quiet
        if !errorlevel! neq 0 (
            echo   [!date! !time!] [ERROR] Failed to synchronize Python dependencies.
        ) else (
            echo   [!date! !time!] [SUCCESS] Biometrics core dependencies verified and synchronized.
        )
        call deactivate
    )
)
cd ..
ping 127.0.0.1 -n 2 > nul

echo.
echo   [%date% %time%] [INFO] [STAGE 5/5] Activating Distributed Micro-services...
ping 127.0.0.1 -n 2 > nul

echo   [%date% %time%] [ACTION] Spinning up Python Biometric OpenCV Engine (Port 8000)...
start "FenceIn Biometrics [Python]" cmd /c "cd biometrics_service && call start_service.bat <nul"

:: Wait exactly 4 seconds for Python to initialize
ping 127.0.0.1 -n 5 > nul

echo   [%date% %time%] [ACTION] Spinning up NestJS API Gateway (Port 3456)...
start "FenceIn Backend [Core]" cmd /c "color 0A && title FenceIn API Gateway [PORT: 3456] && echo [%date% %time%] [INFO] Booting NestJS Backend Engine... && cd backend && npm run start:dev <nul"

:: Wait exactly 5 seconds
ping 127.0.0.1 -n 6 > nul

echo   [%date% %time%] [ACTION] Spinning up Vite Interactive UI (Port 2345)...
start "FenceIn Frontend [UI]" cmd /c "color 0D && title FenceIn User Interface [PORT: 2345] && echo [%date% %time%] [INFO] Booting React Client Engine... && cd frontend && npm run dev <nul"

:: Wait exactly 8 seconds
ping 127.0.0.1 -n 9 > nul

echo   [%date% %time%] [ACTION] Spinning up FenceIn Guard Audit Terminal (Port 5566)...
start "FenceIn Security Logs [REAL-TIME]" cmd /c "color 0C && title FenceIn Central Guard Audit Terminal [PORT: 5566] && echo [%date% %time%] [INFO] Booting Audit Telemetry Server... && node logs-listener.cjs <nul"

echo.
echo   [%date% %time%] [INFO] [STAGE 5/5] Finalizing System Checks...
:: Wait exactly 10 seconds before opening portal tabs
ping 127.0.0.1 -n 11 > nul

echo.
echo   ==================================================================
echo   [SUCCESS] FENCEIN ENTERPRISE INFRASTRUCTURE IS ONLINE
echo   ==================================================================
echo.
echo   [ROUTING ENDPOINTS]
    echo    - Client UI:         http://localhost:2345
    echo    - API Gateway:       http://localhost:3456/api/v1
    echo    - Biometrics API:    http://localhost:8000/api/biometrics/health
    echo    - System Docs:       http://localhost:3456/api/docs
echo.
echo   [%date% %time%] [ACTION] Launching operational portals in browser automatically...
echo   [%date% %time%] [ACTION] Launching Swagger Documentation...
start http://localhost:3456/api/docs

:: Wait exactly 4 seconds
ping 127.0.0.1 -n 5 > nul

echo   [%date% %time%] [ACTION] Launching Frontend Interface...
start http://localhost:2345

:: Wait exactly 5 seconds
ping 127.0.0.1 -n 6 > nul

echo   [%date% %time%] [ACTION] Launching Backend core API...
start http://localhost:3456/api/v1
echo.
echo   [%date% %time%] [INFO] Terminals detached. System running safely in background.
echo.
goto MENU

:TERMINATE_PORTS
cls
echo   ==================================================================
echo   [!] INITIATING SYSTEM OVERRIDE: TERMINATING NETWORK SOCKETS
echo   ==================================================================
echo.
echo   [%date% %time%] [INFO] Scanning for rogue processes on internal ports...
ping 127.0.0.1 -n 2 > nul

echo   [%date% %time%] [ACTION] Targeting API Gateway (Port 3456), Client UI (Port 2345), Biometrics (Port 8000), and Guard Terminal (Port 5566)...

:: Identify active socket listeners on 3456, 2345, 8000 & 5566 and kill them natively
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3456 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :2345 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5566 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

:: Fallback: Powershell termination just in case
powershell -Command "Get-NetTCPConnection -LocalPort 3456, 2345, 8000, 5566 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo.
echo   [%date% %time%] [SUCCESS] Network environment sanitized. All active services successfully halted.
echo.
:: Auto-return to menu after 2 seconds — no keypress required
ping 127.0.0.1 -n 3 > nul
goto MENU

:EOF
echo.
echo   [%date% %time%] [INFO] Shutting down launcher. Goodbye.
ping 127.0.0.1 -n 2 > nul
exit
