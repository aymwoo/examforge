<#
.SYNOPSIS
    ExamForge Development Startup Script for Windows (PowerShell)
.DESCRIPTION
    Quickly starts the development environment (Install -> Generate -> Build Types -> Run)
#>

$ErrorActionPreference = 'Stop'

# Get script directory (project root)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Database file absolute path
$DbPath = Join-Path $ScriptDir 'apps\api\prisma\dev.db'
$DatabaseUrl = "file:$DbPath"

# Colors
function Print-Status($msg) { Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Print-Success($msg) { Write-Host "[SUCCESS] $msg" -ForegroundColor Green }
function Print-Error($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Print-Warning($msg) { Write-Host "[WARNING] $msg" -ForegroundColor Yellow }

# 0. Check .env file
if (-not (Test-Path ".env")) {
    Print-Error ".env file not found!"
    if (Test-Path ".env.example") {
        Print-Status "Creating .env from .env.example..."
        Copy-Item ".env.example" ".env"
        Print-Success ".env file created. Please modify as needed."
    } else {
        Print-Status "Please create .env file with the following required parameters:"
        Write-Host "   - DATABASE_URL: Database connection string"
        Write-Host "   - JWT_SECRET: JWT secret key"
        Write-Host "   - Other AI API configurations"
        exit 1
    }
}

# Ensure DATABASE_URL in .env uses correct absolute path
Print-Status "Checking database path configuration..."
$envContent = Get-Content ".env" -Raw
if ($envContent -match "DATABASE_URL") {
    # Update DATABASE_URL to correct absolute path
    $envContent = $envContent -replace 'DATABASE_URL=.*', "DATABASE_URL=`"file:$DbPath`""
    $envContent | Set-Content ".env" -NoNewline
    Print-Success "Database path set: $DbPath"
} else {
    # Add DATABASE_URL
    Add-Content ".env" "`nDATABASE_URL=`"file:$DbPath`""
    Print-Success "Database path added: $DbPath"
}

Print-Success ".env file check passed"

# Load .env to current shell environment
Print-Status "Loading environment variables..."
Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"').Trim("'")
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}
# Force use calculated absolute path
$env:DATABASE_URL = "file:$DbPath"

Print-Status "Database location: $DbPath"

# 1. Check/Install pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Print-Status "pnpm not found. Installing via npm..."
    npm install -g pnpm
}

# 2. Install dependencies
Print-Status "Installing dependencies..."
pnpm install

# 3. Generate Prisma Client (Required for API and Shared Types)
Print-Status "Generating Prisma client..."
pnpm --filter ./apps/api run prisma:generate

# 4. Build Shared Types (Required for Frontend and Backend)
Print-Status "Building shared types..."
pnpm --filter ./packages/shared-types run build

# 5. Database Setup (Ensure migrations are applied)
Print-Status "Checking database migrations..."
pnpm --filter ./apps/api exec prisma migrate deploy

# 6. Start Dev Servers
Print-Status "Starting development servers (API + Web)..."
Print-Success "Development environment is ready!"
Write-Host "   - API: http://localhost:3000"
Write-Host "   - Web: http://localhost:5173"
Write-Host "   (Press Ctrl+C to stop)"

pnpm dev
