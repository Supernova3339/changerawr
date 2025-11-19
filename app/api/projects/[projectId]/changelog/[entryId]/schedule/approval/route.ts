// app/api/projects/[projectId]/changelog/[entryId]/schedule/approval/route.ts
import {NextResponse} from "next/server";
import {z} from "zod";
import {validateAuthAndGetUser} from "@/lib/utils/changelog";
import {db} from "@/lib/db";
import {createAuditLog} from "@/lib/utils/auditLog";
import {Role, ScheduledJobType} from "@prisma/client";
import {User} from "@/lib/types/auth";

const scheduleApprovalSchema = z.object({
    scheduledAt: z.string().datetime(),
    action: z.enum(["request_approval", "approve", "reject"]),
    reason: z.string().optional(),
});

interface ScheduleApprovalBody {
    scheduledAt: string;
    action: "request_approval" | "approve" | "reject";
    reason?: string;
}

/**
 * Handle schedule approval requests for changelog entries
 * @method POST
 * @description Creates, approves, or rejects a scheduled publish request for a changelog entry when approval is required
 * @body {
 *   "type": "object",
 *   "required": ["action"],
 *   "properties": {
 *     "action": {
 *       "type": "string",
 *       "enum": ["request_approval", "approve", "reject"],
 *       "description": "Action to perform on the schedule request"
 *     },
 *     "scheduledAt": {
 *       "type": "string",
 *       "format": "date-time",
 *       "description": "ISO datetime string for when to publish (required for request_approval)"
 *     },
 *     "reason": {
 *       "type": "string",
 *       "description": "Reason for rejection (optional, used with reject action)"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "message": { "type": "string" },
 *     "request": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "type": { "type": "string" },
 *         "status": { "type": "string" },
 *         "scheduledAt": { "type": "string", "format": "date-time" }
 *       }
 *     }
 *   }
 * }
 * @error 400 Bad Request - Invalid input or business logic violation
 * @error 401 Unauthorized - User not authenticated
 * @error 403 Forbidden - User lacks permission for the action
 * @error 404 Not Found - Changelog entry not found
 * @error 409 Conflict - Request already exists or invalid state
 */
