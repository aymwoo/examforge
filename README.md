# ExamForge (智考工坊)

AI-driven multi-source question bank and online examination system.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)

## Overview

ExamForge is a comprehensive examination platform featuring:

- **AI-Powered Question Import**: Extract questions from Excel, PDF, and images using OCR and LLM
- **Smart Exam Management**: Create exams with flexible question selection and scoring
- **Real-time Grading**: Support for both manual and AI-assisted answer evaluation
- **Student Analytics**: Detailed performance reports with AI-generated insights
- **Batch Operations**: Efficient management of large-scale examinations

## Tech Stack

| Layer    | Technology                               |
| -------- | ---------------------------------------- |
| Frontend | React + Vite + Tailwind CSS              |
| Backend  | NestJS + TypeScript                      |
| Database | SQLite (dev) / PostgreSQL (prod)         |
| ORM      | Prisma                                   |
| AI/OCR   | LLM providers (Qwen, OpenAI) + PaddleOCR |
| API Docs | Swagger/OpenAPI                          |

## Project Structure

```
examforge/
├── apps/
│   ├── api/              # NestJS REST API
│   └── web/              # React frontend
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   └── config/           # Shared Prettier/Tailwind config
├── scripts/              # Build and deployment scripts
├── docs/                 # Documentation
└── AGENTS.md             # Agent/Copilot guidelines
```

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd examforge

# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter ./apps/api run prisma:generate

# Run database migrations
# Use deploy in production (safe for sqlite/postgres)
pnpm --filter ./apps/api run prisma:deploy

# Build both API and Web
pnpm build:api
pnpm build:web

# Start production servers
pnpm start:api
```

#### 3. Docker Deployment

Docker deployment is recommended for production. The project includes multiple docker-compose configurations for different environments:

**Available Configurations:**

- `docker-compose.default.yml`: Standard deployment with official npm registry (recommended for most users)
- `docker-compose.build.yml`: China-optimized with npmmirror.com registry and Aliyun APK mirrors
- `docker-compose.images.yml`: Alternative build configuration

**Quick Start with Docker:**

```bash
# For standard deployment
docker compose -f docker/docker-compose.default.yml up -d

# For China-optimized deployment
docker compose -f docker/docker-compose.build.yml up -d

# Build images first (recommended)
docker compose -f docker/docker-compose.default.yml build
docker compose -f docker/docker-compose.default.yml up -d
```

**Environment Variables:**

Create a `.env` file in the project root or set environment variables:

```bash
# Database (PostgreSQL in Docker, SQLite for local dev)
DATABASE_URL=postgresql://examforge:examforge@postgres:5432/examforge

# Security
JWT_SECRET=your-secure-jwt-secret-here

# AI Configuration (optional)
LLM_PROVIDER=qwen
LLM_API_KEY=your-llm-api-key
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# Redis (optional, for caching)
REDIS_HOST=redis
REDIS_PORT=6379
```

**Docker Services:**

- **API**: NestJS backend on port 3000
- **Web**: React frontend on port 80
- **PostgreSQL**: Database on port 5432
- **Redis**: Cache server on port 6379

**Database Initialization:**

The API service automatically runs Prisma migrations on startup. For initial setup:

```bash
# Access the API container
docker compose -f docker/docker-compose.default.yml exec api sh

# Run migrations manually if needed
cd apps/api && pnpm prisma:deploy
```

### Updating the Application

#### 1. Pull Latest Changes

```bash
# Pull latest code
git pull origin main

# Install any new dependencies
pnpm install

# Generate Prisma client (if schema changed)
pnpm --filter ./apps/api run prisma:generate

# Run any new database migrations
# Use deploy to avoid sqlite resets
pnpm --filter ./apps/api run prisma:deploy

# Rebuild the application
pnpm build:api
pnpm build:web
```

#### 2. Restart Services

After updating, restart your services:

- If running with PM2: `pm2 restart all`
- If running with systemd: `sudo systemctl restart examforge-api`
- If running with Docker: `docker-compose up -d --build`

#### 3. Backup Strategy

Before updating in production, create a backup:

```bash
# Database backup (for PostgreSQL)
pg_dump -h host -U username -W -F t database_name > backup_$(date +%Y%m%d_%H%M%S).tar

