# Nirmaya Backend - AI Assistant Instructions

## Architecture Overview
**Feature-based modular architecture** with API-per-file organization:
- `src/features/[feature]/apis/*.ts` - Individual route handlers (one endpoint per file)
- `src/features/[feature]/shared/` - Schema, queries, interfaces shared across APIs
- `src/features/[feature]/index.ts` - Combines all API routers under feature path
- `src/middlewares/` - Cross-cutting concerns (auth, validation, security, logging)
- `src/utils/` - Shared utilities (JWT, S3, email, logger, response formatting)
- `src/database/` - Drizzle ORM connection, migrations, health checks, seeding

### Feature Structure Pattern
Each feature module follows this precise structure:
```
src/features/[feature]/
├── apis/
│   ├── [operation-name].ts      # Single endpoint: router, schema, handler, logic
│   └── ...
├── shared/
│   ├── schema.ts                # Drizzle table definitions + TypeScript types
│   ├── queries.ts               # Reusable database queries
│   └── interface.ts             # TypeScript interfaces
├── tests/
│   ├── unit/                    # Unit tests
│   └── integration/             # API integration tests
└── index.ts                     # Combines all APIs into feature router
```

**Example**: `src/features/user/apis/get-all-users.ts` exports a configured router with middleware already attached

## Key Patterns & Conventions

### Database & Schema
- **Drizzle ORM** with PostgreSQL - schemas in `src/features/*/shared/schema.ts`
- **Connection**: `import { db } from './database/drizzle'` - singleton with pooling (max 10)
- **Audit fields pattern** (required on ALL tables): `created_by`, `created_at`, `updated_by`, `updated_at`, `is_deleted`, `deleted_by`, `deleted_at`
- **Role system**: `['admin', 'scientist', 'researcher', 'policymaker']` - default `'scientist'`
- **Soft deletes**: All operations use `is_deleted` boolean flag, never hard delete records

#### Database Commands & Workflow:
```bash
# Development workflow (after schema changes):
npm run db:generate     # Generate migration from schema changes
npm run db:migrate      # Apply migrations to database
npm run db:push         # Force push schema (use carefully)

# Database management:
npm run db:studio       # Open Drizzle Studio GUI (localhost:4983)
npm run db:seed         # Populate with test data
npm run db:test         # Health check connection & pool stats
npm run db:check        # Validate schema drift
npm run db:drop         # Drop all tables (dangerous!)
npm run db:up           # Update to latest schema

# Migration files location: src/database/migrations/
# Schema files: src/features/**/*.schema.ts
```

#### Database Patterns:
- **Connection**: `import { db } from './database/drizzle'` - singleton instance
- **Queries**: Use Drizzle's fluent API: `db.select().from(table).where(...)`
- **Transactions**: `db.transaction(async (tx) => { ... })`
- **Raw SQL**: `db.execute(sql\`SELECT * FROM users\`)`
- **Health checks**: `checkDatabaseHealth()` returns connection status & pool stats

#### Database Schema Patterns:
```typescript
// Table definition with audit fields
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  role: text('role').$type<UserRole>().default('scientist').notNull(),
  // Audit fields (required on all tables)
  created_by: integer('created_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_by: integer('updated_by'),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  is_deleted: boolean('is_deleted').default(false).notNull(),
  deleted_by: integer('deleted_by'),
  deleted_at: timestamp('deleted_at'),
});

// TypeScript types (auto-generated)
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

#### Common Database Operations:
```typescript
// Select with filters
const users = await db.select().from(usersTable).where(eq(usersTable.role, 'admin'));

// Insert with returning
const [newUser] = await db.insert(usersTable).values(data).returning();

// Update with conditions
await db.update(usersTable)
  .set({ updated_by: userId, updated_at: new Date() })
  .where(eq(usersTable.id, id));

// Soft delete (preferred over hard delete)
await db.update(usersTable)
  .set({ is_deleted: true, deleted_by: userId, deleted_at: new Date() })
  .where(eq(usersTable.id, id));

