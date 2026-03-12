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

# Database file absolute path (consistent with start-deploy.sh)
$DbPath = Join-Path $ScriptDir 'apps\api\prisma\dev.db'
$DatabaseUrl = "file:./dev.db"

# Colors
function Print-Status($msg) { Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Print-Success($msg) { Write-Host "[SUCCESS] $msg" -ForegroundColor Green }
function Print-Error($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Print-Warning($msg) { Write-Host "[WARNING] $msg" -ForegroundColor Yellow }

# 0. Check apps/api/.env file (consistent with start-deploy.sh)
if (-not (Test-Path "apps\api\.env")) {
    Print-Error "apps/api/.env file not found!"
    if (Test-Path "apps\api\.env.example") {
        Print-Status "Creating apps/api/.env from apps/api/.env.example..."
        Copy-Item "apps\api\.env.example" "apps\api\.env"
        Print-Success "apps/api/.env file created. Please modify as needed."
    } else {
        Print-Status "Please create apps/api/.env file with the following required parameters:"
        Write-Host "   - DATABASE_URL: Database connection string"
        Write-Host "   - JWT_SECRET: JWT secret key"
        Write-Host "   - Other AI API configurations"
        exit 1
    }
}

# Ensure DATABASE_URL in apps/api/.env uses correct path (consistent with start-deploy.sh)
Print-Status "🔧 Checking database path configuration..."
$envContent = Get-Content "apps\api\.env" -Raw
if ($envContent -match "DATABASE_URL") {
    # Update DATABASE_URL to relative path
    $envContent = $envContent -replace 'DATABASE_URL=.*', "DATABASE_URL=`"$DatabaseUrl`""
    $envContent | Set-Content "apps\api\.env" -NoNewline
    Print-Success "Database path set: $DbPath"
} else {
    # Add DATABASE_URL
    Add-Content "apps\api\.env" "`nDATABASE_URL=`"$DatabaseUrl`""
    Print-Success "Database path added: $DbPath"
}

Print-Success "apps/api/.env file check passed"

# Load apps/api/.env to current shell environment
Print-Status "📋 Loading environment variables..."
Get-Content "apps\api\.env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"').Trim("'")
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}
# Force use consistent database path with start-deploy.sh
$env:DATABASE_URL = $DatabaseUrl

Print-Status "📍 Database location: $DbPath"

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

# Get local LAN IP for display
$lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -notmatch 'Loopback' -and
    $_.IPAddress -notmatch '^169\.' -and
    $_.IPAddress -notmatch '^127\.'
} | Select-Object -First 1).IPAddress

# Open firewall ports for LAN access (requires admin, silently skip if no permission)
function Ensure-FirewallRule($name, $port) {
    $existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
    if (-not $existing) {
        try {
            New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol TCP `
                -LocalPort $port -Action Allow -Profile Any -ErrorAction Stop | Out-Null
            Print-Success "Firewall rule added: $name (port $port)"
        } catch {
            Print-Warning "Could not add firewall rule for port $port. Run as Administrator or add manually."
            Print-Warning "  netsh advfirewall firewall add rule name=`"$name`" protocol=TCP dir=in localport=$port action=allow"
        }
    }
}
Ensure-FirewallRule "ExamForge Web Dev (5173)" 5173
Ensure-FirewallRule "ExamForge API Dev (3000)" 3000

Print-Success "Development environment is ready!"
Write-Host "   - API (local): http://localhost:3000"
Write-Host "   - Web (local): http://localhost:5173"
if ($lanIp) {
    Write-Host "   - Web (LAN):   http://${lanIp}:5173" -ForegroundColor Cyan
}
Write-Host "   (Press Ctrl+C to stop)"

pnpm dev
