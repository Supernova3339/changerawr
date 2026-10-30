import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { encryptToken } from '@/lib/utils/encryption'

/**
 * GET /api/ai/settings
 * Returns AI config needed by editor components.
 * The apiKey is re-encrypted for the client (decrypted on demand via /api/ai/decrypt).
 */
export async function GET() {
    try {
        await validateAuthAndGetUser()

        const config = await db.systemConfig.findFirst({
            where: { id: 1 },
            select: {
                enableAIAssistant: true,
                aiApiKey: true,
                aiApiProvider: true,
                aiApiUrl: true,
                aiDefaultModel: true,
                changelogTaggerUrl: true,
            },
        })

        const encryptedApiKey = config?.aiApiKey ? encryptToken(config.aiApiKey) : null

        return NextResponse.json({
            enableAIAssistant: config?.enableAIAssistant ?? false,
            aiApiKey: encryptedApiKey,
            aiApiProvider: config?.aiApiProvider ?? 'halesis',
            aiApiUrl: config?.aiApiUrl ?? null,
            aiDefaultModel: config?.aiDefaultModel ?? null,
            changelogTaggerConfigured: !!config?.changelogTaggerUrl,
        })
    } catch (error) {
        console.error('[ai/settings] GET error:', error)
        return NextResponse.json({
            error: 'Failed to fetch AI settings',
            enableAIAssistant: false,
            aiApiKey: null,
            changelogTaggerConfigured: false,
        }, { status: 500 })
    }
}
