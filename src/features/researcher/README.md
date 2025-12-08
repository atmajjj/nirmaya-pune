# Researcher Application Feature

## Overview
The researcher application feature enables users to apply for researcher access to the Nirmaya platform. This is a public-facing feature where interested individuals can submit applications, and administrators can review and approve or reject them. When accepted, researchers receive an invitation email with credentials to access the platform.

---

## Table of Contents
1. [User Flow](#user-flow)
2. [API Endpoints](#api-endpoints)
   - [Submit Application (Public)](#1-submit-application-public)
   - [Get Applications (Admin)](#2-get-applications-admin)
   - [Accept Application (Admin)](#3-accept-application-admin)
   - [Reject Application (Admin)](#4-reject-application-admin)
3. [Database Schema](#database-schema)
4. [Integration Notes](#integration-notes)
5. [Testing](#testing)

---

## User Flow

### 1. **Public User Submits Application**
- User visits the public application page
- Fills out the application form:
  - Full Name
  - Email Address
  - Phone Number
  - Organization
  - Purpose (detailed reason for joining)
- Clicks "Submit Application"
- System validates and stores application with `pending` status

### 2. **Admin Reviews Applications**
- Admin logs into the admin panel
- Views list of all applications (can filter by status)
- Reviews application details
- Decides to accept or reject

### 3. **Accept Application Flow**
- Admin clicks "Accept" on a pending application
- System:
  - Generates secure invitation token and temporary password
  - Creates invitation record in `invitations` table
  - Sends invitation email with login credentials and link: `http://localhost:8080/accept-invitation?invite_token={token}`
  - Updates application status to `accepted`
- Researcher receives email with credentials (email + temporary password)

### 4. **Researcher Accepts Invitation**
- Researcher reads credentials from email
- Researcher clicks invitation link from email
- Redirected to accept-invitation page: `http://localhost:8080/accept-invitation?invite_token={token}`
- Researcher manually enters email and password from the invitation email
- Researcher clicks "Accept Invitation"
- Account is created and researcher gains immediate access with JWT token

### 5. **Reject Application Flow**
- Admin clicks "Reject" on a pending application
- Admin optionally provides rejection reason
- Application status changes to `rejected`
- Rejected user can reapply later

---

## API Endpoints

### 1. Submit Application (Public)

**Endpoint:** `POST /api/researcher/apply`

**Authentication:** None (Public endpoint)

**Description:** Allows anyone to submit a researcher application.

#### Request Body
```json
{
  "full_name": "Dr. John Smith",
  "email": "john.smith@university.edu",
  "phone_number": "+1234567890",
  "organization": "Stanford University",
  "purpose": "I am a research scientist working on health policy analysis and would like to access the platform to conduct research on healthcare metrics and indicators."
}
```

#### Validation Rules
- `full_name`: 2-200 characters
- `email`: Valid email format
- `phone_number`: 10-20 characters
- `organization`: 2-255 characters
- `purpose`: 10-1000 characters (minimum 10 for detailed explanation)

#### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending"
  },
  "message": "Application submitted successfully! Admin will review and contact you via email."
}
```

#### Error Responses

**400 Bad Request** - Email already registered
```json
{
  "success": false,
  "message": "This email is already registered in the system"
}
```

**400 Bad Request** - Pending application exists
```json
{
  "success": false,
  "message": "You already have a pending application. Please wait for admin review."
}
```

**400 Bad Request** - Already accepted
```json
{
  "success": false,
  "message": "Your application has already been accepted. Check your email for invitation."
}
```

**400 Bad Request** - Validation error
```json
{
  "success": false,
  "message": "email: Invalid email address"
}
```

---

### 2. Get Applications (Admin)

**Endpoint:** `GET /api/researcher/applications`

**Authentication:** Required (Admin role)

**Description:** Retrieves all researcher applications with optional status filtering.

#### Query Parameters
- `status` (optional): Filter by status - `pending`, `accepted`, or `rejected`

#### Request Headers
```
Authorization: Bearer {admin_jwt_token}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "Dr. John Smith",
      "email": "john.smith@university.edu",
      "phone_number": "+1234567890",
      "organization": "Stanford University",
      "purpose": "I am a research scientist working on health policy analysis...",
      "status": "pending",
      "reviewed_by": null,
      "reviewed_at": null,
      "rejection_reason": null,
      "invite_token": null,
      "invite_sent_at": null,
      "created_at": "2025-12-08T10:30:00Z",
      "updated_at": "2025-12-08T10:30:00Z"
    }
  ],
  "message": "Retrieved 1 researcher application(s)"
}
```

#### Error Responses

**401 Unauthorized** - Not authenticated
```json
{
  "success": false,
  "message": "Authentication required. No token provided."
}
```

**403 Forbidden** - Not admin
```json
{
  "success": false,
  "message": "Access denied. Required role: admin"
}
```

**400 Bad Request** - Invalid status
```json
{
  "success": false,
  "message": "Invalid status. Must be one of: pending, accepted, rejected"
}
```

---

### 3. Accept Application (Admin)

**Endpoint:** `POST /api/researcher/applications/accept`

**Authentication:** Required (Admin role)

**Description:** Accepts a researcher application, creates invitation, and sends email.

#### Request Headers
```
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json
```

#### Request Body
```json
{
  "application_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.smith@university.edu",
    "status": "accepted",
    "reviewed_at": "2025-12-08T11:00:00Z"
  },
  "message": "Application accepted successfully! Invitation email sent to the researcher."
}
```

#### What Happens When Accepted
1. ✅ Generates secure 64-character invitation token
2. ✅ Generates random 16-character temporary password
3. ✅ Creates invitation record in `invitations` table
4. ✅ Sends invitation email with link: `http://localhost:8080/accept-invitation?invite_token={token}`
5. ✅ Updates application status to `accepted`
6. ✅ Records review timestamp and admin who accepted

#### Error Responses

**404 Not Found** - Application doesn't exist
```json
{
  "success": false,
  "message": "Application not found"
}
```

**400 Bad Request** - Already processed
```json
{
  "success": false,
  "message": "Application has already been accepted"
}
```

**409 Conflict** - User already exists
```json
{
  "success": false,
  "message": "A user with this email already exists in the system"
}
```

**500 Internal Server Error** - Email sending failed
```json
{
  "success": false,
  "message": "Application accepted but failed to send invitation email. Please retry or contact the researcher manually."
}
```

---

### 4. Reject Application (Admin)

**Endpoint:** `POST /api/researcher/applications/reject`

**Authentication:** Required (Admin role)

**Description:** Rejects a researcher application with optional reason.

#### Request Headers
```
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json
```

#### Request Body
```json
{
  "application_id": "550e8400-e29b-41d4-a716-446655440000",
  "rejection_reason": "Your application does not meet our current research focus criteria. Please reapply when you have more specific research objectives aligned with our platform."
}
```

#### Request Body (Without Reason)
```json
{
  "application_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Validation Rules
- `rejection_reason` (optional): 10-500 characters if provided

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.smith@university.edu",
    "status": "rejected",
    "rejection_reason": "Your application does not meet our current research focus criteria...",
    "reviewed_at": "2025-12-08T11:00:00Z"
  },
  "message": "Application rejected successfully."
}
```

#### Error Responses

**404 Not Found**
```json
{
  "success": false,
  "message": "Application not found"
}
```

**400 Bad Request** - Already processed
```json
{
  "success": false,
  "message": "Application has already been rejected"
}
```

---

## Database Schema

### `researcher_applications` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique application identifier |
| `full_name` | VARCHAR(200) | NOT NULL | Applicant's full name |
| `email` | VARCHAR(255) | NOT NULL | Applicant's email address |
| `phone_number` | VARCHAR(20) | NOT NULL | Contact phone number |
| `organization` | VARCHAR(255) | NOT NULL | Applicant's organization |
| `purpose` | TEXT | NOT NULL | Detailed reason for joining |
| `status` | TEXT | NOT NULL, DEFAULT 'pending' | Application status: `pending`, `accepted`, `rejected` |
| `reviewed_by` | INTEGER | FOREIGN KEY → users.id | Admin who reviewed |
| `reviewed_at` | TIMESTAMP | NULL | When application was reviewed |
| `rejection_reason` | TEXT | NULL | Reason for rejection (if rejected) |
| `invite_token` | VARCHAR(64) | NULL | Invitation token (if accepted) |
| `invite_sent_at` | TIMESTAMP | NULL | When invitation was sent |
| `created_by` | UUID | NULL | Always NULL for public submissions |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | When application was created |
| `updated_by` | UUID | NULL | Who last updated |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | Last update timestamp |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT false | Soft delete flag |
| `deleted_by` | UUID | NULL | Who deleted |
| `deleted_at` | TIMESTAMP | NULL | When deleted |

### Relationships
- `reviewed_by` → `users.id` (Admin who processed the application)
- `invite_token` links to `invitations.invite_token` when accepted

---

## Integration Notes

### Frontend Implementation

#### 1. Public Application Form
Create a public page at `/apply` or `/researcher-application`:

```javascript
// Example: Submit application
async function submitApplication(formData) {
  const response = await fetch('/api/researcher/apply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      full_name: formData.fullName,
      email: formData.email,
      phone_number: formData.phoneNumber,
      organization: formData.organization,
      purpose: formData.purpose
    })
  });

  const result = await response.json();
  
  if (result.success) {
    // Show success message
    alert('Application submitted! We will review and contact you via email.');
  } else {
    // Show error message
    alert(result.message);
  }
}
```

#### 2. Admin Dashboard - Applications List
Create admin page at `/admin/researcher-applications`:

```javascript
// Example: Fetch applications
async function fetchApplications(status = null) {
  const url = status 
    ? `/api/researcher/applications?status=${status}`
    : '/api/researcher/applications';
    
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });

  const result = await response.json();
  return result.data; // Array of applications
}

// Example: Accept application
async function acceptApplication(applicationId) {
  const response = await fetch('/api/researcher/applications/accept', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ application_id: applicationId })
  });

  const result = await response.json();
  
  if (result.success) {
    alert('Application accepted! Invitation email sent.');
    // Refresh applications list
  }
}

// Example: Reject application
async function rejectApplication(applicationId, reason) {
  const response = await fetch('/api/researcher/applications/reject', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      application_id: applicationId,
      rejection_reason: reason 
    })
  });

  const result = await response.json();
  
  if (result.success) {
    alert('Application rejected.');
    // Refresh applications list
  }
}
```

#### 3. Login Page - Handle Invitation
Your login page should detect invitation tokens:

```javascript
// Check for invitation token on page load
const urlParams = new URLSearchParams(window.location.search);
const inviteToken = urlParams.get('invite_token');

if (inviteToken) {
  // Show accept invitation form
  // User manually enters email and password from invitation email
  
  // When form is submitted:
  const acceptInvitation = async (email, password) => {
    const response = await fetch('/api/admin/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token: inviteToken,
        email,
        password
      })
    });
    
    const { data } = await response.json();
    
    // Store JWT token
    localStorage.setItem('authToken', data.token);
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
  };
}
```

### Email Template
When an application is accepted, the researcher receives an email with:
- Welcome message
- **Login credentials**: Email address and temporary password
- Invitation link: `http://localhost:8080/accept-invitation?invite_token={64_char_token}`
- Expiration time: 24 hours
- Instructions to read credentials and click link to accept invitation

---

## Testing

### Running Tests
```bash
# Run all researcher feature tests
npm test -- researcher

# Run only integration tests
npm test -- researcher.api.test

# Run only unit tests
npm test -- researcher/tests/unit
```

### Test Coverage
- ✅ **21 Integration Tests** - Full API workflow testing
  - Application submission validation (7 tests)
  - Admin application management (4 tests)
  - Accept application with email (4 tests)
  - Reject application (5 tests)
  - End-to-end lifecycle (1 test)

- ✅ **10 Unit Tests** - Business logic validation
  - Application submission logic (5 tests)
  - Rejection logic (4 tests)
  - Join request creation (1 test)

### Example Test Scenarios

#### Integration Tests
1. ✅ Submit valid application
2. ✅ Reject invalid email format
3. ✅ Reject short purpose (< 10 chars)
4. ✅ Prevent duplicate applications
5. ✅ Allow reapplication after rejection
6. ✅ Admin view all applications
7. ✅ Admin filter by status
8. ✅ Admin accept application (sends email)
9. ✅ Admin reject with reason
10. ✅ Complete application lifecycle

---

## Environment Variables

Required in `.env.dev`, `.env.test`, `.env.prod`:

```bash
# Frontend URL for invitation links
FRONTEND_URL=http://localhost:8080

# Email configuration (for sending invitations)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
APP_NAME=Nirmaya

# Database
DATABASE_URL=postgresql://...
```

---

## Common Use Cases

### Use Case 1: Public User Applies
1. User visits `/apply` page
2. Fills application form
3. Submits application
4. Receives confirmation: "Application submitted! We'll contact you via email."

### Use Case 2: Admin Reviews Applications
1. Admin logs in
2. Navigates to `/admin/researcher-applications`
3. Views list of pending applications
4. Clicks on application to view details
5. Reviews applicant information
6. Decides to accept or reject

### Use Case 3: Accept Application
1. Admin clicks "Accept" button
2. System generates credentials
3. System sends invitation email
4. Researcher receives email with link
5. Researcher clicks link → redirected to login page
6. Login fields are pre-filled
7. Researcher logs in and gains access

### Use Case 4: Reject Application
1. Admin clicks "Reject" button
2. Admin enters rejection reason (optional)
3. Application status changes to `rejected`
4. User can reapply later if desired

---

## Security Considerations

1. ✅ **Public Endpoint Protection**
   - Rate limiting (consider adding)
   - Email validation to prevent spam
   - Duplicate application prevention

2. ✅ **Admin Endpoints**
   - JWT authentication required
   - Admin role verification
   - Authorization checks on every request

3. ✅ **Invitation Security**
   - 64-character random tokens
   - Token expires in 24 hours
   - Temporary password encrypted in database
   - Password hashed before storage

4. ✅ **Data Privacy**
   - Sensitive data not exposed in responses
   - Soft deletes for data retention
   - Audit trail with timestamps

---

## Troubleshooting

### Issue: "Email already registered"
**Cause:** User already has an account in the system.
**Solution:** User should log in instead of applying.

### Issue: "Pending application exists"
**Cause:** User already submitted an application.
**Solution:** Wait for admin review. Contact admin if urgent.

### Issue: "Email sending failed"
**Cause:** Email service configuration issue.
**Solution:** 
- Check `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`
- Verify Gmail app password is correct
- Check email service logs

### Issue: Invitation link doesn't work
**Cause:** Token expired (24 hours) or already used.
**Solution:** Admin can accept the application again to generate a new invitation.

---

## API Response Format

All endpoints follow this consistent format:

### Success Response
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "message": "Human-readable success message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

---

## Support

For issues or questions:
1. Check test files for examples: `src/features/researcher/tests/`
2. Review integration tests for complete workflows
3. Check server logs for detailed error messages
4. Verify environment variables are set correctly

---

**Last Updated:** December 8, 2025  
**Version:** 1.0.0
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john.doe@university.edu",
  "phone_number": "+1234567890",
  "organization": "MIT Research Lab",
  "purpose": "I want to join to conduct research on water quality data analysis..."
}
```

**Validation:**
- `full_name`: 2-200 characters
- `email`: Valid email format, must not already exist in users or pending applications
- `phone_number`: 10-20 characters
- `organization`: 2-255 characters
- `purpose`: 10-1000 characters

**Response:**
```json
{
  "status": "success",
  "message": "Application submitted successfully! Admin will review and contact you via email.",
  "data": {
    "id": "uuid",
    "status": "pending"
  }
}
```

**Error Cases:**
- `400`: Email already registered or has pending/accepted application
- `400`: Validation errors

---

### Admin Endpoints (Require Admin Role)

#### Get All Applications
```http
GET /api/researcher/applications?status=pending
Authorization: Bearer {admin_token}
```

**Query Parameters:**
- `status` (optional): `pending`, `accepted`, or `rejected`

**Response:**
```json
{
  "status": "success",
  "message": "Retrieved 5 researcher application(s)",
  "data": [
    {
      "id": "uuid",
      "full_name": "John Doe",
      "email": "john.doe@university.edu",
      "phone_number": "+1234567890",
      "organization": "MIT Research Lab",
      "purpose": "I want to join to conduct research...",
      "status": "pending",
      "reviewed_by": null,
      "reviewed_at": null,
      "rejection_reason": null,
      "created_at": "2025-12-08T10:30:00Z"
    }
  ]
}
```

---

#### Accept Application
```http
POST /api/researcher/applications/accept
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "application_id": "uuid"
}
```

**What Happens:**
1. Validates application exists and is pending
2. Checks email doesn't already exist in users table
3. Generates secure invitation token and temporary password
4. Creates invitation record in `invitation` table
5. Updates application status to `accepted`
6. Sends invitation email to researcher
7. Email contains link to accept invitation and login

**Response:**
```json
{
  "status": "success",
  "message": "Application accepted successfully! Invitation email sent to the researcher.",
  "data": {
    "id": "uuid",
    "email": "john.doe@university.edu",
    "status": "accepted",
    "reviewed_at": "2025-12-08T12:00:00Z"
  }
}
```

**Error Cases:**
- `404`: Application not found
- `400`: Application already processed (not pending)
- `409`: User with email already exists
- `500`: Application accepted but email failed to send

---

#### Reject Application
```http
POST /api/researcher/applications/reject
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "application_id": "uuid",
  "rejection_reason": "Application does not meet our criteria..." // optional
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Application rejected successfully.",
  "data": {
    "id": "uuid",
    "email": "john.doe@university.edu",
    "status": "rejected",
    "rejection_reason": "Application does not meet our criteria...",
    "reviewed_at": "2025-12-08T12:00:00Z"
  }
}
```

**Error Cases:**
- `404`: Application not found
- `400`: Application already processed (not pending)

---

## Database Schema

### Table: `researcher_applications`

```sql
CREATE TABLE researcher_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Applicant details
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  organization VARCHAR(255) NOT NULL,
  purpose TEXT NOT NULL,
  
  -- Application status
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending' | 'accepted' | 'rejected'
  
  -- Admin review details
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Invitation details (set when accepted)
  invite_token VARCHAR(64),
  invite_sent_at TIMESTAMP,
  
  -- Audit fields
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_by UUID,
  deleted_at TIMESTAMP
);
```

---

## Email Template

When an application is accepted, the researcher receives the same invitation email used for admin invites:

**Subject:** You're Invited to Join Nirmaya

**Content:**
- Welcome message with researcher's name
- Role: Researcher
- Email confirmation
- "Accept Invitation" button with link
- Expiry notice (24 hours)
- Fallback text link

The invitation link directs to: `{FRONTEND_URL}/accept-invitation?invite_token={token}`

---

## File Structure

```
src/features/researcher/
├── apis/
│   ├── join.ts                    # POST /api/researcher/apply (public)
│   ├── get-applications.ts        # GET /api/researcher/applications (admin)
│   ├── accept-application.ts      # POST /api/researcher/applications/accept (admin)
│   └── reject-application.ts      # POST /api/researcher/applications/reject (admin)
├── shared/
│   ├── schema.ts                  # Database schema & types
│   └── queries.ts                 # Database query functions
├── tests/
│   └── (unit tests to be added)
└── index.ts                       # Route registration
```

---

## Integration with Existing Features

### Admin Invite Flow
- Accepted applications create an invitation using the same flow as admin invites
- Uses existing `invitation` table with `assigned_role: 'researcher'`
- Reuses `sendInvitationEmail` utility function
- Same token verification and password setup process

### User Management
- Checks against `users` table to prevent duplicate emails
- Uses `findUserByEmail` query from user feature
- Integrated with existing auth flow after invitation acceptance

---

## Testing

### Manual Testing Steps

1. **Submit Application (Public)**
   ```bash
   curl -X POST http://localhost:3000/api/researcher/apply \
     -H "Content-Type: application/json" \
     -d '{
       "full_name": "Jane Smith",
       "email": "jane.smith@research.org",
       "phone_number": "+1234567890",
       "organization": "Research Institute",
       "purpose": "I want to conduct water quality research for environmental studies"
     }'
   ```

2. **View Applications (Admin)**
   ```bash
   curl -X GET "http://localhost:3000/api/researcher/applications?status=pending" \
     -H "Authorization: Bearer {admin_token}"
   ```

3. **Accept Application (Admin)**
   ```bash
   curl -X POST http://localhost:3000/api/researcher/applications/accept \
     -H "Authorization: Bearer {admin_token}" \
     -H "Content-Type: application/json" \
     -d '{
       "application_id": "uuid-from-step-1"
     }'
   ```

4. **Check Email**
   - Researcher should receive invitation email
   - Click invitation link
   - View credentials on verification page
   - Login with credentials

5. **Reject Application (Admin)**
   ```bash
   curl -X POST http://localhost:3000/api/researcher/applications/reject \
     -H "Authorization: Bearer {admin_token}" \
     -H "Content-Type: application/json" \
     -d '{
       "application_id": "uuid",
       "rejection_reason": "Does not meet current research criteria"
     }'
   ```

### Unit Tests (To Be Implemented)
- Test application submission validation
- Test duplicate email detection
- Test application status transitions
- Test admin authorization
- Test email sending on acceptance
- Test invitation creation on acceptance

---

## Environment Variables

No new environment variables required. Uses existing:
- `FRONTEND_URL`: For invitation link generation
- Email configuration (from `emailConfig.ts`)
- JWT configuration (for admin authentication)

---

## Future Enhancements

1. **Email Notifications**
   - Send rejection email to applicant with reason
   - Send reminder emails for pending applications

2. **Application Details**
   - Add file upload for CV/resume
   - Add research interests field
   - Add publication links

3. **Admin Features**
   - Bulk accept/reject operations
   - Application search and filters
   - Application statistics dashboard
   - Email templates customization

4. **Researcher Features**
   - View application status (without login)
   - Update application before review
   - Withdraw application

5. **Workflow**
   - Multi-step review process
   - Reviewer assignments
   - Application comments/notes
   - Interview scheduling

---

## Security Considerations

✅ **Implemented:**
- Email validation prevents duplicates
- Admin-only access for review endpoints
- Secure token generation for invitations
- Password encryption and hashing
- Audit trail with reviewed_by tracking
- Soft deletes for data retention

⚠️ **Consider Adding:**
- Rate limiting on public application endpoint
- CAPTCHA for spam prevention
- Email verification before application submission
- Application expiry for old pending applications

---

## Migration

Database migration already applied:
- File: `src/database/migrations/0010_tranquil_mandrill.sql`
- Creates `researcher_applications` table with all fields
- Applied on: 2025-12-08

To apply in other environments:
```bash
npm run db:migrate
```

---

## Support

For issues or questions:
1. Check application logs for error details
2. Verify email configuration is working
3. Ensure database migration has been applied
4. Confirm admin user has correct permissions
