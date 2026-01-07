#!/bin/bash

# ExamForge 一键启动脚本
# 同时启动 API (NestJS) 和 Web (Vite) 服务

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# 启动服务
print_info "Starting ExamForge services..."
print_info "API: http://localhost:3000 (NestJS)"
print_info "Web: http://localhost:5173 (Vite)"
echo ""

# 使用 pnpm 并行启动所有服务
pnpm dev

# 如果上面的命令失败，提供替代方案
if [ $? -ne 0 ]; then
  print_warning "Parallel startup failed, trying alternative method..."
  print_info "Starting API and Web in separate terminals..."

  # 检查是否支持终端多窗口（macOS/Linux）
  if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # macOS/Linux: 在新终端窗口启动
    osascript -e 'tell application "Terminal" to do script "cd '"$(pwd)"' && pnpm --filter @examforge/api start:dev"' 2>/dev/null || \
    ( pnpm --filter @examforge/api start:dev & ) &

    sleep 2
    pnpm --filter @examforge/web dev
  else
    # 其他系统：后台启动 API，前台启动 Web
    print_info "Starting API in background..."
    pnpm --filter @examforge/api start:dev &
    API_PID=$!

    sleep 3
    print_info "Starting Web..."
    pnpm --filter @examforge/web dev

    # 清理
    kill $API_PID 2>/dev/null || true
  fi
fi
