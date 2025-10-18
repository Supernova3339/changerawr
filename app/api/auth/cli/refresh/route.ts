import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { refreshCLIAccessToken } from '@/lib/auth/tokens';

const refreshSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * @method POST
 * @description Refresh CLI access token using refresh token
 * @body {
 *   "type": "object",
 *   "required": ["refreshToken"],
 *   "properties": {
 *     "refreshToken": {
 *       "type": "string",
 *       "description": "Refresh token from previous authentication"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "access_token": {
 *       "type": "string",
 *       "description": "New JWT access token"
 *     },
 *     "refresh_token": {
 *       "type": "string",
 *       "description": "New JWT refresh token"
 *     },
 *     "expires_in": {
 *       "type": "number",
 *       "description": "Access token expiration time in seconds"
 *     },
 *     "token_type": {
 *       "type": "string",
 *       "example": "Bearer"
 *     },
 *     "user": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "email": { "type": "string" },
 *         "name": { "type": "string" },
 *         "role": { "type": "string" }
 *       }
 *     }
 *   }
 * }
 * @response 400 - Invalid refresh token
 * @response 401 - Expired or revoked refresh token
 * @response 500 - Internal server error
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { refreshToken } = refreshSchema.parse(body);

        // Attempt to refresh the access token
        const result = await refreshCLIAccessToken(refreshToken);

        if (!result) {
            return NextResponse.json(
                { error: 'Invalid or expired refresh token' },
                { status: 401 }
            );
        }

        // Return new tokens in OAuth2-compatible format
        // 30 days = 30 * 24 * 60 * 60 = 2,592,000 seconds
        return NextResponse.json({
            access_token: result.accessToken,
            refresh_token: result.refreshToken,
            expires_in: 30 * 24 * 60 * 60, // 30 days in seconds
            token_type: 'Bearer',
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                role: result.user.role,
            },
        });

    } catch (error) {
        console.error('CLI token refresh error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request format', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}