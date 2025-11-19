# System User Service

## Overview

The System User service manages a special internal user account (`system@changerawr.sys`) that is used for system-level operations that require user attribution in audit logs and other tracking mechanisms.

## Purpose

Many operations in Changerawr require a user ID for foreign key constraints and audit trails:
- Scheduled job execution (telemetry, email digests, etc.)
- Background tasks
- System-initiated actions
- Automated processes

Instead of creating nullable foreign keys or special handling for these cases, we use a dedicated system user that exists in the database like any other user but has special characteristics.

## System User Characteristics

- **ID**: `system` (constant, never changes)
- **Email**: `system@changerawr.sys`
- **Password**: Empty string (cannot login via normal auth)
- **Name**: "System"
- **Role**: `ADMIN` (has necessary permissions but filtered from UI)
- **Not deletable**: Frontend should filter this user from management interfaces
- **Not visible**: Should not appear in user lists or selection dropdowns

## Usage

### Initialize at Startup

The system user is automatically created during application startup if it doesn't exist:

```typescript
import {ensureSystemUser} from '@/lib/services/core/system-user/service';

// In app startup file
await ensureSystemUser();
```

### Use in Audit Logs

When creating audit logs for system operations, use the `SYSTEM_USER_ID` constant:

```typescript
import {SYSTEM_USER_ID} from '@/lib/services/core/system-user/service';
import {createAuditLog} from '@/lib/utils/auditLog';

await createAuditLog(
    'SCHEDULED_JOB_EXECUTED',
    SYSTEM_USER_ID,  // performedById
    null,            // targetUserId
    {
        jobId: job.id,
        jobType: job.type,
    }
);
```

### Check if User is System

```typescript
import {isSystemUser} from '@/lib/services/core/system-user/service';

if (isSystemUser(userId)) {
    // Filter from UI, prevent deletion, etc.
}
```

## Frontend Considerations

When building user management interfaces:

1. **Filter from lists**: Use `isSystemUser()` or filter by email `system@changerawr.sys`
2. **Prevent deletion**: Block delete operations on the system user
3. **Hide from selection**: Don't show in user dropdowns or assignment pickers
4. **Read-only**: Don't allow editing of system user properties

## Database Schema

The system user follows the standard `User` model:

```prisma
model User {
  id       String @id @default(cuid())
  email    String @unique
  password String
  name     String?
  role     Role   @default(STAFF)
  // ... other fields
}
```

## Migration Notes

If you have existing installations, the system user will be created automatically on next startup. No manual migration is required.

## Security

- The system user has an empty password and cannot authenticate via normal login flows
- API key authentication should also reject system user credentials
- OAuth connections cannot be linked to the system user
- 2FA cannot be enabled for the system user