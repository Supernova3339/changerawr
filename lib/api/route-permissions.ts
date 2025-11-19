import {API_PERMISSIONS} from './permissions';

/**
 * Route permission configuration
 * Maps API route patterns to required permissions and project scope requirements
 */

export interface RoutePermissionConfig {
    /** Required permission(s) for this route. If array, user needs ANY of them (OR logic) */
    permissions?: string | string[];
    /** Whether this route requires project-specific access */
    requiresProjectAccess?: boolean;
    /** Whether this route requires admin role (bypasses API key permissions) */
    requiresAdmin?: boolean;
    /** Whether this route is public (no auth required) */
    public?: boolean;
    /** HTTP methods this config applies to. If not specified, applies to all methods */
    methods?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
}

/**
 * Route permission mapping organized by category
 * Routes are matched from most specific to least specific
 * Use :param syntax for dynamic segments (e.g., /projects/:projectId)
 */
export const ROUTE_PERMISSIONS: Record<string, RoutePermissionConfig> = {
    // ==========================================
    // PUBLIC ROUTES (No authentication required)
    // ==========================================
    '/api/health': {public: true},
    '/api/check-setup': {public: true},
    '/api/system/version': {public: true},

    // Setup routes (initial installation)
    '/api/setup': {public: true},
    '/api/setup/status': {public: true},
    '/api/setup/admin': {public: true},
    '/api/setup/invitations': {public: true},
    '/api/setup/oauth': {public: true},
    '/api/setup/oauth/auto': {public: true},
    '/api/setup/oauth/debug': {public: true},
    '/api/setup/settings': {public: true},

    // Authentication routes (public by nature)
    '/api/auth/login': {public: true},
    '/api/auth/login/second-factor': {public: true},
    '/api/auth/register': {public: true},
    '/api/auth/forgot-password': {public: true},
    '/api/auth/reset-password/request': {public: true},
    '/api/auth/reset-password/:token': {public: true},
    '/api/auth/invitation/:token': {public: true},
    '/api/auth/oauth/providers': {public: true},
    '/api/auth/oauth/authorize/:providerName': {public: true},
    '/api/auth/oauth/callback/:providerName': {public: true},
    '/api/auth/passkeys/authenticate/options': {public: true},
    '/api/auth/passkeys/authenticate/verify': {public: true},

    // Public changelog/widget routes
    '/api/changelog/subscribe': {public: true},
    '/api/changelog/unsubscribe/:token': {public: true},
    '/api/changelog/verify-domain': {public: true},
    '/api/integrations/widget/:projectId': {public: true},

    // ==========================================
    // ADMIN-ONLY ROUTES (Require ADMIN role)
    // ==========================================

    // User management
    '/api/admin/users': {requiresAdmin: true},
    '/api/admin/users/:userId': {requiresAdmin: true},
    '/api/admin/users/:userId/role': {requiresAdmin: true},
    '/api/admin/users/invitations': {requiresAdmin: true},
    '/api/admin/users/invitations/:id': {requiresAdmin: true},

    // System configuration
    '/api/admin/config': {requiresAdmin: true},
    '/api/admin/config/system-email': {requiresAdmin: true},
    '/api/admin/oauth/providers': {requiresAdmin: true},
    '/api/admin/oauth/providers/:id': {requiresAdmin: true},

    // AI settings
    '/api/admin/ai-settings': {requiresAdmin: true},
    '/api/admin/ai-settings/test-key': {requiresAdmin: true},

    // Audit logs
    '/api/admin/audit-logs': {requiresAdmin: true},
    '/api/admin/audit-logs/actions': {requiresAdmin: true},

    // Admin analytics & dashboard
    '/api/admin/analytics': {requiresAdmin: true},
    '/api/admin/dashboard': {requiresAdmin: true},

    // API key management (admin level)
    '/api/admin/api-keys': {requiresAdmin: true},
    '/api/admin/api-keys/:keyId': {requiresAdmin: true},

    // System management
    '/api/system/easypanel/status': {requiresAdmin: true},
    '/api/system/perform-update': {requiresAdmin: true},
    '/api/system/update-status': {requiresAdmin: true},

    // Telemetry
    '/api/telemetry/config': {requiresAdmin: true},
    '/api/telemetry/debug': {requiresAdmin: true},

    // ==========================================
    // CHANGELOG ROUTES (API-accessible)
    // ==========================================

    // Read changelog entries
    '/api/changelog/:projectId/entries': {
        permissions: API_PERMISSIONS.CHANGELOG_READ,
        requiresProjectAccess: true,
        methods: ['GET']
    },

    // Individual entry operations
    '/api/changelog/entries/:entryId': {
        permissions: [API_PERMISSIONS.CHANGELOG_READ, API_PERMISSIONS.CHANGELOG_WRITE, API_PERMISSIONS.CHANGELOG_DELETE]
    },

    // Changelog requests (feature requests)
    '/api/changelog/requests': {
        permissions: API_PERMISSIONS.CHANGELOG_READ,
        methods: ['GET']
    },
    '/api/changelog/requests/:requestId': {
        permissions: API_PERMISSIONS.CHANGELOG_WRITE
    },

    // ==========================================
    // PROJECT ROUTES (API-accessible)
    // ==========================================

    // List/create projects
    '/api/projects': {
        permissions: API_PERMISSIONS.PROJECT_READ
    },

    // Project details
    '/api/projects/:projectId': {
        permissions: API_PERMISSIONS.PROJECT_READ,
        requiresProjectAccess: true
    },

    // Project settings
    '/api/projects/:projectId/settings': {
        permissions: API_PERMISSIONS.PROJECT_WRITE,
        requiresProjectAccess: true
    },

    // Project versions
    '/api/projects/:projectId/versions': {
        permissions: API_PERMISSIONS.PROJECT_READ,
        requiresProjectAccess: true
    },

    // ==========================================
    // PROJECT CHANGELOG ROUTES
    // ==========================================

    // Changelog entries (CRUD)
    '/api/projects/:projectId/changelog': {
        permissions: [API_PERMISSIONS.CHANGELOG_READ, API_PERMISSIONS.CHANGELOG_WRITE],
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/changelog/:entryId': {
        permissions: [API_PERMISSIONS.CHANGELOG_READ, API_PERMISSIONS.CHANGELOG_WRITE, API_PERMISSIONS.CHANGELOG_DELETE],
        requiresProjectAccess: true
    },

    // Scheduling & publishing
    '/api/projects/:projectId/changelog/:entryId/schedule': {
        permissions: API_PERMISSIONS.CHANGELOG_PUBLISH,
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/changelog/:entryId/schedule/approval': {
        permissions: API_PERMISSIONS.CHANGELOG_PUBLISH,
        requiresProjectAccess: true
    },

    // Tags management
    '/api/projects/:projectId/changelog/tags': {
        permissions: [API_PERMISSIONS.TAGS_READ, API_PERMISSIONS.TAGS_WRITE],
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/changelog/tags/:tagId': {
        permissions: [API_PERMISSIONS.TAGS_READ, API_PERMISSIONS.TAGS_WRITE],
        requiresProjectAccess: true
    },

    // ==========================================
    // PROJECT ANALYTICS ROUTES
    // ==========================================

    '/api/projects/:projectId/analytics': {
        permissions: API_PERMISSIONS.ANALYTICS_READ,
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/analytics/export': {
        permissions: API_PERMISSIONS.ANALYTICS_READ,
        requiresProjectAccess: true
    },

    // ==========================================
    // PROJECT INTEGRATIONS
    // ==========================================

    // Email integration
    '/api/projects/:projectId/integrations/email': {
        permissions: [API_PERMISSIONS.PROJECT_READ, API_PERMISSIONS.PROJECT_WRITE],
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/integrations/email/send': {
        permissions: API_PERMISSIONS.EMAIL_SEND,
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/integrations/email/test': {
        permissions: API_PERMISSIONS.EMAIL_SEND,
        requiresProjectAccess: true
    },

    // GitHub integration
    '/api/projects/:projectId/integrations/github': {
        permissions: [API_PERMISSIONS.GITHUB_READ, API_PERMISSIONS.GITHUB_WRITE],
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/integrations/github/generate': {
        permissions: API_PERMISSIONS.GITHUB_WRITE,
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/integrations/github/tags': {
        permissions: API_PERMISSIONS.GITHUB_READ,
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/integrations/github/test': {
        permissions: API_PERMISSIONS.GITHUB_READ,
        requiresProjectAccess: true
    },

    // ==========================================
    // PROJECT CLI ROUTES
    // ==========================================

    '/api/projects/:projectId/cli/link': {
        permissions: API_PERMISSIONS.PROJECT_WRITE,
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/cli/unlink': {
        permissions: API_PERMISSIONS.PROJECT_WRITE,
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/cli/sync': {
        permissions: API_PERMISSIONS.CHANGELOG_WRITE,
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/cli/sync/status': {
        permissions: API_PERMISSIONS.CHANGELOG_READ,
        requiresProjectAccess: true
    },

    // ==========================================
    // PROJECT API KEYS (Project-scoped)
    // ==========================================

    '/api/projects/:projectId/api-keys': {
        permissions: API_PERMISSIONS.PROJECT_WRITE,
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/api-keys/:keyId': {
        permissions: API_PERMISSIONS.PROJECT_WRITE,
        requiresProjectAccess: true
    },

    // ==========================================
    // PROJECT CATCH-UP / AI SUMMARY
    // ==========================================

    '/api/projects/:projectId/catch-up': {
        permissions: API_PERMISSIONS.CHANGELOG_READ,
        requiresProjectAccess: true
    },
    '/api/projects/:projectId/catch-up/ai-summary': {
        permissions: API_PERMISSIONS.CHANGELOG_READ,
        requiresProjectAccess: true
    },

    // ==========================================
    // SUBSCRIBERS ROUTES
    // ==========================================

    '/api/subscribers': {
        permissions: [API_PERMISSIONS.SUBSCRIBERS_READ, API_PERMISSIONS.SUBSCRIBERS_WRITE]
    },
    '/api/subscribers/:subscriberId': {
        permissions: API_PERMISSIONS.SUBSCRIBERS_WRITE
    },
    '/api/subscribers/generate-mock': {
        permissions: API_PERMISSIONS.SUBSCRIBERS_WRITE
    },

    // ==========================================
    // PROJECT IMPORT ROUTES
    // ==========================================

    '/api/projects/import/canny/validate': {
        permissions: API_PERMISSIONS.PROJECT_WRITE
    },
    '/api/projects/import/canny/fetch': {
        permissions: API_PERMISSIONS.PROJECT_WRITE
    },
    '/api/projects/import/parse': {
        permissions: API_PERMISSIONS.PROJECT_WRITE
    },
    '/api/projects/import/process': {
        permissions: API_PERMISSIONS.PROJECT_WRITE
    },

    // ==========================================
    // USER ROUTES (Authenticated, no special perms)
    // ==========================================

    // Auth session management
    '/api/auth/me': {},
    '/api/auth/logout': {},
    '/api/auth/refresh': {},
    '/api/auth/validate': {},
    '/api/auth/preview': {},

    // User settings
    '/api/auth/change-password': {},
    '/api/auth/connections': {},
    '/api/auth/security-settings': {},
    '/api/auth/settings': {},

    // Passkeys (authenticated user managing their own)
    '/api/auth/passkeys': {},
    '/api/auth/passkeys/:id': {},
    '/api/auth/passkeys/register/options': {},
    '/api/auth/passkeys/register/verify': {},

    // CLI authentication
    '/api/auth/cli/generate': {},
    '/api/auth/cli/token': {},
    '/api/auth/cli/refresh': {},

    // User dashboard
    '/api/dashboard/stats': {},

    // Search
    '/api/search': {},

    // Feature requests
    '/api/requests': {},

    // AI settings (user-level)
    '/api/ai/settings': {},
    '/api/ai/decrypt': {},

    // Analytics tracking (user actions)
    '/api/analytics/track': {},

    // Custom domains
    '/api/custom-domains/list': {},
    '/api/custom-domains/add': {},
    '/api/custom-domains/verify': {},
    '/api/custom-domains/:domain': {},
};

