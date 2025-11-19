import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { CatchUpService } from '@/lib/services/projects/catch-up/catch-up.service';
import { z } from 'zod';

const catchUpQuerySchema = z.object({
    since: z.string().optional().default('auto'),
});

/**
 * @method GET
 * @description Get changelog catch-up data for a project since a specified date/version
 * @query {
 *   "type": "object",
 *   "properties": {
 *     "since": {
 *       "type": "string",
 *       "description": "Starting point for catch-up. Can be 'auto' (user's last login), version (e.g. 'v1.2.0'), relative date (e.g. '7d'), or ISO date",
 *       "default": "auto",
 *       "examples": ["auto", "v1.2.0", "7d", "2025-01-01"]
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "fromDate": {
 *       "type": "string",
 *       "format": "date-time",
 *       "description": "The date we started looking from"
 *     },
 *     "fromVersion": {
 *       "type": "string",
 *       "description": "Version we started from (if applicable)",
 *       "nullable": true
 *     },
 *     "toVersion": {
 *       "type": "string",
 *       "description": "Latest version in the range",
 *       "nullable": true
 *     },
 *     "totalEntries": {
 *       "type": "integer",
 *       "description": "Total number of changelog entries found"
 *     },
 *     "summary": {
 *       "type": "object",
 *       "properties": {
 *         "features": { "type": "integer" },
 *         "fixes": { "type": "integer" },
 *         "other": { "type": "integer" }
 *       }
 *     },
 *     "entries": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "title": { "type": "string" },
 *           "content": { "type": "string" },
 *           "version": { "type": "string", "nullable": true },
 *           "publishedAt": { "type": "string", "format": "date-time", "nullable": true },
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
 *     }
 *   }
 * }
 * @error 400 Invalid query parameters
 * @error 401 Unauthorized
 * @error 404 Project not found
 * @error 500 Internal server error
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        const { projectId } = await context.params;
        const { searchParams } = new URL(request.url);

        const queryResult = catchUpQuerySchema.safeParse({
            since: searchParams.get('since'),
        });

        if (!queryResult.success) {
            return NextResponse.json(
                { error: 'Invalid query parameters', details: queryResult.error.errors },
                { status: 400 }
            );
        }

        const { since } = queryResult.data;

        const catchUpData = await CatchUpService.getCatchUpData(
            projectId,
            user.id,
            since
        );

        return NextResponse.json(catchUpData);
    } catch (error) {
        console.error('Error fetching catch-up data:', error);

        if (error instanceof Error && error.message === 'Project not found') {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch catch-up data' },
            { status: 500 }
        );
    }
}