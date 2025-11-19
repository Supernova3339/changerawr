import {NextResponse} from 'next/server'
import {db} from '@/lib/db'
import {z} from 'zod'
import {getGravatarUrl} from '@/lib/utils/gravatar'

const previewSchema = z.object({
    email: z.string().email()
})

/**
 * @method POST
 * @description Creates a preview of a user's information
 * @path /api/preview
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {email} = previewSchema.parse(body)
        const normalizedEmail = email.toLowerCase()

        // Never acknowledge system accounts
        if (normalizedEmail.endsWith('@changerawr.sys')) {
            // Intentionally return as if no user exists
            return NextResponse.json(
                {error: 'User not found'},
                {status: 404}
            )
        }

        const user = await db.user.findUnique({
            where: {email: normalizedEmail},
            select: {
                name: true,
                email: true,
            },
        })

        if (!user) {
            return NextResponse.json(
                {error: 'User not found'},
                {status: 404}
            )
        }

        const avatarUrl = getGravatarUrl(user.email, 160)

        return NextResponse.json({
            ...user,
            avatarUrl
        })
    } catch (error) {
        console.error('Preview error:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {error: error.errors},
                {status: 400}
            )
        }

        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        )
    }
}
