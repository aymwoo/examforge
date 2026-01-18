<#
ExamForge Development Startup Script (No Docker)
Simultaneously starts API (NestJS) and Web (Vite) services without using Docker images
Usage:
  powershell -ExecutionPolicy Bypass -File .\scripts\start-dev-no-docker.ps1 [-Rebuild] [-ApiOnly] [-WebOnly]
#>

[CmdletBinding()]
param(
  [switch]$Rebuild,
  [switch]$ApiOnly,
  [switch]$WebOnly
)

$ErrorActionPreference = 'Stop'

# Check if both ApiOnly and WebOnly are specified
if ($ApiOnly -and $WebOnly) {
  Write-Host "ERROR: -ApiOnly and -WebOnly cannot be used together" -ForegroundColor Red
  exit 1
}

# Check dependencies
if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: pnpm is not installed. Please install pnpm first." -ForegroundColor Red
  exit 1
}

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: Node.js is not installed. Please install Node.js first." -ForegroundColor Red
  exit 1
}

# Check if required directories exist
if (!(Test-Path "apps/api")) {
  Write-Host "ERROR: apps/api directory not found" -ForegroundColor Red
  exit 1
}

if (!(Test-Path "web")) {
  Write-Host "ERROR: web directory not found" -ForegroundColor Red
  exit 1
}

# Check if dependencies are installed
$missingDeps = @()
if (!(Test-Path "node_modules")) { $missingDeps += "root" }
if (!(Test-Path "apps/api/node_modules")) { $missingDeps += "api" }
if (!(Test-Path "web/node_modules")) { $missingDeps += "web" }

if ($missingDeps.Count -gt 0) {
  Write-Host "WARNING: Dependencies not found in: $($missingDeps -join ', '). Installing..." -ForegroundColor Yellow
  pnpm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
  }
}

# Kill any processes using the required ports
Write-Host "INFO: Checking for running services on ports 3000 and 5173..." -ForegroundColor Blue
try {
  $port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
  if ($port3000) {
    Stop-Process -Id $port3000.OwningProcess -Force
    Write-Host "INFO: Killed process on port 3000" -ForegroundColor Blue
  }
} catch {}

try {
  $port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
  if ($port5173) {
    Stop-Process -Id $port5173.OwningProcess -Force
    Write-Host "INFO: Killed process on port 5173" -ForegroundColor Blue
  }
} catch {}

Start-Sleep -Seconds 2

# Rebuild if requested
if ($Rebuild) {
  Write-Host "INFO: Rebuilding all packages..." -ForegroundColor Blue
  pnpm build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    exit 1
  }
  Write-Host "SUCCESS: Build completed" -ForegroundColor Green
}

# Prepare SQLite database if needed
$dbPath = "apps/api/prisma/dev.db"
if (!(Test-Path $dbPath)) {
  Write-Host "INFO: Initializing SQLite database..." -ForegroundColor Blue
  Push-Location "apps/api"
  try {
    npx prisma migrate dev --name init
    if ($LASTEXITCODE -ne 0) {
      Write-Host "WARNING: Failed to initialize database with migration, trying db push..." -ForegroundColor Yellow
      npx prisma db push
    }
  } finally {
    Pop-Location
  }
}

# Create logs directory
$LogDir = "$(Get-Location)\logs"
if (!(Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Function to start API service
function Start-Api {
  Write-Host "INFO: Starting API service..." -ForegroundColor Blue
  $apiLogFile = "$LogDir\api.log"
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd apps/api && pnpm start:dev > `"$apiLogFile`" 2>&1"
  
  # Wait for API to start
  Start-Sleep -Seconds 5
  
  # Check if API started successfully
  $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*nest start*" }
  if ($processes) {
    Write-Host "SUCCESS: API started successfully" -ForegroundColor Green
    Write-Host "API logs available at: $apiLogFile"
    return $true
  } else {
    Write-Host "ERROR: API failed to start. Check $apiLogFile for details." -ForegroundColor Red
    Get-Content $apiLogFile -Tail 30
    return $false
  }
}

# Function to start Web service
function Start-Web {
  Write-Host "INFO: Starting Web service..." -ForegroundColor Blue
  $webLogFile = "$LogDir\web.log"
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd web && pnpm dev > `"$webLogFile`" 2>&1"
  
  # Wait for Web to start
  Start-Sleep -Seconds 5
  
  # Check if Web started successfully
  $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" -and $_.CommandLine -notlike "*vite build*" }
  if ($processes) {
    Write-Host "SUCCESS: Web started successfully" -ForegroundColor Green
    Write-Host "Web logs available at: $webLogFile"
    return $true
  } else {
    Write-Host "ERROR: Web failed to start. Check $webLogFile for details." -ForegroundColor Red
    Get-Content $webLogFile -Tail 30
    return $false
  }
}

# Main execution
$apiStarted = $true
$webStarted = $true

if (!$WebOnly) {
  $apiStarted = Start-Api
  if (!$apiStarted) {
    Write-Host "ERROR: Failed to start API service. Exiting." -ForegroundColor Red
    exit 1
  }
}

if (!$ApiOnly) {
  $webStarted = Start-Web
  if (!$webStarted) {
    Write-Host "ERROR: Failed to start Web service. Exiting." -ForegroundColor Red
    exit 1
  }
}

# Display success message
Write-Host ""
Write-Host "SUCCESS: ExamForge development services are running!" -ForegroundColor Green
if (!$WebOnly) {
  Write-Host "API: http://localhost:3000/api"
}
if (!$ApiOnly) {
  Write-Host "Web: http://localhost:5173/"
}
Write-Host ""
Write-Host "Logs available at: $LogDir/" -ForegroundColor Blue
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Blue

# Wait for processes to complete
try {
  # Monitor services
  while ($true) {
    if (!$WebOnly) {
      $apiProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*nest start*" }
      if (!$apiProcesses) {
        Write-Host "WARNING: API process stopped unexpectedly!" -ForegroundColor Yellow
        Get-Content "$LogDir\api.log" -Tail 50
        break
      }
    }
    
    if (!$ApiOnly) {
      $webProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" -and $_.CommandLine -notlike "*vite build*" }
      if (!$webProcesses) {
        Write-Host "WARNING: Web process stopped unexpectedly!" -ForegroundColor Yellow
        Get-Content "$LogDir\web.log" -Tail 50
        break
      }
    }
    
    Start-Sleep -Seconds 5
  }
} finally {
  # Cleanup
  Write-Host ""
  Write-Host "INFO: Stopping services..." -ForegroundColor Blue
  
  # Kill API processes
  $apiProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*nest start*" }
  foreach ($proc in $apiProcesses) {
    try {
      Stop-Process -Id $proc.Id -Force
      Write-Host "SUCCESS: API stopped" -ForegroundColor Green
    } catch {
      # Process might already be gone
    }
  }
  
  # Kill Web processes
  $webProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" -and $_.CommandLine -notlike "*vite build*" }
  foreach ($proc in $webProcesses) {
    try {
      Stop-Process -Id $proc.Id -Force
      Write-Host "SUCCESS: Web stopped" -ForegroundColor Green
    } catch {
      # Process might already be gone
    }
  }
  
  Write-Host "INFO: All services stopped." -ForegroundColor Blue
}