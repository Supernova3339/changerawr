import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {validateAuthAndGetUser, sendError} from "@/lib/utils/changelog";

/**
 * @method GET
 * @description List all widgets for a project (auth required)
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const {projectId} = await context.params;

        const widgets = await db.widget.findMany({
            where: {projectId},
            orderBy: {createdAt: 'desc'}
        });

        return NextResponse.json({widgets});

    } catch (error) {
        if (error instanceof Error && error.message === 'Authentication required') {
            return sendError('Unauthorized', 401);
        }
        console.error('Failed to list widgets:', error);
        return sendError('Failed to list widgets', 500);
    }
}
