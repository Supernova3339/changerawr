import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { createAuditLog } from '@/lib/utils/auditLog';
import { db } from '@/lib/db';
import { z } from 'zod';
import { nanoid } from 'nanoid';

// Validation schemas
const createInvitationSchema = z.object({
    email: z.string().toLowerCase().email(),
    role: z.enum(['ADMIN', 'STAFF']),
    expiresAt: z.string().datetime().optional()
});

/**
 * @method GET
 * @description Retrieves a list of users with their email, name, role, creation date, and last login date.
 * Only admins have access to this endpoint.
 * @path /api/users
 * @response 200 {
 *   "type": "array",
 *   "items": {
 *     "type": "object",
 *     "properties": {
 *       "id": { "type": "string" },
 *       "email": { "type": "string" },
 *       "name": { "type": "string" },
 *       "role": { "type": "string" },
 *       "createdAt": { "type": "string", "format": "date-time" },
 *       "lastLoginAt": { "type": "string", "format": "date-time" }
 *     }
 *   }
 * }
 * @error 401 Unauthorized - User not authorized to access this endpoint
 * @error 500 An unexpected error occurred while fetching users
 */
export async function GET() {
    try {
        const user = await validateAuthAndGetUser();

        // Only admins can list users
        if (user.role !== 'ADMIN') {
            return new NextResponse(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 403 }
            );
        }

        const users = await db.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                lastLoginAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Get metrics for the audit log
        const userMetrics = {
            userCount: users.length || 0,
            adminCount: users.filter(u => u.role === 'ADMIN').length,
            staffCount: users.filter(u => u.role === 'STAFF').length,
            newUsersLast30Days: users.filter(u => {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return u.createdAt > thirtyDaysAgo;
            }).length
        };

        // Log the action of viewing users
        try {
            await createAuditLog(
                'VIEW_USERS_LIST',
                user.id,
                user.id, // Using admin's own ID to avoid foreign key issues
                userMetrics
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
            // Continue execution even if audit log creation fails
        }

        return new NextResponse(JSON.stringify(users), { status: 200 });
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return new NextResponse(
            JSON.stringify({ error: 'Failed to fetch users' }),
            { status: 500 }
        );
    }
}

/**
 * @method POST
 * @description Creates an invitation link for user registration.
 * Only admins have access to this endpoint.
 * @path /api/invitations
 * @request {json}
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "message": { "type": "string" },
 *     "invitation": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "email": { "type": "string" },
 *         "role": { "type": "string" },
 *         "expiresAt": { "type": "string", "format": "date-time" },
 *         "url": { "type": "string" }
 *       }
 *     }
 *   }
 * }
 * @error 400 Invalid input - Email or role is missing or invalid
 * @error 400 An active invitation already exists for this email
 * @error 500 An unexpected error occurred while creating the invitation link
 */
export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser();

        // Only admins can create invitation links
        if (user.role !== 'ADMIN') {
            return new NextResponse(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 403 }
            );
        }

        const body = await request.json();
        const validatedData = createInvitationSchema.parse(body);

        // Prevent inviting system emails
        if (validatedData.email.endsWith('@changerawr.sys')) {
            // Log attempted invitation of system email
            try {
                await createAuditLog(
                    'INVALID_INVITATION_ATTEMPT',
                    user.id,
                    user.id,
                    {
                        reason: 'System email address',
                        attemptedEmail: validatedData.email
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return new NextResponse(
                JSON.stringify({ error: 'Cannot invite system email addresses' }),
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await db.user.findUnique({
            where: { email: validatedData.email }
        });

        if (existingUser) {
            // Log attempted invitation of existing user
            try {
                await createAuditLog(
                    'INVALID_INVITATION_ATTEMPT',
                    user.id,
                    existingUser.id, // This is a valid user ID so we can use it
                    {
                        reason: 'User already exists',
                        attemptedEmail: validatedData.email
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return new NextResponse(
                JSON.stringify({ error: 'User with this email already exists' }),
                { status: 400 }
            );
        }

        // Check for existing active invitation
        const existingInvitation = await db.invitationLink.findFirst({
            where: {
                email: validatedData.email,
                usedAt: null,
                expiresAt: {
                    gt: new Date()
                }
            }
        });

        if (existingInvitation) {
            // Log attempted duplicate invitation
            try {
                await createAuditLog(
                    'INVALID_INVITATION_ATTEMPT',
                    user.id,
                    user.id, // Using admin's own ID to avoid foreign key issues
                    {
                        reason: 'Active invitation already exists',
                        attemptedEmail: validatedData.email,
                        existingInvitationId: existingInvitation.id,
                        existingExpiresAt: existingInvitation.expiresAt.toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return new NextResponse(
                JSON.stringify({ error: 'An active invitation already exists for this email' }),
                { status: 400 }
            );
        }

        // Generate invitation token and set expiration
        const token = nanoid(32);
        const expiresAt = validatedData.expiresAt
            ? new Date(validatedData.expiresAt)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

        // Create invitation link
        const invitationLink = await db.invitationLink.create({
            data: {
                email: validatedData.email,
                token,
                role: validatedData.role,
                expiresAt,
                createdBy: user.id
            }
        });

        // Create the full invitation URL
        const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register/${token}`;

        // Create audit log for invitation creation
        try {
            await createAuditLog(
                'CREATE_INVITATION',
                user.id,
                user.id, // Using admin's own ID to avoid foreign key issues
                {
                    invitationId: invitationLink.id,
                    invitationEmail: invitationLink.email,
                    invitationRole: invitationLink.role,
                    expiresAt: invitationLink.expiresAt.toISOString(),
                    tokenLength: token.length
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
            // Continue execution even if audit log creation fails
        }

        return new NextResponse(
            JSON.stringify({
                message: 'Invitation link created successfully',
                invitation: {
                    id: invitationLink.id,
                    email: invitationLink.email,
                    role: invitationLink.role,
                    expiresAt: invitationLink.expiresAt,
                    url: invitationUrl
                }
            }),
            { status: 200 }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Log validation error
            try {
                const user = await validateAuthAndGetUser();
                await createAuditLog(
                    'INVITATION_VALIDATION_ERROR',
                    user.id,
                    user.id, // Using admin's own ID to avoid foreign key issues
                    {
                        errors: error.errors
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return new NextResponse(
                JSON.stringify({ error: 'Invalid request data', details: error.errors }),
                { status: 400 }
            );
        }

        console.error('Failed to create invitation link:', error);
        return new NextResponse(
            JSON.stringify({ error: 'Failed to create invitation link' }),
            { status: 500 }
        );
    }
}