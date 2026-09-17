import {NextResponse} from 'next/server'
import {z} from 'zod'
import {db} from '@/lib/db'
import {hashPassword} from '@/lib/auth/password'
import {Role} from '@prisma/client'
import {countRealUsers} from '@/lib/services/core/system-user/service'
import {checkPasswordBreach, passwordBreachErrorPayload} from '@/lib/services/auth/password-breach'
import {checkRateLimit} from '@/lib/utils/rate-limit'

/**
 * Schema for validating admin user request body.
 */
const adminSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    // Chosen in the wizard's first step, before this account exists —
    // applied directly to the new user's Settings below instead of needing
    // a separate write later.
    theme: z.enum(['light', 'dark']).optional(),
})

/**
 * @method POST
 * @description Creates a new admin user for the application
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "name": {
 *       "type": "string",
 *       "minLength": 2,
 *       "description": "Admin's full name"
 *     },
 *     "email": {
 *       "type": "string",
 *       "format": "email",
 *       "description": "Admin's email address"
 *     },
 *     "password": {
 *       "type": "string",
 *       "minLength": 8,
 *       "description": "Admin's password"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "message": {
 *       "type": "string",
 *       "example": "Admin account created successfully"
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
 * @error 400 Validation failed - Invalid input data
 * @error 403 Setup already completed - Cannot run setup more than once
 * @error 500 An unexpected error occurred during setup
 */
export async function POST(request: Request) {
    try {
        // Rate limit: 10 attempts per hour per IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown'
        const rateLimit = checkRateLimit(`setup-admin:${ip}`, 10, 60 * 60 * 1000)
        if (!rateLimit.allowed) {
            return NextResponse.json(
                {error: 'Too many attempts. Please try again later.'},
                {status: 429}
            )
        }

        // Check if setup is already complete
        const userCount = await countRealUsers();
        if (userCount > 0) {
            return NextResponse.json(
                {error: 'Setup has already been completed'},
                {status: 403}
            )
        }

        // Validate request data
        const body = await request.json()
        const validatedData = adminSchema.parse(body)

        // Reject known-compromised passwords for the very first account
        const breach = await checkPasswordBreach(validatedData.password)
        if (breach.isBreached) {
            return NextResponse.json(passwordBreachErrorPayload(breach.breachCount), {status: 422})
        }

        // Hash password
        const hashedPassword = await hashPassword(validatedData.password)

        // Create admin user
        const user = await db.user.create({
            data: {
                name: validatedData.name,
                email: validatedData.email,
                password: hashedPassword,
                role: Role.ADMIN,
                settings: {
                    create: {
                        theme: validatedData.theme ?? 'light',
                    },
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        })

        return NextResponse.json({
            message: 'Admin account created successfully',
            user,
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Invalid input',
                    details: error.errors,
                },
                {status: 400}
            )
        }

        console.error('Admin setup error:', error)
        return NextResponse.json(
            {error: 'Failed to create admin account'},
            {status: 500}
        )
    }
}

/**
 * @method GET
 * @description Method not allowed - Admin user setup endpoint only accepts POST requests
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
export async function GET() {
    return NextResponse.json(
        {error: 'Method not allowed'},
        {status: 405}
    )
}