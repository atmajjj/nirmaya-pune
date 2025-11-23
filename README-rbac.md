# Role-Based Access Control (RBAC) Implementation

This document details the Role-Based Access Control (RBAC) system implemented in the Nirmaya Backend, including current static roles and future dynamic RBAC considerations.

## 📋 Table of Contents

- [Current RBAC System](#-current-rbac-system)
- [Role Definitions](#-role-definitions)
- [Middleware Implementation](#-middleware-implementation)
- [API Access Control](#-api-access-control)
- [Database Schema](#-database-schema)
- [Authentication Flow](#-authentication-flow)
- [Future Dynamic RBAC](#-future-dynamic-rbac)
- [Security Considerations](#-security-considerations)

## 🔐 Current RBAC System

The Nirmaya Backend implements a **static role-based access control** system with predefined roles and permissions. This approach provides security while maintaining simplicity for the current use case.

### **Key Characteristics**

- **Static Roles**: Fixed set of roles defined in code
- **Role-Based Permissions**: Access control based on user roles
- **Middleware Enforcement**: Automatic permission checking on API endpoints
- **Audit Trail**: All operations logged with user context
- **Soft Deletes**: Data preservation with logical deletion

## 👥 Role Definitions

### **Available Roles**

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | System administrator with full access | Highest |
| `scientist` | Research scientist with data access | Medium |
| `researcher` | Research assistant with limited access | Medium |
| `policymaker` | Policy maker with read-only access | Low |

### **Default Role**
- **Default**: `scientist` (assigned to new users)

### **Role Permissions Matrix**

| Permission | admin | scientist | researcher | policymaker |
|------------|-------|-----------|------------|-------------|
| **User Management** | | | | |
| View all users | ✅ | ❌ | ❌ | ❌ |
| View own profile | ✅ | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ | ✅ |
| Delete users | ✅ | ❌ | ❌ | ❌ |
| **File Management** | | | | |
| Upload files | ✅ | ✅ | ✅ | ❌ |
| Download files | ✅ | ✅ | ✅ | ✅ |
| Delete files | ✅ | ✅ | ✅ | ❌ |
| View all uploads | ✅ | ❌ | ❌ | ❌ |
| **Admin Functions** | | | | |
| Send invitations | ✅ | ❌ | ❌ | ❌ |
| System monitoring | ✅ | ❌ | ❌ | ❌ |

## 🛡️ Middleware Implementation

### **Role Middleware (`src/middlewares/role.middleware.ts`)**

```typescript
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../interfaces/user.interface';

// Extend Express Request to include user info
interface RequestWithUser extends Request {
  userId?: number;
  userRole?: UserRole;
  userAgent?: string;
  clientIP?: string;
}

// Role validation function
export const requireRole = (allowedRoles: UserRole | UserRole[]) => {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.userId || !req.userRole) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
      }

      // Convert single role to array for consistent checking
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      // Check if user's role is in allowed roles
      if (!roles.includes(req.userRole)) {
        return res.status(403).json({
          success: false,
          error: { message: 'Insufficient permissions' }
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: 'Role validation failed' }
      });
    }
  };
};
```

### **Usage Examples**

```typescript
// Single role requirement
router.get('/users', requireAuth, requireRole('admin'), getAllUsers);

// Multiple roles allowed
router.get('/uploads', requireAuth, requireRole(['admin', 'scientist']), getUploads);

// All authenticated users (no role restriction)
router.get('/profile', requireAuth, getUserProfile);
```

## 🔗 API Access Control

### **Protected Endpoints by Role**

#### **Admin Only Endpoints**
```typescript
// User management - admin only
GET    /api/v1/users              // List all users
DELETE /api/v1/users/:id          // Delete user

// Admin functions
POST   /api/v1/admin/invitations  // Send user invitations
```

#### **Authenticated User Endpoints**
```typescript
// Profile management - own profile only
GET    /api/v1/users/:id          // Get user by ID (with ownership check)
PUT    /api/v1/users/:id          // Update user (with ownership check)

// File operations - authenticated users
GET    /api/v1/uploads            // List user's uploads
POST   /api/v1/uploads            // Upload file
GET    /api/v1/uploads/:id/download // Download file
DELETE /api/v1/uploads/:id        // Delete upload
```

### **Ownership Validation**

For endpoints that allow users to access their own data, additional ownership checks are implemented:

```typescript
// In user API handlers
const getUserById = async (req: RequestWithUser, res: Response) => {
  const userId = parseIdParam(req);
  const currentUserId = req.userId!;
  const currentUserRole = req.userRole!;

  // Allow admins to view any user, others can only view themselves
  if (currentUserRole !== 'admin' && userId !== currentUserId) {
    throw new HttpException(403, 'Access denied: Can only view own profile');
  }

  const user = await findUserById(userId);
  // ... rest of handler
};
```

## 🗄️ Database Schema

### **Users Table**

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  phone_number: text('phone_number'),
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
```

### **Role Type Definition**

```typescript
// src/interfaces/user.interface.ts
export type UserRole = 'admin' | 'scientist' | 'researcher' | 'policymaker';

// Default role assignment
export const DEFAULT_USER_ROLE: UserRole = 'scientist';
```

## 🔄 Authentication Flow

### **JWT Token Payload**

```typescript
interface JWTPayload {
  id: number;        // User ID
  role: UserRole;    // User role
  iat: number;       // Issued at timestamp
  exp: number;       // Expiration timestamp
}
```

### **Authentication Middleware**

```typescript
// src/middlewares/auth.middleware.ts
export const requireAuth = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authorization token required' }
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token) as JWTPayload;

    // Attach user info to request
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.userAgent = req.get('User-Agent');
    req.clientIP = req.ip;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token' }
    });
  }
};
```

### **Complete Request Flow**

```
1. Client Request → 2. Auth Middleware → 3. Role Middleware → 4. Route Handler
       ↓                     ↓                     ↓                     ↓
   - Bearer Token       - JWT Verification    - Role Check         - Business Logic
   - Headers            - User Context        - Permission         - Database Ops
   - Body               - req.userId          - Access Control      - Response
```

## 🚀 Future Dynamic RBAC

### **Current Limitations**

The current static RBAC system has these limitations:
- Fixed roles cannot be modified without code changes
- No granular permissions (all-or-nothing per role)
- No role hierarchies or inheritance
- Difficult to customize permissions per organization

### **Dynamic RBAC Architecture**

For future implementation of dynamic RBAC, consider this architecture:

#### **Database Schema Extensions**

```sql
-- Roles table (dynamic roles)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(50) NOT NULL,  -- e.g., 'users', 'uploads'
  action VARCHAR(50) NOT NULL,    -- e.g., 'create', 'read', 'update', 'delete'
  description TEXT
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
  role_id INTEGER REFERENCES roles(id),
  permission_id INTEGER REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

-- User-Role mapping (many-to-many)
CREATE TABLE user_roles (
  user_id INTEGER REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  assigned_by INTEGER NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);
```

#### **Permission Checking Logic**

```typescript
interface Permission {
  resource: string;
  action: string;
}

class DynamicRBACService {
  async hasPermission(userId: number, permission: Permission): Promise<boolean> {
    // Get all roles for user
    const userRoles = await this.getUserRoles(userId);

    // Check if any role has the required permission
    for (const role of userRoles) {
      const hasPermission = await this.roleHasPermission(role.id, permission);
      if (hasPermission) return true;
    }

    return false;
  }

  async getUserRoles(userId: number): Promise<Role[]> {
    // Query user_roles and roles tables
  }

  async roleHasPermission(roleId: number, permission: Permission): Promise<boolean> {
    // Query role_permissions and permissions tables
  }
}
```

#### **Middleware Updates**

```typescript
export const requirePermission = (resource: string, action: string) => {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const userId = req.userId!;
    const rbacService = new DynamicRBACService();

    const hasPermission = await rbacService.hasPermission(userId, { resource, action });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' }
      });
    }

    next();
  };
};
```

### **Migration Strategy**

1. **Phase 1**: Keep current static system, add dynamic tables alongside
2. **Phase 2**: Create migration script to populate dynamic tables with current roles
3. **Phase 3**: Update middleware to use dynamic system
4. **Phase 4**: Add admin UI for role/permission management
5. **Phase 5**: Deprecate static role system

## 🔒 Security Considerations

### **Current Security Measures**

- **JWT Expiration**: 24-hour token validity
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Zod schemas prevent injection attacks
- **Audit Logging**: All operations tracked with user context

### **RBAC Security Best Practices**

#### **Principle of Least Privilege**
- Users should only have minimum permissions required
- Regular permission audits recommended
- Role changes logged and monitored

#### **Defense in Depth**
- Multiple layers of access control
- Client-side restrictions supplemented by server-side checks
- Database-level constraints and triggers

#### **Security Monitoring**
```typescript
// Log all permission checks
logger.info('Permission check', {
  userId: req.userId,
  role: req.userRole,
  resource: 'users',
  action: 'read',
  allowed: true,
  ip: req.clientIP,
  userAgent: req.userAgent
});
```

### **Common Security Issues to Avoid**

1. **Privilege Escalation**: Ensure users can't assign themselves higher roles
2. **Role Confusion**: Clear separation between role assignment and permission checking
3. **Session Fixation**: Proper token invalidation on role changes
4. **Information Leakage**: Don't expose role/permission details in error messages

## 📊 Monitoring and Auditing

### **Access Log Analysis**

```typescript
// Example log entry for permission check
{
  "timestamp": "2024-01-01T10:30:00.000Z",
  "level": "info",
  "message": "Permission check",
  "userId": 123,
  "role": "scientist",
  "resource": "uploads",
  "action": "create",
  "allowed": true,
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "requestId": "req-abc-123"
}
```

### **Audit Queries**

```sql
-- Recent permission denials
SELECT * FROM audit_logs
WHERE action = 'permission_denied'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Role change history
SELECT * FROM audit_logs
WHERE resource = 'users'
AND action = 'role_changed'
ORDER BY created_at DESC;
```

## 🔧 Implementation Examples

### **Adding New Role**

```typescript
// 1. Update UserRole type
export type UserRole = 'admin' | 'scientist' | 'researcher' | 'policymaker' | 'analyst';

// 2. Update permission matrix documentation
// 3. Update API endpoints if needed
// 4. Test role enforcement
```

### **Testing Role Permissions**

```typescript
describe('Role-based Access Control', () => {
  it('should allow admin to view all users', async () => {
    const adminToken = await createTestUser('admin');
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
  });

  it('should deny scientist from viewing all users', async () => {
    const scientistToken = await createTestUser('scientist');
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${scientistToken}`);

    expect(response.status).toBe(403);
  });
});
```

## 📚 Related Documentation

- [Main README](../README.md) - Complete project documentation
- [API Documentation](../README.md#api-documentation) - Endpoint specifications
- [Security Guide](../README.md#security) - Security implementation details

---

**RBAC Implementation - Static Roles with Dynamic Future**</content>
<parameter name="filePath">/Users/harshalpatil/Documents/Projects/nirmaya-backend/README-rbac.md