# For SQLite
cp dev.db backup_$(date +%Y%m%d_%H%M%S).db
```

## Development

For development workflows, see the individual package READMEs:

- [API Development](apps/api/README.md)
- [Web Development](web/README.md)

## Key Features

### Question Bank

- Multi-type support: Single choice, multiple choice, true/false, fill-in, essay
- Import from Excel/CSV files
- Extract from PDF with OCR
- Extract from images with AI vision
- Tag-based organization and difficulty levels

### Exam Management

- Create exams with configurable duration and scoring
- Add questions with custom order and point values
- Support for permanent and temporary student accounts
- Real-time exam status tracking
- Exam copy and archiving

### Grading System

- Manual teacher grading interface
- AI-assisted auto-grading for objective questions
- Batch operations (reset, approve, review)
- Detailed grading analytics
- AI-generated performance reports

### AI Integration

- Question extraction from images/PDFs
- Answer analysis and auto-grading
- Student performance insights
- Customizable AI prompts
- Real-time SSE streaming for long-running tasks

## API Documentation

Once the API server is running, access Swagger documentation at:

- Development: http://localhost:3000/api
- Production: https://your-domain.com/api

### Core Endpoints

| Resource                 | Methods                | Description         |
| ------------------------ | ---------------------- | ------------------- |
| `/questions`             | GET, POST, PUT, DELETE | Question bank CRUD  |
| `/exams`                 | GET, POST, PUT, DELETE | Exam management     |
| `/exams/:id/questions`   | POST, DELETE, PUT      | Question assignment |
| `/exams/:id/students`    | GET, POST              | Student management  |
| `/exams/:id/submissions` | GET, POST              | Submission tracking |
| `/import`                | POST                   | Import questions    |

## Environment Variables

### API (.env)

```bash
# Database
DATABASE_URL="file:./dev.db"  # SQLite for dev

# AI Configuration
LLM_PROVIDER="qwen"
LLM_API_KEY="your-api-key"
LLM_MODEL="qwen-turbo"

# OCR
OCR_ENGINE="paddleocr"

# Server
PORT=3000
JWT_SECRET="your-jwt-secret"
```

## Documentation

- [API Documentation](apps/api/README.md) - Backend implementation details
- [Import History](IMPORT_HISTORY.md) - Question import feature
- [PDF/Image Processing](PDF_IMAGE_PROCESSING.md) - OCR capabilities
- [Question Ordering](QUESTION_ORDERING.md) - Import order management
- [Export Design](EXPORT_DESIGN.md) - Exam data export
- [Agent Guidelines](AGENTS.md) - Guidelines for AI coding assistants

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run lint and tests
5. Submit a pull request

## Production Deployment

For a complete production deployment from scratch, use the deployment script:

### Linux / macOS

```bash
# Make the script executable
chmod +x start-deploy.sh

# Run the deployment script
./start-deploy.sh
```

### Windows

**PowerShell (Recommended):**

```powershell
powershell -ExecutionPolicy Bypass -File .\start-deploy.ps1
```

**Command Prompt:**

```cmd
start-deploy.bat
```

### What the deployment script does

- Install all dependencies
- Build both API and web applications
- Initialize the database with all migrations
- Seed the database with initial AI provider configurations
- Package everything for production in `dist/` directory
- Create production startup scripts
- Start the production server automatically

### Starting the production server manually

After deployment, you can start the production server with:

**Linux / macOS:**

```bash
cd dist && ./start-production.sh
```

**Windows (PowerShell):**

```powershell
cd dist
powershell -ExecutionPolicy Bypass -File .\start-production.ps1
```

### First User Registration

The system does not include default user accounts. Register your first user through the web interface:

1. Open http://localhost:4173 in your browser
2. Click "Register" to create a new account
3. **The first registered user will automatically become the system administrator** with full privileges
4. Subsequent users will need administrator approval before they can log in

### Migration Management

The project includes tools to manage database migrations:

1. **Consolidate Migrations**: Combine all individual migration files into a single SQL file:

   ```bash
   ./consolidate-migrations.sh
   ```

   This creates a `consolidated-migrations.sql` file that contains all database schema changes in a single file, useful for production deployments or database resets.

2. **Generate Single Migration**: Create a fresh migration based on the current schema:

   ```bash
   ./generate-single-migration.sh
   ```

   This generates a single SQL file representing the complete database schema.

## License

ISC License - see LICENSE file for details.

---

Built with ❤️ for educators and students
