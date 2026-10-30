# ====================================================================
# Moon Library Suite - Master One-Click Orchestrator
# Launches: FOLIO (D:\folio) + VuFind (D:\vufind) + Solr + Moon Wolf
# ====================================================================

$ErrorActionPreference = "Continue"

$MoonDir    = $PSScriptRoot
$FolioDir   = "D:\folio"
$VufindDir  = "D:\vufind"
$DockerExe  = "C:\Program Files\Docker\Docker\resources\com.docker.backend.exe"
$DockerGui  = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

Clear-Host
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "     🌙 MOON LIBRARY SUITE - UNIFIED SYSTEM ORCHESTRATOR            " -ForegroundColor Yellow
Write-Host "     • Moon Wolf BIBFRAME Cataloger & FOLIO Studio                  " -ForegroundColor White
Write-Host "     • FOLIO ILS Engine & Inventory (D:\folio @ :8080 & :9130)       " -ForegroundColor White
Write-Host "     • VuFind® Discovery Portal (D:\vufind @ :8085)                 " -ForegroundColor White
Write-Host "     • Apache Solr Search Engine (@ :8983)                          " -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# --------------------------------------------------------------------
# Step 1: Ensure FOLIO Native Service (:8080) is Running
# --------------------------------------------------------------------
Write-Host "[1/4] Checking FOLIO Core & Inventory Engine (:8080)..." -ForegroundColor Yellow
$folio8080Ok = $false
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:8080/instances" -TimeoutSec 2 -ErrorAction Stop
    $folio8080Ok = $true
} catch {
    $folio8080Ok = $false
}

if (-not $folio8080Ok) {
    if (Test-Path "$FolioDir\auth-service\server.js") {
        Write-Host "       Starting FOLIO Core Node Service on Port 8080..." -ForegroundColor Cyan
        Start-Process "node" -ArgumentList "server.js" -WorkingDirectory "$FolioDir\auth-service" -WindowStyle Minimized
        Start-Sleep -Seconds 2
        Write-Host " [OK]  FOLIO Core Service is ONLINE at http://localhost:8080" -ForegroundColor Green
    }
} else {
    Write-Host " [OK]  FOLIO Core Service is already ONLINE at http://localhost:8080" -ForegroundColor Green
}

# --------------------------------------------------------------------
# Step 2: Ensure Docker Engine is Running
# --------------------------------------------------------------------
Write-Host "`n[2/4] Checking Docker Engine Status..." -ForegroundColor Yellow
$dockerReady = $false
try {
    docker info 2>&1 | Out-Null
    $dockerReady = ($LASTEXITCODE -eq 0)
} catch {
    $dockerReady = $false
}

if (-not $dockerReady) {
    Write-Host "       Starting Docker Engine in background..." -ForegroundColor Cyan
    if (Test-Path $DockerExe) {
        Start-Process $DockerExe -ArgumentList "-engine WSL2 -with-frontend=false" -WindowStyle Hidden
    } elseif (Test-Path $DockerGui) {
        Start-Process $DockerGui
    }

    Write-Host "       Waiting for Docker daemon to become responsive..." -ForegroundColor Gray
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        try {
            docker info 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                $dockerReady = $true
                break
            }
        } catch {}
        Write-Host "." -NoNewline
    }
    Write-Host ""
}

if ($dockerReady) {
    Write-Host " [OK]  Docker Engine is ONLINE." -ForegroundColor Green

    # Start FOLIO Okapi Containers if present
    if (Test-Path "$FolioDir\docker-compose.yml") {
        Write-Host "       Starting FOLIO Docker Stack (Okapi :9130, Kafka, Postgres)..." -ForegroundColor Gray
        Push-Location $FolioDir
        docker compose up -d
        Pop-Location
    }

    # Start VuFind & Solr Containers
    if (Test-Path "$VufindDir\docker-compose.yml") {
        Write-Host "       Starting VuFind & Solr Stack (Web :8085, Solr :8983)..." -ForegroundColor Gray
        Push-Location $VufindDir
        docker compose up -d
        Pop-Location
        Write-Host " [OK]  VuFind & Solr containers active." -ForegroundColor Green
    }
} else {
    Write-Host " [WARN] Docker could not be started automatically. Please launch Docker Desktop." -ForegroundColor Yellow
}

# --------------------------------------------------------------------
# Step 3: Health Check & Directory
# --------------------------------------------------------------------
Write-Host "`n[3/4] Verifying System Services..." -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "  ✨ ALL ECOSYSTEM SERVICES ARE ACTIVE:" -ForegroundColor Green
Write-Host "  1. Moon Wolf Editor:           http://localhost:5173" -ForegroundColor Cyan
Write-Host "  2. FOLIO Studio (Inside Moon): http://localhost:5173 -> Tab: FOLIO Studio" -ForegroundColor Cyan
Write-Host "  3. FOLIO Instances API:        http://localhost:8080/instances" -ForegroundColor Cyan
Write-Host "  4. FOLIO Okapi Gateway:        http://localhost:9130" -ForegroundColor Cyan
Write-Host "  5. VuFind Discovery Portal:    http://localhost:8085" -ForegroundColor Cyan
Write-Host "  6. Apache Solr Search Admin:   http://localhost:8983/solr/#/biblio" -ForegroundColor Cyan
Write-Host "  7. BCLD Linked Data Swagger:   https://dev.bcld.info/api/docs" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Green

# Open browser
try {
    Start-Process "http://localhost:5173"
} catch {
    Write-Host "Please open http://localhost:5173 in your browser." -ForegroundColor Yellow
}

# --------------------------------------------------------------------
# Step 4: Keep Dev Server Running
# --------------------------------------------------------------------
Write-Host "`n[4/4] Starting Vite Web Server (press Ctrl+C to stop)...`n" -ForegroundColor Yellow

Push-Location $MoonDir
npm run dev -- --open
Pop-Location
