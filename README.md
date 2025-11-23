# Nirmaya Backend

A production-ready Node.js backend API with authentication, file management, and role-based access control.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.dev
# Edit .env.dev with your database and AWS credentials

# Setup database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

## 📋 Features

- **🔐 Authentication**: JWT-based login/registration with role-based access
- **📁 File Upload**: PDF, DOC, DOCX upload with AWS S3 storage
- **👥 User Management**: CRUD operations with admin controls
- **🗄️ Database**: PostgreSQL with Drizzle ORM and migrations
- **🔒 Security**: Rate limiting, input validation, CORS, helmet
- **🧪 Testing**: Jest with 100% coverage (unit + integration tests)
- **🐳 Docker**: Multi-stage builds for development and production

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+, Express.js 5.x, TypeScript 5.7+
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT + bcrypt + role-based access control
- **Storage**: AWS S3 SDK v3 (Supabase compatible)
- **Testing**: Jest + SWC + Supertest
- **DevOps**: Docker, Winston logging, PM2

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Git

## ⚙️ Environment Setup

Copy `.env.example` to `.env.dev` and configure:

```bash
# Required
JWT_SECRET=your-256-bit-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/nirmaya_dev
PORT=8000

# AWS S3 (for file uploads)
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_KEY=your-secret-key
AWS_BUCKET_NAME=your-bucket
AWS_REGION=your-region
AWS_ENDPOINT=https://your-project.supabase.co/storage/v1/s3

# Email (for admin invites)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## 🗄️ Database Setup

### Local PostgreSQL
```bash
# Using Docker
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15

# Or using Homebrew (macOS)
brew install postgresql
brew services start postgresql
createdb nirmaya_dev
```

### Database Commands
```bash
npm run db:generate    # Generate migrations from schema changes
npm run db:migrate     # Run migrations
npm run db:seed        # Seed with test data
npm run db:studio      # Open Drizzle Studio GUI
```

## 💻 Development

### Project Structure
```
src/
├── features/          # Feature modules (auth, user, upload, admin-invite)
├── middlewares/       # Auth, validation, security, rate limiting
├── utils/            # JWT, logger, S3 upload, database connection
├── database/         # Migrations, seed, health checks
└── interfaces/       # TypeScript definitions

tests/
├── unit/             # Unit tests
└── integration/      # API integration tests
```

### Development Commands
```bash
npm run dev           # Start dev server with hot reload
npm run build         # Build for production
npm run lint          # Check code quality
npm run lint:fix      # Auto-fix linting issues
```

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration # Integration tests only
npm run test:coverage # Generate coverage report
```

Tests include:
- Unit tests for utilities (JWT, validation, etc.)
- Integration tests for all API endpoints
- Database cleanup between tests
- 100% coverage requirement

## 📚 API Documentation

**Base URL**: `http://localhost:8000/api/v1`

### Authentication
All protected endpoints require: `Authorization: Bearer <jwt-token>`

### Endpoints

#### Public
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh-token` - Refresh JWT token
- `GET /health` - Health check

#### Protected (Authenticated Users)
- `GET /users/:id` - Get user profile
- `PUT /users/:id` - Update user profile
- `GET /uploads` - List user uploads
- `POST /uploads` - Upload file
- `GET /uploads/:id/download` - Download file
- `DELETE /uploads/:id` - Delete upload

#### Admin Only
- `GET /users` - List all users
- `DELETE /users/:id` - Delete user
- `POST /admin/invitations` - Send user invitations

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req-123"
  }
}
```

### File Upload
```bash
curl -X POST http://localhost:8000/api/v1/uploads \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf"
```

## 🚀 Deployment

### Docker Deployment
```bash
# Development
docker-compose up --build

# Production
docker build -t nirmaya-backend .
docker run --env-file .env.prod -p 8000:8000 nirmaya-backend
```

### Manual Production Deployment
```bash
# Install dependencies
npm ci --only=production
npm run build

# Setup environment
cp .env.example .env.prod
# Configure production variables

# Run migrations
NODE_ENV=production npm run db:migrate

# Start with PM2
npm install -g pm2
pm2 start build/src/server.js --name nirmaya-backend
```

### Production Checklist
- [ ] Configure production environment variables
- [ ] Run database migrations
- [ ] Setup SSL certificates
- [ ] Configure reverse proxy (nginx)
- [ ] Setup monitoring and logging
- [ ] Configure backups

## 🔒 Security

- **JWT Authentication**: 24-hour token expiration
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: 100 req/min per IP, 5/min for auth
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Prevention**: Parameterized queries
- **CORS**: Configured allowed origins
- **Security Headers**: Helmet.js protection

## 👥 User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | System administrator | Full access, user management |
| `scientist` | Research scientist | Data access, file uploads |
| `researcher` | Research assistant | Limited data access |
| `policymaker` | Policy maker | Read-only access |

## 📄 License

ISC License

---

**Built with modern Node.js best practices**
