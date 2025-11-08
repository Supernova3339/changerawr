import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, hasProjectAccess } from '@/lib/auth/api-key';
import { matchRoute, extractProjectId, methodAllowed, type RoutePermissionConfig } from './route-permissions';
import { db } from '@/lib/db';
import { ApiPermission } from './permissions';

export interface ApiError {
    error: string;
    code?: string;
    status: number;
}

/**
 * Automatic route-based permission enforcement middleware.
 * Checks authentication, project access, and permissions based on route configuration.
 */
export async function enforceRoutePermissions(
    request: NextRequest,
    path: string
): Promise<NextResponse | null> {
    // Match route to configuration
    const routeConfig = matchRoute(path);
    if (!routeConfig) {
        // No matching route found - require authentication by default
        return createErrorResponse('Route not found', 404);
    }

    // Public routes don't require authentication
    if (routeConfig.public) {
        return null; // Continue
    }

    // Check if method is allowed for this route
    if (!methodAllowed(routeConfig, request.method)) {
        return createErrorResponse(`Method ${request.method} not allowed for this route`, 405);
    }

    // Authenticate the request
    const ctx = await authenticateRequest(request);
    if (!ctx) {
        return createErrorResponse('Authentication required', 401);
    }

    // Get user to check role
    const user = await db.user.findUnique({
        where: { id: ctx.userId },
        select: { role: true }
    });

    if (!user) {
        return createErrorResponse('User not found', 401);
    }

    // Admin-only routes
    if (routeConfig.requiresAdmin) {
        if (user.role !== 'ADMIN') {
            return createErrorResponse('Admin access required', 403);
        }
        return null; // Admin has access, continue
    }

    // Check project access if required
    if (routeConfig.requiresProjectAccess) {
        const projectId = extractProjectId(path);
        if (!projectId) {
            return createErrorResponse('Project ID not found in route', 400);
        }

        if (!hasProjectAccess(ctx, projectId)) {
            return createErrorResponse('Access denied to this project', 403);
        }
    }

    // Check permissions if required
    if (routeConfig.permissions) {
        // JWT tokens (not API keys) have full access
        if (!ctx.isApiKey) {
            return null; // Continue
        }

        // API keys need to have the required permissions
        const requiredPerms = Array.isArray(routeConfig.permissions)
            ? routeConfig.permissions
            : [routeConfig.permissions];

        // User needs ANY of the permissions (OR logic)
        const hasRequiredPerm = requiredPerms.some(perm =>
            ctx.permissions.includes(perm)
        );

        if (!hasRequiredPerm) {
            return createErrorResponse(
                `Missing required permission. Need one of: ${requiredPerms.join(', ')}`,
                403
            );
        }
    }

    // All checks passed
    return null;
}

/**
 * Wrapper for API route handlers that automatically enforces permissions.
 * Use this to wrap your route handlers for automatic permission checking.
 *
 * @example
 * export const GET = withPermissions(async (request, ctx) => {
 *     // Your route logic here
 *     // ctx contains authenticated user info and permissions
 *     return NextResponse.json({ data: 'success' });
 * });
 */
export function withPermissions<T extends Record<string, unknown>>(
    handler: (
        request: NextRequest,
        context: { params: T }
    ) => Promise<NextResponse>
) {
    return async (
        request: NextRequest,
        context: { params: T }
    ): Promise<NextResponse> => {
        // Get the pathname from the request
        const path = new URL(request.url).pathname;

        // Enforce permissions
        const error = await enforceRoutePermissions(request, path);
        if (error) {
            return error;
        }

        // Call the actual handler
        return handler(request, context);
    };
}

/**
 * Helper to create standardized error responses
 */
function createErrorResponse(message: string, status: number): NextResponse {
    return NextResponse.json(
        { error: message },
        { status }
    );
}

/**
 * Validate permission for a specific action.
 * Use this within route handlers for additional permission checks.
 */
export async function requirePermission(
    request: NextRequest,
    permission: ApiPermission
): Promise<{ error: NextResponse } | { success: true }> {
    const ctx = await authenticateRequest(request);

    if (!ctx) {
        return { error: createErrorResponse('Authentication required', 401) };
    }

    // JWT tokens have all permissions
    if (!ctx.isApiKey) {
        return { success: true };
    }

    if (!ctx.permissions.includes(permission)) {
        return {
            error: createErrorResponse(
                `Missing required permission: ${permission}`,
                403
            )
        };
    }

    return { success: true };
}

/**
 * Validate project access.
 * Use this within route handlers for additional project scope checks.
 */
export async function requireProjectAccess(
    request: NextRequest,
    projectId: string
): Promise<{ error: NextResponse } | { success: true }> {
    const ctx = await authenticateRequest(request);

    if (!ctx) {
        return { error: createErrorResponse('Authentication required', 401) };
    }

    if (!hasProjectAccess(ctx, projectId)) {
        return {
            error: createErrorResponse(
                'Access denied to this project',
                403
            )
        };
    }

    return { success: true };
}