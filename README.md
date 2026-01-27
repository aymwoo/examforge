# ExamForge (智考工坊)

由 AI 驱动的多源题库和在线考试系统。

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)

## 概述

ExamForge 是一个全面的考试平台，具有以下功能：

- **AI 题目导入**：使用 OCR 和大语言模型从 Excel、PDF 和图像中提取题目
- **智能考试管理**：创建包含灵活题目选择和评分的考试
- **实时评分**：支持手动和 AI 辅助答案评估
- **学生分析**：详细的性能报告和 AI 生成的见解
- **批量操作**：高效管理大规模考试

## 技术栈

| 层次     | 技术                                  |
| -------- | ------------------------------------- |
| 前端     | React + Vite + Tailwind CSS           |
| 后端     | NestJS + TypeScript                   |
| 数据库   | SQLite (开发) / PostgreSQL (生产)     |
| ORM      | Prisma                                |
| AI/OCR   | LLM 提供商 (Qwen, OpenAI) + PaddleOCR |
| API 文档 | Swagger/OpenAPI                       |

## 项目结构

```
examforge/
├── apps/
│   ├── api/              # NestJS REST API
│   └── web/              # React 前端
├── packages/
│   ├── shared-types/     # 共享 TypeScript 类型
│   └── config/           # 共享 Prettier/Tailwind 配置
├── scripts/              # 构建和部署脚本
├── docs/                 # 文档
└── AGENTS.md             # 代理/Copilot 指南
```

## 快速开始

### 系统要求

- Node.js >= 18
- pnpm >= 8

### 安装

```bash
# 克隆仓库
git clone <repo-url>
cd examforge

# 安装依赖
pnpm install

# 生成 Prisma 客户端
pnpm --filter ./apps/api run prisma:generate

# 运行数据库迁移
# 在生产环境中使用 deploy (对 sqlite/postgres 安全)
pnpm --filter ./apps/api run prisma:deploy

# 构建 API 和 Web
pnpm build:api
pnpm build:web

# 启动生产服务器
pnpm start:api
```

#### 3. Docker 部署

推荐在生产环境中使用 Docker 部署。项目包含多种 docker-compose 配置以适应不同环境：

**可用配置：**

- `docker-compose.default.yml`: 标准部署，使用官方 npm 仓库 (推荐大多数用户使用)
- `docker-compose.build.yml`: 中国优化版，使用 npmmirror.com 仓库和阿里云 APK 镜像
- `docker-compose.images.yml`: 替代构建配置

**Docker 快速开始：**

```bash
# 标准部署
docker compose -f docker/docker-compose.default.yml up -d

# 中国优化部署
docker compose -f docker/docker-compose.build.yml up -d

# 首先构建镜像 (推荐)
docker compose -f docker/docker-compose.default.yml build
docker compose -f docker/docker-compose.default.yml up -d
```

**环境变量：**

在项目根目录创建 `.env` 文件或设置环境变量：

```bash
# 数据库 (Docker 中的 PostgreSQL, 本地开发用 SQLite)
DATABASE_URL=postgresql://examforge:examforge@postgres:5432/examforge

# 安全
JWT_SECRET=your-secure-jwt-secret-here

# AI 配置 (可选)
LLM_PROVIDER=qwen
LLM_API_KEY=your-llm-api-key
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# Redis (可选, 用于缓存)
REDIS_HOST=redis
REDIS_PORT=6379
```

**Docker 服务：**

- **API**: NestJS 后端运行在端口 3000
- **Web**: React 前端运行在端口 80
- **PostgreSQL**: 数据库运行在端口 5432
- **Redis**: 缓存服务器运行在端口 6379

**数据库初始化：**

API 服务在启动时自动运行 Prisma 迁移。初始设置如下：

```bash
# 访问 API 容器
docker compose -f docker/docker-compose.default.yml exec api sh

# 如需要手动运行迁移
cd apps/api && pnpm prisma:deploy
```

### 更新应用程序

#### 1. 拉取最新更改

```bash
# 拉取最新代码
git pull origin main

# 安装任何新依赖项
pnpm install

# 生成 Prisma 客户端 (如果模式有变化)
pnpm --filter ./apps/api run prisma:generate

# 运行任何新的数据库迁移
# 使用 deploy 以避免 sqlite 重置
pnpm --filter ./apps/api run prisma:deploy

# 重新构建应用程序
pnpm build:api
pnpm build:web
```

#### 2. 重启服务

更新后，重启您的服务：

- 如果使用 PM2 运行: `pm2 restart all`
- 如果使用 systemd 运行: `sudo systemctl restart examforge-api`
- 如果使用 Docker 运行: `docker-compose up -d --build`

#### 3. 备份策略

在生产环境中更新前，请创建备份：

```bash
# 数据库备份 (对于 PostgreSQL)
pg_dump -h host -U username -W -F t database_name > backup_$(date +%Y%m%d_%H%M%S).tar

# 对于 SQLite
cp dev.db backup_$(date +%Y%m%d_%H%M%S).db
```

