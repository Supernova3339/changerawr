import {NextRequest} from 'next/server';
import {db} from '@/lib/db';
import {verifyAccessToken} from '@/lib/auth/tokens';
import {ApiPermission, hasPermission, hasAllPermissions} from '@/lib/api/permissions';

export interface AuthContext {
    userId: string;
    apiKeyId?: string;
    projectId?: string | null;  // null = global access, string = project-specific
    permissions: string[];
    isApiKey: boolean;           // true if authenticated via API key, false if JWT
}

// Minimal request interface for authentication
export interface AuthRequest {
    headers: {
        get(name: string): string | null;
    };
    cookies: {
        get(name: string): { value: string } | undefined;
    };
}

/**
 * Extract authentication token from request.
 * Checks both cookies and Authorization header.
 */
function getTokenFromRequest(request: AuthRequest): {type: 'jwt' | 'apikey', token: string} | null {
    // Check Authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            // API keys start with 'chr_', JWT tokens don't
            if (token.startsWith('chr_')) {
                return {type: 'apikey', token};
            }
            return {type: 'jwt', token};
        }
    }

    // Fall back to cookies for JWT
    const accessToken = request.cookies.get('accessToken')?.value;
    if (accessToken) {
        return {type: 'jwt', token: accessToken};
    }

    return null;
}

/**
 * Authenticate request using JWT access token.
 */
async function authenticateWithJWT(token: string): Promise<AuthContext | null> {
    try {
        const userId = await verifyAccessToken(token);
        if (!userId) {
            return null;
        }

        // JWT tokens have full access to everything
        return {
            userId,
            projectId: null,  // Global access
            permissions: [],  // Empty = full access for JWT
            isApiKey: false,
        };
    } catch (error) {
        console.error('JWT verification failed:', error);
        return null;
    }
}

/**
 * Authenticate request using API key.
 * Updates lastUsed timestamp on successful auth.
 */
async function authenticateWithAPIKey(key: string): Promise<AuthContext | null> {
    try {
        const apiKey = await db.apiKey.findUnique({
            where: {key},
            select: {
                id: true,
                userId: true,
                projectId: true,
                permissions: true,
                isRevoked: true,
                expiresAt: true,
                lastUsed: true,
            }
        });

        if (!apiKey) {
            return null;
        }

        // Check if key is revoked
        if (apiKey.isRevoked) {
            return null;
        }

        // Check if key is expired
        if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
            return null;
        }

        // Update lastUsed timestamp (non-blocking)
        db.apiKey.update({
            where: {id: apiKey.id},
            data: {lastUsed: new Date()}
        }).catch(err => console.error('Failed to update API key lastUsed:', err));

        return {
            userId: apiKey.userId,
            apiKeyId: apiKey.id,
            projectId: apiKey.projectId,
            permissions: apiKey.permissions,
            isApiKey: true,
        };
    } catch (error) {
        console.error('API key verification failed:', error);
        return null;
    }
}

/**
 * Authenticate incoming request using either JWT or API key.
 * Returns auth context with user info, project scope, and permissions.
 * Accepts either a full NextRequest or a minimal AuthRequest interface.
 */
export async function authenticateRequest(request: AuthRequest | NextRequest): Promise<AuthContext | null> {
    const auth = getTokenFromRequest(request);
    if (!auth) {
        return null;
    }

    if (auth.type === 'jwt') {
        return authenticateWithJWT(auth.token);
    }

    return authenticateWithAPIKey(auth.token);
}

/**
 * Check if authenticated context has access to a specific project.
 * JWT tokens and global API keys have access to all projects.
 * Project-specific API keys only have access to their assigned project.
 */
export function hasProjectAccess(ctx: AuthContext, projectId: string): boolean {
    // JWT tokens have global access
    if (!ctx.isApiKey) {
        return true;
    }

    // Global API keys (projectId = null) have access to all projects
    if (ctx.projectId === null) {
        return true;
    }

    // Project-specific keys only have access to their project
    return ctx.projectId === projectId;
}

/**
 * Check if authenticated context has a specific permission.
 * JWT tokens have all permissions.
 * API keys are checked against their permission array.
 */
export function hasRequiredPermission(ctx: AuthContext, permission: ApiPermission): boolean {
    // JWT tokens have all permissions
    if (!ctx.isApiKey) {
        return true;
    }

    return hasPermission(ctx.permissions, permission);
}

/**
 * Check if authenticated context has all required permissions.
 */
export function hasRequiredPermissions(ctx: AuthContext, permissions: ApiPermission[]): boolean {
    // JWT tokens have all permissions
    if (!ctx.isApiKey) {
        return true;
    }

    return hasAllPermissions(ctx.permissions, permissions);
}

/**
 * Validate request has required permission and project access.
 * Throws error with appropriate status code if validation fails.
 */
export async function validateRequestAuth(
    request: NextRequest,
    options: {
        projectId?: string;
        permission?: ApiPermission;
        permissions?: ApiPermission[];
    } = {}
): Promise<AuthContext> {
    const ctx = await authenticateRequest(request);

    if (!ctx) {
        throw new Error('Authentication required');
    }

    // Check project access if projectId specified
    if (options.projectId && !hasProjectAccess(ctx, options.projectId)) {
        throw new Error('Access denied to this project');
    }

    // Check single permission if specified
    if (options.permission && !hasRequiredPermission(ctx, options.permission)) {
        throw new Error(`Missing required permission: ${options.permission}`);
    }

    // Check multiple permissions if specified
    if (options.permissions && !hasRequiredPermissions(ctx, options.permissions)) {
        throw new Error('Missing required permissions');
    }

    return ctx;
}