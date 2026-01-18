<#
.SYNOPSIS
    ExamForge Deployment Script for Windows (PowerShell)
.DESCRIPTION
    This script deploys the ExamForge service from scratch, including database initialization
#>

$ErrorActionPreference = 'Stop'

Write-Host "🚀 Starting ExamForge deployment..." -ForegroundColor Cyan

# Function to print colored output
function Print-Status($msg) { Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Print-Success($msg) { Write-Host "[SUCCESS] $msg" -ForegroundColor Green }
function Print-Warning($msg) { Write-Host "[WARNING] $msg" -ForegroundColor Yellow }
function Print-Error($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

# Check if npm is installed
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Print-Error "npm is not installed. Please install Node.js (with npm) first."
    exit 1
}

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Print-Error "Node.js is not installed. Please install Node.js first."
    exit 1
}

# Check Node.js version
$nodeVersion = (node -v) -replace 'v', ''
$minVersion = [Version]"18.0.0"
$currentVersion = [Version]$nodeVersion

if ($currentVersion -lt $minVersion) {
    Print-Error "Node.js version must be >= $minVersion. Current version: $nodeVersion"
    exit 1
}

Print-Status "Prerequisites check passed"

# Navigate to project root
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Print-Status "Working in project directory: $ProjectRoot"

# Set npm registry to China mirror for faster downloads
Print-Status "Setting npm registry to China mirror (npmmirror.com)..."
npm config set registry https://registry.npmmirror.com
Print-Success "npm registry configured"

# Install dependencies
Print-Status "Installing dependencies..."
npm install
Print-Success "Dependencies installed"

# Build the applications
Print-Status "Building applications..."
npm run build
Print-Success "Applications built"

# Setup database
Print-Status "Setting up database..."

# Check if .env exists
if (-not (Test-Path "apps/api/.env")) {
    Print-Warning "apps/api/.env file not found. Creating from example..."
    Copy-Item "apps/api/.env.example" "apps/api/.env"
}

# Navigate to API directory
Push-Location "apps/api"

# Generate Prisma client
Print-Status "Generating Prisma client..."
npm run prisma:generate
Print-Success "Prisma client generated"

# Apply all migrations to create the database schema
Print-Status "Applying database migrations..."
npx prisma migrate deploy
Print-Success "Database migrations applied"

# Seed the database with initial AI providers
Print-Status "Seeding database with initial data..."
Print-Status "   Creating initial AI providers..."
npx tsx prisma/seed-ai-providers.ts
Print-Success "Database seeded with initial data"

# Return to project root
Pop-Location

# Build the web application
Print-Status "Building web application..."
npm run build:web
Print-Success "Web application built"

