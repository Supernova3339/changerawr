import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { encryptToken, decryptToken } from '@/lib/utils/encryption'
import { resolveTaggerConfig } from '@/lib/services/ai/tagger-detect'

interface AISettingsResponse {
    enableAIAssistant: boolean
    aiApiKey: boolean | null
    aiApiProvider: string
    aiApiUrl: string | null
    aiDefaultModel: string | null
    changelogTaggerUrl: string | null
    changelogTaggerApiKey: boolean | null
    /** true when no changelogTaggerUrl is configured but the bundled sidecar was found running */
    changelogTaggerAutoDetected: boolean
}

interface AISettingsUpdateRequest {
    enableAIAssistant?: boolean
    aiApiKey?: string | null
    aiApiProvider?: string
    aiApiUrl?: string | null
    aiDefaultModel?: string | null
    changelogTaggerUrl?: string | null
    changelogTaggerApiKey?: string | null
}

export async function GET() {
    try {
        const user = await validateAuthAndGetUser()
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const config = await db.systemConfig.findFirst({
            where: { id: 1 },
            select: {
                enableAIAssistant: true,
                aiApiKey: true,
                aiApiProvider: true,
                aiApiUrl: true,
                aiDefaultModel: true,
                changelogTaggerUrl: true,
                changelogTaggerApiKey: true,
            },
        })

        const tagger = await resolveTaggerConfig({
            changelogTaggerUrl: config?.changelogTaggerUrl ?? null,
            changelogTaggerApiKey: config?.changelogTaggerApiKey ?? null,
        })

        const response: AISettingsResponse = {
            enableAIAssistant: config?.enableAIAssistant ?? false,
            aiApiKey: config?.aiApiKey ? true : null,
            aiApiProvider: config?.aiApiProvider ?? 'halesis',
            aiApiUrl: config?.aiApiUrl ?? null,
            aiDefaultModel: config?.aiDefaultModel ?? null,
            changelogTaggerUrl: config?.changelogTaggerUrl ?? null,
            changelogTaggerApiKey: config?.changelogTaggerApiKey ? true : null,
            changelogTaggerAutoDetected: !!tagger?.autoDetected,
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('[admin/ai-settings] GET error:', error)
        return NextResponse.json({ error: 'Failed to fetch AI settings' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser()
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const body: AISettingsUpdateRequest = await request.json()
        const updateData: Record<string, unknown> = {}

        if (typeof body.enableAIAssistant === 'boolean') {
            updateData.enableAIAssistant = body.enableAIAssistant
        }

        if (body.aiApiProvider !== undefined) {
            updateData.aiApiProvider = body.aiApiProvider
        }

        if (body.aiApiKey !== undefined) {
            updateData.aiApiKey = body.aiApiKey || null
        }

        if (body.aiApiUrl !== undefined) {
            updateData.aiApiUrl = body.aiApiUrl || null
        }

        if (body.aiDefaultModel !== undefined) {
            updateData.aiDefaultModel = body.aiDefaultModel || null
        }

        if (body.changelogTaggerUrl !== undefined) {
            updateData.changelogTaggerUrl = body.changelogTaggerUrl || null
        }

        if (body.changelogTaggerApiKey !== undefined) {
            if (body.changelogTaggerApiKey) {
                updateData.changelogTaggerApiKey = encryptToken(body.changelogTaggerApiKey)
            } else {
                updateData.changelogTaggerApiKey = null
            }
        }

        await db.systemConfig.upsert({
            where: { id: 1 },
            update: updateData,
            create: {
                id: 1,
                ...updateData,
                defaultInvitationExpiry: 7,
                requireApprovalForChangelogs: true,
                maxChangelogEntriesPerProject: 100,
                enableAnalytics: true,
                enableNotifications: true,
                enablePasswordReset: false,
                updatedAt: new Date(),
            },
        })

        await db.auditLog.create({
            data: {
                action: 'UPDATE_AI_SETTINGS',
                userId: user.id,
                details: {
                    enableAIAssistant: updateData.enableAIAssistant,
                    aiApiProvider: updateData.aiApiProvider,
                    aiDefaultModel: updateData.aiDefaultModel,
                    aiApiKeyUpdated: updateData.aiApiKey !== undefined,
                    taggerKeyUpdated: updateData.changelogTaggerApiKey !== undefined,
                },
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[admin/ai-settings] POST error:', error)
        return NextResponse.json({ error: 'Failed to update AI settings' }, { status: 500 })
    }
}

// Re-export decrypt helper used by test-key
export { decryptToken }
