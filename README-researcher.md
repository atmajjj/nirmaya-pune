# Researcher Application Feature

## Overview
This feature allows users to apply to join the platform as researchers. Admins can review applications and either accept or reject them. Accepted researchers receive an invitation email similar to the admin invite flow.

## Flow

### 1. User Application
- User fills out a form on the frontend with:
  - Full Name
  - Email
  - Phone Number
  - Organization
  - Purpose (why they want to join)
- User clicks "Submit Application"
- Application is stored in `researcher_applications` table with status `pending`

### 2. Admin Review
- Admin logs into admin panel
- Admin views all applications via "View Applications" page
- Admin can filter by status (pending, accepted, rejected)
- Admin reviews each application and decides to accept or reject

### 3. Accept Application
- Admin clicks "Accept" on an application
- System generates secure credentials (similar to admin invite)
- System creates an invitation record in `invitation` table
- Researcher receives an email with invitation link
- Email contains link to `/accept-invitation/{token}`
- Application status changes to `accepted`

### 4. Reject Application
- Admin clicks "Reject" on an application
- Admin optionally provides rejection reason
- Application status changes to `rejected`
- No email is sent (optional: could add rejection notification)

### 5. Researcher Login
- Researcher clicks invitation link from email
- Researcher views their temporary credentials on verification page
- Researcher logs in with provided credentials
- Researcher can change password after first login

## API Endpoints

### Public Endpoint

#### Submit Application
```http
POST /api/researcher/apply
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

The invitation link directs to: `{FRONTEND_URL}/accept-invitation/{token}`

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
