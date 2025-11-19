import {NextResponse} from 'next/server';
import {z} from 'zod';
import {createPasswordResetAndSendEmail} from '@/lib/services/auth/password-reset';

// Validation schema for forgot password request
const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

/**
 * @method POST
 * @description Initiates the password reset process by sending a reset email
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "email": {
 *       "type": "string",
 *       "format": "email",
 *       "description": "User's email address"
 *     }
 *   },
 *   "required": ["email"]
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": {
 *       "type": "boolean"
 *     },
 *     "message": {
 *       "type": "string"
 *     }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Invalid email format"
 *     }
 *   }
 * }
 * @error 500 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Failed to initiate password reset"
 *     }
 *   }
 * }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {email} = forgotPasswordSchema.parse(body);

        // Skip system emails
        if (email.toLowerCase().endsWith('@changerawr.sys')) {
            return NextResponse.json({
                success: true,
                message: "If an account with this email exists, a password reset link has been sent."
            });
        }

        await createPasswordResetAndSendEmail({email});

        // Always return success even if user doesn't exist (for security)
        return NextResponse.json({
            success: true,
            message: "If an account with this email exists, a password reset link has been sent."
        });
    } catch (error) {
        console.error('Password reset error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {error: 'Invalid email format'},
                {status: 400}
            );
        }

        return NextResponse.json(
            {error: 'Failed to initiate password reset'},
            {status: 500}
        );
    }
}
