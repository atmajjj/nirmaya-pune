# Nirmaya Backend

A robust, production-ready Nirmaya backend with TypeScript, featuring user authentication with role-based access, file upload management, and modern tooling with 100% test coverage.

![API Documentation Screenshot](./Screenshot.png)

## 🚀 Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

## 📋 Features

- **Authentication**: JWT-based user registration/login with role-based access
- **File Management**: PDF, DOC, DOCX upload with S3 storage
- **User Management**: CRUD operations for users with admin controls
- **Database**: PostgreSQL with Drizzle ORM migrations
- **Storage**: AWS S3 compatible (Supabase)
- **Caching**: Optional Redis integration
- **Security**: Rate limiting, CORS, input validation, helmet
- **Testing**: Jest with unit/integration tests (104 tests)
- **Docker**: Multi-stage builds for dev/prod

## 🗂️ API Endpoints

### Public

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh-token` - Refresh JWT token
- `POST /auth/logout` - User logout

### Protected

- `GET /users` - List all users (admin only)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user (admin only)
- `GET /uploads` - List user uploads
- `GET /uploads/stats` - Get upload statistics
- `GET /uploads/status/:status` - Get uploads by status
- `POST /uploads` - Upload file
- `GET /uploads/:id` - Get upload by ID
- `GET /uploads/:id/download` - Download file
- `PUT /uploads/:id` - Update upload
- `DELETE /uploads/:id` - Delete upload

### System

- `GET /health` - Health check

## 🗄️ Database Schema

```sql
users (id, name, email, password, phone_number, role, audit_fields)
uploads (id, user_id, filename, original_filename, mime_type, file_size, file_path, file_url, status, error_message, audit_fields)
```

**Features**: Audit fields, soft deletes, referential integrity, role-based access, upload status tracking.

## ⚙️ Environment Setup

Create `.env` with:

```bash
JWT_SECRET=your-256-bit-secret
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
PORT=8000
REDIS_HOST=redis-host (optional)
AWS_ACCESS_KEY=key
AWS_SECRET_KEY=secret
AWS_BUCKET_NAME=bucket
```

**Files**: `.env` (dev), `.env.prod` (prod), `.env.example` (template)

## 🏗️ Project Structure

```
src/
├── app.ts, server.ts     # App setup and bootstrap
├── features/             # Feature-based modules (auth, user, upload)
├── middlewares/          # Auth, validation, security, CORS, rate-limit
├── utils/               # Logger, JWT, Redis, S3 upload, validators
├── interfaces/          # TypeScript definitions
└── database/            # Drizzle schemas, migrations, seed, health

build/                   # Compiled TypeScript output
tests/                   # Unit and integration tests
logs/                    # Application logs (error, info)
scripts/                 # Utility scripts
```

## 🛠️ Commands

```bash
# Development
npm run dev              # Start dev server with nodemon
npm run build           # Build for production
npm start               # Start production server

# Database
npm run db:generate     # Generate Drizzle migrations
npm run db:migrate      # Run database migrations
npm run db:push         # Push schema changes to database
npm run db:studio       # Open Drizzle Studio
npm run db:seed         # Seed database with test data
npm run db:test         # Test database connection
npm run db:check        # Check schema drift
npm run db:up           # Update schema to latest

# Testing
npm test                # Run all tests (104 tests)
npm run test:unit       # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:coverage   # Run tests with coverage

# Quality
npm run lint            # Lint code with ESLint
npm run lint:fix        # Fix linting issues
```

## Deployment

### Docker

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Production Checklist

- [ ] Configure `.env.prod`
- [ ] Run database migrations: `npm run db:migrate`
- [ ] Setup SSL certificates
- [ ] Configure monitoring

## 🔧 Tech Stack

- **Runtime**: Node.js 18+, Express 5.x, TypeScript 5.7+
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT + bcrypt + role-based access
- **Validation**: Zod schemas
- **Storage**: AWS S3 SDK v3
- **Testing**: Jest + SWC + V8 coverage (104 tests)
- **Linting**: ESLint 9 + Prettier 3
- **Docker**: Multi-stage Alpine builds

---

**Built with ❤️ for modern Node.js development**
