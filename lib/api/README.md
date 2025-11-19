# API Permission System

This directory contains the permission-based API authentication and authorization system for Changerawr.

## Overview

The system provides:
- **Automatic route-based permission checking** using route patterns
- **API key and JWT authentication**
- **Project-scoped access control**
- **Granular permissions** for different operations

## Files

- `permissions.ts` - Permission definitions and helper functions
- `route-permissions.ts` - Route-to-permission mapping configuration
- `middleware.ts` - Automatic permission enforcement utilities

## Usage

### Method 1: Using `withPermissions` wrapper (Recommended)

The easiest way to enforce permissions is to wrap your route handlers:

```typescript
// app/api/projects/[projectId]/changelog/route.ts
import { withPermissions } from '@/lib/api/middleware';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withPermissions(async (request, { params }) => {
    // Permissions are automatically checked based on route-permissions.ts
    // If user doesn't have access, they'll get a 403 before reaching here

    const { projectId } = params;

    // Your route logic here
    return NextResponse.json({ data: 'success' });
});

export const POST = withPermissions(async (request, { params }) => {
    const { projectId } = params;
    const body = await request.json();

    // Create changelog entry
    return NextResponse.json({ created: true });
});
```

### Method 2: Manual permission checking

For more control, use the helper functions:

```typescript
import { authenticateRequest, hasProjectAccess } from '@/lib/auth/api-key';
import { API_PERMISSIONS } from '@/lib/api/permissions';
import { requirePermission, requireProjectAccess } from '@/lib/api/middleware';

export async function GET(request: NextRequest) {
    // Check specific permission
    const permCheck = await requirePermission(request, API_PERMISSIONS.CHANGELOG_READ);
    if ('error' in permCheck) {
        return permCheck.error;
    }

    // Check project access
    const accessCheck = await requireProjectAccess(request, projectId);
    if ('error' in accessCheck) {
        return accessCheck.error;
    }

    // Your route logic here
}
```

### Method 3: Using validateAuthAndGetUser (Legacy, still works)

This is the existing method used throughout the codebase:

```typescript
import { validateAuthAndGetUser } from '@/lib/utils/changelog';

export async function GET(request: NextRequest) {
    try {
        const user = await validateAuthAndGetUser();
        // User is authenticated, continue with logic
    } catch (error) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }
}
```

Note: This method authenticates but doesn't enforce specific permissions. It's best used for routes that just need authentication without specific permission requirements.

## Route Configuration

Routes are configured in `route-permissions.ts`. Example:

```typescript
export const ROUTE_PERMISSIONS: Record<string, RoutePermissionConfig> = {
    // Public route (no auth required)
    '/api/health': { public: true },

    // Admin-only route
    '/api/admin/users': { requiresAdmin: true },

    // Requires specific permission
    '/api/changelog/:projectId/entries': {
        permissions: API_PERMISSIONS.CHANGELOG_READ,
        requiresProjectAccess: true,
        methods: ['GET']  // Only applies to GET requests
    },

    // Requires ANY of multiple permissions (OR logic)
    '/api/projects/:projectId/changelog': {
        permissions: [
            API_PERMISSIONS.CHANGELOG_READ,
            API_PERMISSIONS.CHANGELOG_WRITE
        ],
        requiresProjectAccess: true
    },
};
```

## Permission Types

Defined in `permissions.ts`:

- **Changelog**: `changelog:read`, `changelog:write`, `changelog:publish`, `changelog:delete`
- **Project**: `project:read`, `project:write`
- **Analytics**: `analytics:read`
- **Subscribers**: `subscribers:read`, `subscribers:write`
- **Email**: `email:send`
- **GitHub**: `github:read`, `github:write`
- **Tags**: `tags:read`, `tags:write`
- **Webhooks**: `webhooks:read`, `webhooks:write`

## Permission Groups

Pre-configured groups for common use cases:

- `READ_ONLY` - Read access to all resources
- `CHANGELOG_MANAGER` - Full changelog management without project config changes
- `FULL_ACCESS` - All permissions

## Authentication Flow

1. Request comes in with either:
   - JWT token in cookie (`accessToken`)
   - API key in Authorization header (`Bearer chr_...`)

2. `authenticateRequest()` validates the token/key and returns:
   ```typescript
   {
       userId: string;
       apiKeyId?: string;
       projectId?: string | null;  // null = global access
       permissions: string[];
       isApiKey: boolean;
   }
   ```

3. Permission checks:
   - **JWT tokens** have full access (no permission checks)
   - **API keys** are checked against their permission array
   - **Project-scoped keys** can only access their assigned project
   - **Global keys** can access all projects (if they have permission)

4. Route-based enforcement (if using `withPermissions`):
   - Matches request path to route pattern
   - Checks if route is public
   - Validates authentication
   - Checks admin requirement
   - Validates project access
   - Validates permissions (OR logic for arrays)

## Migration Guide

To migrate an existing route to the new system:

1. **Add route to `route-permissions.ts`**:
   ```typescript
   '/api/your/route/:id': {
       permissions: API_PERMISSIONS.YOUR_PERMISSION,
       requiresProjectAccess: true  // if needed
   }
   ```

2. **Wrap your handler**:
   ```typescript
   // Before
   export async function GET(request: NextRequest) {
       const user = await validateAuthAndGetUser();
       // logic
   }

   // After
   export const GET = withPermissions(async (request, { params }) => {
       // Permission already checked, just implement logic
   });
   ```

3. **Test with API keys**:
   - Create an API key with limited permissions
   - Verify it can access allowed routes
   - Verify it's blocked from restricted routes

## Best Practices

1. **Always use route configuration** - Define all routes in `route-permissions.ts` for centralized permission management

2. **Use wrapper when possible** - `withPermissions` provides automatic enforcement and is easier to maintain

3. **Prefer specific permissions** - Use specific permissions rather than `FULL_ACCESS` for better security

4. **Document permission requirements** - Add comments in route files explaining why certain permissions are needed

5. **Test with restricted keys** - Always test API endpoints with limited-permission API keys to ensure enforcement works

## Security Notes

- JWT tokens bypass permission checks (they're for authenticated users)
- API keys must have explicit permissions
- Admin-only routes require ADMIN role regardless of permissions
- Project-scoped keys can ONLY access their assigned project
- Public routes skip all authentication
- Permission arrays use OR logic (user needs ANY permission, not all)