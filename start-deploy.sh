#!/bin/bash

# ExamForge Deployment Script
# This script deploys the ExamForge service from scratch, including database initialization

set -e  # Exit on any error

echo "🚀 Starting ExamForge deployment..."

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default registry (China)
REGISTRY_URL="https://registry.npmmirror.com"
REGISTRY_LABEL="China Mirror (npmmirror.com)"
BUILD_ONLY=false

# Parse arguments
for arg in "$@"
do
    case $arg in
        --official)
            REGISTRY_URL="https://registry.npmjs.org"
            REGISTRY_LABEL="Official NPM Registry"
            ;;
        --china)
            REGISTRY_URL="https://registry.npmmirror.com"
            REGISTRY_LABEL="China Mirror (npmmirror.com)"
            ;;
        --build-only)
            BUILD_ONLY=true
            ;;
    esac
done

print_status "🔧 Configuration: Using $REGISTRY_LABEL"
if [ "$BUILD_ONLY" = true ]; then
    print_status "🔧 Configuration: Build only mode (will not start server)"
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm is not installed. Attempting to install via npm..."
    if command -v npm &> /dev/null; then
        npm install -g pnpm
        print_success "✅ pnpm installed"
    else
        print_error "npm is not installed. Please install Node.js (with npm) first to install pnpm."
        exit 1
    fi
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
MIN_NODE_VERSION="18.0.0"

