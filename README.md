# Nirmaya Backend

REST API backend for the Nirmaya platform — handles authentication, user management, file uploads, and admin workflows.

## Tech Stack

**Runtime:** Node.js 18+ · Express.js 5.x · TypeScript  
**Database:** PostgreSQL + Drizzle ORM  
**Storage:** AWS S3 (Supabase compatible)  
**Auth:** JWT + bcrypt · Role-based access control  
**Testing:** Jest + Supertest (100% coverage)  
**DevOps:** Docker · Winston logging · PM2

## Quick Start

1. **Install dependencies:** `npm install`
2. **Configure environment:** Copy `.env.example` → `.env.dev` and fill in database, AWS S3, and email credentials
3. **Setup database:** `npm run db:migrate && npm run db:seed`
4. **Start server:** `npm run dev`

The API runs at `http://localhost:8000/api/v1`

## Project Structure

```
src/
├── features/       # Feature modules (auth, user, upload, admin-invite)
├── middlewares/    # Auth, validation, security, rate limiting
├── utils/          # Shared utilities (JWT, logger, S3, email)
├── database/       # Drizzle ORM connection, migrations, seeds
└── interfaces/     # TypeScript definitions
```

Each feature is self-contained with its own APIs, schema, queries, and tests.

## API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | User registration |
| POST | `/auth/login` | Public | User login |
| POST | `/auth/refresh-token` | Public | Refresh JWT |
| GET | `/users/:id` | Auth | Get user profile |
| PUT | `/users/:id` | Auth | Update profile |
| GET | `/users` | Admin | List all users |
| DELETE | `/users/:id` | Admin | Delete user |
| POST | `/uploads` | Auth | Upload file (PDF/DOC) |
| GET | `/uploads` | Auth | List uploads |
| GET | `/uploads/:id/download` | Auth | Download file |
| POST | `/admin/invitations` | Admin | Send user invite |
| GET | `/health` | Public | Health check |

All protected endpoints require `Authorization: Bearer <token>` header.

## User Roles

| Role | Access Level |
|------|--------------|
| `admin` | Full access, user management |
| `scientist` | Data access, file uploads |
| `researcher` | Limited data access |
| `policymaker` | Read-only access |

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm test` | Run all tests |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:studio` | Open Drizzle Studio GUI |
| `npm run docker:dev` | Run full stack with Docker |
| `npm run build` | Build for production |

## Environment Variables

Required in `.env.dev` / `.env.prod`:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret key for JWT (min 32 characters)
- `AWS_*` — S3 credentials (access key, secret, bucket, region, endpoint)
- `EMAIL_*` — SMTP credentials for sending invitations

See `.env.example` for the complete list.

## Documentation

- **Docker setup:** See `docker/README.md`
- **Database guide:** See `src/database/README.md`
- **AI coding guidelines:** See `.github/copilot-instructions.md`

## License

ISC