## 开发

有关开发工作流程，请参阅各个包的 README：

- [API 开发](apps/api/README.md)
- [Web 开发](web/README.md)

## 主要功能

### 题库

- 多类型支持：单选题、多选题、判断题、填空题、论述题
- 从 Excel/CSV 文件导入
- 通过 OCR 从 PDF 提取
- 通过 AI 视觉从图像中提取
- 基于标签的组织和难度级别

### 考试管理

- 创建具有可配置持续时间和评分的考试
- 添加具有自定义顺序和分值的问题
- 支持永久和临时学生账户
- 实时考试状态跟踪
- 考试复制和归档

### 评分系统

- 手动教师评分界面
- AI 辅助客观题自动评分
- 批量操作（重置、批准、审核）
- 详细评分分析
- AI 生成的绩效报告

### AI 集成

- 从图像/PDF 中提取问题
- 答案分析和自动评分
- 学生表现洞察
- 可定制的 AI 提示
- 长时间任务的实时 SSE 流

## API 文档

API 服务器运行后，在以下位置访问 Swagger 文档：

- 开发环境：http://localhost:3000/api
- 生产环境：https://your-domain.com/api

### 核心端点

| 资源                     | 方法                   | 描述      |
| ------------------------ | ---------------------- | --------- |
| `/questions`             | GET, POST, PUT, DELETE | 题库 CRUD |
| `/exams`                 | GET, POST, PUT, DELETE | 考试管理  |
| `/exams/:id/questions`   | POST, DELETE, PUT      | 题目分配  |
| `/exams/:id/students`    | GET, POST              | 学生管理  |
| `/exams/:id/submissions` | GET, POST              | 提交跟踪  |
| `/import`                | POST                   | 导入题目  |

## 环境变量

### API (.env)

```bash
# 数据库
DATABASE_URL="file:./dev.db"  # 开发用 SQLite

# AI 配置
LLM_PROVIDER="qwen"
LLM_API_KEY="your-api-key"
LLM_MODEL="qwen-turbo"

# OCR
OCR_ENGINE="paddleocr"

# 服务器
PORT=3000
JWT_SECRET="your-jwt-secret"
```

## 文档

- [API 文档](apps/api/README.md) - 后端实现细节
- [导入历史](IMPORT_HISTORY.md) - 题目导入功能
- [PDF/图像处理](PDF_IMAGE_PROCESSING.md) - OCR 功能
- [题目排序](QUESTION_ORDERING.md) - 导入顺序管理
- [导出设计](EXPORT_DESIGN.md) - 考试数据导出
- [代理指南](AGENTS.md) - AI 编码助手指南

## 贡献

1. Fork 仓库
2. 创建功能分支
3. 进行修改
4. 运行 lint 和测试
5. 提交拉取请求

## 生产部署

要从头开始完整的生产部署，请使用部署脚本：

### Linux / macOS

```bash
# 使脚本可执行
chmod +x start-deploy.sh

# 运行部署脚本
./start-deploy.sh
```

### Windows

**PowerShell (推荐):**

```powershell
powershell -ExecutionPolicy Bypass -File .\start-deploy.ps1
```

**命令提示符:**

```cmd
start-deploy.bat
```

### 部署脚本做什么

- 安装所有依赖项
- 构建 API 和 Web 应用程序
- 使用所有迁移初始化数据库
- 使用初始 AI 提供程序配置填充数据库
- 将所有内容打包到 `dist/` 目录以供生产使用
- 创建生产启动脚本
- 自动启动生产服务器

### 手动启动生产服务器

部署后，您可以使用以下命令启动生产服务器：

**Linux / macOS:**

```bash
cd dist && ./start-production.sh
```

**Windows (PowerShell):**

```powershell
cd dist
powershell -ExecutionPolicy Bypass -File .\start-production.ps1
```

### 首个用户注册

系统不包含默认用户账户。通过 Web 界面注册您的第一个用户：

1. 在浏览器中打开 http://localhost:4173
2. 点击“注册”创建新账户
3. **第一个注册的用户将自动成为系统管理员**，拥有全部权限
4. 后续用户需要管理员批准才能登录

### 迁移管理

项目包含管理数据库迁移的工具：

1. **合并迁移**：将所有单独的迁移文件合并为单个 SQL 文件：

   ```bash
   ./consolidate-migrations.sh
   ```

   这会创建一个 `consolidated-migrations.sql` 文件，其中包含单个文件中的所有数据库模式更改，适用于生产部署或数据库重置。

2. **生成单一迁移**：基于当前模式创建新的迁移：

   ```bash
   ./generate-single-migration.sh
   ```

   这会生成一个表示完整数据库模式的单个 SQL 文件。

## 许可证

ISC 许可证 - 详情请参见 LICENSE 文件。

---

用 ❤️ 为教育工作者和学生打造