export async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string; entryId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        const {projectId, entryId} = await context.params;
        const body = await request.json() as ScheduleApprovalBody;

        const validatedData = scheduleApprovalSchema.parse(body);
        const {action, scheduledAt, reason} = validatedData;

        // Get the changelog entry and project settings
        const entry = await db.changelogEntry.findFirst({
            where: {
                id: entryId,
                changelog: {
                    project: {
                        id: projectId,
                    },
                },
            },
            include: {
                changelog: {
                    include: {
                        project: true,
                    },
                },
            },
        });

        if (!entry) {
            return NextResponse.json(
                {error: 'Entry not found or does not belong to this project'},
                {status: 404}
            );
        }

        const project = entry.changelog.project;

        if (action === "request_approval") {
            // Staff can request approval to schedule
            if (user.role !== Role.STAFF) {
                return NextResponse.json(
                    {error: 'Only staff members can request schedule approval'},
                    {status: 403}
                );
            }

            if (!project.requireApproval) {
                return NextResponse.json(
                    {error: 'This project does not require approval for scheduling'},
                    {status: 400}
                );
            }

            if (entry.publishedAt) {
                return NextResponse.json(
                    {error: 'Cannot schedule an already published entry'},
                    {status: 409}
                );
            }

            const scheduleDate = new Date(scheduledAt);
            if (scheduleDate <= new Date()) {
                return NextResponse.json(
                    {error: 'Scheduled time must be in the future'},
                    {status: 400}
                );
            }

            // Check for existing schedule requests
            const existingRequest = await db.changelogRequest.findFirst({
                where: {
                    type: 'ALLOW_SCHEDULE',
                    changelogEntryId: entryId,
                    status: 'PENDING'
                }
            });

            if (existingRequest) {
                return NextResponse.json(
                    {error: 'A schedule approval request for this entry already exists'},
                    {status: 409}
                );
            }

            // Create the schedule approval request
            const scheduleRequest = await db.changelogRequest.create({
                data: {
                    type: 'ALLOW_SCHEDULE',
                    staffId: user.id,
                    projectId,
                    changelogEntryId: entryId,
                    status: 'PENDING',
                    targetId: scheduledAt, // Store the requested schedule time
                },
                include: {
                    staff: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                },
            });

            await createAuditLog(
                'CHANGELOG_SCHEDULE_APPROVAL_REQUESTED',
                user.id,
                user.id,
                {
                    projectId,
                    entryId,
                    requestId: scheduleRequest.id,
                    requestedScheduleTime: scheduledAt,
                    timestamp: new Date().toISOString(),
                }
            );

            return NextResponse.json({
                success: true,
                message: 'Schedule approval request created',
                request: {
                    id: scheduleRequest.id,
                    type: scheduleRequest.type,
                    status: scheduleRequest.status,
                    scheduledAt: scheduledAt,
                },
            });
        }

        if (action === "approve" || action === "reject") {
            // Only admins can approve/reject
            if (user.role !== Role.ADMIN) {
                return NextResponse.json(
                    {error: 'Only administrators can approve or reject schedule requests'},
                    {status: 403}
                );
            }

            // Find the pending request
            const pendingRequest = await db.changelogRequest.findFirst({
                where: {
                    type: 'ALLOW_SCHEDULE',
                    changelogEntryId: entryId,
                    status: 'PENDING'
                },
                include: {
                    staff: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                },
            });

            if (!pendingRequest) {
                return NextResponse.json(
                    {error: 'No pending schedule request found for this entry'},
                    {status: 404}
                );
            }

            const requestedScheduleTime = pendingRequest.targetId; // The stored schedule time

            if (action === "approve") {
                // Approve and schedule the entry
                const scheduleDate = new Date(requestedScheduleTime!);

                // Update the request status
                await db.changelogRequest.update({
                    where: {id: pendingRequest.id},
                    data: {
                        status: 'APPROVED',
                        adminId: user.id,
                        reviewedAt: new Date(),
                    },
                });

                // Schedule the entry
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const updatedEntry = await db.changelogEntry.update({
                    where: {id: entryId},
                    data: {scheduledAt: scheduleDate},
                });

                // Create scheduled job
                const {
                    ScheduledJobService,
                } = await import('@/lib/services/jobs/scheduled-job.service');
                const jobId = await ScheduledJobService.createJob({
                    type: ScheduledJobType.PUBLISH_CHANGELOG_ENTRY,
                    entityId: entryId,
                    scheduledAt: scheduleDate,
                });

                await createAuditLog(
                    'CHANGELOG_SCHEDULE_APPROVED',
                    user.id,
                    user.id,
                    {
                        projectId,
                        entryId,
                        requestId: pendingRequest.id,
                        staffUserId: pendingRequest.staff?.id,
                        scheduledAt: scheduleDate.toISOString(),
                        jobId,
                        timestamp: new Date().toISOString(),
                    }
                );

                // Send notification to staff member
                try {
                    const {sendNotificationEmail} = await import('@/lib/services/email/notification');
                    await sendNotificationEmail({
                        userId: pendingRequest.staffId!,
                        status: 'APPROVED',
                        request: {
                            type: 'Schedule Request',
                            projectName: project.name,
                            entryTitle: entry.title,
                            adminName: user.name || user.email,
                        },
                        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/projects/${projectId}`,
                    });
                } catch (emailError) {
                    console.error('Failed to send approval notification:', emailError);
                }

                return NextResponse.json({
                    success: true,
                    message: 'Schedule request approved and entry scheduled',
                    request: {
                        id: pendingRequest.id,
                        type: pendingRequest.type,
                        status: 'APPROVED',
                        scheduledAt: scheduleDate.toISOString(),
                    },
                });
            } else {
                // Reject the request
                await db.changelogRequest.update({
                    where: {id: pendingRequest.id},
                    data: {
                        status: 'REJECTED',
                        adminId: user.id,
                        reviewedAt: new Date(),
                    },
                });

                await createAuditLog(
                    'CHANGELOG_SCHEDULE_REJECTED',
                    user.id,
                    user.id,
                    {
                        projectId,
                        entryId,
                        requestId: pendingRequest.id,
                        staffUserId: pendingRequest.staff?.id,
                        reason: reason || 'No reason provided',
                        timestamp: new Date().toISOString(),
                    }
                );

                // Send notification to staff member
                try {
                    const {sendNotificationEmail} = await import('@/lib/services/email/notification');
                    await sendNotificationEmail({
                        userId: pendingRequest.staffId!,
                        status: 'REJECTED',
                        request: {
                            type: 'Schedule Request',
                            projectName: project.name,
                            entryTitle: entry.title,
                            adminName: user.name || user.email,
                        },
                        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/projects/${projectId}`,
                    });
                } catch (emailError) {
                    console.error('Failed to send rejection notification:', emailError);
                }

                return NextResponse.json({
                    success: true,
                    message: 'Schedule request rejected',
                    request: {
                        id: pendingRequest.id,
                        type: pendingRequest.type,
                        status: 'REJECTED',
                        scheduledAt: null,
                    },
                });
            }
        }

        return NextResponse.json(
            {error: 'Invalid action'},
            {status: 400}
        );
    } catch (error) {
        console.error('Error handling schedule approval:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: error.errors.map((err) => ({
                        message: err.message,
                        path: err.path.join('.'),
                    })),
                },
                {status: 400}
            );
        }

        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        );
    }
}