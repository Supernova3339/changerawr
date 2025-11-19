import {db} from '@/lib/db';
import {Role} from '@prisma/client';

/**
 * System user ID - a well-known constant
 */
export const SYSTEM_USER_ID = 'system';

/**
 * System user configuration
 */
const SYSTEM_USER = {
    id: SYSTEM_USER_ID,
    email: 'system@changerawr.sys',
    password: '', // No password - cannot login
    name: 'System',
    role: Role.ADMIN,
} as const;

/**
 * Ensure the system user exists in the database.
 * This user is used for audit logs and other system-level operations.
 *
 * @returns The system user ID
 */
export async function ensureSystemUser(): Promise<string> {
    try {
        // Try to find existing system user
        const existingUser = await db.user.findUnique({
            where: {id: SYSTEM_USER_ID}
        });

        if (existingUser) {
            return SYSTEM_USER_ID;
        }

        // Create system user if it doesn't exist
        await db.user.create({
            data: SYSTEM_USER
        });

        console.log('✓ Created system user');
        return SYSTEM_USER_ID;

    } catch (error) {
        // If user already exists (race condition during parallel execution), that's fine
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            return SYSTEM_USER_ID;
        }
        console.error('Failed to ensure system user exists:', error);
        throw error;
    }
}

/**
 * Check if a user ID is the system user
 */
export function isSystemUser(userId: string): boolean {
    return userId === SYSTEM_USER_ID;
}