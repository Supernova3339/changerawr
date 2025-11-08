import { db } from '@/lib/db'
import {
    validateAuthAndGetUser,
    changelogEntrySchema,
    sendError,
    sendSuccess,
    generateExcerpt,
    type ChangelogEntryInput
} from '@/lib/utils/changelog'
import { z } from "zod";

// Helper to get project ID from changelog entry
async function getProjectIdFromEntry(entryId: string) {
    const entry = await db.changelogEntry.findUnique({
        where: { id: entryId },
        select: {
            changelog: {
                select: {
                    projectId: true
                }
            }
        }
    });
    return entry?.changelog?.projectId;
}

/**
 * @method PUT
 * @description Updates a changelog entry by its ID. Only authorized users with role 'STAFF' or 'ADMIN' can update an entry.
 * @body {
 *   "type": "object",
 *   "required": ["title", "content", "version"],
 *   "properties": {
 *     "title": { "type": "string", "example": "New feature: dark mode" },
 *     "content": { "type": "string", "example": "The app now has a dark mode option." },
 *     "version": { "type": "string", "example": "1.0.1" },
 *     "tags": {
 *       "type": "array",
 *       "items": {
 *         "type": "string",
 *         "example": "feature"
 *       }
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "data": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "title": { "type": "string" },
 *         "content": { "type": "string" },
 *         "version": { "type": "string" },
 *         "tags": {
 *           "type": "array",
 *           "items": {
 *             "type": "object",
 *             "properties": {
 *               "id": { "type": "string" },
 *               "name": { "type": "string" }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Invalid request data"
 *     }
 *   }
 * }
 * @error 401 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Unauthorized"
 *     }
 *   }
 * }
 * @error 403 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Forbidden"
 *     }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Changelog entry not found"
 *     }
 *   }
 * }
 * @error 500 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Internal server error"
 *     }
 *   }
 * }
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ entryId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser()

        if (user.role === 'VIEWER') {
            return sendError('Unauthorized', 403)
        }

        const json = await request.json()
        const body: ChangelogEntryInput = changelogEntrySchema.parse(json)

        const entry = await db.changelogEntry.update({
            where: { id: (await params).entryId },
            data: {
                title: body.title,
                content: body.content,
                excerpt: generateExcerpt(body.content), // Regenerate excerpt when content changes
                version: body.version,
                tags: body.tags ? {
                    set: [], // Clear existing tags
                    connectOrCreate: body.tags.map(tag => ({
                        where: { name: tag },
                        create: { name: tag }
                    }))
                } : undefined
            },
            include: {
                tags: true
            }
        })

        return sendSuccess(entry)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return sendError('Invalid request data: ' + error.message, 400)
        }
        console.error('Error updating changelog entry:', error)
        return sendError('Failed to update changelog entry', 500)
    }
}

/**
 * @method DELETE
 * @description Deletes a changelog entry by its ID. Only authorized users with role 'ADMIN' can delete an entry.
 * @body {
 *   "type": "null"
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "data": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" }
 *       }
 *     }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Invalid request data"
 *     }
 *   }
 * }
 * @error 401 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Unauthorized"
 *     }
 *   }
 * }
 * @error 403 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Forbidden"
 *     }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Changelog entry not found"
 *     }
 *   }
 * }
 * @error 500 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Internal server error"
 *     }
 *   }
 * }
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ entryId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser()

        if (user.role === 'VIEWER') {
            return sendError('Unauthorized', 403)
        }

        // Get the project ID from the changelog entry
        const projectId = await getProjectIdFromEntry((await params).entryId)

        if (!projectId) {
            return sendError('Changelog entry not found', 404)
        }

        // If user is staff, create a deletion request
        if (user.role === 'STAFF') {
            const request = await db.changelogRequest.create({
                data: {
                    type: 'DELETE_ENTRY',
                    status: 'PENDING',
                    staffId: user.id,
                    changelogEntryId: (await params).entryId,
                    projectId: projectId
                }
            })

            return sendSuccess({
                message: 'Deletion request created',
                request
            })
        }

        // If admin, delete directly
        const entry = await db.changelogEntry.delete({
            where: { id: (await params).entryId }
        })

        return sendSuccess({
            message: 'Changelog entry deleted',
            entry
        })
    } catch (error) {
        console.error('Error handling changelog entry deletion:', error)
        return sendError('Failed to process deletion request', 500)
    }
}