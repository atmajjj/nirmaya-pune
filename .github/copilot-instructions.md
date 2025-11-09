# Nirmaya Backend - AI Assistant Instructions

## Architecture Overview
**Feature-based modular structure** with clear separation of concerns:
- `src/features/` - Business logic grouped by domain (auth, user, upload)
- `src/middlewares/` - Cross-cutting concerns (auth, validation, security)
- `src/utils/` - Shared utilities and helpers
- `src/database/` - Drizzle ORM schemas and migrations

## Key Patterns & Conventions

### Database & Schema
- **Drizzle ORM** with PostgreSQL - schemas in `src/features/*/user.schema.ts`
- **Connection**: Uses `DATABASE_URL` env var with connection pooling (max 10 connections)
- **Audit fields pattern**: `created_by`, `created_at`, `updated_by`, `updated_at`, `is_deleted`, `deleted_by`, `deleted_at`
- **Role system**: `['admin', 'scientist', 'researcher', 'policymaker']` - default `'scientist'`
- **Soft deletes**: All tables use `is_deleted` boolean flag instead of hard deletes

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

### Authentication & Authorization
- **JWT-based auth** with `requireAuth` middleware
- **Role-based access**: `requireRole(['admin', 'scientist', 'researcher', 'policymaker'])` for user operations
- **Admin-only**: `requireRole('admin')` for sensitive operations
- **User context**: `req.userId`, `req.userRole` attached by auth middleware

### Controller Patterns
- **Helper functions**: Use `parseIdParam(req)`, `getUserId(req)`, `asyncHandler()` from `src/utils/controllerHelpers.ts`
- **Error handling**: Throw `HttpException(status, message)` - caught by global error middleware
- **Response format**: Controllers return data, formatting handled by response utilities

### Route Structure
```typescript
// Feature routes follow this pattern:
class FeatureRoute implements Route {
  router = Router();
  path = '/feature';

  private initializeRoutes() {
    this.router.get(`${this.path}`, requireAuth, requireRole('admin'), controller.method);
    this.router.get(`${this.path}/:id`, requireAuth, requireRole([...]), controller.method);
  }
}
```

### Validation & Types
- **Zod schemas** in `*.validation.ts` files
- **TypeScript types** auto-generated from Drizzle schemas: `User`, `NewUser`
- **Request interfaces**: `RequestWithUser` extends Express.Request with auth context

### Testing
- **Jest + SWC** for fast TypeScript testing
- **Test structure**: `tests/unit/`, `tests/integration/`
- **Commands**: `npm run test:unit`, `npm run test:integration`, `npm run test:coverage`

### Development Workflow
- **Environment**: `.env` validated by `validateEnv()` on startup
- **Logging**: Winston with daily rotation to `logs/` directory
- **Build**: `npm run build` (TypeScript only, no postbuild)
- **Dev server**: `npm run dev` with nodemon watching `src/**/*` and `.env`

### File Organization
```
src/features/[feature]/
├── [feature].controller.ts    # Route handlers
├── [feature].route.ts         # Express routes & middleware
├── [feature].schema.ts        # Drizzle table definitions
├── [feature].validation.ts    # Zod schemas
├── [feature].queries.ts       # Database operations
├── [feature].interface.ts     # TypeScript interfaces
├── services/                  # Business logic
└── tests/                     # Feature-specific tests
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