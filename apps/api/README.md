# ExamForge (智考工坊)

AI-driven multi-source question bank and online examination system.

## Features

- ✅ Question Bank CRUD API with support for multiple question types
- ✅ Exam management with question assignment and scoring
- ✅ Student submission tracking and grading system
- ✅ AI-powered answer analysis and auto-grading
- ✅ Excel/CSV Import for bulk questions
- ✅ PDF and image question import with OCR
- ✅ Real-time exam export with SSE progress streaming
- ✅ Batch operations for submissions (review, reset, approve)
- ✅ SQLite Database (dev) with Prisma ORM
- ✅ NestJS + TypeScript
- ✅ Validation with class-validator
- ✅ Swagger API documentation

## Tech Stack

- **Backend**: Node.js + TypeScript + NestJS
- **Database**: SQLite (dev) / PostgreSQL (prod) via Prisma ORM
- **Validation**: class-validator + class-transformer
- **Excel/PDF Processing**: xlsx, pdfkit, paddleocr
- **AI Integration**: LLM provider support (Qwen, etc.)
- **API Style**: REST with SSE for real-time updates

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm run prisma:generate

# Run database migrations
pnpm run prisma:migrate

# Start development server
pnpm run start:dev
```

The server will be running at http://localhost:3000

## API Documentation

Once the server is running, access Swagger documentation at:
http://localhost:3000/api

## Available Scripts

```bash
# Development
pnpm run start:dev          # Start with hot-reload

# Build
pnpm run build              # Compile TypeScript

# Linting & Formatting
pnpm run lint               # ESLint check
pnpm run lint:fix           # ESLint auto-fix
pnpm run format             # Prettier format

# Testing
pnpm run test               # Run all unit tests
pnpm run test:cov           # Coverage report
pnpm run test:e2e           # End-to-end tests

# Database
pnpm run prisma:generate    # Generate Prisma client
pnpm run prisma:migrate     # Run migrations (dev)
pnpm run prisma:studio      # Open Prisma Studio GUI
```

## Project Structure

```
src/
├── main.ts                 # Entry point
├── app.module.ts           # Root module
├── common/                 # Shared utilities
│   ├── dto/               # Common DTOs (pagination)
│   ├── enums/             # Enum definitions
│   └── utils/             # Utility functions (account generator, etc.)
├── modules/
│   ├── ai/                # AI service integration
│   │   └── ai.service.ts
│   ├── auth/              # Authentication & exam student auth
│   │   ├── exam-auth.service.ts
│   │   ├── guards/
│   │   └── decorators/
│   ├── exam/              # Exam management
│   │   ├── dto/           # Request/response DTOs
│   │   ├── exam.controller.ts
│   │   └── exam.service.ts
│   ├── question/          # Question bank CRUD
│   │   ├── dto/
│   │   ├── question.controller.ts
│   │   └── question.service.ts
│   ├── submission/        # Submission & grading
│   │   ├── submission.controller.ts
│   │   └── submission.service.ts
│   ├── import/            # Excel/CSV import & AI generation
│   │   ├── import.controller.ts
│   │   └── import.service.ts
│   ├── class/             # Class management
│   ├── student/           # Student management
│   └── user/              # User management
├── prisma/                # Prisma service
│   ├── prisma.module.ts
│   └── prisma.service.ts
└── prisma/                # Database schema and migrations
    └── schema.prisma
