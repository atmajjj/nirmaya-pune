# Docker Setup for Nirmaya Backend

## Quick Start

```bash
# Development (with hot reload)
npm run docker:dev

# Test environment (auto-migrates on startup)
npm run docker:test

# Production
npm run docker:prod
```

## Database Migrations

### Test Environment
Migrations run **automatically via Jest setup** (`tests/utils/setup.ts`) when you run tests.

```bash
# Start test containers (DB + Redis only, no API needed for tests)
npm run docker:test:up

# Run tests (migrations happen automatically)
npm run test

# Fresh start (wipe data)
npm run docker:test:clean && npm run docker:test:up
```

### Development Environment
Migrations are run **manually** from host machine:

```bash
# Start dev environment first
npm run docker:dev

# Then run migrations (in another terminal)
npm run db:migrate:dev

# Or use Drizzle Studio to inspect DB
npm run db:studio:dev
```

### Production Environment
Migrations are run **manually** before deployment:

```bash
# Run migrations against production DB
npm run db:migrate:prod

# Or push schema directly (use with caution!)
npm run db:push:prod
```

### Migration Commands Reference

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate migration from schema changes |
| `npm run db:migrate:dev` | Apply migrations to dev database |
| `npm run db:migrate:test` | Apply migrations to test database |
| `npm run db:migrate:prod` | Apply migrations to production database |
| `npm run db:push:dev` | Push schema to dev (no migration file) |
| `npm run db:studio:dev` | Open Drizzle Studio for dev DB |
| `npm run db:studio:test` | Open Drizzle Studio for test DB |

## Environments

### Development (`docker/compose.dev.yaml`)
- **Backend**: Hot reload enabled, source mounted
- **PostgreSQL**: Local container on port 5432
- **Redis**: Local container on port 6379
- **Migrations**: Manual (`npm run db:migrate:dev`)
- **Use case**: Local development with full stack

### Test (`docker/compose.test.yaml`)
- **Backend**: Test configuration with auto-migrations
- **PostgreSQL**: Local container on port 5433
- **Redis**: Local container on port 6380
- **Migrations**: Automatic on startup
- **Use case**: Running integration tests in isolation

### Production (`docker/compose.prod.yaml`)
- **Backend only**: Optimized production build
- **No PostgreSQL/Redis**: Uses external managed services
- **Migrations**: Manual before deployment
- **Use case**: Production deployment

## Commands

```bash
# Start services
docker compose -f docker/compose.dev.yaml up -d
docker compose -f docker/compose.test.yaml up -d
docker compose -f docker/compose.prod.yaml up -d

# Stop services
docker compose -f docker/compose.dev.yaml down
docker compose -f docker/compose.test.yaml down
docker compose -f docker/compose.prod.yaml down

# View logs
docker compose -f docker/compose.dev.yaml logs -f api

# Rebuild after code changes
docker compose -f docker/compose.dev.yaml up --build

# Clean up volumes (removes data!)
docker compose -f docker/compose.dev.yaml down -v
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Development                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐     ┌─────────────┐     ┌─────────┐           │
│  │   API   │────▶│  PostgreSQL │     │  Redis  │           │
│  │ :8000   │     │   :5432     │     │  :6379  │           │
│  └─────────┘     └─────────────┘     └─────────┘           │
│                  nirmaya-dev network                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         Test                                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐     ┌─────────────┐     ┌─────────┐           │
│  │   API   │────▶│  PostgreSQL │     │  Redis  │           │
│  │ :8001   │     │   :5433     │     │  :6380  │           │
│  └─────────┘     └─────────────┘     └─────────┘           │
│                 nirmaya-test network                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Production                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐     ┌─────────────┐     ┌─────────┐           │
│  │   API   │────▶│  Supabase   │     │  Redis  │           │
│  │ :8000   │     │  (External) │     │ (Cloud) │           │
│  └─────────┘     └─────────────┘     └─────────┘           │
│    Docker            External Services                      │
└─────────────────────────────────────────────────────────────┘
```

## Image Size Optimization

The Dockerfile uses multi-stage builds:
1. **base**: Alpine Node.js with curl
2. **deps**: All dependencies for building
3. **prod-deps**: Production dependencies only
4. **build**: TypeScript compilation
5. **production**: Minimal runtime (~523MB)

## Ports

| Environment | API   | PostgreSQL (Host) | Redis (Host) |
|-------------|-------|-------------------|--------------|
| Development | 8000  | 5434              | 6379         |
| Test        | 8001  | 5433              | 6380         |
| Production  | 8000  | External          | External     |

> **Note**: Dev uses port 5434 to avoid conflict with local PostgreSQL on 5432.
