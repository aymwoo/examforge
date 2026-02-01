#!/bin/bash

# ExamForge Development Startup Script
# Quickly starts the development environment (Install -> Generate -> Build Types -> Run)

set -e  # Exit on error

# 获取脚本所在目录的绝对路径（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 数据库文件的固定绝对路径
DB_PATH="$SCRIPT_DIR/apps/api/prisma/dev.db"
DATABASE_URL="file:$DB_PATH"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 0. Check .env file
if [ ! -f ".env" ]; then
    print_error ".env 文件不存在!"
    if [ -f ".env.example" ]; then
        print_status "正在从 .env.example 创建 .env 文件..."
        cp .env.example .env
        print_success ".env 文件已创建，请根据需要修改配置"
    else
        print_status "请创建 .env 文件并配置以下必要参数："
        echo "   - DATABASE_URL: 数据库连接字符串"
        echo "   - JWT_SECRET: JWT 密钥"
        echo "   - 其他 AI API 相关配置"
        exit 1
    fi
fi

# 确保 .env 中的 DATABASE_URL 使用正确的绝对路径
print_status "🔧 检查数据库路径配置..."
if grep -q "DATABASE_URL" .env; then
    # 更新 DATABASE_URL 为正确的绝对路径
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"file:$DB_PATH\"|" .env
    else
        # Linux
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"file:$DB_PATH\"|" .env
    fi
    print_success "数据库路径已设置: $DB_PATH"
else
    # 添加 DATABASE_URL
    echo "DATABASE_URL=\"file:$DB_PATH\"" >> .env
    print_success "数据库路径已添加: $DB_PATH"
fi

print_success ".env 文件检查通过"

# 加载根目录 .env 到当前 shell 环境（供 Prisma 和其他工具使用）
print_status "📋 加载环境变量..."
set -a  # 自动导出所有变量
source .env
# 强制使用计算出的绝对路径，覆盖 .env 中可能的错误配置
export DATABASE_URL="file:$DB_PATH"
set +a

print_status "📍 数据库位置: $DB_PATH"

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
