import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import { logger } from './logger.config';


async function bootstrap() {
  // Create logs directory if it doesn't exist
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Serve OpenAPI files statically
  const openApiDir = path.join(__dirname, '../openapi');
  if (fs.existsSync(openApiDir)) {
    // We need to use the underlying express app to serve static files
    // because NestJS ServeStaticModule is usually for the root
    app.use('/openapi', (req, res, next) => {
      // Simple static file serving for the openapi directory
      const filePath = path.join(openApiDir, req.path);
      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        next();
      }
    });

    // Swagger/OpenAPI setup
    // We point Swagger UI to the static YAML file
    SwaggerModule.setup('api/docs', app, null, {
      swaggerOptions: {
        url: '/openapi/index.yaml',
        persistAuthorization: true,
        tryItOutEnabled: true,
        filter: true,
        displayRequestDuration: true,
      },
      customSiteTitle: 'SkillHive API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
    });
    console.log('Swagger UI configured to use static OpenAPI files');
  } else {
    console.warn('OpenAPI directory not found, skipping Swagger UI setup');
  }

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`SkillHive API is running on: http://localhost:${port}`);
  console.log(`API documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
