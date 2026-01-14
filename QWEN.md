# ExamForge (智考工坊) - QWEN Context

## Project Overview

ExamForge is a comprehensive AI-driven multi-source question bank and online examination system built as a monorepo. The platform enables educators to create, manage, and grade examinations with AI-powered question import capabilities from various sources including Excel, PDF, and images using OCR and LLM technology.

### Key Features
- **AI-Powered Question Import**: Extract questions from Excel, PDF, and images using OCR and LLM
- **Smart Exam Management**: Create exams with flexible question selection and scoring
- **Real-time Grading**: Support for both manual and AI-assisted answer evaluation
- **Student Analytics**: Detailed performance reports with AI-generated insights
- **Batch Operations**: Efficient management of large-scale examinations
- **Multi-type Questions**: Support for single choice, multiple choice, true/false, fill-in, and essay questions

### Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: NestJS + TypeScript
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: Prisma
- **AI/OCR**: LLM providers (Qwen, OpenAI) + PaddleOCR
- **API Documentation**: Swagger/OpenAPI

### Project Structure
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

## Building and Running

### Prerequisites
- Node.js >= 18
- pnpm >= 8

### Installation
```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter ./apps/api run prisma:generate

# Run database migrations
pnpm --filter ./apps/api run prisma:migrate
```

### Development Commands
```bash
# Start development servers (API + Web) in parallel
pnpm dev

# API only
pnpm dev:api          # Development with hot reload

# Web only
pnpm dev:web          # Vite development server

# Database
pnpm --filter ./apps/api run prisma:studio     # GUI database viewer
pnpm --filter ./apps/api run prisma:deploy     # Production migrations

# Code Quality
pnpm lint             # Lint all packages
pnpm format           # Format with Prettier
pnpm test             # Run tests
```

### Alternative Development Script
```bash
# Use the one-click startup script
./start-dev.sh        # Starts both API and Web services
./start-dev.sh --rebuild  # Rebuilds before starting
```

## Development Conventions

### TypeScript Configuration
- Target: ES2022
- Strict mode: Enabled (with some intentional exceptions in API)
- Path aliases:
  - API: `@/* -> apps/api/src/*`
  - Web: `@/* -> web/src/*`
  - Shared: `@examforge/shared-types -> packages/shared-types/src`

### Code Style
- **Formatting**: Prettier with printWidth: 100, tabWidth: 2, singleQuote: true, semi: true
- **Naming**: kebab-case for files, PascalCase for classes, camelCase for functions/variables
- **Imports**: Order: framework → third-party → internal alias → relative

### Backend Architecture (NestJS)
- Feature modules in `apps/api/src/modules/<feature>/`
- Controllers handle routing only (no business logic)
- Services contain business logic and database access
- DTOs for request/response validation with class-validator
- Prisma service for database operations (never in controllers)

### Frontend Architecture (React/Vite)
- UI reference: `demo.html` in repo root
- Tailwind CSS for styling
- React Router for navigation
- TanStack Query for data fetching
- Component structure: `src/features/`, `src/components/`, `src/services/`, `src/pages/`, `src/types/`

### Error Handling
- Use NestJS exceptions (BadRequestException, NotFoundException, etc.)
- Fail fast: validate existence before updates/deletes
- Frontend: Handle errors inline with toast notifications

### Testing
- Unit tests: Co-located `*.spec.ts` files
- E2E tests: `apps/api/test/*.e2e-spec.ts`
- Jest for both unit and integration testing

## Key APIs and Endpoints

### Core API Endpoints
| Resource                 | Methods                | Description         |
| ------------------------ | ---------------------- | ------------------- |
| `/questions`             | GET, POST, PUT, DELETE | Question bank CRUD  |
| `/exams`                 | GET, POST, PUT, DELETE | Exam management     |
| `/exams/:id/questions`   | POST, DELETE, PUT      | Question assignment |
| `/exams/:id/students`    | GET, POST              | Student management  |
| `/exams/:id/submissions` | GET, POST              | Submission tracking |
| `/import`                | POST                   | Import questions    |

### Special Features
- **PDF Processing**: Includes page header/footer cropping and image stitching capabilities
- **Import History**: Track and manage question import jobs with ability to create exams from import records
- **AI Integration**: Real-time SSE streaming for long-running AI tasks

## Environment Configuration

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

## Special Considerations

1. **Monorepo Structure**: Uses pnpm workspaces with strict package filtering
2. **AI Dependencies**: Integrates with external LLM providers and OCR engines
3. **File Processing**: Handles various file types (Excel, PDF, images) with advanced processing options
4. **Real-time Features**: Implements SSE for long-running AI processing tasks
5. **Accessibility**: Ensures focus-visible rings and reduced motion support

## Agent Guidelines

When working with this codebase:
- Follow the strict TypeScript conventions
- Use path aliases appropriately
- Respect the separation of concerns between controllers and services
- Maintain transactional integrity for multi-step database operations
- Follow the established error handling patterns
- Keep frontend components accessible and responsive