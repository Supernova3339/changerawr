import { NextResponse } from "next/server"
import { countRealUsers } from "@/lib/services/core/system-user/service"
import { isSetupCompleted } from "@/lib/services/core/setup-completion"
import { db } from "@/lib/db"

/**
 * @method GET
 * @description Checks if the initial setup has been completed and provides setup state information
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "isComplete": {
 *       "type": "boolean",
 *       "description": "Indicates whether the setup has been completed"
 *     },
 *     "setupState": {
 *       "type": "object",
 *       "properties": {
 *         "adminCreated": { "type": "boolean" },
 *         "systemConfigured": { "type": "boolean" },
 *         "oauthConfigured": { "type": "boolean" }
 *       }
 *     }
 *   }
 * }
 * @error 500 An unexpected error occurred while checking setup status
 */
export async function GET() {
    try {
        // Add cache headers to prevent frequent checks
        const responseHeaders = new Headers();
        responseHeaders.set('Cache-Control', 'max-age=5');

        // Check if any *non-system* user exists
        const userCount = await countRealUsers();

        // Check if system configuration exists
        const systemConfig = await db.systemConfig.findFirst();

        // Check if any OAuth providers are configured
        const oauthProviders = await db.oAuthProvider.count();

        // Determine if setup is complete — must be the wizard's own completion
        // marker, not "admin + settings exist," since the oauth/team steps
        // still need to be reachable after settings is configured.
        const isComplete = await isSetupCompleted();

        return NextResponse.json({
            isComplete,
            setupState: {
                adminCreated: userCount > 0,
                systemConfigured: !!systemConfig,
                oauthConfigured: oauthProviders > 0
            }
        }, {
            status: 200,
            headers: responseHeaders
        });
    } catch (error) {
        console.error('Setup status check error:', error);

        // Even on error, set cache headers to prevent thundering herd
        const responseHeaders = new Headers();
        responseHeaders.set('Cache-Control', 'max-age=1');

        return NextResponse.json(
            {
                error: 'Failed to check setup status',
                isComplete: false,
                setupState: {
                    adminCreated: false,
                    systemConfigured: false,
                    oauthConfigured: false
                }
            },
            {
                status: 500,
                headers: responseHeaders
            }
        );
    }
}