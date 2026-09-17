// app/api/invitations/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { nanoid } from 'nanoid'
import { isSetupCompleted } from '@/lib/services/core/setup-completion'

/**
 * Schema for validating invitation creation request body.
 */
const createInvitationSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    name: z.string().optional(),
    role: z.nativeEnum(Role).default(Role.STAFF),
    expiresInDays: z.number().min(1).max(30).default(7),
})

/**
 * @method POST
 * @description Create a new invitation link for team setup
 * @body {
 *   "type": "object",
 *   "required": ["email"],
 *   "properties": {
 *     "email": {
 *       "type": "string",
 *       "format": "email",
 *       "description": "Email address to invite"
 *     },
 *     "name": {
 *       "type": "string",
 *       "description": "Optional name for the invitee"
 *     },
 *     "role": {
 *       "type": "string",
 *       "enum": ["ADMIN", "STAFF", "VIEWER"],
 *       "default": "STAFF",
 *       "description": "Role to assign to the invited user"
 *     },
 *     "expiresInDays": {
 *       "type": "integer",
 *       "minimum": 1,
 *       "maximum": 30,
 *       "default": 7,
 *       "description": "Number of days until the invitation expires"
 *     }
 *   }
 * }
 * @response 201 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "token": { "type": "string" },
 *     "email": { "type": "string" },
 *     "role": { "type": "string" },
 *     "expiresAt": { "type": "string", "format": "date-time" },
 *     "createdAt": { "type": "string", "format": "date-time" }
 *   }
 * }
 * @error 400 Validation failed - Invalid input data
 * @error 409 Invitation already exists for this email
 * @error 500 An unexpected error occurred
 */
export async function POST(request: Request) {
    try {
        // Block access once the wizard has actually been finished
        if (await isSetupCompleted()) {
            return NextResponse.json(
                { error: 'Setup already completed. Use the admin panel to manage invitations.' },
                { status: 403 }
            )
        }

        // Validate request data
        const body = await request.json()
        const validatedData = createInvitationSchema.parse(body)

        // Check if invitation already exists for this email
        const existingInvitation = await db.invitationLink.findFirst({
            where: {
                email: validatedData.email,
                usedAt: null, // Only unused invitations
                expiresAt: {
                    gt: new Date() // Not expired
                }
            }
        })

        if (existingInvitation) {
            return NextResponse.json(
                { error: 'An active invitation already exists for this email' },
                { status: 409 }
            )
        }

        // Calculate expiration date
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + validatedData.expiresInDays)

        // Generate unique token
        const token = nanoid(32)

        // For setup phase, we'll use a system user ID or the first admin
        // This is a temporary solution for the setup phase
        let createdBy = 'system'

        // Try to find the first admin user
        const firstAdmin = await db.user.findFirst({
            where: { role: Role.ADMIN },
            select: { id: true }
        })

        if (firstAdmin) {
            createdBy = firstAdmin.id
        }

        // Create invitation
        const invitation = await db.invitationLink.create({
            data: {
                token,
                email: validatedData.email,
                role: validatedData.role,
                createdBy,
                expiresAt
            },
            select: {
                id: true,
                token: true,
                email: true,
                role: true,
                expiresAt: true,
                createdAt: true
            }
        })

        return NextResponse.json(invitation, { status: 201 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                },
                { status: 400 }
            )
        }

        console.error('Invitation creation error:', error)
        return NextResponse.json(
            { error: 'An unexpected error occurred while creating invitation' },
            { status: 500 }
        )
    }
}

/**
 * @method GET
 * @description List all active invitations (for admin use)
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "invitations": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "email": { "type": "string" },
 *           "role": { "type": "string" },
 *           "expiresAt": { "type": "string", "format": "date-time" },
 *           "createdAt": { "type": "string", "format": "date-time" },
 *           "usedAt": { "type": "string", "format": "date-time", "nullable": true }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 500 An unexpected error occurred
 */
export async function GET() {
    try {
        // Block access once the wizard has actually been finished
        if (await isSetupCompleted()) {
            return NextResponse.json(
                { error: 'Setup already completed. Use the admin panel to manage invitations.' },
                { status: 403 }
            )
        }

        const invitations = await db.invitationLink.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                expiresAt: true,
                createdAt: true,
                usedAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json({ invitations })
    } catch (error) {
        console.error('Error fetching invitations:', error)
        return NextResponse.json(
            { error: 'An unexpected error occurred while fetching invitations' },
            { status: 500 }
        )
    }
}