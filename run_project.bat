@echo off
title HealthPulse AI - Smart Healthcare Assistant Launcher
color 0B

echo =========================================================================
echo   HealthPulse AI: Disease Prediction & Appointment Optimizer
echo =========================================================================
echo.
echo [1/3] Checking environment...
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH! Please install Python.
    pause
    exit /b 1
)

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js.
    pause
    exit /b 1
)

echo [OK] Python and Node.js detected.
echo.

echo [2/3] Starting Python ML Microservice (Port 5001)...
start "HealthPulse AI - Python ML Microservice" cmd /k "cd /d "%~dp0ai_service" && python app.py"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Node.js Express API & Frontend Server (Port 5000)...
start "HealthPulse AI - Node.js Server" cmd /k "cd /d "%~dp0backend" && node server.js"

timeout /t 2 /nobreak >nul

echo.
echo =========================================================================
echo   SUCCESS! HealthPulse AI Services are booting up:
echo   - Web Application:    http://localhost:5000
echo   - Backend API:         http://localhost:5000/api
echo   - Python AI Engine:    http://localhost:5001
echo =========================================================================
echo.
echo Opening browser...
start http://localhost:5000

pause