// Join queries
await db.select()
  .from(usersTable)
  .innerJoin(uploadsTable, eq(usersTable.id, uploadsTable.user_id))
  .where(eq(usersTable.id, userId));
```

### API-Per-File Pattern
Each endpoint is self-contained in its own file with all components:
```typescript
// src/features/user/apis/get-all-users.ts
import { Router, Response } from 'express';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { db } from '../../../database/drizzle';
import { users } from '../shared/schema';

// 1. Business logic function (testable)
async function getAllUsers() {
  return await db.select().from(users).where(eq(users.is_deleted, false));
}

// 2. Request handler with asyncHandler wrapper
const handler = asyncHandler(async (req: Request, res: Response) => {
  const usersList = await getAllUsers();
  ResponseFormatter.success(res, usersList, 'Users retrieved');
});

// 3. Router with middleware chain
const router = Router();
router.get('/', requireAuth, requireRole('admin'), handler);

export default router;
```

**Key principles**:
- Export configured router (not controller class)
- Middleware attached at route level: `requireAuth`, `requireRole([...])`, `validationMiddleware(schema)`
- Use `asyncHandler()` wrapper for automatic error handling
- Business logic in separate function for testing
- Validation schemas inline using Zod

### Authentication & Authorization
- **JWT tokens**: Bearer token in Authorization header (24h expiry)
- **requireAuth middleware**: Attaches `req.userId`, `req.userRole`, `req.userAgent`, `req.clientIP`
- **requireRole middleware**: Pass single role or array: `requireRole('admin')` or `requireRole(['admin', 'scientist'])`
- **User context helpers**: `getUserId(req)` throws if missing, `parseIdParam(req)` for route params

### Response Formatting
**Always use `ResponseFormatter`** from `src/utils/responseFormatter.ts`:
```typescript
// Success (200)
ResponseFormatter.success(res, data, 'Operation successful');

// Created (201)
ResponseFormatter.created(res, data, 'Resource created');

// No content (204)
ResponseFormatter.noContent(res, 'Resource deleted');

// Errors: throw HttpException instead
throw new HttpException(404, 'User not found');
throw new HttpException(409, 'Email already exists');
```

### Validation & Types
- **Zod schemas** defined inline in API files (no separate validation files)
- **TypeScript types** auto-generated from Drizzle schemas: `User`, `NewUser`, `Invitation`
- **Request interfaces**: `RequestWithUser` extends Express.Request with `userId`, `userRole`
- **Validation middleware**: `validationMiddleware(zodSchema)` - validates `req.body`

### Shared Queries Pattern
Reusable database queries in `shared/queries.ts` for cross-API usage:
```typescript
// src/features/user/shared/queries.ts
export const findUserById = async (id: number): Promise<User | undefined> => {
  const [user] = await db.select().from(users)
    .where(and(eq(users.id, id), eq(users.is_deleted, false)))
    .limit(1);
  return user;
};

