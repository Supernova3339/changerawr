import {NextResponse} from 'next/server'
import {validateAuthAndGetUser, generateExcerpt} from '@/lib/utils/changelog'
import {createAuditLog} from '@/lib/utils/auditLog'
import {db} from '@/lib/db'
import {Role} from "@/lib/types/auth";

/**
 * Get a changelog entry by ID
 * @method GET
 * @description Returns the details of a changelog entry by its ID, including its title, content, version, tags, and creation/update timestamps. Requires user authentication and permission to view the project.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry to retrieve.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "tags": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" },
 *           "color": { "type": "string" }
 *         }
 *       }
 *     },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "updatedAt": { "type": "string", "format": "date-time" },
 *     "projectId": { "type": "string" }
 *   }
 * }
 * @error 401 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 403 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string; entryId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        const {projectId, entryId} = await (async () => context.params)();

        // Log entry view attempt
        try {
            await createAuditLog(
                'VIEW_CHANGELOG_ENTRY_ATTEMPT',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    projectId,
                    entryId,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create view attempt audit log:', auditLogError);
        }

        const entry = await db.changelogEntry.findUnique({
            where: {id: entryId},
            include: {
                tags: true,
                changelog: {
                    select: {
                        projectId: true
                    }
                }
            }
        });

        if (!entry) {
            // Log entry not found
            try {
                await createAuditLog(
                    'CHANGELOG_ENTRY_NOT_FOUND',
                    user.id,
                    user.id, // Use user's own ID to avoid foreign key issues
                    {
                        projectId,
                        entryId,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create not found audit log:', auditLogError);
            }

            return NextResponse.json(
                {error: 'Entry not found'},
                {status: 404}
            );
        }

        // Verify the entry belongs to the requested project
        if (entry.changelog.projectId !== projectId) {
            // Log project mismatch
            try {
                await createAuditLog(
                    'CHANGELOG_ENTRY_PROJECT_MISMATCH',
                    user.id,
                    user.id, // Use user's own ID to avoid foreign key issues
                    {
                        requestedProjectId: projectId,
                        actualProjectId: entry.changelog.projectId,
                        entryId,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create project mismatch audit log:', auditLogError);
            }

            return NextResponse.json(
                {error: 'Entry does not belong to this project'},
                {status: 400}
            );
        }

        // Log successful entry view
        try {
            await createAuditLog(
                'VIEW_CHANGELOG_ENTRY_SUCCESS',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    projectId,
                    entryId: entry.id,
                    entryTitle: entry.title,
                    entryVersion: entry.version,
                    tagCount: entry.tags.length,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create view success audit log:', auditLogError);
        }

        // Remove changelog field from response
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {changelog, ...entryData} = entry;
        return NextResponse.json(entryData);
    } catch (error) {
        console.error('Error fetching changelog entry:', error);

        // Log error
        try {
            const {projectId, entryId} = await (async () => context.params)();
            const user = await validateAuthAndGetUser();
            await createAuditLog(
                'CHANGELOG_ENTRY_ERROR',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    action: 'VIEW_ENTRY',
                    projectId,
                    entryId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create error audit log:', auditLogError);
        }

        return NextResponse.json(
            {error: 'Failed to fetch changelog entry'},
            {status: 500}
        );
    }
}

/**
 * Update a changelog entry by ID
 * @method PUT
 * @description Updates the title, content, version, and tags of a changelog entry by its ID. Requires user authentication and permission to edit the project.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry to update.
 * @requestBody {
 *   "type": "object",
 *   "properties": {
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "tags": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" },
 *           "color": { "type": "string" }
 *         }
 *       }
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "tags": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" },
 *           "color": { "type": "string" }
 *         }
 *       }
 *     },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "updatedAt": { "type": "string", "format": "date-time" },
 *     "projectId": { "type": "string" }
 *   }
 * }
 * @error 401 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 403 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" },
 *     "details": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "message": { "type": "string" },
 *           "path": { "type": "string" }
 *         }
 *       }
 *     }
 *   }
 * }
 */