/**
 * Match a request path to a route pattern
 * Converts Next.js dynamic segments to pattern format
 */
export function matchRoute(path: string): RoutePermissionConfig | null {
    // Normalize path (remove trailing slash, ensure leading slash)
    const normalizedPath = path.replace(/\/$/, '') || '/';

    // Try exact match first
    if (ROUTE_PERMISSIONS[normalizedPath]) {
        return ROUTE_PERMISSIONS[normalizedPath];
    }

    // Try pattern matching for dynamic routes
    // Sort patterns by specificity (more segments = more specific)
    const patterns = Object.entries(ROUTE_PERMISSIONS).sort((a, b) => {
        const aSegments = a[0].split('/').length;
        const bSegments = b[0].split('/').length;
        return bSegments - aSegments; // More segments first
    });

    for (const [pattern, config] of patterns) {
        const regex = patternToRegex(pattern);
        if (regex.test(normalizedPath)) {
            return config;
        }
    }

    // No match found - require authentication by default
    return {};
}

/**
 * Convert route pattern to regex
 * Converts :param to regex capture groups
 */
function patternToRegex(pattern: string): RegExp {
    const regexPattern = pattern
        .replace(/:[^/]+/g, '[^/]+') // Replace :param with [^/]+
        .replace(/\//g, '\\/');       // Escape slashes
    return new RegExp(`^${regexPattern}$`);
}

/**
 * Extract project ID from request path if present
 */
export function extractProjectId(path: string): string | null {
    const match = path.match(/\/projects\/([^/]+)/);
    return match ? match[1] : null;
}

/**
 * Check if a route config allows a specific HTTP method
 */
export function methodAllowed(config: RoutePermissionConfig, method: string): boolean {
    if (!config.methods) return true; // No method restriction
    return config.methods.includes(method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE');
}