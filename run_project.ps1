# HealthPulse AI - PowerShell Launcher
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "  HealthPulse AI: Disease Prediction & Appointment Optimizer" -ForegroundColor Cyan
Write-Host "=========================================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Start Python Microservice
Write-Host "`n[1/2] Starting Python ML Microservice (Port 5001)..." -ForegroundColor Yellow
Start-Process -FilePath "python" -ArgumentList "app.py" -WorkingDirectory "$scriptDir\ai_service" -NoNewWindow

Start-Sleep -Seconds 2

# 2. Start Node.js Express Server
Write-Host "[2/2] Starting Node.js Express Server (Port 5000)..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "$scriptDir\backend" -NoNewWindow

Start-Sleep -Seconds 2

Write-Host "`nAll services active!" -ForegroundColor Green
Write-Host "Frontend Portal: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Backend API:     http://localhost:5000/api" -ForegroundColor Cyan

Start-Process "http://localhost:5000"
