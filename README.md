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

## License

ISC License - see LICENSE file for details.

---

Built with ❤️ for educators and students
