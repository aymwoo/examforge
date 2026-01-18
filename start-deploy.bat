@echo off
REM ExamForge Deployment Script for Windows (Batch)
REM This script deploys the ExamForge service from scratch, including database initialization

setlocal enabledelayedexpansion

echo.
echo ===================================================
echo   ExamForge Deployment Script
echo ===================================================
echo.

REM Check if PowerShell is available (preferred method)
where powershell >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] PowerShell detected. Running PowerShell deployment script...
    echo.
    powershell -ExecutionPolicy Bypass -File "%~dp0start-deploy.ps1"
    goto :end
)

echo [WARNING] PowerShell not found. Running basic batch deployment...
echo.

REM Check if pnpm is installed
where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] pnpm is not installed. Installing via npm...
    where npm >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] npm is not installed. Please install Node.js first.
        exit /b 1
    )
    call npm install -g pnpm
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install pnpm.
        exit /b 1
    )
)

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    exit /b 1
)

echo [INFO] Prerequisites check passed

REM Navigate to project root
cd /d "%~dp0"
echo [INFO] Working in project directory: %CD%

REM Install dependencies
echo [INFO] Installing dependencies...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies.
    exit /b 1
)
echo [SUCCESS] Dependencies installed

REM Build the applications
echo [INFO] Building applications...
call pnpm build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build applications.
    exit /b 1
)
echo [SUCCESS] Applications built

REM Setup database
echo [INFO] Setting up database...

REM Check if .env exists
if not exist "apps\api\.env" (
    echo [WARNING] apps\api\.env file not found. Creating from example...
    copy "apps\api\.env.example" "apps\api\.env" >nul
)

REM Navigate to API directory
cd apps\api

REM Generate Prisma client
echo [INFO] Generating Prisma client...
call pnpm run prisma:generate
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to generate Prisma client.
    exit /b 1
)
echo [SUCCESS] Prisma client generated

REM Apply all migrations
echo [INFO] Applying database migrations...
call pnpm prisma migrate deploy
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to apply migrations.
    exit /b 1
)
echo [SUCCESS] Database migrations applied

REM Seed the database
echo [INFO] Seeding database with initial data...
call npx tsx prisma/seed-ai-providers.ts
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Failed to seed database (may already be seeded).
)
echo [SUCCESS] Database seeded with initial data

REM Return to project root
cd ..\..

REM Build the web application
echo [INFO] Building web application...
cd web
call pnpm build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build web application.
    exit /b 1
)
cd ..
echo [SUCCESS] Web application built

REM Create production build directory
if not exist "dist" mkdir dist
if not exist "dist\api" mkdir dist\api
if not exist "dist\web" mkdir dist\web

REM Copy built applications
echo [INFO] Packaging applications...

REM Copy API build
if exist "apps\api\dist" (
    xcopy /E /Y /Q "apps\api\dist\*" "dist\api\" >nul
)

REM Copy prisma schema + migrations
if not exist "dist\api\prisma\migrations" mkdir dist\api\prisma\migrations
copy /Y "apps\api\prisma\schema.prisma" "dist\api\prisma\" >nul
xcopy /E /Y /Q "apps\api\prisma\migrations\*" "dist\api\prisma\migrations\" >nul
if exist "apps\api\prisma\seed-users.ts" copy /Y "apps\api\prisma\seed-users.ts" "dist\api\prisma\" >nul
if exist "apps\api\prisma\seed-ai-providers.ts" copy /Y "apps\api\prisma\seed-ai-providers.ts" "dist\api\prisma\" >nul

REM Copy assets/uploads
if not exist "dist\api\assets" mkdir dist\api\assets
if not exist "dist\api\uploads" mkdir dist\api\uploads
if exist "apps\api\assets" xcopy /E /Y /Q "apps\api\assets\*" "dist\api\assets\" >nul 2>nul

REM Copy web build
if exist "web\dist" (
    xcopy /E /Y /Q "web\dist\*" "dist\web\" >nul
)

REM Generate minimal API package.json
echo [INFO] Creating dist/api/package.json...
(
echo {
echo   "name": "examforge-api-dist",
echo   "private": true,
echo   "type": "commonjs",
echo   "scripts": {
echo     "start": "node main.js",
echo     "db:generate": "npx prisma generate --schema=./prisma/schema.prisma",
echo     "db:migrate": "npx prisma migrate deploy --schema=./prisma/schema.prisma",
echo     "db:seed": "npx tsx ./prisma/seed-ai-providers.ts",
echo     "db:init": "npm run db:generate && npm run db:migrate && npm run db:seed"
echo   },
echo   "dependencies": {
echo     "@nestjs/common": "^11.1.11",
echo     "@nestjs/config": "^4.0.2",
echo     "@nestjs/core": "^11.1.11",
echo     "@nestjs/jwt": "^11.0.2",
echo     "@nestjs/passport": "^11.0.5",
echo     "@nestjs/platform-express": "^11.1.11",
echo     "@nestjs/swagger": "^11.2.3",
echo     "@prisma/client": "5.22.0",
echo     "@prisma/migrate": "5.22.0",
echo     "prisma": "5.22.0",
echo     "archiver": "^7.0.1",
echo     "bcrypt": "^6.0.0",
echo     "class-transformer": "^0.5.1",
echo     "class-validator": "^0.14.3",
echo     "multer": "^2.0.2",
echo     "passport": "^0.7.0",
echo     "passport-jwt": "^4.0.1",
echo     "pdfkit": "^0.17.2",
echo     "pdfreader": "^3.0.8",
echo     "reflect-metadata": "^0.2.2",
echo     "rxjs": "^7.8.2",
echo     "sharp": "^0.32.6",
echo     "node-gyp": "^10.0.1",
echo     "tsx": "^4.20.6",
echo     "uuid": "^13.0.0",
echo     "xlsx": "^0.18.5"
echo   }
echo }
) > dist\api\package.json

echo [INFO] Installing production dependencies into dist\api...
cd dist\api
call npm install --omit=dev
cd ..\..

echo [SUCCESS] Applications packaged to dist\ directory

REM Print deployment summary
echo.
echo ===================================================
echo   ExamForge Deployment Completed Successfully!
echo ===================================================
echo.
echo Deployment Summary:
echo    - Dependencies installed
echo    - Applications built
echo    - Database initialized
echo    - Production package created in dist\ directory
echo.
echo Note: Register your first user through the web interface.
echo       The first registered user will automatically become an administrator.
echo.

echo [INFO] Starting production server...
echo.

REM Start the production server
cd dist
if exist "start-production.ps1" (
    powershell -ExecutionPolicy Bypass -File ".\start-production.ps1"
) else (
    echo [ERROR] start-production.ps1 not found. Please run start-deploy.ps1 instead.
    exit /b 1
)

:end
endlocal
