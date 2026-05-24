@echo off
title FenceIn Enterprise OS Launcher
color 0B

echo ==================================================================
echo.
echo                 FenceIn Enterprise OS Launcher
echo.
echo ==================================================================
echo.

echo [1/3] Checking Backend Environment...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
) else (
    echo Backend dependencies found.
)

echo.
echo [2/3] Checking Frontend Environment...
cd ../frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
) else (
    echo Frontend dependencies found.
)

echo.
echo [3/3] Launching Services...
cd ..

echo Starting Backend API (NestJS) on Port 3456...
start "FenceIn Backend" cmd /c "color 0A && title FenceIn Backend && cd backend && echo Starting NestJS Server... && npm run start:dev"

echo Starting Frontend UI (Vite) on Port 2345...
start "FenceIn Frontend" cmd /c "color 0D && title FenceIn Frontend && cd frontend && echo Starting React/Vite... && npm run dev"

echo.
echo ==================================================================
echo FenceIn successfully launched in background terminals!
echo.
echo [Frontend URL] http://localhost:2345
echo [Backend API]  http://localhost:3456
echo [Swagger API]  http://localhost:3456/api/docs
echo ==================================================================
echo.
pause
