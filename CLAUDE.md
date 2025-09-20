# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sellvio is a NestJS-based backend API for an influencer marketing platform that connects businesses with content creators. The platform facilitates campaign management, creator participation, video submissions, and financial transactions.

## Development Commands

### Core Development
- `npm run start:dev` - Start development server with watch mode
- `npm run build` - Build the application
- `npm run start:prod` - Start production build

### Testing
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:cov` - Run tests with coverage report

### Code Quality
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier

### Database (Prisma)
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:format` - Format Prisma schema
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:push` - Push schema changes to database
- `npm run prisma:studio` - Open Prisma Studio GUI

## Architecture

### Database Layer
- **Prisma ORM**: Global PrismaService handles all database operations
- **PostgreSQL**: Primary database with complex relational schema
- **Core entities**: Users (business/creator types), Campaigns, Videos, Transactions, Social Media integration

### Application Structure
- **Modular NestJS**: Feature-based modules (Auth, Prisma as global)
- **Global validation**: ValidationPipe with whitelist and transformation enabled
- **Security**: Helmet middleware, ThrottlerGuard (60 requests/minute globally)
- **API Documentation**: Swagger setup at `/docs` endpoint

### Key Business Domains
1. **User Management**: Dual user types (business/creator) with separate profile tables
2. **Campaign Management**: Businesses create campaigns, creators participate and submit videos
3. **Content Workflow**: Video submission → review → approval → social posting
4. **Financial System**: Multi-currency accounts, transactions, creator earnings
5. **Social Integration**: Instagram, TikTok, Facebook platform connections

### Database Schema Highlights
- **Enum mappings**: Employee ranges use @map for database-friendly values
- **Cascading deletes**: Proper foreign key relationships with CASCADE on user deletion
- **Multi-platform support**: Social media accounts and video analytics per platform
- **Chat system**: Campaign-based chat servers with channels and memberships

### Environment Setup
- Database connection via `DATABASE_URL` and `DIRECT_URL` environment variables
- API runs on port 3000 by default (configurable via PORT env var)

### Development Notes
- Prisma schema validation implemented in application logic due to check constraint limitations
- Global error handling and validation through NestJS pipes
- Rate limiting applied globally via ThrottlerGuard
- API versioning and documentation through Swagger decorators