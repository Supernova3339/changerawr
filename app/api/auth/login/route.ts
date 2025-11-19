import {NextRequest, NextResponse} from 'next/server'
import bcrypt from 'bcryptjs'
import {z} from 'zod'
import {generateTokens} from '@/lib/auth/tokens'
import {db} from '@/lib/db'
import {createAuditLog} from '@/lib/utils/auditLog'
import {checkPasswordBreach} from '@/lib/services/auth/password-breach'

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    bypassBreachWarning: z.boolean().optional() // For when user chooses to continue despite breach
})

type RequestBody = z.infer<typeof loginSchema>

/**
 * @method POST
 * @description Authenticates user with email and password, checks for password breach
 * @body {
 *   "type": "object",
 *   "required": ["email", "password"],
 *   "properties": {
 *     "email": {
 *       "type": "string",
 *       "format": "email",
 *       "description": "User's email address"
 *     },
 *     "password": {
 *       "type": "string",
 *       "description": "User's password"
 *     },
 *     "bypassBreachWarning": {
 *       "type": "boolean",
 *       "description": "Whether to bypass password breach warning"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "user": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "email": { "type": "string" },
 *         "name": { "type": "string" },
 *         "role": { "type": "string" },
 *         "lastLoginAt": { "type": "string", "format": "date-time" }
 *       }
 *     },
 *     "accessToken": { "type": "string" },
 *     "refreshToken": { "type": "string" }
 *   }
 * }
 * @response 422 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string", "example": "password_breached" },
 *     "message": { "type": "string" },
 *     "breachCount": { "type": "number" },
 *     "resetUrl": { "type": "string" }
 *   }
 * }
 * @error 400 Validation failed - Invalid input format
 * @error 401 Unauthorized - Invalid credentials
 * @error 500 Internal server error
 * @secure cookieAuth
 */
