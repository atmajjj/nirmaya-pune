# User Feature - Frontend Integration Guide

## Overview

The User feature provides user management capabilities including viewing profiles, listing all users, updating user information, and deleting accounts. It supports role-based access control where admins have elevated privileges for managing all users.

## Base URL

```
/api/users
```

## Authentication Requirements

| Endpoint | Authentication | Authorization |
|----------|----------------|---------------|
| `GET /` | ✅ Required | Admin only |
| `GET /:id` | ✅ Required | Any authenticated user |
| `PUT /:id` | ✅ Required | Owner or Admin |
| `DELETE /:id` | ✅ Required | Admin only |

---

## Endpoints

### 1. Get All Users

Get paginated list of all users in the system.

**Endpoint:** `GET /api/users`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | number | `1` | - | Page number (min: 1) |
| `limit` | number | `20` | `100` | Items per page |

#### Example Request

```
GET /api/users?page=1&limit=20
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com",
      "phone_number": "+1234567890",
      "role": "admin",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone_number": null,
      "role": "scientist",
      "created_at": "2024-01-10T09:00:00.000Z",
      "updated_at": "2024-01-10T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

> **Note:** Password and other sensitive fields are excluded from the response.

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | User is not an admin |

---

### 2. Get User by ID

Get a specific user's profile information.

**Endpoint:** `GET /api/users/:id`

**Authentication:** Required (Bearer Token)

**Authorization:** Any authenticated user

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | User ID |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 5,
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone_number": "+1987654321",
    "role": "researcher",
    "created_at": "2024-01-12T14:30:00.000Z",
    "updated_at": "2024-01-15T09:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | User not found |

---

### 3. Update User

Update user profile information. Users can update their own profile, while admins can update any user including role changes.

**Endpoint:** `PUT /api/users/:id`

**Authentication:** Required (Bearer Token)

**Authorization:** 
- **Own profile:** Any authenticated user
- **Other users:** Admin only
- **Role changes:** Admin only

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | User ID to update |

#### Request Body

```json
{
  "name": "Jane Smith Updated",
  "email": "jane.updated@example.com",
  "phone_number": "+1122334455",
  "password": "NewSecurePass123!",
  "role": "scientist"
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ❌ | User's full name (min 1 char) |
| `email` | string | ❌ | Valid email address |
| `phone_number` | string | ❌ | Phone number |
| `password` | string | ❌ | New password (min 8 chars) |
| `role` | string | ❌ | Role (admin only): `admin`, `scientist`, `researcher`, `policymaker` |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": 5,
    "name": "Jane Smith Updated",
    "email": "jane.updated@example.com",
    "phone_number": "+1122334455",
    "role": "scientist",
    "created_at": "2024-01-12T14:30:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid request body |
| `400` | Bad Request | Cannot change your own admin role |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | You can only update your own profile |
| `403` | Forbidden | Only admins can change user roles |
| `404` | Not Found | User not found |
| `409` | Conflict | Email already exists |

---

### 4. Delete User

Soft delete a user account. Only admins can delete users.

**Endpoint:** `DELETE /api/users/:id`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | User ID to delete |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Bad Request | Cannot delete your own account |
| `400` | Bad Request | Cannot delete the last admin account |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | User is not an admin |
| `404` | Not Found | User not found |

---

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | System administrator | Full access, user management, role changes |
| `scientist` | Scientific user | Default role for public registration |
| `researcher` | Research user | Limited access to research features |
| `policymaker` | Policy user | Access to policy-related features |

### Role-Based Access Summary

| Action | Admin | Scientist | Researcher | Policymaker |
|--------|-------|-----------|------------|-------------|
| View all users | ✅ | ❌ | ❌ | ❌ |
| View any user by ID | ✅ | ✅ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ | ✅ |
| Update other users | ✅ | ❌ | ❌ | ❌ |
| Change user roles | ✅ | ❌ | ❌ | ❌ |
| Delete users | ✅ | ❌ | ❌ | ❌ |

---

## Permission Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       USER UPDATE PERMISSION FLOW                    │
└─────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │  PUT /users/:id │
                              └───────┬──────┘
                                      │
                              ┌───────▼───────┐
                              │ Is user       │
                              │ authenticated?│
                              └───────┬───────┘
                                      │
                        ┌─────────────┼─────────────┐
                        │ No                        │ Yes
                        ▼                           ▼
                   ┌────────┐               ┌───────────────┐
                   │  401   │               │ Is user admin?│
                   │ Error  │               └───────┬───────┘
                   └────────┘                       │
                                      ┌─────────────┼─────────────┐
                                      │ No                        │ Yes
                                      ▼                           ▼
                               ┌─────────────┐            ┌───────────────┐
                               │ Is updating │            │ ✅ Can update │
                               │ own profile?│            │ any user +    │
                               └──────┬──────┘            │ change roles  │
                                      │                   └───────────────┘
                        ┌─────────────┼─────────────┐
                        │ No                        │ Yes
                        ▼                           ▼
                   ┌────────┐               ┌───────────────┐
                   │  403   │               │ ✅ Can update │
                   │ Error  │               │ own profile   │
                   └────────┘               │ (no role chg) │
                                            └───────────────┘
```

---

## Frontend Implementation Example

### TypeScript Service

```typescript
// user.service.ts

const API_BASE = '/api/users';

interface User {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  role: 'admin' | 'scientist' | 'researcher' | 'policymaker';
  created_at: string;
  updated_at: string;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  phone_number?: string;
  password?: string;
  role?: 'admin' | 'scientist' | 'researcher' | 'policymaker';
}

interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

// Get auth header
const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Get all users (admin only)
export const getAllUsers = async (
  page = 1,
  limit = 20
): Promise<PaginatedUsers> => {
  const response = await fetch(`${API_BASE}?page=${page}&limit=${limit}`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const result = await response.json();
  return {
    users: result.data,
    total: result.pagination.total,
    page: result.pagination.page,
    limit: result.pagination.limit,
  };
};

// Get user by ID
export const getUserById = async (id: number): Promise<User> => {
  const response = await fetch(`${API_BASE}/${id}`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data } = await response.json();
  return data;
};

// Get current user profile (convenience method)
export const getCurrentUser = async (): Promise<User> => {
  // Decode JWT to get user ID, or use a /me endpoint if available
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('Not authenticated');
  
  const payload = JSON.parse(atob(token.split('.')[1]));
  return getUserById(payload.id);
};

// Update user
export const updateUser = async (
  id: number,
  data: UpdateUserData
): Promise<User> => {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data: user } = await response.json();
  return user;
};

// Update current user profile (convenience method)
export const updateCurrentUser = async (
  data: Omit<UpdateUserData, 'role'>
): Promise<User> => {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('Not authenticated');
  
  const payload = JSON.parse(atob(token.split('.')[1]));
  return updateUser(payload.id, data);
};

// Delete user (admin only)
export const deleteUser = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
};