export const createUser = async (userData: NewUser): Promise<User> => {
  const [newUser] = await db.insert(users).values(userData).returning();
  return newUser;
};
```
- Import from feature's shared queries: `import { findUserById } from '../../user/shared/queries'`
- Always filter by `is_deleted = false` for soft delete safety
- Use `.returning()` on inserts/updates to get full record back

### Environment & Configuration
- **Validation**: `validateEnv()` runs at startup - fails fast if missing vars
- **Required vars**: `JWT_SECRET` (min 32 chars), `DATABASE_URL`, AWS S3 credentials, email config
- **Optional**: Redis connection (app starts without it)
- **Access config**: `const env = validateEnv()` then use `env.JWT_SECRET`, etc.

### Email System
- **Nodemailer** with Gmail SMTP configured in `src/utils/emailConfig.ts`
- **Invitation emails**: See `src/utils/sendInvitationEmail.ts` for pattern
- **Config**: Uses `EMAIL_USER`, `EMAIL_PASSWORD`, `APP_NAME` from env
- **Error handling**: Email failures are logged but don't block operations

### Testing Patterns
- **Structure**: `src/features/[feature]/tests/{unit,integration}/` with Jest + SWC + Supertest
- **API Integration Tests**: Use `ApiTestHelper` for HTTP requests, `AuthTestHelper` for tokens, `TestDataFactory` for data
- **Database Cleanup**: `dbHelper.cleanup()` and `dbHelper.resetSequences()` in `beforeEach`
- **Example**:
```typescript
describe('User API', () => {
  let app: Application;
  let authToken: string;

  beforeAll(async () => {
    const appInstance = new App([new AuthRoute(), new UserRoute()]);
    app = appInstance.getServer();
  });

  beforeEach(async () => {
    await dbHelper.cleanup();
    const userData = TestDataFactory.createUser();
    const response = await apiHelper.post('/api/v1/auth/register', userData);
    authToken = response.body.data.token;
  });
});
```

### Middleware Execution Order
Critical sequence (defined in `src/app.ts`):
1. **Request ID** - Generates unique ID for request tracking
2. **Security** - Helmet, CORS, HPP
3. **Request Logger** - Winston logging
4. **Compression** - Response compression
5. **Rate Limiting** - Auth endpoints (stricter) vs API endpoints
6. **Body Parsing** - JSON/URL-encoded (10mb limit)
7. **Route-specific** - Auth → Role → Validation → Handler

### Graceful Shutdown
- **Setup**: `setupGracefulShutdown({ server, database, redis })` in `src/server.ts`
- **Signals**: Handles SIGTERM, SIGINT, uncaughtException, unhandledRejection
- **Cleanup order**: HTTP server → Database pool → Redis connection
- **Logging**: Winston logs all shutdown steps

### Project-Specific Conventions
- **No controller classes**: Use functions exported from API files
- **Feature routes**: Class-based with `Route` interface, aggregates API routers
- **Database schemas**: Register in `src/database/drizzle.ts` for migrations
- **Admin invites**: Separate feature for user onboarding with email workflow
- **Upload tracking**: Dedicated table with status tracking (`pending`, `completed`, `failed`)
### Bootstrap Sequence
Critical startup order in `src/server.ts`:
1. **Validate Environment**: `validateEnv()` - fails fast if missing vars
2. **Database Health Check**: `checkDatabaseHealth()` - verifies connection & pool
3. **Redis Connection**: Optional, skipped if unavailable
4. **Start Express App**: Initialize routes and middlewares
5. **Setup Graceful Shutdown**: `setupGracefulShutdown({ server, database, redis })`
- **Failure Handling**: Exit(1) if critical services (DB) fail
- **Logging**: Winston logs each step with structured data

### Development Workflow
- **Environment**: `.env` validated by `validateEnv()` on startup
- **Logging**: Winston with daily rotation to `logs/` directory
- **Build**: `npm run build` (TypeScript only, no postbuild)
- **Dev server**: `npm run dev` with nodemon watching `src/**/*` and `.env`

### File Organization
```
src/features/[feature]/
├── apis/
│   └── [operation-name].ts     # Complete endpoint with router, handler, validation
├── shared/
│   ├── schema.ts               # Drizzle table definitions + TypeScript types
│   ├── queries.ts              # Reusable database queries
│   └── interface.ts            # TypeScript interfaces
├── tests/
│   ├── unit/                   # Business logic tests
│   └── integration/            # API endpoint tests
└── index.ts                    # Feature router aggregator
```

### Key Dependencies
- **Database**: Drizzle ORM + PostgreSQL
- **Auth**: JWT + bcrypt
- **Validation**: Zod schemas
- **File Upload**: Multer + AWS S3
- **Security**: Helmet, CORS, rate limiting
- **Testing**: Jest + SWC + Supertest

### Common Gotchas
- **Database**: Always run migrations after schema changes
- **Roles**: All user operations allow `['admin', 'scientist', 'researcher', 'policymaker']` - no ownership checks
- **Middleware order**: Request ID → Security → Auth → Validation → Route handler
- **Environment**: All variables validated at startup - check `validateEnv.ts`