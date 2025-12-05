# Admin Invite Feature - Frontend Integration Guide

## Overview

The Admin Invite feature allows administrators to create user accounts by sending invitations via email. Invited users can verify their invitation token and accept the invitation to create their account with a pre-assigned role.

## Base URL

```
/api/admin/invitations
```

## Authentication Requirements

| Endpoint | Authentication | Authorization |
|----------|----------------|---------------|
| `POST /` | ✅ Required (JWT) | Admin only |
| `GET /` | ✅ Required (JWT) | Admin only |
| `POST /verify` | ❌ Public | Rate limited |
| `POST /accept` | ❌ Public | Rate limited |

---

## Endpoints

### 1. Create Invitation

Creates a new invitation and sends an email to the invitee with their login credentials.

**Endpoint:** `POST /api/admin/invitations`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin role only

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "assigned_role": "researcher"
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | string | ✅ | Invitee's first name (1-100 chars) |
| `last_name` | string | ✅ | Invitee's last name (1-100 chars) |
| `email` | string | ✅ | Valid email address |
| `assigned_role` | string | ✅ | One of: `admin`, `scientist`, `researcher`, `policymaker` |

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "status": "pending",
    "assigned_role": "researcher",
    "invited_by": 1,
    "expires_at": "2024-01-16T10:30:00.000Z",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid request body |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | User is not an admin |
| `409` | Conflict | User with this email already exists |
| `409` | Conflict | Pending invitation already exists for this email |

---

### 2. List Invitations

Retrieves a paginated list of all invitations with optional filtering.

**Endpoint:** `GET /api/admin/invitations`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin role only

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by status: `pending`, `accepted`, `revoked`, `expired` |
| `page` | number | `1` | Page number (min: 1) |
| `limit` | number | `10` | Items per page (min: 1, max: 100) |

#### Example Request

