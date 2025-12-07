# Auth Feature - Frontend Integration Guide

## Overview

The Auth feature handles user authentication including registration, login, logout, and token refresh. It uses JWT (JSON Web Tokens) for stateless authentication with support for access and refresh tokens.

## Base URL

```
/api/auth
```

## Authentication Requirements

| Endpoint | Authentication | Rate Limited |
|----------|----------------|--------------|
| `POST /register` | ❌ Public | ❌ No |
| `POST /login` | ❌ Public | ❌ No |
| `POST /logout` | ✅ Required (JWT) | ❌ No |
| `POST /refresh-token` | ❌ Public | ✅ Yes |

---

## Endpoints

### 1. Register

Creates a new user account. All public registrations are assigned the `scientist` role by default. For other roles, administrators must use the Admin Invite system.

**Endpoint:** `POST /api/auth/register`

**Authentication:** Not required (Public endpoint)

#### Request Headers

```http
Content-Type: application/json
```

#### Request Body

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "phone_number": "+1234567890"
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | User's full name (min 1 char) |
| `email` | string | ✅ | Valid email address |
| `password` | string | ✅ | Password (min 8 characters) |
| `phone_number` | string | ❌ | Phone number (optional) |

> **Note:** The `role` field is not accepted in registration requests for security. All public registrations receive the `scientist` role.

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "role": "scientist",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

> **Frontend Note:** Store the returned `token` for authenticated API calls. The user is automatically logged in after registration.

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid request body (e.g., short password) |
| `409` | Conflict | Email already registered |

---

### 2. Login

Authenticates a user and returns a JWT token.

**Endpoint:** `POST /api/auth/login`

**Authentication:** Not required (Public endpoint)

#### Request Headers

```http
Content-Type: application/json
```

#### Request Body

```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | Valid email address |
| `password` | string | ✅ | User's password |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "role": "scientist",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid request body |
| `401` | Unauthorized | Invalid credentials (wrong email or password) |

> **Security Note:** The API returns a generic "Invalid credentials" error for both wrong email and wrong password to prevent user enumeration attacks.

---

### 3. Logout

Logs out the user. The JWT token will remain valid until it naturally expires.

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Required (Bearer Token)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Request Body

None required.

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `401` | Unauthorized | Missing or invalid JWT token |

> **Frontend Note:** After logout, remove the token from local storage and redirect to the login page.

---

### 4. Refresh Token

Exchanges a valid refresh token for a new access token and refresh token pair. Use this to maintain user sessions without requiring re-authentication.

**Endpoint:** `POST /api/auth/refresh-token`

**Authentication:** Not required (refresh token is validated instead)

**Rate Limited:** Yes (prevents abuse)

#### Request Headers

```http
Content-Type: application/json
```

#### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refreshToken` | string | ✅ | Valid refresh token |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "role": "scientist",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

> **Frontend Note:** Store both the new `token` (access token) and `refreshToken` for future use. Discard the old tokens.

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Refresh token not provided |
| `401` | Unauthorized | Invalid or expired refresh token |
| `404` | Not Found | User no longer exists |
| `429` | Too Many Requests | Rate limit exceeded |

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                              │
└─────────────────────────────────────────────────────────────────────┘

1. REGISTRATION / LOGIN
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │  Frontend   │ ──POST──▶│   Backend   │ ──────▶│   User      │
   │  Login/Reg  │  /login  │   Validates │ JWT    │   Receives  │
   │   Form      │  /register│  Credentials│ Token  │   Token     │
   └─────────────┘          └─────────────┘        └──────┬──────┘
                                                          │
                                                          ▼
2. STORE TOKEN                                    ┌─────────────┐
                                                  │  Frontend   │
   Store in localStorage or                       │   Stores    │
   secure cookie                                  │   Token     │
                                                  └──────┬──────┘
                                                         │
3. AUTHENTICATED REQUESTS                                ▼
   ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
   │  Frontend   │ ───────▶│   Backend   │        │   API       │
   │  API Call   │ Bearer  │   Validates │ ─────▶ │   Response  │
   │  + Token    │ Token   │   JWT Token │        │             │
   └─────────────┘         └─────────────┘        └─────────────┘

