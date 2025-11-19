import { NextResponse } from 'next/server'
import { validateAuthAndGetUser, generateExcerpt } from '@/lib/utils/changelog'
import { createAuditLog } from '@/lib/utils/auditLog' // Add this import
import { db } from '@/lib/db'

/**
 * @method GET
 * @description Fetches the changelog entries for a given project
 * @query {
 *   projectId: String, required
 *   search?: String, optional
 *   tag?: String, optional
 *   startDate?: String, optional
 *   endDate?: String, optional
 *   page?: Number, optional
 *   limit?: Number, optional
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "entries": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "title": { "type": "string" },
 *           "content": { "type": "string" },
 *           "version": { "type": "number" },
 *           "createdAt": { "type": "string", "format": "date-time" },
 *           "tags": {
 *             "type": "array",
 *             "items": {
 *               "type": "object",
 *               "properties": {
 *                 "id": { "type": "string" },
 *                 "name": { "type": "string" }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     },
 *     "pagination": {
 *       "page": { "type": "number" },
 *       "limit": { "type": "number" },
 *       "total": { "type": "number" },
 *       "totalPages": { "type": "number" }
 *     }
 *   }
 * }
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 404 Project not found
 * @error 500 An unexpected error occurred while fetching the changelog entries
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params
        const user = await validateAuthAndGetUser()
        const { searchParams } = new URL(request.url)

        // Get query parameters
        const search = searchParams.get('search')
        const tag = searchParams.get('tag')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const skip = (page - 1) * limit

        // Log the changelog view attempt
        try {
            await createAuditLog(
                'VIEW_CHANGELOG_ATTEMPT',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    projectId,
                    filters: {
                        search: search || null,
                        tag: tag || null,
                        startDate: startDate || null,
                        endDate: endDate || null,
                        page,
                        limit
                    },
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create view attempt audit log:', auditLogError);
        }

        // First get the changelog for this project
        const changelog = await db.changelog.findUnique({
            where: { projectId }
        })

        if (!changelog) {
            // Log changelog not found error
            try {
                await createAuditLog(
                    'CHANGELOG_NOT_FOUND',
                    user.id,
                    user.id, // Use user's own ID to avoid foreign key issues
                    {
                        projectId,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create not found audit log:', auditLogError);
            }

            return NextResponse.json(
                { error: 'Changelog not found' },
                { status: 404 }
            )
        }

        // Build where clause for filtering
        const where = {
            changelogId: changelog.id,
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' as const } },
                    { content: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
            ...(tag && {
                tags: {
                    some: {
                        name: tag
                    }
                }
            }),
            ...(startDate && endDate && {
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            })
        }

        // Get entries with pagination
        const [entries, total] = await Promise.all([
            db.changelogEntry.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    excerpt: true, // Use excerpt instead of full content for list view
                    version: true,
                    publishedAt: true,
                    scheduledAt: true,
                    createdAt: true,
                    updatedAt: true,
                    tags: {
                        select: {
                            id: true,
                            name: true,
                            color: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit
            }),
            db.changelogEntry.count({ where })
        ])

        // Get all tags used in this project's changelog
        const tags = await db.changelogTag.findMany({
            where: {
                entries: {
                    some: {
                        changelogId: changelog.id
                    }
                }
            }
        })

        // Log the successful changelog view
        try {
            await createAuditLog(
                'VIEW_CHANGELOG_SUCCESS',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    projectId,
                    changelogId: changelog.id,
                    entriesCount: entries.length,
                    totalEntries: total,
                    tagsCount: tags.length,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create view success audit log:', auditLogError);
        }

        return NextResponse.json({
            entries,
            tags,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Error fetching changelog:', error)

        // Log error in fetching changelog
        try {
            const { projectId } = await params;
            const user = await validateAuthAndGetUser();
            await createAuditLog(
                'CHANGELOG_ERROR',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    action: 'VIEW_CHANGELOG',
                    projectId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create error audit log:', auditLogError);
        }

        return NextResponse.json(
            { error: 'Failed to fetch changelog' },
            { status: 500 }
        )
    }
}

/**
 * @method POST
 * @description Creates a new changelog entry for a given project
 * @query {
 *   projectId: String, required
 * }
 * @body {
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
 *           "name": { "type": "string" }
 *         }
 *       }
 *     }
 *   },
 *   "required": [
 *     "title",
 *     "content",
 *     "version",
 *     "tags"
 *   ]
 * }
 * @response 201 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "tags": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 404 Project not found
 * @error 500 An unexpected error occurred while creating the changelog entry
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser()
        const projectId = (await params).projectId;
        const requestBody = await request.json();
        const { title, content, version, tags } = requestBody;

        // Log the changelog entry creation attempt
        try {
            await createAuditLog(
                'CREATE_CHANGELOG_ENTRY_ATTEMPT',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    projectId,
                    entryTitle: title,
                    entryVersion: version,
                    tagCount: tags?.length || 0,
                    contentLength: content?.length || 0,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create attempt audit log:', auditLogError);
        }

        // Get the changelog for this project
        const changelog = await db.changelog.findUnique({
            where: { projectId }
        })

        if (!changelog) {
            // Log changelog not found error
            try {
                await createAuditLog(
                    'CHANGELOG_NOT_FOUND',
                    user.id,
                    user.id, // Use user's own ID to avoid foreign key issues
                    {
                        action: 'CREATE_CHANGELOG_ENTRY',
                        projectId,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create not found audit log:', auditLogError);
            }

            return NextResponse.json(
                { error: 'Changelog not found' },
                { status: 404 }
            )
        }

        // Check for entry with same version
        const existingEntry = await db.changelogEntry.findFirst({
            where: {
                changelogId: changelog.id,
                version
            }
        });

        if (existingEntry) {
            // Log version conflict error
            try {
                await createAuditLog(
                    'CHANGELOG_VERSION_CONFLICT',
                    user.id,
                    user.id, // Use user's own ID to avoid foreign key issues
                    {
                        projectId,
                        changelogId: changelog.id,
                        conflictingVersion: version,
                        existingEntryId: existingEntry.id,
                        existingEntryTitle: existingEntry.title,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create version conflict audit log:', auditLogError);
            }

            return NextResponse.json(
                { error: `Entry with version ${version} already exists` },
                { status: 409 }
            )
        }

        // Create the entry with its tags
        const entry = await db.changelogEntry.create({
            data: {
                title,
                content,
                excerpt: generateExcerpt(content), // Auto-generate excerpt from content
                version,
                changelogId: changelog.id,
                tags: {
                    connectOrCreate: tags.map((tag: { id?: string; name: string }) => ({
                        where: {
                            // If we have an ID, use it; otherwise use the name
                            id: tag.id || undefined,
                            name: !tag.id ? tag.name : undefined
                        },
                        create: {
                            name: tag.name
                        }
                    }))
                }
            },
            include: {
                tags: true
            }
        })

        // Log the successful changelog entry creation
        try {
            await createAuditLog(
                'CREATE_CHANGELOG_ENTRY_SUCCESS',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    projectId,
                    changelogId: changelog.id,
                    entryId: entry.id,
                    entryTitle: entry.title,
                    entryVersion: entry.version,
                    tags: entry.tags.map(tag => tag.name),
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create success audit log:', auditLogError);
        }

        return NextResponse.json(entry, { status: 201 })
    } catch (error) {
        console.error('Error creating changelog entry:', error)

        // Log error in creating changelog entry
        try {
            const projectId = (await params).projectId;
            const user = await validateAuthAndGetUser();
            await createAuditLog(
                'CHANGELOG_ERROR',
                user.id,
                user.id, // Use user's own ID to avoid foreign key issues
                {
                    action: 'CREATE_CHANGELOG_ENTRY',
                    projectId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create error audit log:', auditLogError);
        }

        return NextResponse.json(
            { error: 'Failed to create changelog entry' },
            { status: 500 }
        )
    }
}