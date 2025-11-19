/**
 * API Key Permission Definitions
 *
 * Permissions follow the format: resource:action
 * Used for scope-based access control on API keys.
 */

export const API_PERMISSIONS = {
    // Changelog entry operations
    CHANGELOG_READ: 'changelog:read',           // Fetch changelog entries and metadata
    CHANGELOG_WRITE: 'changelog:write',         // Create and update changelog entries
    CHANGELOG_PUBLISH: 'changelog:publish',     // Publish or unpublish entries
    CHANGELOG_DELETE: 'changelog:delete',       // Delete changelog entries

    // Project configuration
    PROJECT_READ: 'project:read',               // Read project settings and configuration
    PROJECT_WRITE: 'project:write',             // Modify project settings

    // Analytics and metrics
    ANALYTICS_READ: 'analytics:read',           // Access analytics data and metrics

    // Subscription management
    SUBSCRIBERS_READ: 'subscribers:read',       // List and view subscribers
    SUBSCRIBERS_WRITE: 'subscribers:write',     // Add, update, or remove subscribers

    // Email notifications
    EMAIL_SEND: 'email:send',                   // Trigger email notifications for entries

    // GitHub integration
    GITHUB_READ: 'github:read',                 // Read GitHub integration settings
    GITHUB_WRITE: 'github:write',               // Modify GitHub integration and generate entries

    // Tags and categorization
    TAGS_READ: 'tags:read',                     // List and view tags
    TAGS_WRITE: 'tags:write',                   // Create, update, or delete tags

    // Webhook operations (placeholder for future implementation)
    WEBHOOKS_READ: 'webhooks:read',             // List webhook configurations
    WEBHOOKS_WRITE: 'webhooks:write',           // Create, update, or delete webhooks
} as const;

export type ApiPermission = typeof API_PERMISSIONS[keyof typeof API_PERMISSIONS];

/**
 * Permission groups for common use cases.
 * These are convenience sets for typical access patterns.
 */
export const PERMISSION_GROUPS = {
    // Read-only access to all resources
    READ_ONLY: [
        API_PERMISSIONS.CHANGELOG_READ,
        API_PERMISSIONS.PROJECT_READ,
        API_PERMISSIONS.ANALYTICS_READ,
        API_PERMISSIONS.SUBSCRIBERS_READ,
        API_PERMISSIONS.GITHUB_READ,
        API_PERMISSIONS.TAGS_READ,
        API_PERMISSIONS.WEBHOOKS_READ,
    ],

    // Full changelog management without project config changes
    CHANGELOG_MANAGER: [
        API_PERMISSIONS.CHANGELOG_READ,
        API_PERMISSIONS.CHANGELOG_WRITE,
        API_PERMISSIONS.CHANGELOG_PUBLISH,
        API_PERMISSIONS.CHANGELOG_DELETE,
        API_PERMISSIONS.TAGS_READ,
        API_PERMISSIONS.TAGS_WRITE,
    ],

    // Full access to everything
    FULL_ACCESS: Object.values(API_PERMISSIONS),
} as const;

/**
 * Check if an API key has a specific permission.
 *
 * @param keyPermissions - Array of permissions from the API key
 * @param requiredPermission - Permission to check for
 * @returns true if key has the permission
 */
export function hasPermission(
    keyPermissions: string[],
    requiredPermission: ApiPermission
): boolean {
    return keyPermissions.includes(requiredPermission);
}

/**
 * Check if an API key has all required permissions.
 *
 * @param keyPermissions - Array of permissions from the API key
 * @param requiredPermissions - Permissions to check for
 * @returns true if key has all permissions
 */
export function hasAllPermissions(
    keyPermissions: string[],
    requiredPermissions: ApiPermission[]
): boolean {
    return requiredPermissions.every(perm => keyPermissions.includes(perm));
}

/**
 * Check if an API key has any of the required permissions.
 *
 * @param keyPermissions - Array of permissions from the API key
 * @param requiredPermissions - Permissions to check for
 * @returns true if key has at least one permission
 */
export function hasAnyPermission(
    keyPermissions: string[],
    requiredPermissions: ApiPermission[]
): boolean {
    return requiredPermissions.some(perm => keyPermissions.includes(perm));
}