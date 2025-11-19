import {NextResponse} from 'next/server'
import {db} from '@/lib/db'

const ITEMS_PER_PAGE = 10

// Define type for search params
type SortOrder = 'asc' | 'desc'

// Define interfaces for the where conditions
interface BaseWhereClause {
    changelogId: string;
    publishedAt: { not: null };
    OR?: SearchCondition[] | CursorCondition[];
    tags?: {
        some: {
            id: { in: string[] }
        }
    };
}

interface SearchCondition {
    title?: { contains: string; mode: 'insensitive' };
    content?: { contains: string; mode: 'insensitive' };
}

interface CursorCondition {
    publishedAt: { lt: Date } | { gt: Date } | { equals: Date };
    id?: { lt: string } | { gt: string };
}

/**
 * @method GET
 * @description Fetches the changelog entries for a given public project, with filtering, searching and pagination
 * @query {
 *   projectId: String, required
 *   cursor?: String, optional
 *   search?: String, optional - Search in title and content
 *   tags?: String, optional - Comma-separated list of tag IDs
 *   sort?: 'newest'|'oldest', optional - Default is 'newest'
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "project": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "name": { "type": "string" }
 *       }
 *     },
 *     "items": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "title": { "type": "string" },
 *           "content": { "type": "string" },
 *           "version": { "type": "string" },
 *           "publishedAt": { "type": "string", "format": "date-time" },
 *           "tags": {
 *             "type": "array",
 *             "items": {
 *               "type": "object",
 *               "properties": {
 *                 "id": { "type": "string" },
 *                 "name": { "type": "string" },
 *                 "color": { "type": "string", "nullable": true }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     },
 *     "nextCursor": { "type": "string", "nullable": true }
 *   }
 * }
 * @error 400 Invalid request data
 * @error 403 Unauthorized - User does not have 'ADMIN' role or the project is not public
 * @error 404 Project not found
 * @error 500 An unexpected error occurred while fetching the changelog entries
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    return await (async () => {
        try {
            const {params} = context
            const {projectId} = await (async () => params)();
            const {searchParams} = new URL(request.url)

            // Get pagination, search, and filter parameters
            const cursor = searchParams.get('cursor')
            const search = searchParams.get('search')
            const tagsParam = searchParams.get('tags')
            const sortParam = searchParams.get('sort') || 'newest'

            const tagIds = tagsParam ? tagsParam.split(',') : []
            const sortOrder: SortOrder = sortParam === 'oldest' ? 'asc' : 'desc'

            // Get project and changelog
            const project = await db.project.findUnique({
                where: {
                    id: projectId,
                    isPublic: true
                },
                select: {
                    id: true,
                    name: true,
                    changelog: {
                        select: {
                            id: true
                        }
                    },
                    emailConfig: {
                        select: {
                            enabled: true
                        }
                    }
                }
            })

            if (!project?.changelog) {
                return NextResponse.json(
                    {error: 'Changelog not found or not public'},
                    {status: 404}
                )
            }

            // Build base where clause
            const baseWhere: BaseWhereClause = {
                changelogId: project.changelog.id,
                publishedAt: {not: null}
            }

            // Add search condition if present
            if (search) {
                const searchConditions: SearchCondition[] = [
                    {title: {contains: search, mode: 'insensitive'}},
                    {content: {contains: search, mode: 'insensitive'}}
                ]
                baseWhere.OR = searchConditions
            }

            // Add tags filter if present
            if (tagIds.length > 0) {
                baseWhere.tags = {
                    some: {
                        id: {in: tagIds}
                    }
                }
            }

            // Build cursor-based pagination where clause
            let where: BaseWhereClause = {...baseWhere}

            if (cursor) {
                const cursorEntry = await db.changelogEntry.findUnique({
                    where: {id: cursor},
                    select: {publishedAt: true}
                })

                if (cursorEntry?.publishedAt) {
                    // Different cursor logic based on sort order
                    const cursorConditions: CursorCondition[] = sortOrder === 'desc'
                        ? [
                            {publishedAt: {lt: cursorEntry.publishedAt}},
                            {
                                publishedAt: {equals: cursorEntry.publishedAt},
                                id: {lt: cursor}
                            }
                        ]
                        : [
                            {publishedAt: {gt: cursorEntry.publishedAt}},
                            {
                                publishedAt: {equals: cursorEntry.publishedAt},
                                id: {gt: cursor}
                            }
                        ]

                    // Create a new where clause with cursor conditions
                    where = {
                        ...baseWhere,
                        OR: cursorConditions
                    }
                }
            }

            // Get entries with cursor-based pagination
            const entries = await db.changelogEntry.findMany({
                where,
                take: ITEMS_PER_PAGE + 1,
                orderBy: [
                    {publishedAt: sortOrder},
                    {id: sortOrder}
                ],
                select: {
                    id: true,
                    title: true,
                    excerpt: true, // Use excerpt instead of full content for list view
                    version: true,
                    publishedAt: true,
                    createdAt: true,
                    updatedAt: true,
                    tags: {
                        select: {
                            id: true,
                            name: true,
                            color: true
                        }
                    }
                }
            })

            let nextCursor: string | undefined

            // If we got more items than requested, we have a next page
            if (entries.length > ITEMS_PER_PAGE) {
                const nextItem = entries.pop()
                nextCursor = nextItem?.id
            }

            return NextResponse.json({
                project: {
                    id: project.id,
                    name: project.name,
                    emailNotificationsEnabled: project.emailConfig?.enabled || false
                },
                items: entries,
                nextCursor
            })
        } catch (error) {
            console.error('Error fetching changelog entries:', error)
            return NextResponse.json(
                {error: 'Failed to fetch changelog entries'},
                {status: 500}
            )
        }
    })()
}