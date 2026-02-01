import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';

// Default JWT secret for development/demo purposes
const DEFAULT_JWT_SECRET = 'examforge-default-jwt-secret-please-change-in-production';

async function bootstrap() {
  // Handle JWT_SECRET
  if (!process.env.JWT_SECRET) {
    console.warn('\n' + '='.repeat(70));
    console.warn('⚠️  WARNING: JWT_SECRET is not set!');
    console.warn('   Using default secret for demo purposes.');
    console.warn('   THIS IS NOT SECURE FOR PRODUCTION USE!');
    console.warn('   Please set JWT_SECRET environment variable with a secure random string.');
    console.warn('='.repeat(70) + '\n');
    process.env.JWT_SECRET = DEFAULT_JWT_SECRET;
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(cookieParser());

  app.setGlobalPrefix('api');

  // 静态文件服务
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.use((req, res, next) => {
    const dbUrl = process.env.DATABASE_URL || '';
    const instanceHint = dbUrl.split('/').pop() || 'default';
    res.setHeader('X-ExamForge-Instance', instanceHint);
    next();
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 ExamForge is running on http://localhost:${port}`);
}
bootstrap();
