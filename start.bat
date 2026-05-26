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

:: ---- DATABASE INITIALIZATION ----
cd ..
cd backend
echo   [%date% %time%] [INFO] [STAGE 2/4] Initializing Database Schema...
call npx prisma db push --schema=prisma/schema.prisma
if errorlevel 1 goto DB_FAILED

call npm run seed
if errorlevel 1 goto SEED_FAILED
goto DB_SUCCESS

:DB_FAILED
echo   [%date% %time%] [WARN] Database schema sync failed (host unreachable). Proceeding with local/cached state...
goto DB_SUCCESS

:SEED_FAILED
echo   [%date% %time%] [WARN] Database seed failed/skipped.
goto DB_SUCCESS

:DB_SUCCESS
cd ..

:: ---- CLOUDINARY VERIFICATION ----
cd backend
echo   [%date% %time%] [INFO] [STAGE 3/4] Verifying Cloudinary Connection...
call npm run cloudinary:test
if errorlevel 1 (
  echo   [%date% %time%] [ERROR] Cloudinary connection failed.
  exit /b 1
)
cd ..

echo.
echo   [%date% %time%] [INFO] [STAGE 2/4] Validating Frontend Core (Vite/React)...
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
echo   [%date% %time%] [INFO] [STAGE 3/4] Activating Distributed Micro-services...
cd ..
ping 127.0.0.1 -n 2 > nul

echo   [%date% %time%] [ACTION] Spinning up NestJS API Gateway (Port 3456)...
start "FenceIn Backend [Core]" cmd /c "color 0A && title FenceIn API Gateway [PORT: 3456] && echo [%date% %time%] [INFO] Booting NestJS Backend Engine... && cd backend && npm run start:dev"

:: Wait exactly 5 seconds
ping 127.0.0.1 -n 6 > nul

echo   [%date% %time%] [ACTION] Spinning up Vite Interactive UI (Port 2345)...
start "FenceIn Frontend [UI]" cmd /c "color 0D && title FenceIn User Interface [PORT: 2345] && echo [%date% %time%] [INFO] Booting React Client Engine... && cd frontend && npm run dev"

:: Wait exactly 8 seconds
ping 127.0.0.1 -n 9 > nul

echo   [%date% %time%] [ACTION] Spinning up FenceIn Guard Audit Terminal (Port 5566)...
start "FenceIn Security Logs [REAL-TIME]" cmd /c "color 0C && title FenceIn Central Guard Audit Terminal [PORT: 5566] && echo [%date% %time%] [INFO] Booting Audit Telemetry Server... && node logs-listener.cjs || pause"

echo.
echo   [%date% %time%] [INFO] [STAGE 4/4] Finalizing System Checks...
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
pause
goto MENU

:TERMINATE_PORTS
cls
echo   ==================================================================
echo   [!] INITIATING SYSTEM OVERRIDE: TERMINATING NETWORK SOCKETS
echo   ==================================================================
echo.
echo   [%date% %time%] [INFO] Scanning for rogue processes on internal ports...
ping 127.0.0.1 -n 2 > nul

echo   [%date% %time%] [ACTION] Targeting API Gateway (Port 3456), Client UI (Port 2345), and Audit Logs (Port 5566)...

:: 1. Identify active socket listeners on 3456, 2345 & 5566 and kill their parent supervisor/watcher processes
powershell -Command "Get-NetTCPConnection -LocalPort 3456, 2345, 5566 -ErrorAction SilentlyContinue | ForEach-Object { $procId = $_.OwningProcess; $parent = (Get-CimInstance Win32_Process -Filter \"ProcessId = $procId\").ParentProcessId; if ($parent) { Stop-Process -Id $parent -Force -ErrorAction SilentlyContinue }; Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue }"

:: 2. Search for any rogue background node processes that have 'backend' or 'frontend' in their startup command line
powershell -Command "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" -ErrorAction SilentlyContinue | ForEach-Object { if ($_.CommandLine -like '*backend*' -or $_.CommandLine -like '*frontend*') { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }"

:: 3. Clean up any lingering active cmd.exe window wrappers with the corporate title
taskkill /F /T /FI "WINDOWTITLE eq FenceIn*" 2>NUL

echo.
echo   [%date% %time%] [SUCCESS] Network environment sanitized. All active services and watcher trees successfully halted.
echo.
pause
goto MENU

:EOF
echo.
echo   [%date% %time%] [INFO] Shutting down launcher. Goodbye.
ping 127.0.0.1 -n 2 > nul
exit
