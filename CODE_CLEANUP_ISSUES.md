# Code Cleanup Issues - Nirmaya Backend

> Generated: 26 November 2025

## 🔴 Unused/Redundant Code

| File | Item | Status |
|------|------|--------|
| `src/utils/httpException.ts` | `ValidationException`, `AuthenticationException`, `AuthorizationException`, `NotFoundError`, `ConflictError` - never used in production code | ✅ Fixed |
| `src/utils/uuid.ts` | `UniversalUuid.isValid()`, `UniversalUuid.generateMultiple()` - never called | ✅ Fixed |
| `src/utils/redis.ts` | `connectRedis()`, `pingRedisConnection()`, `closeRedisConnection()` - exported but unused | ✅ Removed |
| `src/utils/s3Upload.ts` | `uploadMultipleToS3()` - defined but never used | ✅ Removed |
| `src/database/drizzle.ts` | `connectWithRetry()` - exported but never called | ✅ Now used in server.ts |
| `src/middlewares/request-logger.middleware.ts` | `apiRequestLoggerMiddleware` - deprecated alias | ✅ Removed |
| `src/interfaces/request.interface.ts` | `TokenData`, `RequestWithContext` - never used | ✅ Removed |
| `src/features/admin-invite/shared/interface.ts` | `IInvitationWithDetails` - never used | ✅ Removed |
| `src/features/upload/shared/interface.ts` | `UploadInput`, `UploadStatsRaw` - never used | ✅ Removed (earlier) |

## 🟡 Over-Engineered Code

| File | Issue | Status |
|------|-------|--------|
| `src/utils/uuid.ts` | Custom UUID when `crypto.randomUUID()` is native | ✅ Fixed |
| `src/features/user/apis/delete-user.ts` | Admin count cache for infrequent operation | ✅ Fixed |
| `src/utils/encryption.ts` | PBKDF2 100k iterations (10k sufficient) | ⏸️ Kept (security) |
| `src/features/admin-invite/apis/verify-invitation.ts` | `timingSafeCompare()` - overkill for DB-indexed tokens | ✅ Removed |

## 🟠 Complexity to Simplify

| File | Issue | Status |
|------|-------|--------|
| `src/features/user/apis/get-user-by-id.ts` | `requireRole` with ALL roles - just use `requireAuth` | ✅ Fixed |
| `src/features/upload/apis/*.ts` | Same pattern - `requireRole` with all 4 roles | ✅ Fixed |
| `src/utils/responseFormatter.ts` | `noContent()` has unused `_message` param | ✅ Fixed |
| `src/features/auth/apis/register.ts` | Extra DB call for self-reference `created_by` | ⏸️ Kept (necessary) |
| `src/features/upload/apis/get-uploads.ts` | `supportedMimeTypes` duplicates middleware config | ✅ Fixed |

## 🔵 Duplicated Patterns

| Pattern | Locations | Status |
|---------|-----------|--------|
| `convertUpload()` function | `get-uploads.ts`, `update-upload.ts` | ✅ Fixed |
| `BCRYPT_ROUNDS = 12` | `create-invitation.ts`, `password.ts` | ✅ Fixed |
| Role array with all roles | Multiple API files | ✅ Fixed |

## 🟢 Minor Issues

| File | Issue | Status |
|------|-------|--------|
| `src/features/admin-invite/apis/create-invitation.ts` | Awkward `void _unused` pattern | ✅ Fixed |
| `src/features/upload/apis/download-file.ts` | Redundant type cast after instanceof check | ✅ Fixed |
| `src/utils/jwt.ts` | Unnecessary caching of singleton | ✅ Fixed |
| `src/app.ts` | `cookieParser()` with no cookies used | ✅ Removed |

---

## Progress Summary

- [x] Remove unused exception classes
- [x] Replace custom UUID with `crypto.randomUUID()`
- [x] Remove redundant `requireRole` (use `requireAuth` only)
- [x] Consolidate duplicated patterns
- [x] Remove unused Redis functions
- [x] Remove unused `uploadMultipleToS3`
- [x] Use `connectWithRetry` in server.ts
- [x] Remove deprecated logger alias
- [x] Remove unused interfaces
- [x] Fix `noContent()` unused param
- [x] Remove unused `cookieParser`
- [x] Remove admin count cache (over-engineered)
- [x] Remove `timingSafeCompare` (overkill)
- [x] Remove `supportedMimeTypes` duplication
- [x] Fix `void _unused` pattern
- [x] Fix redundant type cast
- [x] Remove JWT secret caching

### ✅ All cleanup items completed!
