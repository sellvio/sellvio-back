"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const helmet_1 = require("helmet");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Sellvio API')
        .setDescription(`
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
    `)
        .setVersion('1.0.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
    }, 'JWT-auth')
        .addServer('http://localhost:3000', 'Development server')
        .addServer('https://api.sellvio.com', 'Production server')
        .addTag('Authentication', 'User authentication and profile management')
        .addTag('Campaigns', 'Campaign creation and management')
        .addTag('Videos', 'Content creation and review workflows')
        .addTag('Transactions', 'Financial operations and account management')
        .addTag('Social Media', 'Social media platform integrations')
        .addTag('Admin', 'Administrative operations and system management')
        .setContact('Sellvio Support', 'https://sellvio.com/support', 'support@sellvio.com')
        .setLicense('MIT', 'https://opensource.org/licenses/MIT')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config, {
        operationIdFactory: (controllerKey, methodKey) => methodKey,
        deepScanRoutes: true,
    });
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
            showRequestHeaders: true,
            docExpansion: 'none',
            defaultModelsExpandDepth: 2,
            defaultModelExpandDepth: 2,
        },
        customfavIcon: '/favicon.ico',
        customSiteTitle: 'Sellvio API Documentation',
        customCss: `
      .swagger-ui .topbar { background-color: #1890ff; }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { color: #1890ff; }
    `,
    });
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
//# sourceMappingURL=main.js.map