# Create production build directory if it doesn't exist
if (-not (Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist" | Out-Null
}

# Copy built applications to distribution directory
Print-Status "Packaging applications..."
New-Item -ItemType Directory -Path "dist/api" -Force | Out-Null
New-Item -ItemType Directory -Path "dist/web" -Force | Out-Null

# Copy API build
if (Test-Path "apps/api/dist/*") {
    Copy-Item -Path "apps/api/dist/*" -Destination "dist/api/" -Recurse -Force
} else {
    Print-Warning "No API build found, skipping API packaging"
}

# Copy prisma schema + migrations + seed scripts
New-Item -ItemType Directory -Path "dist/api/prisma/migrations" -Force | Out-Null
Copy-Item "apps/api/prisma/schema.prisma" "dist/api/prisma/schema.prisma" -Force
Copy-Item -Path "apps/api/prisma/migrations/*" -Destination "dist/api/prisma/migrations/" -Recurse -Force
if (Test-Path "apps/api/prisma/seed-users.ts") {
    Copy-Item "apps/api/prisma/seed-users.ts" "dist/api/prisma/" -Force
}
if (Test-Path "apps/api/prisma/seed-ai-providers.ts") {
    Copy-Item "apps/api/prisma/seed-ai-providers.ts" "dist/api/prisma/" -Force
}

# Copy assets/uploads (best effort)
New-Item -ItemType Directory -Path "dist/api/assets" -Force | Out-Null
New-Item -ItemType Directory -Path "dist/api/uploads" -Force | Out-Null
if (Test-Path "apps/api/assets/*") {
    Copy-Item -Path "apps/api/assets/*" -Destination "dist/api/assets/" -Recurse -Force -ErrorAction SilentlyContinue
}

# Copy web build
if (Test-Path "web/dist/*") {
    Copy-Item -Path "web/dist/*" -Destination "dist/web/" -Recurse -Force
} else {
    Print-Warning "No web build found, skipping web packaging"
}

# Generate minimal API package.json for dist runtime
$packageJson = @'
{
  "name": "examforge-api-dist",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "start": "node main.js",
    "db:generate": "node -e \"require('child_process').execSync('npx prisma generate --schema=./prisma/schema.prisma', { stdio: 'inherit' })\"",
    "db:migrate": "node -e \"require('child_process').execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', { stdio: 'inherit' })\"",
    "db:seed": "node -e \"require('child_process').execSync('npx tsx ./prisma/seed-ai-providers.ts', { stdio: 'inherit' })\"",
    "db:init": "npm run db:generate && npm run db:migrate && npm run db:seed"
  },
  "dependencies": {
    "@nestjs/common": "^11.1.11",
    "@nestjs/config": "^4.0.2",
    "@nestjs/core": "^11.1.11",
    "@nestjs/jwt": "^11.0.2",
    "@nestjs/passport": "^11.0.5",
    "@nestjs/platform-express": "^11.1.11",
    "@nestjs/swagger": "^11.2.3",
    "@prisma/client": "5.22.0",
    "@prisma/migrate": "5.22.0",
    "prisma": "5.22.0",
    "archiver": "^7.0.1",
    "bcrypt": "^6.0.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.3",
    "multer": "^2.0.2",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "pdfkit": "^0.17.2",
    "pdfreader": "^3.0.8",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2",
    "sharp": "^0.32.6",
    "node-gyp": "^10.0.1",
    "tsx": "^4.20.6",
    "uuid": "^13.0.0",
    "xlsx": "^0.18.5"
  }
}
'@
$packageJson | Out-File -FilePath "dist/api/package.json" -Encoding UTF8

Print-Status "Installing production dependencies into dist/api..."
Push-Location "dist/api"
npm install --omit=dev
Pop-Location

Print-Success "Applications packaged to dist/ directory"

# Create start-production.sh (same as in shell script)
$startProductionSh = @'
#!/bin/bash
# Production startup script for ExamForge

set -e

echo "🚀 Starting ExamForge in production mode..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Navigate to the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure Node.js exists
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is not installed."
    exit 1
fi

# Ensure dependencies exist
if [ ! -d "$SCRIPT_DIR/api/node_modules" ]; then
    echo -e "${RED}[ERROR]${NC} Missing dist/api/node_modules. Please re-run start-deploy.sh."
    exit 1
fi

# Default DB (SQLite) location
export DATABASE_URL="${DATABASE_URL:-file:./prisma/prod.db}"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"

# Initialize database if missing
if [ ! -f "$SCRIPT_DIR/api/prisma/prod.db" ]; then
    print_status "Initializing database..."
    (cd "$SCRIPT_DIR/api" && npm run db:init)
fi

# Start the API server in background
print_status "Starting API server..."
cd "$SCRIPT_DIR/api" && node main.js &
API_PID=$!

# Wait a moment for the API to start
sleep 3

# Check if API is running
if kill -0 $API_PID 2>/dev/null; then
    print_success "API server started (PID: $API_PID)"
else
    echo -e "${RED}[ERROR]${NC} Failed to start API server"
    exit 1
fi

# Start web static server with API proxy
print_status "Starting web server..."
node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(process.cwd(), 'web');
const port = process.env.WEB_PORT || 4173;
const apiPort = process.env.PORT || 3000;

