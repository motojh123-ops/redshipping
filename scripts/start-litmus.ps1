param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Restart
)

$Host.UI.RawUI.WindowTitle = "Litmus Check Manager"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Litmus Check - AI Playwright Automation Platform      " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1] Checking Red Shipping Docker Services (Postgres and Redis)..." -ForegroundColor Yellow

$dockerPs = docker ps --format "{{.Names}}" 2>$null
if ($dockerPs -match "banna-postgres" -and $dockerPs -match "banna-redis") {
    Write-Host " -> Postgres and Redis containers are healthy and running." -ForegroundColor Green
} else {
    Write-Host " -> Warning: Ensure docker-compose is up (Postgres on 5432 and Redis on 6379)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2] Current Service Status:" -ForegroundColor Yellow

$serverConn = Get-NetTCPConnection -LocalPort 6010 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
$frontendConn = Get-NetTCPConnection -LocalPort 3005 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if ($serverConn) {
    Write-Host "  - lc-server (Backend):   RUNNING on http://localhost:6010 (PID: $($serverConn.OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "  - lc-server (Backend):   STOPPED (Port 6010)" -ForegroundColor Red
}

if ($frontendConn) {
    Write-Host "  - lc-frontend (Frontend): RUNNING on http://localhost:3005 (PID: $($frontendConn.OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "  - lc-frontend (Frontend): STOPPED (Port 3005)" -ForegroundColor Red
}

if ($Stop -or $Restart) {
    Write-Host ""
    Write-Host "[*] Stopping Litmus Check Services..." -ForegroundColor Yellow
    if ($serverConn) {
        Stop-Process -Id $serverConn.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host " -> Stopped lc-server (PID $($serverConn.OwningProcess))." -ForegroundColor Gray
    }
    if ($frontendConn) {
        Stop-Process -Id $frontendConn.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host " -> Stopped lc-frontend (PID $($frontendConn.OwningProcess))." -ForegroundColor Gray
    }
    Start-Sleep -Seconds 1
    if ($Stop) {
        Write-Host "Services stopped successfully." -ForegroundColor Green
        Write-Host "========================================================" -ForegroundColor Cyan
        return
    }
}

if ($Start -or $Restart) {
    Write-Host ""
    Write-Host "[3] Starting Litmus Check Stack..." -ForegroundColor Green
    
    $repoRoot = (Get-Item $PSScriptRoot).Parent.FullName
    $serverDir = Join-Path $repoRoot "tools\litmus\lc-server"
    $frontendDir = Join-Path $repoRoot "tools\litmus\lc-frontend"
    
    $serverRunning = Get-NetTCPConnection -LocalPort 6010 -State Listen -ErrorAction SilentlyContinue
    if (-not $serverRunning) {
        Write-Host " -> Starting lc-server on http://localhost:6010 ..." -ForegroundColor Cyan
        Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd '$serverDir'; .\venv\Scripts\activate; python src\app.py"
    } else {
        Write-Host " -> lc-server is ALREADY running on http://localhost:6010." -ForegroundColor Yellow
    }
    
    $frontendRunning = Get-NetTCPConnection -LocalPort 3005 -State Listen -ErrorAction SilentlyContinue
    if (-not $frontendRunning) {
        Write-Host " -> Starting lc-frontend on http://localhost:3005 ..." -ForegroundColor Cyan
        Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; pnpm dev -- -p 3005"
    } else {
        Write-Host " -> lc-frontend is ALREADY running on http://localhost:3005." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Access links:" -ForegroundColor Green
    Write-Host "  Backend:  http://localhost:6010" -ForegroundColor White
    Write-Host "  Frontend: http://localhost:3005" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Usage Commands:" -ForegroundColor White
    Write-Host "  Check Status:    .\scripts\start-litmus.ps1" -ForegroundColor Gray
    Write-Host "  Start Services:  .\scripts\start-litmus.ps1 -Start" -ForegroundColor Green
    Write-Host "  Restart:         .\scripts\start-litmus.ps1 -Restart" -ForegroundColor Yellow
    Write-Host "  Stop Services:   .\scripts\start-litmus.ps1 -Stop" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
