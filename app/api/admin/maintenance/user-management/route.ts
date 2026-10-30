import { validateAuthAndGetUser } from "@/lib/utils/changelog";
import { NextResponse } from "next/server";
import { UserManagementCleanupService } from "@/lib/services/maintenance/user-management-cleanup.service";

/**
 * Run user management maintenance manually
 * @method POST
 * @description Triggers a manual cleanup of expired invitations. Requires admin permissions.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "expiredInvitationsDeleted": { "type": "number" }
 *   }
 * }
 */
export async function POST() {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Run maintenance manually (with 0 days grace period for manual runs)
        const expiredInvitationsDeleted = await UserManagementCleanupService.cleanupExpiredInvitations(0);

        return NextResponse.json({
            success: true,
            expiredInvitationsDeleted,
        });
    } catch (error) {
        console.error('Failed to run user management maintenance:', error);
        return NextResponse.json(
            { error: 'Failed to run maintenance' },
            { status: 500 }
        );
    }
}

/**
 * Get user management maintenance status
 * @method GET
 * @description Get the count of expired invitations waiting for cleanup. Requires admin permissions.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "expiredInvitationsCount": { "type": "number" }
 *   }
 * }
 */
export async function GET() {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const expiredInvitationsCount = await UserManagementCleanupService.getExpiredInvitationsCount();

        return NextResponse.json({
            expiredInvitationsCount,
        });
    } catch (error) {
        console.error('Failed to get maintenance status:', error);
        return NextResponse.json(
            { error: 'Failed to get maintenance status' },
            { status: 500 }
        );
    }
}
