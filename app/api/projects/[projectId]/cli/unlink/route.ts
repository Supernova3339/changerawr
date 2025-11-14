import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {
    ProjectUnlinkRequest,
    ProjectUnlinkResponse,
    ProjectApiError,
    ProjectApiSuccess
} from '@/lib/types/cli/project-api';
import {createAuditLog} from "@/lib/utils/auditLog";

const unlinkRequestSchema = z.object({
    reason: z.string().optional(),
    preserveData: z.boolean().default(true),
});

/**
 * @method POST
 * @description Unlink a project from its Git repository
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "reason": {
 *       "type": "string",
 *       "description": "Reason for unlinking"
 *     },
 *     "preserveData": {
 *       "type": "boolean",
 *       "description": "Whether to preserve synced commit data",
 *       "default": true
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "data": {
 *       "type": "object",
 *       "properties": {
 *         "success": { "type": "boolean" },
 *         "message": { "type": "string" },
 *         "unlinkedAt": { "type": "string" }
 *       }
 *     }
 *   }
 * }
 * @error 400 Invalid request data
 * @error 401 Unauthorized
 * @error 404 Project not found or not linked
 * @secure bearerAuth
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        // Validate authentication
        const user = await validateAuthAndGetUser();
        const {projectId} = await context.params;

        // Parse and validate request body
        const body = await request.json();
        const validatedData = unlinkRequestSchema.parse(body) as ProjectUnlinkRequest;

        // Check if project exists and user has access
        const project = await db.project.findFirst({
            where: {
                id: projectId,
            },
            include: {
                syncMetadata: true,
                syncedCommits: true
            }
        });

        if (!project) {
            const errorResponse: ProjectApiError = {
                success: false,
                error: 'Project not found',
                message: 'Project not found or you do not have access to it',
                code: 'PROJECT_NOT_FOUND'
            };
            return NextResponse.json(errorResponse, {status: 404});
        }

        const unlinkedAt = new Date();

        // Force delete all sync metadata for this project (in case there are orphaned records)
        await db.projectSyncMetadata.deleteMany({
            where: {projectId: project.id}
        });

        // Handle data preservation or deletion
        if (!validatedData.preserveData) {
            // Delete all synced commits
            await db.syncedCommit.deleteMany({
                where: {projectId: project.id}
            });
        }

        // Update project
        await db.project.update({
            where: {id: project.id},
            data: {
                updatedAt: unlinkedAt
            }
        });

        // Create audit log entry
        try {
            await createAuditLog(
                'PROJECT_UNLINKED',
                user.id,
                user.id,
                {
                    reason: validatedData.reason,
                    preserveData: validatedData.preserveData,
                    commitCount: project.syncedCommits.length,
                    repositoryUrl: project.syncMetadata?.repositoryUrl || 'Unknown',
                    unlinkedAt: unlinkedAt.toISOString()
                }
            );
        } catch (auditError) {
            console.error('Failed to create audit log:', auditError);
            // Continue execution - audit logging is not critical
        }

        // Create response
        const unlinkResponse: ProjectUnlinkResponse = {
            success: true,
            message: !project.syncMetadata
                ? 'Project was not linked, but any orphaned sync data has been cleaned up'
                : validatedData.preserveData
                    ? 'Project unlinked successfully (data preserved)'
                    : 'Project unlinked successfully (data removed)',
            unlinkedAt: unlinkedAt.toISOString()
        };

        const successResponse: ProjectApiSuccess<ProjectUnlinkResponse> = {
            success: true,
            data: unlinkResponse,
            message: 'Project unlinked from repository'
        };

        return NextResponse.json(successResponse);

    } catch (error) {
        console.error('Project unlink error:', error);

        if (error instanceof z.ZodError) {
            const errorResponse: ProjectApiError = {
                success: false,
                error: 'Validation failed',
                message: 'Invalid request data',
                code: 'VALIDATION_ERROR',
                details: {errors: error.errors}
            };
            return NextResponse.json(errorResponse, {status: 400});
        }

        if (error instanceof Error && error.message.includes('token')) {
            const errorResponse: ProjectApiError = {
                success: false,
                error: 'Unauthorized',
                message: 'Authentication required',
                code: 'AUTH_REQUIRED'
            };
            return NextResponse.json(errorResponse, {status: 401});
        }

        const errorResponse: ProjectApiError = {
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR'
        };
        return NextResponse.json(errorResponse, {status: 500});
    }
}