export async function PUT(
    request: Request,
    context: { params: Promise<{ projectId: string; entryId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        const {projectId, entryId} = await (async () => context.params)();
        const requestBody = await request.json();
        const {title, content, version, tags} = requestBody;

        // Log update attempt
        try {
            await createAuditLog(
                'UPDATE_CHANGELOG_ENTRY_ATTEMPT',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    projectId,
                    entryId,
                    requestedChanges: {
                        titleChanged: !!title,
                        contentChanged: !!content,
                        versionChanged: !!version,
                        tagCount: tags?.length || 0
                    },
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create update attempt audit log:', auditLogError);
        }

        // Verify the entry exists and get existing data for comparison
        const existingEntry = await db.changelogEntry.findUnique({
            where: {id: entryId},
            include: {
                tags: true,
                changelog: {
                    select: {
                        projectId: true
                    }
                }
            }
        });

        if (!existingEntry) {
            // Log entry not found
            try {
                await createAuditLog(
                    'CHANGELOG_ENTRY_NOT_FOUND',
                    user.id,
                    user.id, // Use user's own ID to avoid foreign key issues
                    {
                        action: 'UPDATE_ENTRY',
                        projectId,
                        entryId,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create not found audit log:', auditLogError);
            }

            return NextResponse.json(
                {error: 'Entry not found'},
                {status: 404}
            );
        }

        // Verify the entry belongs to the project
        if (existingEntry.changelog.projectId !== projectId) {
            // Log project mismatch
            try {
                await createAuditLog(
                    'CHANGELOG_ENTRY_PROJECT_MISMATCH',
                    user.id,
                    user.id, // Use user's own ID to avoid foreign key issues
                    {
                        action: 'UPDATE_ENTRY',
                        requestedProjectId: projectId,
                        actualProjectId: existingEntry.changelog.projectId,
                        entryId,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create project mismatch audit log:', auditLogError);
            }

            return NextResponse.json(
                {error: 'Entry does not belong to this project'},
                {status: 400}
            );
        }

        // Track changes for audit log
        const changes: Record<string, { from: unknown; to: unknown }> = {};

        if (title && title !== existingEntry.title) {
            changes.title = {from: existingEntry.title, to: title};
        }

        if (content && content !== existingEntry.content) {
            changes.content = {
                from: `${existingEntry.content.substring(0, 50)}${existingEntry.content.length > 50 ? '...' : ''}`,
                to: `${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`
            };
        }

        if (version && version !== existingEntry.version) {
            changes.version = {from: existingEntry.version, to: version};
        }

        if (tags) {
            const existingTagIds = existingEntry.tags.map(tag => tag.id).sort();
            const newTagIds = tags.map((tag: { id: string }) => tag.id).sort();

            if (JSON.stringify(existingTagIds) !== JSON.stringify(newTagIds)) {
                changes.tags = {
                    from: existingEntry.tags.map(tag => tag.name),
                    to: tags.map((tag: { name: string }) => tag.name)
                };
            }
        }

        // Fix the tags connection structure
        const updatedEntry = await db.changelogEntry.update({
            where: {
                id: entryId
            },
            data: {
                title,
                content,
                excerpt: content ? generateExcerpt(content) : undefined, // Regenerate excerpt when content changes
                version,
                updatedAt: new Date(),
                tags: {
                    set: tags.map((tag: { id: string }) => ({
                        id: tag.id
                    }))
                }
            },
            include: {
                tags: true
            }
        });

        // Log successful update with changes
        try {
            await createAuditLog(
                'UPDATE_CHANGELOG_ENTRY_SUCCESS',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    projectId,
                    entryId: updatedEntry.id,
                    entryTitle: updatedEntry.title,
                    entryVersion: updatedEntry.version,
                    changes,
                    changeCount: Object.keys(changes).length,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create update success audit log:', auditLogError);
        }

        return NextResponse.json(updatedEntry);
    } catch (error) {
        console.error('Error updating changelog entry:', error);

        // Log error
        try {
            const {projectId, entryId} = await (async () => context.params)();
            const user = await validateAuthAndGetUser();
            await createAuditLog(
                'CHANGELOG_ENTRY_ERROR',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    action: 'UPDATE_ENTRY',
                    projectId,
                    entryId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create error audit log:', auditLogError);
        }

        return NextResponse.json(
            {error: 'Failed to update changelog entry'},
            {status: 500}
        );
    }
}

/**
 * Update the status of a changelog entry by ID
 * @method PATCH
 * @description Updates the status (published/unpublished) of a changelog entry by its ID. Requires user authentication and permission to edit the project.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry to update.
 * @requestBody {
 *   "type": "object",
 *   "properties": {
 *     "action": { "type": "string", "enum": ["publish", "unpublish"] }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "tags": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" },
 *           "color": { "type": "string" }
 *         }
 *       }
 *     },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "updatedAt": { "type": "string", "format": "date-time" },
 *     "projectId": { "type": "string" },
 *     "publishedAt": { "type": "string", "format": "date-time" }
 *   }
 * }
 * @error 401 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 403 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" },
 *     "details": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "message": { "type": "string" },
 *           "path": { "type": "string" }
 *         }
 *       }
 *     }
 *   }
 * }
 */
export async function PATCH(
    request: Request,
    context: { params: Promise<{ projectId: string; entryId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        const {action, publishedAt} = await request.json();
        const {projectId, entryId} = await (async () => context.params)();

        // Log status update attempt
        try {
            await createAuditLog(
                `CHANGELOG_ENTRY_${action.toUpperCase()}_ATTEMPT`,
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    projectId,
                    entryId,
                    action,
                    userRole: user.role,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create status update attempt audit log:', auditLogError);
        }

        // Verify user has permission
        if (user.role === Role.VIEWER) {
            // Log permission denied
            try {
                await createAuditLog(
                    'CHANGELOG_ENTRY_PERMISSION_DENIED',
                    user.id,
                    user.id, // Use user's own ID to avoid foreign key issues
                    {
                        projectId,
                        entryId,
                        action,
                        userRole: user.role,
                        requiredRole: 'STAFF or ADMIN',
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create permission denied audit log:', auditLogError);
            }

            return NextResponse.json(
                {error: 'Insufficient permissions'},
                {status: 403}
            );
        }

        // First, verify the entry exists and belongs to the project
        const existingEntry = await db.changelogEntry.findFirst({
            where: {
                id: entryId,
                changelog: {
                    projectId: projectId
                }
            },
            include: {
                changelog: {
                    select: {
                        project: {
                            select: {
                                requireApproval: true,
                                allowAutoPublish: true
                            }
                        }
                    }
                }
            }
        });

        if (!existingEntry) {
            // Log entry not found
            try {
                await createAuditLog(
                    'CHANGELOG_ENTRY_NOT_FOUND',
                    user.id,
                    user.id, // Use user's own ID to avoid foreign key issues
                    {
                        action: `${action.toUpperCase()}_ENTRY`,
                        projectId,
                        entryId,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create not found audit log:', auditLogError);
            }

            return NextResponse.json(
                {error: 'Entry not found or does not belong to this project'},
                {status: 404}
            );
        }

        const project = existingEntry.changelog.project;

        // Handle publish/unpublish actions
        if (action === 'publish' || action === 'unpublish') {
            // Allow unpublishing for both ADMIN and STAFF
            if (action === 'unpublish') {
                const entry = await db.changelogEntry.update({
                    where: {id: entryId},
                    data: {
                        publishedAt: null
                    },
                    include: {tags: true}
                });

                // Log successful unpublish
                try {
                    await createAuditLog(
                        'CHANGELOG_ENTRY_UNPUBLISHED',
                        user.id,
                        user.id, // Use user's own ID to avoid foreign key issues
                        {
                            projectId,
                            entryId: entry.id,
                            entryTitle: entry.title,
                            entryVersion: entry.version,
                            userRole: user.role,
                            timestamp: new Date().toISOString()
                        }
                    );
                } catch (auditLogError) {
                    console.error('Failed to create unpublish success audit log:', auditLogError);
                }

                return NextResponse.json(entry);
            }

            // Handle publishing
            if (action === 'publish') {
                // Admins can always publish directly
                if (user.role === Role.ADMIN) {
                    const entry = await db.changelogEntry.update({
                        where: {id: entryId},
                        data: {
                            publishedAt: publishedAt ? new Date(publishedAt) : new Date()
                        },
                        include: {tags: true}
                    });

                    // Log successful admin publish
                    try {
                        await createAuditLog(
                            'CHANGELOG_ENTRY_PUBLISHED',
                            user.id,
                            user.id, // Use user's own ID to avoid foreign key issues
                            {
                                projectId,
                                entryId: entry.id,
                                entryTitle: entry.title,
                                entryVersion: entry.version,
                                userRole: user.role,
                                publishedAt: entry.publishedAt?.toISOString(),
                                timestamp: new Date().toISOString()
                            }
                        );
                    } catch (auditLogError) {
                        console.error('Failed to create admin publish success audit log:', auditLogError);
                    }

                    return NextResponse.json(entry);
                }

                // Staff can publish directly if the project doesn't require approval OR allowAutoPublish is true
                if (user.role === Role.STAFF && (!project.requireApproval || project.allowAutoPublish)) {
                    const entry = await db.changelogEntry.update({
                        where: {id: entryId},
                        data: {
                            publishedAt: publishedAt ? new Date(publishedAt) : new Date()
                        },
                        include: {tags: true}
                    });

                    // Log successful staff direct publish
                    try {
                        await createAuditLog(
                            'CHANGELOG_ENTRY_PUBLISHED',
                            user.id,
                            user.id, // Use user's own ID to avoid foreign key issues
                            {
                                projectId,
                                entryId: entry.id,
                                entryTitle: entry.title,
                                entryVersion: entry.version,
                                userRole: user.role,
                                publishedAt: entry.publishedAt?.toISOString(),
                                projectRequiresApproval: project.requireApproval,
                                projectAllowsAutoPublish: project.allowAutoPublish,
                                timestamp: new Date().toISOString()
                            }
                        );
                    } catch (auditLogError) {
                        console.error('Failed to create staff publish success audit log:', auditLogError);
                    }

                    return NextResponse.json(entry);
                }

                // Staff needs approval if required
                if (project.requireApproval && user.role === Role.STAFF) {
                    // Check for existing pending request
                    const existingRequest = await db.changelogRequest.findFirst({
                        where: {
                            type: 'ALLOW_PUBLISH',
                            changelogEntryId: entryId,
                            status: 'PENDING'
                        }
                    });

                    if (existingRequest) {
                        // Log duplicate request attempt
                        try {
                            await createAuditLog(
                                'CHANGELOG_ENTRY_DUPLICATE_REQUEST',
                                user.id,
                                user.id, // Use user's own ID to avoid foreign key issues
                                {
                                    projectId,
                                    entryId,
                                    requestType: 'ALLOW_PUBLISH',
                                    existingRequestId: existingRequest.id,
                                    timestamp: new Date().toISOString()
                                }
                            );
                        } catch (auditLogError) {
                            console.error('Failed to create duplicate request audit log:', auditLogError);
                        }

                        return NextResponse.json(
                            {error: 'A publish request for this entry is already pending'},
                            {status: 400}
                        );
                    }

                    // Create publish request
                    const publishRequestData: {
                        type: string;
                        staffId: string;
                        projectId: string;
                        changelogEntryId: string;
                        status: string;
                        metadata?: {customPublishedAt: string};
                    } = {
                        type: 'ALLOW_PUBLISH',
                        staffId: user.id,
                        projectId,
                        changelogEntryId: entryId,
                        status: 'PENDING'
                    };

                    // Store custom publishedAt in metadata if provided
                    if (publishedAt) {
                        publishRequestData.metadata = {
                            customPublishedAt: publishedAt
                        };
                    }

                    const publishRequest = await db.changelogRequest.create({
                        data: publishRequestData
                    });

                    // Log successful publish request creation
                    try {
                        await createAuditLog(
                            'CHANGELOG_ENTRY_PUBLISH_REQUEST_CREATED',
                            user.id,
                            user.id, // Use user's own ID to avoid foreign key issues
                            {
                                projectId,
                                entryId,
                                requestId: publishRequest.id,
                                timestamp: new Date().toISOString()
                            }
                        );
                    } catch (auditLogError) {
                        console.error('Failed to create publish request audit log:', auditLogError);
                    }

                    return NextResponse.json({
                        message: 'Publish request created, awaiting admin approval',
                        request: publishRequest
                    }, {status: 202});
                }
            }
        }

        // Log invalid action
        try {
            await createAuditLog(
                'CHANGELOG_ENTRY_INVALID_ACTION',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    projectId,
                    entryId,
                    action,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create invalid action audit log:', auditLogError);
        }

        return NextResponse.json(
            {error: 'Invalid action'},
            {status: 400}
        );
    } catch (error) {
        console.error('Error updating changelog entry status:', error);

        // Log error
        try {
            const {projectId, entryId} = await (async () => context.params)();
            const user = await validateAuthAndGetUser();
            await createAuditLog(
                'CHANGELOG_ENTRY_ERROR',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    action: 'UPDATE_ENTRY_STATUS',
                    projectId,
                    entryId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create error audit log:', auditLogError);
        }

        return NextResponse.json(
            {error: 'Failed to update changelog entry status'},
            {status: 500}
        );
    }
}

/**
 * Delete a changelog entry or create a deletion request
 * @method DELETE
 * @description Deletes a changelog entry if the user is an admin, or creates a deletion request if the user is staff. Requires user authentication and appropriate permissions.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry to delete.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "projectId": { "type": "string" },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "updatedAt": { "type": "string", "format": "date-time" }
 *   }
 * }
 * @response 202 {
 *   "type": "object",
 *   "properties": {
 *     "message": { "type": "string" },
 *     "request": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "type": { "type": "string", "enum": ["DELETE_ENTRY"] },
 *         "status": { "type": "string", "enum": ["PENDING"] },
 *         "staffId": { "type": "string" },
 *         "projectId": { "type": "string" },
 *         "changelogEntryId": { "type": "string" },
 *         "createdAt": { "type": "string", "format": "date-time" }
 *       }
 *     }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 401 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 403 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 500 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 */
export async function DELETE(
    request: Request,
    context: { params: Promise<{ projectId: string; entryId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        const {projectId, entryId} = await (async () => context.params)();

        // Log deletion attempt
        try {
            await createAuditLog(
                'DELETE_CHANGELOG_ENTRY_ATTEMPT',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    projectId,
                    entryId,
                    userRole: user.role,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create deletion attempt audit log:', auditLogError);
        }

        // Verify the entry exists and belongs to the project
        const existingEntry = await db.changelogEntry.findFirst({
            where: {
                id: entryId,
                changelog: {
                    projectId
                }
            },
            include: {
                tags: true
            }
        });

        if (!existingEntry) {
            // Log entry not found
            try {
                await createAuditLog(
                    'CHANGELOG_ENTRY_NOT_FOUND',
                    user.id,
                    user.id, // Use user's own ID to avoid foreign key issues
                    {
                        action: 'DELETE_ENTRY',
                        projectId,
                        entryId,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create not found audit log:', auditLogError);
            }

            return NextResponse.json(
                {error: 'Entry not found or does not belong to this project'},
                {status: 404}
            );
        }

        // Admin can delete directly
        if (user.role === Role.ADMIN) {
            // Save entry details for audit log before deleting
            const entryDetails = {
                id: existingEntry.id,
                title: existingEntry.title,
                content: existingEntry.content?.substring(0, 100) + (existingEntry.content?.length > 100 ? '...' : ''),
                version: existingEntry.version,
                tags: existingEntry.tags.map(tag => tag.name),
                createdAt: existingEntry.createdAt,
                updatedAt: existingEntry.updatedAt,
                publishedAt: existingEntry.publishedAt
            };

            // Perform the deletion
            const entry = await db.changelogEntry.delete({
                where: {id: entryId}
            });

            // Log successful deletion by admin
            try {
                await createAuditLog(
                    'DELETE_CHANGELOG_ENTRY_SUCCESS',
                    user.id,
                    user.id, // Use user's own ID to avoid foreign key issues
                    {
                        projectId,
                        entryId: entryDetails.id,
                        entryTitle: entryDetails.title,
                        entryVersion: entryDetails.version,
                        entryTags: entryDetails.tags,
                        wasPublished: !!entryDetails.publishedAt,
                        userRole: user.role,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create admin deletion success audit log:', auditLogError);
            }

            return NextResponse.json(entry);
        }

        // Staff must create a deletion request
        if (user.role === Role.STAFF) {
            // Check if there's already a pending request
            const existingRequest = await db.changelogRequest.findFirst({
                where: {
                    changelogEntryId: entryId,
                    status: 'PENDING'
                }
            });

            if (existingRequest) {
                // Log duplicate request attempt
                try {
                    await createAuditLog(
                        'CHANGELOG_ENTRY_DUPLICATE_REQUEST',
                        user.id,
                        user.id, // Use user's own ID to avoid foreign key issues
                        {
                            projectId,
                            entryId,
                            requestType: 'DELETE_ENTRY',
                            existingRequestId: existingRequest.id,
                            timestamp: new Date().toISOString()
                        }
                    );
                } catch (auditLogError) {
                    console.error('Failed to create duplicate request audit log:', auditLogError);
                }

                return NextResponse.json(
                    {error: 'A deletion request for this entry is already pending'},
                    {status: 400}
                );
            }

            // Create deletion request
            const deleteRequest = await db.changelogRequest.create({
                data: {
                    type: 'DELETE_ENTRY',
                    staffId: user.id,
                    projectId,
                    changelogEntryId: entryId,
                    status: 'PENDING'
                }
            });

            // Log successful deletion request creation
            try {
                await createAuditLog(
                    'CHANGELOG_ENTRY_DELETION_REQUEST_CREATED',
                    user.id,
                    user.id, // Use user's own ID to avoid foreign key issues
                    {
                        projectId,
                        entryId,
                        entryTitle: existingEntry.title,
                        entryVersion: existingEntry.version,
                        requestId: deleteRequest.id,
                        userRole: user.role,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create deletion request audit log:', auditLogError);
            }

            return NextResponse.json({
                message: 'Deletion request created, awaiting admin approval',
                request: deleteRequest
            }, {status: 202});
        }

        // Handle viewers and other roles
        // Log permission denied
        try {
            await createAuditLog(
                'CHANGELOG_ENTRY_PERMISSION_DENIED',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    projectId,
                    entryId,
                    action: 'DELETE_ENTRY',
                    userRole: user.role,
                    requiredRole: 'STAFF or ADMIN',
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create permission denied audit log:', auditLogError);
        }

        return NextResponse.json(
            {error: 'Insufficient permissions'},
            {status: 403}
        );
    } catch (error) {
        console.error('Error handling changelog entry deletion:', error);

        // Log error
        try {
            const {projectId, entryId} = await (async () => context.params)();
            const user = await validateAuthAndGetUser();
            await createAuditLog(
                'CHANGELOG_ENTRY_ERROR',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    action: 'DELETE_ENTRY',
                    projectId,
                    entryId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create error audit log:', auditLogError);
        }

        return NextResponse.json(
            {error: 'Failed to process deletion request'},
            {status: 500}
        );
    }
}