```
GET /api/admin/invitations?status=pending&page=1&limit=10
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Invitations retrieved successfully",
  "data": {
    "invitations": [
      {
        "id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "status": "pending",
        "assigned_role": "researcher",
        "invited_by": 1,
        "expires_at": "2024-01-16T10:30:00.000Z",
        "accepted_at": null,
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid query parameters |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | User is not an admin |

---

### 3. Verify Invitation

Verifies an invitation token and returns the invitee's credentials for auto-fill on frontend. This endpoint has brute force protection (max 5 attempts).

**Endpoint:** `POST /api/admin/invitations/verify`

**Authentication:** Not required (Public endpoint)

**Rate Limiting:** Yes (prevents abuse)

#### Request Body

```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ | 64-character hex invitation token |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Invitation verified successfully",
  "data": {
    "email": "john.doe@example.com",
    "password": "TempPass123!",
    "first_name": "John",
    "last_name": "Doe",
    "assigned_role": "researcher"
  }
}
```

> **Frontend Note:** Use the returned `email` and `password` to pre-fill the accept invitation form for better UX.

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid token format |
| `400` | Bad Request | Invalid or expired invitation |
| `400` | Bad Request | Maximum verification attempts exceeded |
| `429` | Too Many Requests | Rate limit exceeded |

---

### 4. Accept Invitation

Accepts an invitation and creates the user account. Returns an auth token for immediate login.

**Endpoint:** `POST /api/admin/invitations/accept`

**Authentication:** Not required (Public endpoint)

**Rate Limiting:** Yes (prevents abuse)

#### Request Body

```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "email": "john.doe@example.com",
  "password": "TempPass123!"
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ | 64-character hex invitation token |
| `email` | string | ✅ | Email address (must match invitation) |
| `password` | string | ✅ | Temporary password from invitation email |

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "data": {
    "user": {
      "id": 5,
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "researcher",
      "email_verified": true,
      "created_at": "2024-01-15T11:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

> **Frontend Note:** Store the returned `token` for authenticated API calls. The user is immediately logged in after accepting.

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid request body |
| `400` | Bad Request | Invalid or expired invitation |
| `400` | Bad Request | Email does not match invitation |
| `400` | Bad Request | Invalid password |
| `409` | Conflict | Invitation already accepted |
| `429` | Too Many Requests | Rate limit exceeded |

---

## Invitation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ADMIN INVITATION FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

1. ADMIN CREATES INVITATION
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │   Admin     │ ──POST──▶│   Backend   │ ──────▶│   Email     │
   │  Dashboard  │    /     │   Creates   │  Sends │   Service   │
   │             │          │  Invitation │  Email │             │
   └─────────────┘          └─────────────┘        └──────┬──────┘
                                                          │
                                                          ▼
2. INVITEE RECEIVES EMAIL                         ┌─────────────┐
                                                  │   Invitee   │
   Email contains:                                │   Inbox     │
   - Invitation link with token                   └──────┬──────┘
   - Temporary password                                  │
                                                         │
3. INVITEE CLICKS LINK                                   ▼
   ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
   │  Frontend   │◀──Link──│   Email     │◀───────│   Invitee   │
   │  Verify     │         │   Link      │        │   Clicks    │
   │   Page      │         │             │        │             │
   └──────┬──────┘         └─────────────┘        └─────────────┘
          │
          │ POST /verify (with token)
          ▼
4. FRONTEND VERIFIES TOKEN
   ┌─────────────┐         ┌─────────────┐
   │  Frontend   │ ──POST──▶│   Backend   │
   │  Gets       │    /     │   Returns   │
   │  Credentials│  verify  │  email +    │
   │  & Pre-fills│          │  password   │
   └──────┬──────┘          └─────────────┘
          │
          │ POST /accept (token + email + password)
          ▼
5. INVITEE ACCEPTS INVITATION
   ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
   │  Frontend   │ ──POST──▶│   Backend   │ ─────▶│   User      │
   │  Accept     │    /     │   Creates   │ JWT   │   Logged    │
   │   Form      │  accept  │   User +    │ Token │   In!       │
   │             │          │   Returns   │       │             │
   └─────────────┘          │   JWT       │       └─────────────┘
                            └─────────────┘
```

---

## Frontend Implementation Example

### React Example: Accept Invitation Flow

```typescript
// 1. Extract token from URL
const token = new URLSearchParams(window.location.search).get('token');

// 2. Verify the invitation and get credentials
const verifyInvitation = async (token: string) => {
  const response = await fetch('/api/admin/invitations/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
};

// 3. Accept the invitation
const acceptInvitation = async (token: string, email: string, password: string) => {
  const response = await fetch('/api/admin/invitations/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, email, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  const { data } = await response.json();
  
  // Store JWT token for authenticated requests
  localStorage.setItem('authToken', data.token);
  
  // Redirect to dashboard
  window.location.href = '/dashboard';
};

// Usage in component
useEffect(() => {
  if (token) {
    verifyInvitation(token)
      .then(({ data }) => {
        setEmail(data.email);
        setPassword(data.password);
        setFirstName(data.first_name);
        setLastName(data.last_name);
      })
      .catch(err => setError(err.message));
  }
}, [token]);
```

---

## Data Types

### Invitation Status

| Status | Description |
|--------|-------------|
| `pending` | Invitation sent, waiting for acceptance |
| `accepted` | User accepted and account created |
| `revoked` | Admin revoked the invitation |
| `expired` | Invitation expired (24 hours) |

### User Roles

| Role | Description |
|------|-------------|
| `admin` | Full system access |
| `scientist` | Scientific data access and analysis |
| `researcher` | Research data access |
| `policymaker` | Policy-related data access |

---

## Security Considerations

1. **Token Expiration**: Invitations expire after 24 hours
2. **Brute Force Protection**: Maximum 5 verification attempts per token
3. **Rate Limiting**: Public endpoints are rate-limited to prevent abuse
4. **Password Security**: Temporary passwords are encrypted at rest (AES-256-GCM)
5. **Email Verification**: Users created via invitation are automatically email-verified

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

- **Auth Feature**: `/api/auth/login` - For users to login after initial password change
- **User Feature**: `/api/users/me` - Get current user profile
