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
pnpm --filter ./apps/api run prisma:migrate

# Start development servers (API + Web)
pnpm dev
```

### Individual Commands

```bash
# API only
pnpm dev:api          # Development with hot reload
pnpm build:api        # Build for production

# Web only
pnpm dev:web          # Vite development server
pnpm build:web        # Build for production

# Database
pnpm --filter ./apps/api run prisma:studio     # GUI database viewer
pnpm --filter ./apps/api run prisma:deploy     # Production migrations

# Code Quality
pnpm lint             # Lint all packages
pnpm format           # Format with Prettier
pnpm test             # Run tests
```

## Deployment

### Production Deployment

#### 1. Environment Setup

Create a `.env` file in the `apps/api` directory with production settings:

```bash
# Database (PostgreSQL recommended for production)
DATABASE_URL="postgresql://username:password@host:port/database_name"

# Server
PORT=3000
JWT_SECRET="your-production-jwt-secret"

# AI Configuration
LLM_PROVIDER="qwen"  # or "openai"
LLM_API_KEY="your-production-api-key"
LLM_MODEL="qwen-turbo"  # or your preferred model

# OCR
OCR_ENGINE="paddleocr"
```

#### 2. Build and Deploy

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter ./apps/api run prisma:generate

# Run database migrations
pnpm --filter ./apps/api run prisma:migrate

# Build both API and Web
pnpm build:api
pnpm build:web

# Start production servers
pnpm start:api
```

#### 3. Docker Deployment (Optional)

If you prefer Docker deployment, create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile  # Assumes you create Dockerfile in project root
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/examforge
      - JWT_SECRET=your-jwt-secret
      - LLM_API_KEY=${LLM_API_KEY}
    depends_on:
      - db

  web:
    build:
      context: .
      dockerfile: Dockerfile.web  # Assumes you create Dockerfile for web in project root
    ports:
      - "80:80"
    depends_on:
      - api

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: examforge
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

Then deploy with:
```bash
docker-compose up -d
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
pnpm --filter ./apps/api run prisma:migrate

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

```bash
# Make the script executable
chmod +x start-deploy.sh

# Run the deployment script
./start-deploy.sh
```

This script will:
- Install all dependencies
- Build both API and web applications
- Initialize the database with all migrations
- Seed the database with initial data
- Package everything for production
- Create a production startup script

After deployment, you can start the production server with:
```bash
cd dist && ./start-production.sh
```

The deployment includes default credentials:
- Admin: `admin` / `admin123`
- Teacher: `teacher` / `teacher123`

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