export async function POST(request: NextRequest) {
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    let attemptLogId: string | undefined
    let userId: string | undefined

    try {
        const body: RequestBody = await request.json()

        // Validate input
        const {email, password, bypassBreachWarning} = loginSchema.parse(body)

        // Block login for system accounts
        if (email.endsWith('@changerawr.sys')) {
            try {
                await createAuditLog(
                    'LOGIN_FAILURE',
                    null,
                    null,
                    {
                        reason: 'SYSTEM_ACCOUNT_LOGIN_BLOCKED',
                        email,
                        ipAddress,
                        userAgent,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create system account block audit log:', auditLogError);
            }

            await bcrypt.compare(password, '$2a$12$dummy.hash.to.prevent.timing.attacks.with.enough.length.to.be.realistic')

            return NextResponse.json(
                {error: 'Invalid credentials'},
                {status: 401}
            )
        }

        // Create login attempt log
        try {
            const attemptLog = await createAuditLog(
                'LOGIN_ATTEMPT',
                null, // No user ID available yet
                null, // No target user ID
                {
                    email: body.email,
                    ipAddress,
                    userAgent,
                    timestamp: new Date().toISOString(),
                    bypassBreachWarning: bypassBreachWarning || false
                }
            );
            attemptLogId = attemptLog?.id;
        } catch (auditLogError) {
            console.error('Failed to create login attempt audit log:', auditLogError);
            // Continue with the login process even if audit logging fails
        }

        // Find user and include the necessary fields
        const user = await db.user.findUnique({
            where: {email},
            select: {
                id: true,
                email: true,
                password: true,
                name: true,
                role: true,
                lastLoginAt: true,
                twoFactorMode: true, // this will eventually be reworked
            },
        })

        if (!user) {
            // User not found - log the failed login attempt
            try {
                await createAuditLog(
                    'LOGIN_FAILURE',
                    null, // No user ID available
                    null, // No target user ID
                    {
                        reason: 'USER_NOT_FOUND',
                        email,
                        ipAddress,
                        userAgent,
                        timestamp: new Date().toISOString(),
                        attemptLogId
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create login failure audit log:', auditLogError);
            }

            // Simulate password check to prevent timing attacks
            await bcrypt.compare(password, '$2a$12$dummy.hash.to.prevent.timing.attacks.with.enough.length.to.be.realistic')

            return NextResponse.json(
                {error: 'Invalid credentials'},
                {status: 401}
            )
        }

        userId = user.id

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password)

        if (!isValidPassword) {
            // Invalid password - log the failed login attempt
            try {
                await createAuditLog(
                    'LOGIN_FAILURE',
                    user.id,
                    user.id,
                    {
                        reason: 'INVALID_PASSWORD',
                        email,
                        ipAddress,
                        userAgent,
                        timestamp: new Date().toISOString(),
                        attemptLogId
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create login failure audit log:', auditLogError);
            }

            return NextResponse.json(
                {error: 'Invalid credentials'},
                {status: 401}
            )
        }

        // Check if password has been breached (only if not bypassing)
        if (!bypassBreachWarning) {
            const breachResult = await checkPasswordBreach(password);

            if (breachResult.isBreached) {
                // Log the breach detection
                try {
                    await createAuditLog(
                        'PASSWORD_BREACH_DETECTED',
                        user.id,
                        user.id,
                        {
                            email,
                            breachCount: breachResult.breachCount,
                            ipAddress,
                            userAgent,
                            timestamp: new Date().toISOString(),
                            attemptLogId
                        }
                    );
                } catch (auditLogError) {
                    console.error('Failed to create breach detection audit log:', auditLogError);
                }

                // Return breach warning instead of logging in
                return NextResponse.json(
                    {
                        error: 'password_breached',
                        message: `Your password has been found in ${breachResult.breachCount.toLocaleString()} data breach${breachResult.breachCount === 1 ? '' : 'es'}. We recommend changing it for better security.`,
                        breachCount: breachResult.breachCount,
                        resetUrl: '/forgot-password'
                    },
                    {status: 422} // Unprocessable Entity
                )
            }
        }

        // Update user's last login timestamp
        await db.user.update({
            where: {id: user.id},
            data: {lastLoginAt: new Date()},
        })

        // Generate tokens
        const tokens = await generateTokens(user.id)
        if (!tokens) {
            throw new Error('Failed to generate authentication tokens')
        }

        // Update attempt log with successful user ID if we created one
        if (attemptLogId) {
            try {
                await db.auditLog.update({
                    where: {id: attemptLogId},
                    data: {
                        userId: user.id,
                        targetUserId: user.id
                    }
                });
            } catch (updateError) {
                console.error('Failed to update login attempt audit log with user ID:', updateError);
                // This is not critical, continue
            }
        }

        // Log successful login
        try {
            await createAuditLog(
                'LOGIN_SUCCESS',
                user.id,
                user.id,
                {
                    email: user.email,
                    role: user.role,
                    ipAddress,
                    userAgent,
                    timestamp: new Date().toISOString(),
                    tokenGenerated: true,
                    lastLoginAt: user.lastLoginAt?.toISOString(),
                    attemptLogId,
                    bypassedBreachWarning: bypassBreachWarning || false
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create login success audit log:', auditLogError);
        }

        // Create response with user data
        const response = {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                lastLoginAt: user.lastLoginAt,
            },
            ...tokens,
        }

        // Create response and set cookies
        const nextResponse = NextResponse.json(response)

        // Set access token as HTTP-only cookie
        nextResponse.cookies.set('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60, // 15 minutes
        })

        // Set refresh token as HTTP-only cookie
        nextResponse.cookies.set('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        })

        return nextResponse
    } catch (error) {
        // Log token generation or login completion error
        try {
            await createAuditLog(
                'LOGIN_COMPLETION_ERROR',
                userId || null, // Use null if no userId available
                userId || null,
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    email: (await request.json().catch(() => ({})))?.email,
                    ipAddress,
                    userAgent,
                    timestamp: new Date().toISOString(),
                    attemptLogId
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create login completion error audit log:', auditLogError);
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {error: 'Validation failed', details: error.errors},
                {status: 400}
            )
        }

        console.error('Login error:', error)
        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        )
    }
}

/**
 * @method GET
 * @description Method not allowed - Login endpoint only accepts POST requests
 * @response 405 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Method not allowed"
 *     }
 *   }
 * }
 */
export async function GET(request: Request) {
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Log invalid method attempt
    try {
        await createAuditLog(
            'LOGIN_INVALID_METHOD',
            null,
            null,
            {
                method: 'GET',
                ipAddress,
                userAgent,
                timestamp: new Date().toISOString()
            }
        );
    } catch (auditLogError) {
        console.error('Failed to create invalid method audit log:', auditLogError);
    }

    return NextResponse.json(
        {error: 'Method not allowed'},
        {status: 405}
    )
}