4. TOKEN REFRESH (Before Expiry)
   ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
   │  Frontend   │ ──POST──▶│   Backend   │ ─────▶│   New       │
   │  Refresh    │ /refresh │   Validates │ New   │   Tokens    │
   │  Token      │ -token   │   Refresh   │ Token │   Stored    │
   └─────────────┘          │   Token     │ Pair  └─────────────┘
                            └─────────────┘

5. LOGOUT
   ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
   │  Frontend   │ ──POST──▶│   Backend   │        │   Token     │
   │  Logout     │ /logout  │  Confirms   │ ─────▶ │   Removed   │
   │  + Token    │         │   Logout    │        │   Locally   │
   └─────────────┘          └─────────────┘        └─────────────┘
```

---

## Frontend Implementation Example

### React/TypeScript Authentication Service

```typescript
// auth.service.ts

const API_BASE = '/api/auth';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  role: string;
  created_at: string;
  updated_at: string;
  token: string;
  refreshToken?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Register new user
export const register = async (
  name: string,
  email: string,
  password: string,
  phone_number?: string
): Promise<AuthUser> => {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, phone_number }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data } = await response.json() as ApiResponse<AuthUser>;
  
  // Store token
  localStorage.setItem('authToken', data.token);
  
  return data;
};

// Login user
export const login = async (email: string, password: string): Promise<AuthUser> => {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data } = await response.json() as ApiResponse<AuthUser>;
  
  // Store token
  localStorage.setItem('authToken', data.token);
  
  return data;
};

// Logout user
export const logout = async (): Promise<void> => {
  const token = localStorage.getItem('authToken');
  
  if (token) {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }
  
  // Remove token regardless of API response
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
};

// Refresh token
export const refreshToken = async (): Promise<AuthUser> => {
  const storedRefreshToken = localStorage.getItem('refreshToken');
  
  if (!storedRefreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE}/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: storedRefreshToken }),
  });

  if (!response.ok) {
    // Refresh failed - clear tokens and redirect to login
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    throw new Error('Session expired. Please login again.');
  }

  const { data } = await response.json() as ApiResponse<AuthUser>;
  
  // Store new tokens
  localStorage.setItem('authToken', data.token);
  if (data.refreshToken) {
    localStorage.setItem('refreshToken', data.refreshToken);
  }
  
  return data;
};

// Get auth header for API requests
export const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('authToken');
};
```

### Axios Interceptor for Token Refresh

```typescript
// axios.config.ts

import axios from 'axios';
import { refreshToken } from './auth.service';

const api = axios.create({
  baseURL: '/api',
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await refreshToken();
        
        // Retry with new token
        const token = localStorage.getItem('authToken');
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## Token Information

### Access Token
- **Validity:** 24 hours
- **Contains:** User ID, email, name, role
- **Usage:** Include in `Authorization` header as `Bearer <token>`

### Refresh Token
- **Validity:** Longer-lived (implementation specific)
- **Contains:** User ID only
- **Usage:** Used to obtain new access token when current one expires

### Token Storage Recommendations

| Storage Method | Security | Use Case |
|----------------|----------|----------|
| `localStorage` | Medium | SPAs where XSS is mitigated |
| `sessionStorage` | Medium | Single tab sessions |
| `httpOnly Cookie` | High | Server-rendered apps |
| Memory (variable) | High | Short-lived sessions |

---

## User Roles

| Role | Description |
|------|-------------|
| `admin` | Full system access, can invite users |
| `scientist` | Default role for public registration |
| `researcher` | Research data access |
| `policymaker` | Policy-related data access |

> **Note:** Only `admin` users can assign different roles via the Admin Invite system.

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

## Security Best Practices

1. **Token Storage**: Prefer `httpOnly` cookies for production; use `localStorage` only with proper XSS protection
2. **Token Refresh**: Implement proactive token refresh before expiry (e.g., when 5 minutes remain)
3. **Logout Cleanup**: Always clear tokens on logout, even if API call fails
4. **HTTPS Only**: Always use HTTPS in production
5. **Error Handling**: Don't expose sensitive error details to users

---

## Related Endpoints

- **Admin Invite**: `/api/admin/invitations` - For creating users with specific roles
- **User Profile**: `/api/users/me` - Get/update current user profile