// Check if current user is admin
export const isAdmin = (): boolean => {
  const token = localStorage.getItem('authToken');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role === 'admin';
  } catch {
    return false;
  }
};
```

### React Profile Edit Component

```tsx
// ProfileEdit.tsx

import { useState, useEffect } from 'react';
import { getCurrentUser, updateCurrentUser, User } from './user.service';

export function ProfileEdit() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setName(userData.name);
      setEmail(userData.email);
      setPhoneNumber(userData.phone_number || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updateData: any = { name, email };
      if (phoneNumber) updateData.phone_number = phoneNumber;
      if (password) updateData.password = password;

      const updated = await updateCurrentUser(updateData);
      setUser(updated);
      setPassword(''); // Clear password field
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading profile...</p>;
  if (!user) return <p>Failed to load profile</p>;

  return (
    <div className="profile-edit">
      <h2>Edit Profile</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Phone Number</label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>New Password (leave blank to keep current)</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            placeholder="••••••••"
          />
        </div>

        <div className="form-info">
          <p><strong>Role:</strong> {user.role}</p>
          <p><small>Contact an administrator to change your role.</small></p>
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">Profile updated successfully!</p>}

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
```

### React Admin User List Component

```tsx
// AdminUserList.tsx

import { useState, useEffect } from 'react';
import { getAllUsers, deleteUser, User, isAdmin } from './user.service';

export function AdminUserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (!isAdmin()) {
      return; // Redirect or show unauthorized
    }
    loadUsers();
  }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getAllUsers(page, limit);
      setUsers(result.users);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;

    try {
      await deleteUser(user.id);
      setUsers(users.filter(u => u.id !== user.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'red',
      scientist: 'blue',
      researcher: 'green',
      policymaker: 'purple',
    };
    return colors[role] || 'gray';
  };

  if (!isAdmin()) {
    return <p>You do not have permission to view this page.</p>;
  }

  if (loading) return <p>Loading users...</p>;

  return (
    <div className="admin-user-list">
      <h2>User Management</h2>
      
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                <span className={`badge badge-${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </span>
              </td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
              <td>
                <button onClick={() => window.location.href = `/users/${user.id}/edit`}>
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(user)}
                  className="danger"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button 
          disabled={page === 1} 
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </button>
        <span>Page {page} of {Math.ceil(total / limit)}</span>
        <button 
          disabled={page >= Math.ceil(total / limit)} 
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## Response Sanitization

All user responses are sanitized to exclude sensitive information:

### Included Fields

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "role": "scientist",
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

### Excluded Fields

- `password` - Never exposed
- `is_deleted` - Internal flag
- `deleted_by` - Internal audit field
- `deleted_at` - Internal audit field
- `created_by` - Internal audit field
- `updated_by` - Internal audit field

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## Related Endpoints

- **Auth Feature**: `/api/auth` - User registration and login
- **Admin Invite**: `/api/admin/invitations` - Create users with specific roles
