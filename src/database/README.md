# Database Guide

Uses **Drizzle ORM** for type-safe PostgreSQL operations.

## Files

```
src/database/
├── drizzle.ts      # Database connection & client
├── health.ts       # Health checks
├── migrate.ts      # Run migrations
├── seed.ts         # Add test data
├── examples.ts     # Usage examples
└── migrations/     # Migration files
```

## Quick Commands

```bash
npm run db:test      # Test connection
npm run db:generate  # Create migration from schema changes
npm run db:migrate   # Apply migrations
npm run db:push      # Push schema directly (dev only)
npm run db:studio    # Open database GUI
npm run db:seed      # Add test data
```

## Setup

**Environment Variable:**
```
DATABASE_URL="postgresql://user:password@host:port/database"
```

**Schemas:** Located in `src/features/**/*.schema.ts`

## Basic Usage

```typescript
import { db } from './database/drizzle';
import { users } from '../features/user/user.schema';
import { eq } from 'drizzle-orm';

// Select
const user = await db.select().from(users).where(eq(users.id, 1));

// Insert
const [newUser] = await db.insert(users).values({
  name: 'John',
  email: 'john@example.com',
  created_by: 1
}).returning();

// Update
await db.update(users).set({ name: 'Jane' }).where(eq(users.id, 1));

// Transaction
await db.transaction(async (tx) => {
  // Multiple operations here
});
```

## Schema Changes

1. Edit schema files in feature folders
2. Run `npm run db:generate` to create migration
3. Run `npm run db:migrate` to apply

For detailed examples, see `examples.ts`
