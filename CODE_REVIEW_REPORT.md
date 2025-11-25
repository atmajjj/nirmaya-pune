# Code Review Report: Nirmaya Backend

**Date:** 25 November 2025
**Reviewer:** GitHub Copilot (Senior Developer Persona)

## 1. Executive Summary

The codebase follows a well-structured, modular architecture (Feature-based) using modern tools like TypeScript, Express, and Drizzle ORM. The separation of concerns is generally good, with clear boundaries between APIs, shared schemas, and core infrastructure.

However, there are **critical security vulnerabilities** in the authentication flow and **major configuration issues** regarding dependency versions that need immediate attention. The project also exhibits some potential stability risks related to resource management (Redis, Database connections).

## 2. Critical Issues (High Priority)

### 2.1. Security Vulnerabilities
- **Privilege Escalation in Registration**: The `POST /api/v1/auth/register` endpoint allows users to specify their `role` in the request body. The Zod schema defines `role` as optional but allows it to be passed. A malicious user can send `{"role": "admin"}` to gain administrative access.
  - **File**: `src/features/auth/apis/register.ts`
  - **Fix**: Remove `role` from the input schema or forcibly override it to `'scientist'` (or default) in the handler logic.

- **Audit Field Tampering**: The registration endpoint also allows users to inject values for `created_by`, `updated_by`, `is_deleted`, etc.
  - **File**: `src/features/auth/apis/register.ts`
  - **Fix**: Strip these fields from the input DTO. `created_by` should be set by the system (e.g., to a system user ID or the new user's ID if self-registered).

### 2.2. Dependency Configuration
- **Non-Existent/Future Versions**: `package.json` lists dependency versions that do not exist or are far ahead of the current stable releases. This will cause `npm install` to fail.
  - `uuid`: `^13.0.0` (Current stable: ~11.x)
  - `zod`: `^4.1.9` (Current stable: ~3.x)
  - `nodemailer`: `^7.0.3` (Current stable: ~6.9.x)
  - `multer`: `^2.0.0` (Current stable: ~1.4.5)
  - `dotenv`: `^17.2.1` (Current stable: ~16.x)
  - `bcrypt`: `^6.0.0` (Current stable: ~5.1.x)
  - **Fix**: Revert these to the latest stable versions.

## 3. Architecture & Code Quality

### 3.1. Database & ORM
- **Circular Dependency**: `src/database/drizzle.ts` imports schemas from `src/features/...`. While common in Drizzle to aggregate schemas, it creates a dependency from the core infrastructure to the feature layer.
- **Hardcoded ID Assumption**: Registration logic defaults `created_by` to `1`. If the user with ID 1 (Admin) does not exist (e.g., fresh DB), the foreign key constraint will fail, breaking registration.

### 3.2. Infrastructure
- **Redis Handling**: `src/server.ts` imports `redisClient` but explicitly skips the connection check. However, it passes `redisClient` to `setupGracefulShutdown`. If `redisClient` is not connected, calling `.quit()` on it during shutdown might throw an error or hang.
- **Jest Configuration**: `forceExit: true` is used in `jest.config.js`. This masks issues where resources (DB connections, server handles) are not properly closed after tests, leading to potential memory leaks or "hanging" processes in CI/CD.

### 3.3. Linting
- **Ignored Files**: `eslint.config.mjs` ignores `**/*.js`. This means configuration files (like `jest.config.js`, `drizzle.config.ts` if compiled to js) or legacy JS files are not linted.

## 4. Recommendations

1.  **Fix Security Flaws Immediately**:
    - Update `RegisterDto` schema to exclude `role` and audit fields.
    - Hardcode `role: 'scientist'` in the `handleRegister` function.

2.  **Correct `package.json`**:
    - Run `npm install` with valid versions to generate a correct `package-lock.json` and update `package.json`.

3.  **Improve Error Handling**:
    - Ensure `setupGracefulShutdown` checks if Redis is actually connected before attempting to close it.

4.  **Refactor Database Schema Import**:
    - Consider a central `src/database/schema.ts` that exports all feature schemas, or keep the current pattern but be aware of the coupling.

5.  **Testing**:
    - Investigate why `forceExit` is needed. Ensure `db.end()` and `server.close()` are called correctly in `afterAll` blocks.

## 5. Code Style & Consistency

- **General**: The code style is consistent (Prettier/ESLint).
- **Imports**: Good use of absolute/relative imports.
- **Comments**: Code is well-commented.
- **Naming**: Variable and function names are descriptive and follow conventions.

---
**Status**: ⚠️ **Requires Immediate Action** (Security & Dependencies)
