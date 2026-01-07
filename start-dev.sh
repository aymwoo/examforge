#!/bin/bash

# ExamForge 一键启动脚本
# 同时启动 API (NestJS) 和 Web (Vite) 服务

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 检查依赖
if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}Error: pnpm is not installed${NC}"
  exit 1
fi

# 检查是否需要安装依赖
if [ ! -d "node_modules" ] || [ ! -d "apps/api/node_modules" ] || [ ! -d "web/node_modules" ]; then
  print_warning "Dependencies not found. Installing..."
  pnpm install
fi

# 清理可能占用端口的进程
print_info "Checking for running services..."
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
sleep 2

# 启动服务
print_info "Starting ExamForge services..."
print_info "API: http://localhost:3000 (NestJS)"
print_info "Web: http://localhost:5173 (Vite)"
print_info "Press Ctrl+C to stop both services"
echo ""

# 创建日志目录
LOG_DIR="$(pwd)/logs"
mkdir -p "$LOG_DIR"

# 启动 API
print_info "Starting API..."
(cd apps/api && pnpm start:dev > "$LOG_DIR/api.log" 2>&1) &
API_PID=$!

# 等待 API 启动
sleep 3

# 检查 API 是否启动成功
if ps -p $API_PID > /dev/null; then
  print_success "API started (PID: $API_PID)"
else
  print_warning "API may have issues. Check $LOG_DIR/api.log"
  tail -30 "$LOG_DIR/api.log"
fi

# 启动 Web
print_info "Starting Web..."
(cd web && pnpm dev > "$LOG_DIR/web.log" 2>&1) &
WEB_PID=$!

# 等待 Web 启动
sleep 3

# 检查 Web 是否启动成功
if ps -p $WEB_PID > /dev/null; then
  print_success "Web started (PID: $WEB_PID)"
else
  print_warning "Web may have issues. Check $LOG_DIR/web.log"
  tail -30 "$LOG_DIR/web.log"
fi

echo ""
print_success "Both services are running!"
echo "API: http://localhost:3000/api"
echo "Web: http://localhost:5173/"
echo ""
print_info "Logs available at: $LOG_DIR/"
echo ""
print_info "Press Ctrl+C to stop all services"

# 清理函数
cleanup() {
  echo ""
  print_info "Stopping services..."

  if [ ! -z "$API_PID" ] && ps -p $API_PID > /dev/null; then
    kill $API_PID 2>/dev/null
    print_success "API stopped"
  fi

  if [ ! -z "$WEB_PID" ] && ps -p $WEB_PID > /dev/null; then
    kill $WEB_PID 2>/dev/null
    print_success "Web stopped"
  fi

  # 额外清理
  pkill -f "nest start" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true

  exit 0
}

# 捕获 Ctrl+C
trap cleanup SIGINT SIGTERM

# 持续监控服务状态
while true; do
  if ! ps -p $API_PID > /dev/null; then
    print_warning "API process stopped!"
    tail -50 "$LOG_DIR/api.log"
    break
  fi

  if ! ps -p $WEB_PID > /dev/null; then
    print_warning "Web process stopped!"
  fi

  sleep 5
done

# 如果到这里说明某个服务停止了
cleanup
