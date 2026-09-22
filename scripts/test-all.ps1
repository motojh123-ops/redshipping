# ==============================================================================
# Banna Red Shipping ERP — Automated Full-Stack Test Suite
# Tests all business functions: Unit tests, E2E functional tests, and DB lifecycle
# ==============================================================================

param(
    [switch]$SmokeOnly,
    [switch]$UI,
    [switch]$UnitOnly,
    [switch]$LifecycleOnly,
    [switch]$Report
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "   Banna Red Shipping ERP — Automated Full-Stack Test & Quality Assurance" -ForegroundColor White
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

if ($UI) {
    Write-Host "Launching Playwright UI Test Runner..." -ForegroundColor Yellow
    npm run test:e2e:ui
    exit 0
}

# 1. Run Unit Tests across all workspaces (Web, API, Workers)
if (-not $SmokeOnly -and -not $LifecycleOnly) {
    Write-Host "[1/3] Running Unit & Integration Tests (Vitest & Jest)..." -ForegroundColor Yellow
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Host " Unit tests reported failures." -ForegroundColor Red
    } else {
        Write-Host " All Unit Tests Passed successfully!" -ForegroundColor Green
    }
    Write-Host ""
}

# 2. Run Database & Business Lifecycle Audit
if (-not $SmokeOnly -and -not $UnitOnly) {
    Write-Host "[2/3] Running Database Business Lifecycle Verification..." -ForegroundColor Yellow
    npx ts-node scripts/verify_full_cycle.ts
    if ($LASTEXITCODE -ne 0) {
        Write-Host " Database lifecycle audit reported warnings or errors." -ForegroundColor Yellow
    } else {
        Write-Host " Database Lifecycle Audit Passed!" -ForegroundColor Green
    }
    Write-Host ""
}

# 3. Run Playwright E2E Functional Tests
if (-not $UnitOnly -and -not $LifecycleOnly) {
    if ($SmokeOnly) {
        Write-Host "[E2E] Running Fast Smoke Test across all 23 application routes..." -ForegroundColor Yellow
        npx playwright test e2e/smoke.spec.ts
    } else {
        Write-Host "[3/3] Running Comprehensive End-to-End Functional Test Suite (77 Tests)..." -ForegroundColor Yellow
        npx playwright test
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host " Some E2E tests failed. Generating triage report..." -ForegroundColor Yellow
    } else {
        Write-Host " All End-to-End Tests Passed successfully!" -ForegroundColor Green
    }
    Write-Host ""
}

# 4. Optional Litmus Agent Triage
if (Test-Path "./reports/report.json") {
    Write-Host "Generating test execution report from ./reports/report.json..." -ForegroundColor Cyan
    npx litmus-agent triage ./reports/report.json --pretty
}

if ($Report) {
    npx playwright show-report
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "   Automated Verification Completed!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
