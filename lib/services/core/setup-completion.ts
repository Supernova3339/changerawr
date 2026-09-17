import {db} from '@/lib/db'

/**
 * Whether the setup wizard has been fully finished (the completion step was
 * reached). This is the only correct "block further setup-only API access"
 * signal: checking whether an admin user exists doesn't work for any step
 * after admin creation, since an admin always already exists by the time
 * those steps legitimately run.
 */
export async function isSetupCompleted(): Promise<boolean> {
    const config = await db.systemConfig.findUnique({
        where: {id: 1},
        select: {setupCompletedAt: true}
    })
    return !!config?.setupCompletedAt
}

/**
 * Marks the setup wizard as finished. Idempotent — safe to call more than once.
 */
export async function markSetupCompleted(): Promise<void> {
    await db.systemConfig.updateMany({
        where: {id: 1, setupCompletedAt: null},
        data: {setupCompletedAt: new Date()}
    })
}
