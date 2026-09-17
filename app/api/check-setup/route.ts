import { NextResponse } from 'next/server'
import { isSetupCompleted } from '@/lib/services/core/setup-completion'

/**
 * This is a special API route that only handles setup status check
 * and implements cache headers to prevent circular requests.
 */
export async function GET(request: Request) {
    const headers = new Headers();

    // Check for the special middleware header to prevent circular requests
    const isMiddlewareCheck = request.headers.get('x-middleware-check') === 'true';

    if (!isMiddlewareCheck) {
        // If not coming from middleware, return 403
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Add cache headers to prevent frequent checks
        headers.set('Cache-Control', 'max-age=5');

        const isComplete = await isSetupCompleted();

        return NextResponse.json(
            { isComplete },
            { headers, status: 200 }
        );
    } catch (error) {
        console.error('Setup check error:', error);

        // Even on error, set cache headers to prevent thundering herd
        headers.set('Cache-Control', 'max-age=1');

        return NextResponse.json(
            { error: 'Failed to check setup status', isComplete: false },
            { headers, status: 500 }
        );
    }
}