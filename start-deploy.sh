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

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is not installed. Please install pnpm first."
    exit 1
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

# Install dependencies
print_status "📦 Installing dependencies..."
pnpm install
print_success "✅ Dependencies installed"

# Build the applications
print_status "🔨 Building applications..."
pnpm build
print_success "✅ Applications built"

# Setup database
print_status "💾 Setting up database..."

# Check if DATABASE_URL is set in .env, otherwise use default
if [ ! -f "apps/api/.env" ]; then
    print_warning "apps/api/.env file not found. Creating from example..."
    cp apps/api/.env.example apps/api/.env
fi

# Navigate to API directory
cd apps/api

# Generate Prisma client
print_status "⚙️ Generating Prisma client..."
pnpm prisma:generate
print_success "✅ Prisma client generated"

# Apply all migrations to create the database schema
print_status "🔄 Applying database migrations..."
pnpm prisma migrate deploy
print_success "✅ Database migrations applied"

# Seed the database with initial data
print_status "🌱 Seeding database with initial data..."

# Run the user seed script first
print_status "   Creating initial users..."
npx tsx prisma/seed-users.ts

# Run the AI provider seed script
print_status "   Creating initial AI providers..."
npx tsx prisma/seed-ai-providers.ts

print_success "✅ Database seeded with initial data"

# Return to project root
cd ../..

# Build the web application
print_status "🌐 Building web application..."
cd web
pnpm build
print_success "✅ Web application built"

# Return to project root
cd ..

# Create production build directory if it doesn't exist
mkdir -p dist

# Copy built applications to distribution directory
print_status "📦 Packaging applications..."
mkdir -p dist/api dist/web

# Copy API build
cp -r apps/api/dist/* dist/api/ 2>/dev/null || print_warning "No API build found, skipping API packaging"

# Copy web build
cp -r web/dist/* dist/web/ 2>/dev/null || print_warning "No web build found, skipping web packaging"

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

# Navigate to the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Print deployment summary
echo ""
echo "🎉 ExamForge deployed successfully!"
echo ""
echo "🌐 API Server: http://localhost:3000"
echo "📄 API Documentation: http://localhost:3000/api"
echo ""
echo "Admin credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Teacher credentials:"
echo "  Username: teacher"
echo "  Password: teacher123"
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

# Wait for termination signal
trap "echo -e '\n🛑 Shutting down ExamForge...'; kill $API_PID; exit" SIGINT SIGTERM

# Wait indefinitely
while true; do
    sleep 1
done
EOF

chmod +x dist/start-production.sh

print_success "✅ Production startup script created: dist/start-production.sh"

# Print deployment summary
print_success "🎉 ExamForge deployment completed successfully!"

echo ""
echo "📋 Deployment Summary:"
echo "   - Dependencies installed"
echo "   - Applications built"
echo "   - Database initialized and seeded"
echo "   - Production package created in dist/ directory"
echo ""
echo "🔐 Default Credentials:"
echo "   Admin: admin / admin123"
echo "   Teacher: teacher / teacher123"
echo ""
echo "🚀 To start the production server, run:"
echo "   cd dist && ./start-production.sh"
echo ""

print_status "Deployment script completed!"