if [[ $(printf '%s\n' "$MIN_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1) != "$MIN_NODE_VERSION" ]]; then
    print_error "Node.js version must be >= $MIN_NODE_VERSION. Current version: $NODE_VERSION"
    exit 1
fi

print_status "✅ Prerequisites check passed"

# Navigate to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

print_status "📁 Working in project directory: $PROJECT_ROOT"

# Set npm registry
print_status "🌐 Setting npm registry to $REGISTRY_LABEL..."
pnpm config set registry $REGISTRY_URL
print_success "✅ npm registry configured"

# Install dependencies
print_status "📦 Installing dependencies..."
CI=true pnpm install
print_success "✅ Dependencies installed"

# Check if DATABASE_URL is set in .env, otherwise use default
if [ ! -f "apps/api/.env" ]; then
    print_warning "apps/api/.env file not found. Creating from example..."
    cp apps/api/.env.example apps/api/.env
fi

# Generate Prisma client (required for build)
print_status "⚙️ Generating Prisma client..."
pnpm --filter ./apps/api run prisma:generate
print_success "✅ Prisma client generated"

# Build shared types
print_status "🔨 Building shared types..."
pnpm --filter ./packages/shared-types run build
print_success "✅ Shared types built"

# Build the applications
print_status "🔨 Building applications..."
pnpm run build:api
print_success "✅ Applications built"

# Setup database
print_status "💾 Setting up database..."

# Navigate to API directory
cd apps/api

# Apply all migrations to create the database schema
print_status "🔄 Applying database migrations..."
pnpm exec prisma migrate deploy
print_success "✅ Database migrations applied"

# Seed the database with initial AI providers
print_status "🌱 Seeding database with initial data..."

# Run the AI provider seed script
print_status "   Creating initial AI providers..."
pnpm exec tsx prisma/seed-ai-providers.ts

print_success "✅ Database seeded with initial data"

# Return to project root
cd ../..

# Build the web application
print_status "🌐 Building web application..."
pnpm run build:web
print_success "✅ Web application built"

# Create production build directory if it doesn't exist
mkdir -p dist

# Copy built applications to distribution directory
print_status "📦 Packaging applications..."
mkdir -p dist/api dist/web

# Copy API build
cp -r apps/api/dist/* dist/api/ 2>/dev/null || print_warning "No API build found, skipping API packaging"

# Copy prisma schema + baseline migration + seed scripts
mkdir -p dist/api/prisma/migrations
cp apps/api/prisma/schema.prisma dist/api/prisma/schema.prisma
cp -r apps/api/prisma/migrations/* dist/api/prisma/migrations/
cp apps/api/prisma/seed-users.ts dist/api/prisma/ 2>/dev/null || true
cp apps/api/prisma/seed-ai-providers.ts dist/api/prisma/ 2>/dev/null || true

# Copy assets/uploads (best effort)
mkdir -p dist/api/assets dist/api/uploads
cp -r apps/api/assets/* dist/api/assets/ 2>/dev/null || true

# Copy web build
cp -r web/dist/* dist/web/ 2>/dev/null || print_warning "No web build found, skipping web packaging"

# Generate minimal API package.json for dist runtime
cat > dist/api/package.json << 'EOF'
{
  "name": "examforge-api-dist",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "start": "node main.js",
    "db:generate": "npx prisma generate --schema=./prisma/schema.prisma",
    "db:migrate": "npx prisma migrate deploy --schema=./prisma/schema.prisma",
    "db:seed": "npx tsx ./prisma/seed-ai-providers.ts",
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
    "cookie-parser": "^1.4.7",
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
EOF

print_status "📦 Installing production dependencies into dist/api..."
(cd dist/api && npm install --omit=dev --registry $REGISTRY_URL)

print_success "✅ Applications packaged to dist/ directory"

# Create a startup script for production
cat > dist/start-production.sh << 'EOF'
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

# Default DB (SQLite) location - use absolute path for consistency
DB_PATH="$SCRIPT_DIR/api/prisma/prod.db"
export DATABASE_URL="${DATABASE_URL:-file:$DB_PATH}"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"

# Security warning for default JWT_SECRET
if [ "${JWT_SECRET:-default_secret_for_dev}" = "default_secret_for_dev" ]; then
    echo -e "${YELLOW}[WARNING]${NC} Using default JWT_SECRET. Please set a secure JWT_SECRET in production!"
fi

# Initialize database if missing
if [ ! -f "$SCRIPT_DIR/api/prisma/prod.db" ]; then
    print_status "Initializing database..."
    (cd "$SCRIPT_DIR/api" && pnpm run db:init)
fi

# Start the API server in background
print_status "Starting API server..."
cd "$SCRIPT_DIR/api" && node main.js &
API_PID=$!

# Wait a moment for the API to start
sleep 3

# Check if API is running
if kill -0 $API_PID 2>/dev/null; then
    print_success "✅ API server started (PID: $API_PID)"
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

# Wait for termination signal
trap "echo -e '\n🛑 Shutting down ExamForge...'; kill $API_PID $WEB_PID; exit" SIGINT SIGTERM

# Print final confirmation
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

# Wait indefinitely
while true; do
    sleep 1
done
EOF

cat > dist/start-production.ps1 << 'EOF'
<#
Production startup script for ExamForge (Windows)
#>

$ErrorActionPreference = 'Stop'
Write-Host "🚀 Starting ExamForge in production mode..."

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js is not installed."
  exit 1
}

if (-not (Test-Path (Join-Path $ScriptDir 'api/node_modules'))) {
  Write-Error "Missing dist/api/node_modules. Please re-run start-deploy.sh."
  exit 1
}

# Default DB (SQLite) location - use absolute path for consistency
$dbPath = Join-Path $ScriptDir 'api\prisma\prod.db'
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "file:$dbPath" }
$env:NODE_ENV = if ($env:NODE_ENV) { $env:NODE_ENV } else { 'production' }
$env:PORT = if ($env:PORT) { $env:PORT } else { '3000' }
$env:WEB_PORT = if ($env:WEB_PORT) { $env:WEB_PORT } else { '4173' }

# Security warning for default JWT_SECRET
if (-not $env:JWT_SECRET -or $env:JWT_SECRET -eq 'default_secret_for_dev') {
  Write-Host "[WARNING] Using default JWT_SECRET. Please set a secure JWT_SECRET in production!" -ForegroundColor Yellow
}

if (-not (Test-Path $dbPath)) {
  Write-Host "[INFO] Initializing database..."
  Push-Location (Join-Path $ScriptDir 'api')
  try {
    npm run db:init
  } finally {
    Pop-Location
  }
}

Write-Host "[INFO] Starting API server..."
Push-Location (Join-Path $ScriptDir 'api')
$apiProcess = Start-Process node -ArgumentList 'main.js' -PassThru
Pop-Location
Start-Sleep -Seconds 3

if ($apiProcess.HasExited) {
  Write-Error "Failed to start API server."
  exit 1
}

Write-Host "[INFO] Starting web server..."
$webScript = @'
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
'@
$webProcess = Start-Process node -ArgumentList '-e', $webScript -PassThru

Write-Host ""
Write-Host "🎉 ExamForge deployed successfully!"
Write-Host ""
Write-Host "🌐 API Server: http://localhost:$($env:PORT)"
Write-Host "📄 API Documentation: http://localhost:$($env:PORT)/api"
Write-Host "🌐 Web: http://localhost:$($env:WEB_PORT)"
Write-Host ""
Write-Host "Note: Please register your first user account through the web interface."
Write-Host "      The first registered user will automatically become an administrator."
Write-Host ""
Write-Host "Press Ctrl+C to stop the servers"

try {
  while ($true) { Start-Sleep -Seconds 1 }
} finally {
  if (-not $apiProcess.HasExited) { $apiProcess.Kill() }
  if (-not $webProcess.HasExited) { $webProcess.Kill() }
}
EOF

cat > dist/README.md << 'EOF'
# ExamForge dist Package

This folder is a standalone production bundle generated by `start-deploy.sh`.

## Quick start

```bash
./start-production.sh
```

Windows:

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
EOF

chmod +x dist/start-production.sh

print_success "✅ Production startup script created: dist/start-production.sh"
print_success "✅ Production startup script created: dist/start-production.ps1"
print_success "✅ dist/README.md created"

# Print deployment summary
print_success "🎉 ExamForge deployment completed successfully!"

echo ""
echo "📋 Deployment Summary:"
echo "   - Dependencies installed"
echo "   - Applications built"
echo "   - Database initialized"
echo "   - Production package created in dist/ directory"
echo ""
echo "📝 Note: Register your first user through the web interface."
echo "   The first registered user will automatically become an administrator."
echo ""

if [ "$BUILD_ONLY" = true ]; then
    print_success "🏁 Build complete. The 'dist' folder is ready for deployment."
    echo "You can copy the 'dist' directory to your server and run './start-production.sh'."
    exit 0
fi

print_status "Starting production server..."
echo ""

# Start the production server
cd dist && ./start-production.sh