const getMime = (p) => ({
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
})[path.extname(p)] || 'application/octet-stream';

http.createServer((req, res) => {
  // Proxy API requests to the API server
  if (req.url.startsWith('/api/') || req.url.startsWith('/admin/')) {
    const options = {
      hostname: 'localhost',
      port: apiPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: 'localhost:' + apiPort }
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
      res.writeHead(502);
      res.end('API server unavailable');
    });
    req.pipe(proxyReq);
    return;
  }
  
  // Serve static files
  let file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  let filePath = path.join(root, file);
  if (!filePath.startsWith(root)) return res.writeHead(403).end();
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: serve index.html for non-existent paths
      fs.readFile(path.join(root, 'index.html'), (err2, indexData) => {
        if (err2) {
          res.writeHead(404);
          return res.end('Not found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexData);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': getMime(filePath) });
    res.end(data);
  });
}).listen(port, () => console.log('Web running on http://localhost:' + port));
" &
WEB_PID=$!

# Print deployment summary
echo ""
echo "🎉 ExamForge deployed successfully!"
echo ""
echo "🌐 API Server: http://localhost:${PORT}"
echo "📄 API Documentation: http://localhost:${PORT}/api"
echo "🌐 Web: http://localhost:${WEB_PORT:-4173}"
echo ""
echo "Note: Please register your first user account through the web interface."
echo "      The first registered user will automatically become an administrator."
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

# Wait for termination signal
trap "echo -e '\n🛑 Shutting down ExamForge...'; kill $API_PID $WEB_PID; exit" SIGINT SIGTERM

# Wait indefinitely
while true; do
    sleep 1
done
'@
$startProductionSh | Out-File -FilePath "dist/start-production.sh" -Encoding UTF8 -NoNewline

# Create start-production.ps1
$startProductionPs1 = @'
<#
Production startup script for ExamForge (Windows)
#>

$ErrorActionPreference = 'Stop'
Write-Host "🚀 Starting ExamForge in production mode..." -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path (Join-Path $ScriptDir 'api/node_modules'))) {
    Write-Host "[ERROR] Missing dist/api/node_modules. Please re-run start-deploy.ps1." -ForegroundColor Red
    exit 1
}

$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { 'file:./prisma/prod.db' }
$env:NODE_ENV = if ($env:NODE_ENV) { $env:NODE_ENV } else { 'production' }
$env:PORT = if ($env:PORT) { $env:PORT } else { '3000' }
$env:WEB_PORT = if ($env:WEB_PORT) { $env:WEB_PORT } else { '4173' }

$dbPath = Join-Path $ScriptDir 'api/prisma/prod.db'
if (-not (Test-Path $dbPath)) {
    Write-Host "[INFO] Initializing database..." -ForegroundColor Blue
    Push-Location (Join-Path $ScriptDir 'api')
    try {
        npm run db:init
    } finally {
        Pop-Location
    }
}

Write-Host "[INFO] Starting API server..." -ForegroundColor Blue
$apiJob = Start-Job -ScriptBlock {
    param($dir, $port)
    Set-Location $dir
    $env:PORT = $port
    node main.js
} -ArgumentList (Join-Path $ScriptDir 'api'), $env:PORT

Start-Sleep -Seconds 3

if ($apiJob.State -ne 'Running') {
    Write-Host "[ERROR] Failed to start API server." -ForegroundColor Red
    Receive-Job $apiJob
    exit 1
}
Write-Host "[SUCCESS] API server started" -ForegroundColor Green

Write-Host "[INFO] Starting web server..." -ForegroundColor Blue
$webScript = @"
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join('$($ScriptDir -replace '\\', '/')', 'web');
const port = $env:WEB_PORT;
const apiPort = $env:PORT;

const getMime = (p) => ({
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
})[path.extname(p)] || 'application/octet-stream';

