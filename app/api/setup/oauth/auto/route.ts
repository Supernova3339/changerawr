// app/api/setup/oauth/auto/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
    performAutoOAuthSetup,
    verifyAutoSetupConfiguration,
    getOAuthServerInfo
} from '@/lib/auth/providers/easypanel/auto-setup';
import { isSetupCompleted } from '@/lib/services/core/setup-completion';

/**
 * Schema for validating auto OAuth setup request body.
 */
const autoSetupSchema = z.object({
    appName: z.string().optional(),
    redirectUri: z.string().url().optional(),
    persistent: z.boolean().default(true),
});

/**
 * @method POST
 * @description Automatically create and configure OAuth client with remote server
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "appName": {
 *       "type": "string",
 *       "description": "Optional custom name for the OAuth client"
 *     },
 *     "persistent": {
 *       "type": "boolean",
 *       "default": true,
 *       "description": "Whether the client should persist server restarts"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "client": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "name": { "type": "string" },
 *         "clientId": { "type": "string" },
 *         "redirectUri": { "type": "string" }
 *       }
 *     },
 *     "message": { "type": "string" }
 *   }
 * }
 * @response 400 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean", "example": false },
 *     "error": { "type": "string" },
 *     "details": { "type": "string" }
 *   }
 * }
 * @response 503 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean", "example": false },
 *     "error": { "type": "string", "example": "Auto OAuth setup not available" },
 *     "details": { "type": "string" }
 *   }
 * }
 * @error 400 Validation failed or setup error
 * @error 503 Auto OAuth setup not configured
 * @error 500 Internal server error
 */
export async function POST(request: Request) {
    try {
        // Block access once the wizard has actually been finished
        if (await isSetupCompleted()) {
            return NextResponse.json(
                { success: false, error: 'Setup already completed. Use the admin panel to manage OAuth providers.' },
                { status: 403 }
            )
        }

        console.log('🦖 Auto OAuth setup request received');

        // Check if environment variables are set first
        const serverUrl = process.env.CHR_EPOA2_SERV_URL;
        const apiKey = process.env.CHR_EPOA2_SERV_API_KEY;

        console.log('🦖 Environment check:', {
            hasServerUrl: !!serverUrl,
            hasApiKey: !!apiKey,
            serverUrl: serverUrl ? serverUrl.substring(0, 20) + '...' : 'not set'
        });

        if (!serverUrl || !apiKey) {
            console.log('🦖 Missing environment variables');
            return NextResponse.json(
                {
                    success: false,
                    error: 'Auto OAuth setup not available',
                    details: 'Missing CHR_EPOA2_SERV_URL or CHR_EPOA2_SERV_API_KEY environment variables'
                },
                { status: 503 }
            );
        }

        // Parse and validate request body
        let body;
        try {
            body = await request.json();
            console.log('🦖 Request body received:', body);
        } catch (parseError) {
            console.error('🦖 Failed to parse request body:', parseError);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid JSON in request body',
                    details: parseError instanceof Error ? parseError.message : 'JSON parse error'
                },
                { status: 400 }
            );
        }

        // Validate request data with better error handling
        let validatedData;
        try {
            validatedData = autoSetupSchema.parse(body);
            console.log('🦖 Validated data:', validatedData);
        } catch (validationError) {
            console.error('🦖 Validation failed:', validationError);
            if (validationError instanceof z.ZodError) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Validation failed',
                        details: validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
                        received: body
                    },
                    { status: 400 }
                );
            }
            throw validationError;
        }

        // Perform auto setup
        console.log('🦖 Starting auto setup with options:', validatedData);
        const result = await performAutoOAuthSetup({
            appName: validatedData.appName,
            persistent: validatedData.persistent
        });

        console.log('🦖 Auto setup result:', { success: result.success, error: result.error });

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error,
                    details: result.details
                },
                { status: result.error?.includes('not available') ? 503 : 400 }
            );
        }

        console.log('🦖 Auto setup successful, client created:', result.client?.name);

        return NextResponse.json({
            success: true,
            client: {
                id: result.client!.id,
                name: result.client!.name,
                clientId: result.client!.clientId,
                redirectUri: result.client!.redirectUri
            },
            message: 'OAuth client created and configured successfully'
        });

    } catch (error) {
        console.error('🦖 Auto OAuth setup error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation failed',
                    details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

/**
 * @method GET
 * @description Check auto OAuth setup availability and status
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "available": { "type": "boolean" },
 *     "connected": { "type": "boolean" },
 *     "serverInfo": {
 *       "type": "object",
 *       "properties": {
 *         "serverUrl": { "type": "string" },
 *         "hasApiKey": { "type": "boolean" },
 *         "isConfigured": { "type": "boolean" }
 *       }
 *     },
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 500 Internal server error
 */
export async function GET() {
    try {
        // Block access once the wizard has actually been finished
        if (await isSetupCompleted()) {
            return NextResponse.json({ error: 'Setup already completed' }, { status: 403 })
        }

        // Get server configuration info
        const serverInfo = getOAuthServerInfo();

        // Verify configuration if available
        const verification = await verifyAutoSetupConfiguration();

        return NextResponse.json({
            available: verification.available,
            connected: verification.connected,
            serverInfo,
            error: verification.error
        });

    } catch (error) {
        console.error('Auto OAuth status check error:', error);
        return NextResponse.json(
            {
                available: false,
                connected: false,
                serverInfo: getOAuthServerInfo(),
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}