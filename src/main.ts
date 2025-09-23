import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // in main.ts, replace app.use(helmet()) with:
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Sellvio API')
    .setDescription(
      `
# Sellvio Influencer Marketing Platform API

## Overview
Sellvio is a comprehensive influencer marketing platform that connects businesses with content creators. This API enables:

- **User Management**: Business and creator account registration and management
- **Campaign Management**: Create, manage, and participate in marketing campaigns
- **Content Management**: Video submission, review, and approval workflows
- **Financial System**: Multi-currency transactions and payment processing
- **Social Media Integration**: Connect and manage social media accounts
- **Analytics**: Comprehensive reporting and analytics
- **Admin Tools**: Platform administration and moderation

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## User Types
- **Business**: Create campaigns, review content, process payments
- **Creator**: Participate in campaigns, submit content, receive payments

## Response Format
All successful responses follow this format:
\`\`\`json
{
  "success": true,
  "data": {...},
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint",
  "method": "GET"
}
\`\`\`

Error responses follow this format:
\`\`\`json
{
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint",
  "method": "GET",
  "error": "Bad Request",
  "message": "Detailed error message"
}
\`\`\`
    `,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.sellvio.com', 'Production server')
    .addTag('Authentication', 'User authentication and profile management')
    .addTag('Campaigns', 'Campaign creation and management')
    .addTag('Videos', 'Content creation and review workflows')
    .addTag('Transactions', 'Financial operations and account management')
    .addTag('Social Media', 'Social media platform integrations')
    .addTag('Admin', 'Administrative operations and system management')
    .setContact(
      'Sellvio Support',
      'https://sellvio.com/support',
      'support@sellvio.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  // Serve the OpenAPI JSON directly
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/api-json', (_req: any, res: any) => {
    res.json(document);
  });

  // Serve a minimal Swagger UI HTML that loads assets from CDN
  expressApp.get('/api/docs', (_req: any, res: any) => {
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sellvio API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
    <style>
      body { margin: 0; padding: 0; }
      #swagger-ui { max-width: 100%; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: '/api-json',
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          layout: 'BaseLayout',
          persistAuthorization: true,
        });
      };
    </script>
  </body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