http.createServer((req, res) => {
  if (req.url.startsWith('/api/') || req.url.startsWith('/admin/')) {
    const options = {
      hostname: 'localhost',
      port: apiPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: 'localhost:' + apiPort }
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
      res.writeHead(502);
      res.end('API server unavailable');
    });
    req.pipe(proxyReq);
    return;
  }
  
  let file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  let filePath = path.join(root, file);
  if (!filePath.startsWith(root)) return res.writeHead(403).end();
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(root, 'index.html'), (err2, indexData) => {
        if (err2) {
          res.writeHead(404);
          return res.end('Not found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexData);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': getMime(filePath) });
    res.end(data);
  });
}).listen(port, () => console.log('Web running on http://localhost:' + port));
"@

$webJob = Start-Job -ScriptBlock {
    param($script)
    node -e $script
} -ArgumentList $webScript

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "🎉 ExamForge deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 API Server: http://localhost:$env:PORT" -ForegroundColor Cyan
Write-Host "📄 API Documentation: http://localhost:$env:PORT/api" -ForegroundColor Cyan
Write-Host "🌐 Web: http://localhost:$env:WEB_PORT" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Please register your first user account through the web interface."
Write-Host "      The first registered user will automatically become an administrator."
Write-Host ""
Write-Host "Press Ctrl+C to stop the servers"
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 1
        # Check if jobs are still running
        if ($apiJob.State -ne 'Running') {
            Write-Host "[WARNING] API server stopped unexpectedly" -ForegroundColor Yellow
            Receive-Job $apiJob
        }
    }
} finally {
    Write-Host "`n🛑 Shutting down ExamForge..." -ForegroundColor Yellow
    Stop-Job $apiJob -ErrorAction SilentlyContinue
    Stop-Job $webJob -ErrorAction SilentlyContinue
    Remove-Job $apiJob -ErrorAction SilentlyContinue
    Remove-Job $webJob -ErrorAction SilentlyContinue
}
'@
$startProductionPs1 | Out-File -FilePath "dist/start-production.ps1" -Encoding UTF8

# Create README.md
$readme = @'
# ExamForge dist Package

This folder is a standalone production bundle generated by `start-deploy.ps1`.

## Quick start

### Linux/macOS
```bash
./start-production.sh
```

### Windows (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File .\start-production.ps1
```

## Endpoints

- API: http://localhost:3000
- Web: http://localhost:4173
- API docs: http://localhost:3000/api

## Database

- Default SQLite file: `dist/api/prisma/prod.db`
- Override with `DATABASE_URL` (example: `file:./prisma/custom.db`)

## Environment variables

- `PORT` (default: 3000)
- `WEB_PORT` (default: 4173)
- `DATABASE_URL` (default: `file:./prisma/prod.db`)
- `JWT_SECRET` / `LLM_API_KEY` (required for production usage)

## Notes

- The API bundle includes production `node_modules` in `dist/api/node_modules`.
- On first run, the database is initialized with AI provider configurations.
- Register your first user through the web interface - the first user will automatically become an administrator.
'@
$readme | Out-File -FilePath "dist/README.md" -Encoding UTF8

Print-Success "Production startup script created: dist/start-production.sh"
Print-Success "Production startup script created: dist/start-production.ps1"
Print-Success "dist/README.md created"

# Print deployment summary
Print-Success "🎉 ExamForge deployment completed successfully!"

Write-Host ""
Write-Host "📋 Deployment Summary:"
Write-Host "   - Dependencies installed"
Write-Host "   - Applications built"
Write-Host "   - Database initialized"
Write-Host "   - Production package created in dist/ directory"
Write-Host ""
Write-Host "📝 Note: Register your first user through the web interface."
Write-Host "   The first registered user will automatically become an administrator."
Write-Host ""

Print-Status "Starting production server..."
Write-Host ""

# Start the production server
Set-Location "dist"
& powershell -ExecutionPolicy Bypass -File ".\start-production.ps1"
