// app/api/setup/oauth/debug/route.ts
import { NextResponse } from 'next/server';
import {
    getOAuthServerInfo
} from '@/lib/auth/providers/easypanel/auto-setup';
import {isAutoOAuthAvailable} from "@/lib/auth/providers/easypanel/client";
import { isSetupCompleted } from '@/lib/services/core/setup-completion';

/**
 * @method GET
 * @description Debug endpoint to check OAuth auto setup configuration
 * @response 200 Debug information about OAuth setup
 */
export async function GET() {
    try {
        // Only accessible during initial setup
        if (await isSetupCompleted()) {
            return NextResponse.json({ error: 'Setup already completed' }, { status: 403 })
        }

        const serverInfo = getOAuthServerInfo();
        const isAvailable = isAutoOAuthAvailable();

        // Get environment variables (safely)
        const envVars = {
            CHR_EPOA2_SERV_URL: process.env.CHR_EPOA2_SERV_URL ?
                `${process.env.CHR_EPOA2_SERV_URL.substring(0, 20)}...` : 'not set',
            CHR_EPOA2_SERV_API_KEY: process.env.CHR_EPOA2_SERV_API_KEY ?
                `${process.env.CHR_EPOA2_SERV_API_KEY.substring(0, 8)}...` : 'not set',
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set'
        };

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            autoSetupAvailable: isAvailable,
            serverInfo,
            environmentVariables: envVars,
            callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/callback/easypanel`,
            diagnostics: {
                hasServerUrl: !!process.env.CHR_EPOA2_SERV_URL,
                hasApiKey: !!process.env.CHR_EPOA2_SERV_API_KEY,
                hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL
            }
        });

    } catch (error) {
        return NextResponse.json({
            error: 'Debug endpoint failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

/**
 * @method POST
 * @description Test the auto setup schema validation
 */
export async function POST(request: Request) {
    try {
        // Only accessible during initial setup
        if (await isSetupCompleted()) {
            return NextResponse.json({ success: false, error: 'Setup already completed' }, { status: 403 })
        }

        const body = await request.json();

        // Import the schema from the main route
        const { z } = await import('zod');

        const testSchema = z.object({
            appName: z.string().optional().or(z.literal('')).transform(val => val || undefined),
            redirectUri: z.string().url().optional().or(z.literal('')).transform(val => val || undefined),
            persistent: z.boolean().optional().default(true),
        }).transform(data => ({
            appName: data.appName,
            redirectUri: data.redirectUri,
            persistent: data.persistent ?? true
        }));

        const validated = testSchema.parse(body);

        return NextResponse.json({
            success: true,
            receivedBody: body,
            validatedData: validated,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown validation error',
            receivedBody: await request.json().catch(() => 'Failed to parse body'),
            timestamp: new Date().toISOString()
        }, { status: 400 });
    }
}