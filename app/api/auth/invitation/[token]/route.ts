import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Handles validation of invitation tokens and returns user data
 * @method GET
 * @description Validates an invitation token and returns the associated user email, role, and expiration date.
 * @body None
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "email": { "type": "string" },
 *     "role": { "type": "string" },
 *     "expiresAt": { "type": "string", "format": "date-time" }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "message": { "type": "string" }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "message": { "type": "string" }
 *   }
 * }
 * @error 500 {
 *   "type": "object",
 *   "properties": {
 *     "message": { "type": "string" }
 *   }
 * }
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    if (!(await params).token) {
        return NextResponse.json(
            { message: 'Token is required' },
            { status: 400 }
        )
    }

    try {
        console.log(`Checking invitation token: ${(await params).token}`)

        const invitation = await db.invitationLink.findUnique({
            where: {
                token: (await params).token
            }
        })

        console.log('Database result:', invitation)

        if (!invitation) {
            return NextResponse.json(
                { message: 'Invitation not found' },
                { status: 404 }
            )
        }

        if (invitation.usedAt) {
            return NextResponse.json(
                { message: 'Invitation has already been used' },
                { status: 400 }
            )
        }

        if (invitation.expiresAt < new Date()) {
            return NextResponse.json(
                { message: 'Invitation has expired' },
                { status: 400 }
            )
        }

        return NextResponse.json({
            email: invitation.email,
            role: invitation.role,
            expiresAt: invitation.expiresAt.toISOString()
        })

    } catch (error) {
        console.error('Server error validating invitation:', error)
        return NextResponse.json(
            { message: 'Error validating invitation' },
            { status: 500 }
        )
    }
}