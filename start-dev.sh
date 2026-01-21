#!/bin/bash

# ExamForge Development Startup Script
# Quickly starts the development environment (Install -> Generate -> Build Types -> Run)

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 1. Check/Install pnpm
if ! command -v pnpm &> /dev/null; then
    print_status "pnpm not found. Installing via npm..."
    npm install -g pnpm
fi

# 2. Install dependencies
print_status "📦 Installing dependencies..."
pnpm install

# 3. Generate Prisma Client (Required for API and Shared Types)
print_status "⚙️ Generating Prisma client..."
pnpm --filter ./apps/api run prisma:generate

# 4. Build Shared Types (Required for Frontend and Backend)
print_status "🔨 Building shared types..."
pnpm --filter ./packages/shared-types run build

# 5. Database Setup (Ensure migrations are applied)
print_status "🔄 Checking database migrations..."
# We use migrate deploy to safely apply pending migrations without interactive prompts
pnpm --filter ./apps/api exec prisma migrate deploy

# 6. Start Dev Servers
print_status "🚀 Starting development servers (API + Web)..."
print_success "Development environment is ready!"
echo "   - API: http://localhost:3000"
echo "   - Web: http://localhost:5173"
echo "   (Press Ctrl+C to stop)"

pnpm dev
