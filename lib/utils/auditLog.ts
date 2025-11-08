import {db} from '@/lib/db';
import type {Prisma} from '@prisma/client';
import {SYSTEM_USER_ID} from '@/lib/services/core/system-user/service';

interface AuditLogDetails {
    [key: string]: unknown;
}

/**
 * Creates an audit log entry
 * @param action The type of action performed
 * @param performedById ID of the user performing the action (use 'system' for system actions)
 * @param targetUserId ID of the user the action is performed on (can be null)
 * @param details Optional additional details about the action
 */
export async function createAuditLog(
    action: string,
    performedById: string | null,
    targetUserId: string | null,
    details?: AuditLogDetails
): Promise<{ id: string } | null> {
    try {
        // Map 'system' string to SYSTEM_USER_ID constant
        if (performedById === 'system') {
            performedById = SYSTEM_USER_ID;
        }
        if (targetUserId === 'system') {
            targetUserId = SYSTEM_USER_ID;
        }

        let safeDetails: AuditLogDetails = {};

        if (details && typeof details === 'object') {
            safeDetails = details;
        } else if (details !== undefined) {
            console.warn(
                `Audit log received invalid details type: ${typeof details}`,
                details
            );
        }

        const baseData = {
            action,
            details: JSON.stringify(safeDetails),
        };

        // Conditionally add userId and targetUserId only if they exist
        const data = {
            ...baseData,
            ...(performedById && {userId: performedById}),
            ...(targetUserId && {targetUserId: targetUserId}),
        } as Prisma.AuditLogUncheckedCreateInput;

        return await db.auditLog.create({data}); // Return the created log with ID
    } catch (error) {
        console.error('Failed to create audit log:', error);
        return null; // Return null on error
    }
}