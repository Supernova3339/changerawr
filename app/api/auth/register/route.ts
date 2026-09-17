import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { checkPasswordBreach, passwordBreachErrorPayload } from '@/lib/services/auth/password-breach'

const registerSchema = z.object({
    token: z.string(),
    name: z.string().min(2),
    password: z.string().min(8),
})

/**
 * @method POST
 * @description Registers a new user using an invitation token
 * @path /api/auth/register
 * @request {json}
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean", "example": true }
 *   }
 * }
 * @error 400 Invalid input - Token, name, or password is missing or invalid
 * @error 400 Invalid or expired invitation
 * @error 409 User already exists
 * @error 500 An unexpected error occurred during registration
 */
export async function POST(request: NextRequest) {
    try {
        // Rate limit: 10 registration attempts per hour per IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown'
        const rateLimit = checkRateLimit(`register:${ip}`, 10, 60 * 60 * 1000)
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many registration attempts. Please try again later.' },
                { status: 429 }
            )
        }

        const body = await request.json()
        const { token, name, password } = registerSchema.parse(body)

        // Reject known-compromised passwords when creating the account
        const breach = await checkPasswordBreach(password)
        if (breach.isBreached) {
            return NextResponse.json(passwordBreachErrorPayload(breach.breachCount), { status: 422 })
        }

        // Start a transaction
        return await db.$transaction(async (tx) => {
            // Find and validate invitation
            const invitation = await tx.invitationLink.findFirst({
                where: {
                    token,
                    usedAt: null,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            })

            if (!invitation) {
                return NextResponse.json(
                    { error: 'Invalid or expired invitation' },
                    { status: 400 }
                )
            }

            // Block registration for system accounts
            if (invitation.email.endsWith('@changerawr.sys')) {
                return NextResponse.json(
                    { error: 'Cannot register with system email addresses' },
                    { status: 400 }
                )
            }

            // Hash password
            const hashedPassword = await hashPassword(password)

            // Check if user already exists
            const existingUser = await tx.user.findFirst({
                where: { email: invitation.email },
            })

            if (existingUser) {
                return NextResponse.json(
                    { error: 'User already exists' },
                    { status: 409 }
                )
            }

            // Create user
            const user = await tx.user.create({
                data: {
                    email: invitation.email,
                    name,
                    password: hashedPassword,
                    role: invitation.role,
                },
            })

            // Mark invitation as used
            await tx.invitationLink.update({
                where: { id: invitation.id },
                data: { usedAt: new Date() },
            })

            // Create default settings
            await tx.settings.create({
                data: {
                    userId: user.id,
                    theme: 'light',
                },
            })

            return NextResponse.json({ success: true })
        })
    } catch (error) {
        console.error('Registration error:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.errors[0]?.message || 'Invalid input' },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Registration failed' },
            { status: 500 }
        )
    }
}