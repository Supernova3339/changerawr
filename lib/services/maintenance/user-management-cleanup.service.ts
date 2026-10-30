/**
 * User Management Maintenance Service
 * Handles automatic cleanup of expired invitations and other user-related maintenance tasks
 */

import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/utils/auditLog';

export class UserManagementCleanupService {
    /**
     * Clean up expired invitations that are past their expiration date
     * @param daysOld - Clean up invitations that have been expired for this many days (default: 0, meaning any expired)
     * @returns Number of invitations deleted
     */
    static async cleanupExpiredInvitations(daysOld: number = 0): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            // Find expired invitations that have not been used
            const expiredInvitations = await db.invitationLink.findMany({
                where: {
                    expiresAt: {
                        lt: cutoffDate,
                    },
                    usedAt: null,
                },
                select: {
                    id: true,
                    email: true,
                    expiresAt: true,
                },
            });

            if (expiredInvitations.length === 0) {
                console.log('No expired invitations to clean up');
                return 0;
            }

            // Delete expired invitations
            const result = await db.invitationLink.deleteMany({
                where: {
                    id: {
                        in: expiredInvitations.map(inv => inv.id),
                    },
                },
            });

            const count = result.count;

            if (count > 0) {
                console.log(`Cleaned up ${count} expired invitation(s)`);

                // Create audit log
                await createAuditLog(
                    'USER_MANAGEMENT_CLEANUP',
                    'system',
                    'system',
                    {
                        action: 'cleanup_expired_invitations',
                        deletedCount: count,
                        daysOld,
                        invitations: expiredInvitations.map(inv => ({
                            id: inv.id,
                            email: inv.email,
                            expiresAt: inv.expiresAt.toISOString(),
                        })),
                        timestamp: new Date().toISOString(),
                    }
                );
            }

            return count;
        } catch (error) {
            console.error('Error cleaning up expired invitations:', error);
            throw error;
        }
    }

    /**
     * Get count of expired invitations waiting for cleanup
     * @returns Number of expired invitations
     */
    static async getExpiredInvitationsCount(): Promise<number> {
        try {
            const count = await db.invitationLink.count({
                where: {
                    expiresAt: {
                        lt: new Date(),
                    },
                    usedAt: null,
                },
            });

            return count;
        } catch (error) {
            console.error('Error getting expired invitations count:', error);
            return 0;
        }
    }

    /**
     * Run all user management maintenance tasks
     * This is the main entry point for scheduled cleanup jobs
     */
    static async runMaintenance(): Promise<{
        expiredInvitationsDeleted: number;
    }> {
        console.log('Running user management maintenance...');

        const results = {
            expiredInvitationsDeleted: 0,
        };

        try {
            // Clean up invitations that have been expired for at least 7 days
            // This gives users a grace period to see why their invitation expired
            results.expiredInvitationsDeleted = await this.cleanupExpiredInvitations(7);

            console.log('User management maintenance complete:', results);
        } catch (error) {
            console.error('Error during user management maintenance:', error);
        }

        return results;
    }
}
