import {NextResponse} from 'next/server'
import {db} from '@/lib/db'
import {countRealUsers} from '@/lib/services/core/system-user/service'
import {isSetupCompleted, markSetupCompleted} from '@/lib/services/core/setup-completion'

/**
 * @method POST
 * @description Marks the setup wizard as finished. Called once the wizard
 * reaches its completion step, regardless of which optional steps (OAuth,
 * team invites) were skipped along the way. Idempotent.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" }
 *   }
 * }
 * @error 400 Setup has not created an admin account yet
 * @error 500 An unexpected error occurred
 */
export async function POST() {
    try {
        if (await isSetupCompleted()) {
            return NextResponse.json({success: true})
        }

        const userCount = await countRealUsers()
        if (userCount === 0) {
            return NextResponse.json(
                {error: 'Cannot complete setup before an admin account exists'},
                {status: 400}
            )
        }

        const existingConfig = await db.systemConfig.findUnique({where: {id: 1}})
        if (!existingConfig) {
            return NextResponse.json(
                {error: 'Cannot complete setup before system settings are configured'},
                {status: 400}
            )
        }

        await markSetupCompleted()

        return NextResponse.json({success: true})
    } catch (error) {
        console.error('Setup completion error:', error)
        return NextResponse.json(
            {error: 'Failed to mark setup as complete'},
            {status: 500}
        )
    }
}
