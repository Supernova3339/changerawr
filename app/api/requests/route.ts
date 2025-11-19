import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';

/**
 * @method GET
 * @description Retrieves changelog requests for the current user
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "requests": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "type": { "type": "string" },
 *           "status": { "type": "string" },
 *           "createdAt": { "type": "string", "format": "date-time" },
 *           "reviewedAt": { "type": "string", "format": "date-time" },
 *           "project": {
 *             "type": "object",
 *             "properties": {
 *               "id": { "type": "string" },
 *               "name": { "type": "string" }
 *             }
 *           },
 *           "entry": {
 *             "type": "object",
 *             "properties": {
 *               "id": { "type": "string" },
 *               "title": { "type": "string" }
 *             }
 *           },
 *           "tag": {
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
 * @error 401 Unauthorized - Please log in
 * @error 500 Internal Server Error
 * @secure cookieAuth
 */
export async function GET() {
    try {
        // Validate authentication
        const user = await validateAuthAndGetUser();

        if (!user) {
            return NextResponse.json(
                {error: 'Unauthorized'},
                {status: 401}
            );
        }

        // Fetch requests for the current user
        const requests = await db.changelogRequest.findMany({
            where: {
                staffId: user.id
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                ChangelogEntry: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                ChangelogTag: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                admin: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({requests});
    } catch (error) {
        console.error('Error fetching requests:', error);
        return NextResponse.json(
            {error: 'Failed to fetch requests'},
            {status: 500}
        );
    }
}