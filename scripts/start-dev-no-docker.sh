#!/bin/bash

# ExamForge Development Startup Script (No Docker)
# Simultaneously starts API (NestJS) and Web (Vite) services without using Docker images
# Usage:
#   ./scripts/start-dev-no-docker.sh [--rebuild] [--api-only] [--web-only]

# Colors definition
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print colored messages
print_info() {
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

# Initialize variables
REBUILD=false
API_ONLY=false
WEB_ONLY=false

# Parse command-line arguments
for arg in "$@"; do
  case $arg in
    --rebuild)
      REBUILD=true
      ;;
    --api-only)
      API_ONLY=true
      ;;
    --web-only)
      WEB_ONLY=true
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: $0 [--rebuild] [--api-only] [--web-only]"
      exit 1
      ;;
  esac
done

# Check if both --api-only and --web-only are specified
if [ "$API_ONLY" = true ] && [ "$WEB_ONLY" = true ]; then
  print_error "--api-only and --web-only cannot be used together"
  exit 1
fi

# Check dependencies
if ! command -v pnpm &> /dev/null; then
  print_error "pnpm is not installed. Please install pnpm first."
  exit 1
fi

if ! command -v node &> /dev/null; then
  print_error "Node.js is not installed. Please install Node.js first."
  exit 1
fi

# Check if required directories exist
if [ ! -d "apps/api" ]; then
  print_error "apps/api directory not found"
  exit 1
fi

if [ ! -d "web" ]; then
  print_error "web directory not found"
  exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ] || [ ! -d "apps/api/node_modules" ] || [ ! -d "web/node_modules" ]; then
  print_warning "Dependencies not found. Installing..."
  pnpm install
  if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
  fi
fi

# Clean up any processes that might be using the ports
print_info "Checking for running services on ports 3000 and 5173..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
  fuser -k 3000/tcp 2>/dev/null || true
  print_info "Killed process on port 3000"
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null; then
  fuser -k 5173/tcp 2>/dev/null || true
  print_info "Killed process on port 5173"
fi

sleep 2

# Rebuild if requested
if [ "$REBUILD" = true ]; then
  print_info "Rebuilding all packages..."
  pnpm build
  if [ $? -ne 0 ]; then
    print_error "Build failed"
    exit 1
  fi
  print_success "Build completed"
fi

# Prepare SQLite database if needed
if [ ! -f "apps/api/prisma/dev.db" ]; then
  print_info "Initializing SQLite database..."
  (cd apps/api && npx prisma migrate dev --name init)
  if [ $? -ne 0 ]; then
    print_warning "Failed to initialize database with migration, trying db push..."
    (cd apps/api && npx prisma db push)
  fi
fi

# Create logs directory
LOG_DIR="$(pwd)/logs"
mkdir -p "$LOG_DIR"

# Function to start API service
start_api() {
  print_info "Starting API service..."
  (cd apps/api && pnpm start:dev > "$LOG_DIR/api.log" 2>&1) &
  API_PID=$!
  
  # Wait for API to start
  sleep 5
  
  # Check if API started successfully
  if ps -p $API_PID > /dev/null; then
    print_success "API started successfully (PID: $API_PID)"
    echo "API logs available at: $LOG_DIR/api.log"
  else
    print_error "API failed to start. Check $LOG_DIR/api.log for details."
    tail -30 "$LOG_DIR/api.log"
    return 1
  fi
}

# Function to start Web service
start_web() {
  print_info "Starting Web service..."
  (cd web && pnpm dev > "$LOG_DIR/web.log" 2>&1) &
  WEB_PID=$!
  
  # Wait for Web to start
  sleep 5
  
  # Check if Web started successfully
  if ps -p $WEB_PID > /dev/null; then
    print_success "Web started successfully (PID: $WEB_PID)"
    echo "Web logs available at: $LOG_DIR/web.log"
  else
    print_error "Web failed to start. Check $LOG_DIR/web.log for details."
    tail -30 "$LOG_DIR/web.log"
    return 1
  fi
}

# Main execution
if [ "$WEB_ONLY" = false ]; then
  start_api
  if [ $? -ne 0 ]; then
    print_error "Failed to start API service. Exiting."
    exit 1
  fi
fi

if [ "$API_ONLY" = false ]; then
  start_web
  if [ $? -ne 0 ]; then
    print_error "Failed to start Web service. Exiting."
    exit 1
  fi
fi

# Display success message
echo ""
print_success "ExamForge development services are running!"
if [ "$WEB_ONLY" = false ]; then
  echo "API: http://localhost:3000/api"
fi
if [ "$API_ONLY" = false ]; then
  echo "Web: http://localhost:5173/"
fi
echo ""
print_info "Logs available at: $LOG_DIR/"
echo ""
print_info "Press Ctrl+C to stop all services"

# Cleanup function
cleanup() {
  echo ""
  print_info "Stopping services..."
  
  if [ ! -z "${API_PID:-}" ] && ps -p $API_PID > /dev/null; then
    kill $API_PID 2>/dev/null
    print_success "API stopped"
  fi
  
  if [ ! -z "${WEB_PID:-}" ] && ps -p $WEB_PID > /dev/null; then
    kill $WEB_PID 2>/dev/null
    print_success "Web stopped"
  fi
  
  # Additional cleanup
  pkill -f "nest start" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  
  print_info "All services stopped."
  exit 0
}

# Trap signals to handle cleanup
trap cleanup SIGINT SIGTERM

# Monitor services
while true; do
  if [ "$WEB_ONLY" = false ] && [ ! -z "${API_PID:-}" ] && ! ps -p $API_PID > /dev/null; then
    print_warning "API process stopped unexpectedly!"
    tail -50 "$LOG_DIR/api.log"
    break
  fi
  
  if [ "$API_ONLY" = false ] && [ ! -z "${WEB_PID:-}" ] && ! ps -p $WEB_PID > /dev/null; then
    print_warning "Web process stopped unexpectedly!"
    tail -50 "$LOG_DIR/web.log"
    break
  fi
  
  sleep 5
done

# If we reach here, one of the services stopped, so cleanup
cleanup