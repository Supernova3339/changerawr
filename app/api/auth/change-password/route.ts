// app/api/auth/change-password/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { checkPasswordBreach, passwordBreachErrorPayload } from '@/lib/services/auth/password-breach';
import { z } from 'zod';

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * @method POST
 * @description Changes the password for a logged-in user
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "currentPassword": {
 *       "type": "string",
 *       "description": "User's current password"
 *     },
 *     "newPassword": {
 *       "type": "string",
 *       "minLength": 8,
 *       "description": "User's new password"
 *     }
 *   },
 *   "required": ["currentPassword", "newPassword"]
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" }
 *   }
 * }
 * @error 400 Invalid input - Validation error
 * @error 401 Unauthorized - Invalid current password
 * @error 500 An unexpected error occurred while changing the password
 */
export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser();
        const body = await request.json();
        const { currentPassword, newPassword } = changePasswordSchema.parse(body);

        // Get the user's current password
        const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { password: true }
        });

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Verify current password
        const isValidPassword = await verifyPassword(currentPassword, dbUser.password);
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 401 }
            );
        }

        // Reject known-compromised passwords
        const breach = await checkPasswordBreach(newPassword);
        if (breach.isBreached) {
            return NextResponse.json(passwordBreachErrorPayload(breach.breachCount), { status: 422 });
        }

        // Hash the new password
        const hashedPassword = await hashPassword(newPassword);

        // Update the user's password
        await db.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        // Invalidate all refresh tokens
        await db.refreshToken.updateMany({
            where: { userId: user.id },
            data: { invalidated: true }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Password change error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to change password' },
            { status: 500 }
        );
    }
}