```

## API Endpoints

### Questions

- `POST /questions` - Create a new question
- `GET /questions` - Get all questions with pagination
- `GET /questions/:id` - Get a question by ID
- `PUT /questions/:id` - Update a question
- `DELETE /questions/:id` - Delete a question

### Exams

- `POST /exams` - Create a new exam
- `GET /exams` - Get all exams with pagination (includes question count and student count)
- `GET /exams/:id` - Get an exam by ID with questions
- `PUT /exams/:id` - Update an exam
- `DELETE /exams/:id` - Delete an exam
- `POST /exams/:id/copy` - Copy an exam
- `POST /exams/:id/questions` - Add a question to an exam
- `DELETE /exams/:id/questions/:questionId` - Remove a question from an exam
- `PUT /exams/:id/questions/:questionId` - Update question order and score in exam
- `PATCH /exams/:id/questions/batch-scores` - Batch update question scores
- `PATCH /exams/:id/questions/batch-orders` - Batch update question orders
- `POST /exams/:id/questions/batch-delete` - Batch remove questions from exam

### Exam Students

- `POST /exams/:id/students` - Add a student to exam
- `POST /exams/:id/students/batch` - Batch add students to exam
- `POST /exams/:id/students/generate` - Generate temporary student accounts
- `GET /exams/:id/students` - Get all students for an exam
- `DELETE /exams/:id/students/:studentId` - Remove a student from exam

### Submissions & Grading

- `GET /exams/:id/submissions` - Get all submissions for an exam
- `POST /exams/:id/submissions/:submissionId/ai-grade` - AI grading for a submission
- `POST /exams/:id/submissions/:submissionId/grade` - Manual grading for a submission
- `POST /exams/:id/submissions/batch-reset` - Batch reset submissions
- `POST /exams/:id/submissions/batch-approve` - Batch approve and finalize scores
- `GET /exams/:id/analytics` - Get exam analytics and statistics

### AI Analysis

- `GET /exams/:id/ai-report-stream` - SSE stream for AI analysis progress
- `GET /exams/:id/ai-analysis` - Get AI analysis report for an exam

### Import

- `POST /import/excel` - Import questions from Excel file
- `POST /import/ai-generate` - Generate questions from image using AI

### Dashboard

- `GET /exams/dashboard` - Get dashboard statistics

## Excel Import Format

The Excel import supports the following columns:

- `题干` or `content` - Question content (required)
- `题型` or `type` - Question type (单选题/SINGLE_CHOICE, 多选题/MULTIPLE_CHOICE, 判断题/TRUE_FALSE, 填空题/FILL_BLANK, 简答题/ESSAY)
- `选项` or `options` - Options for choice questions
- `答案` or `answer` - Correct answer
- `解析` or `explanation` - Explanation
- `标签` or `tags` - Question tags (comma-separated)
- `难度` or `difficulty` - Difficulty level (1-5)
- `知识点` or `knowledgePoint` - Knowledge point

## Environment Variables

```bash
# .env
DATABASE_URL="file:./dev.db"

# LLM Configuration
LLM_PROVIDER="qwen"           # LLM provider (qwen, openai, etc.)
LLM_API_KEY="sk-xxx"          # API key
LLM_BASE_URL=""               # Base URL for custom endpoints
LLM_MODEL=""                  # Model name (optional)

# OCR Configuration
OCR_ENGINE="paddleocr"        # OCR engine (paddleocr, tesseract)

# AI Analysis
STUDENT_AI_ANALYSIS_ENABLED="true"
STUDENT_AI_ANALYSIS_PROMPT="" # Custom prompt for student analysis

# Export Configuration
EXAM_EXPORT_ZIP_RETENTION_MINUTES="30"

# Server Configuration
PORT=3000
NODE_ENV="development"
JWT_SECRET="your-jwt-secret"
```

## API Usage Examples

### Create a Question

```bash
curl -X POST http://localhost:3000/questions \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What is 2 + 2?",
    "type": "SINGLE_CHOICE",
    "options": [
      {"label": "A", "content": "3"},
      {"label": "B", "content": "4"},
      {"label": "C", "content": "5"},
      {"label": "D", "content": "6"}
    ],
    "answer": "B",
    "difficulty": 1
  }'
```

### Create an Exam

```bash
curl -X POST http://localhost:3000/exams \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Math Quiz",
    "description": "Basic mathematics quiz",
    "duration": 60,
    "totalScore": 100
  }'
```

### Add Question to Exam

```bash
curl -X POST http://localhost:3000/exams/{examId}/questions \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "{questionId}",
    "order": 1,
    "score": 10
  }'
```

### Get Exam with Questions

```bash
curl http://localhost:3000/exams/{examId}
```

## Database Schema

### Core Models

- **User** - System users (teachers, admins)
- **Question** - Question bank with content, type, options, answer, explanation, tags, difficulty
- **Exam** - Exam configuration with title, duration, scoring, time windows
- **ExamQuestion** - Junction table linking exams to questions with order and score
- **Student** - Fixed student records
- **ExamStudent** - Temporary/permanent student accounts for specific exams
- **Submission** - Student answers and scores
- **StudentAiAnalysisReport** - AI-generated analysis reports for submissions

### Import & History

- **ImportRecord** - Tracks bulk import jobs and status

## Next Steps

- [x] Exam module with full CRUD
- [x] Submission and grading system
- [x] AI-powered answer analysis
- [x] PDF and image import with OCR
- [x] Real-time export with SSE
- [ ] Write unit tests
- [ ] Add E2E tests
- [ ] Deploy to production
