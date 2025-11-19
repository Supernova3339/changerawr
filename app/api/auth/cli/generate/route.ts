import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {generateCLIAuthCode} from '@/lib/auth/cli-auth';

const generateCodeSchema = z.object({
    callbackUrl: z.string().url('Valid callback URL is required'),
});

/**
 * @method POST
 * @description Generate a temporary authorization code for CLI authentication
 * @body {
 *   "type": "object",
 *   "required": ["callbackUrl"],
 *   "properties": {
 *     "callbackUrl": {
 *       "type": "string",
 *       "format": "uri",
 *       "description": "CLI callback URL for the authorization code"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "code": {
 *       "type": "string",
 *       "description": "Temporary authorization code"
 *     },
 *     "expires": {
 *       "type": "number",
 *       "description": "Expiration timestamp in milliseconds"
 *     },
 *     "expiresAt": {
 *       "type": "string",
 *       "format": "date-time",
 *       "description": "Expiration date in ISO format"
 *     }
 *   }
 * }
 * @error 400 Invalid callback URL
 * @error 401 User not authenticated
 * @error 500 Internal server error
 * @secure cookieAuth
 */
export async function POST(request: NextRequest) {
    try {
        // Validate user authentication (cookie-based)
        const user = await validateAuthAndGetUser();

        // Parse and validate request body
        const body = await request.json();
        const {callbackUrl} = generateCodeSchema.parse(body);

        // Validate that the callback URL is for localhost (security measure)
        const url = new URL(callbackUrl);

        // Skip hostname validation for wwc:// protocol
        if (url.protocol !== 'wwc:') {
            // For other protocols, enforce localhost restriction
            if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
                return NextResponse.json(
                    {error: 'Callback URL must be localhost for security'},
                    {status: 400}
                );
            }
        }
        // wwc:// protocol is allowed through without hostname validation

        // Generate the authorization code
        const authCode = await generateCLIAuthCode(user.id, callbackUrl);

        return NextResponse.json({
            code: authCode.code,
            expires: authCode.expires,
            expiresAt: authCode.expiresAt.toISOString(),
        });

    } catch (error) {
        console.error('CLI auth code generation error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {error: 'Invalid request format', details: error.errors},
                {status: 400}
            );
        }

        if (error instanceof Error && error.message.includes('token')) {
            return NextResponse.json(
                {error: 'Authentication required'},
                {status: 401}
            );
        }

        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        );
    }
}