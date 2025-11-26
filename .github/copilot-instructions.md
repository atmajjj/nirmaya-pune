# Nirmaya Backend - AI Assistant Instructions

## Architecture: Feature-based API-per-File
Each endpoint lives in its own file with router, schema, handler, and business logic:

```
src/features/[feature]/
├── apis/[operation].ts   # Self-contained endpoint (see pattern below)
├── shared/
│   ├── schema.ts         # Drizzle table + types
│   ├── queries.ts        # Reusable DB queries
│   └── interface.ts      # TypeScript interfaces
├── tests/{unit,integration}/
└── index.ts              # Combines APIs into feature router
```

## API File Pattern (follow exactly)
```typescript
// src/features/[feature]/apis/[operation].ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { db } from '../../../database/drizzle';

const schema = z.object({ /* inline Zod schema */ });

async function businessLogic() { /* testable function */ }

const handler = asyncHandler(async (req, res: Response) => {
  const result = await businessLogic();
  ResponseFormatter.success(res, result, 'Message');
});

const router = Router();
router.post('/path', requireAuth, requireRole('admin'), validationMiddleware(schema), handler);
export default router;
```

## Database: Drizzle ORM + PostgreSQL
**All tables require audit fields**: `created_by`, `created_at`, `updated_by`, `updated_at`, `is_deleted`, `deleted_by`, `deleted_at`

```typescript
// Always filter soft deletes
await db.select().from(users).where(eq(users.is_deleted, false));
// Soft delete (never hard delete)
await db.update(users).set({ is_deleted: true, deleted_by: userId, deleted_at: new Date() }).where(eq(users.id, id));
// Insert with returning
const [newUser] = await db.insert(users).values(data).returning();
```

**Commands**: `npm run db:generate` → `npm run db:migrate` (after schema changes), `npm run db:studio` (GUI)

## Response & Error Handling
```typescript
ResponseFormatter.success(res, data, 'Message');     // 200
ResponseFormatter.created(res, data, 'Created');     // 201
ResponseFormatter.paginated(res, data, { page, limit, total }, 'Message');
ResponseFormatter.noContent(res);                    // 204
throw new HttpException(404, 'Not found');           // Errors via exceptions
```

## Auth & Middleware
- `requireAuth` → attaches `req.userId`, `req.userRole` from JWT
- `requireRole('admin')` or `requireRole(['admin', 'scientist'])` for authorization
- `validationMiddleware(zodSchema)` validates `req.body`
- `asyncHandler(fn)` wraps handlers for automatic error handling
- Roles: `'admin' | 'scientist' | 'researcher' | 'policymaker'`

## Key Commands
```bash
npm run dev              # Development server (nodemon)
npm test                 # All tests
npm run test:coverage    # Coverage report
npm run db:generate      # Generate migration from schema
npm run db:migrate       # Apply migrations
npm run docker:dev       # Full stack with Docker
```

## Testing Pattern
```typescript
import { dbHelper } from '../../../tests/utils/database.helper';
import { TestDataFactory } from '../../../tests/utils/factories';

beforeEach(async () => {
  await dbHelper.cleanup();
  await dbHelper.resetSequences();
});
```
Tests live in `src/features/[feature]/tests/` or `tests/` for shared utilities.

## Environment
- Config via `import { config } from './utils/validateEnv'` (validated at startup)
- Files: `.env.dev`, `.env.test`, `.env.prod` based on `NODE_ENV`
- Required: `DATABASE_URL`, `JWT_SECRET` (32+ chars), AWS S3 creds, email config

## Cross-Feature Imports
```typescript
import { findUserByEmail } from '../../user/shared/queries';  // Reuse queries
import { users } from '../../user/shared/schema';             // Access schema
```

## Critical Conventions
- **No controller classes** - export configured routers from API files
- **Soft deletes only** - always filter `is_deleted = false`
- **Feature routes** implement `Route` interface, registered in `src/server.ts`
- **Zod schemas inline** in API files (no separate validation files)
- Types auto-generated: `type User = typeof users.$inferSelect`
