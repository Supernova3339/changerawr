import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { createAIClient } from '@/lib/utils/ai/halesis'

/**
 * POST /api/admin/ai-settings/test-key
 * Validates an API key by hitting the /models endpoint.
 * Works for both Halesis and any OpenAI-compatible endpoint.
 * Body: { apiKey: string, provider?: string, apiUrl?: string }
 */
export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser()
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const { apiKey, provider = 'halesis', apiUrl } = await request.json()

        if (!apiKey || typeof apiKey !== 'string') {
            return NextResponse.json({ valid: false, message: 'API key is required' }, { status: 400 })
        }

        if (provider === 'halesis' && !apiKey.startsWith('sk-')) {
            return NextResponse.json({
                valid: false,
                message: 'Invalid format — Halesis API keys start with "sk-".',
            }, { status: 400 })
        }

        if (provider === 'custom' && !apiUrl) {
            return NextResponse.json({ valid: false, message: 'API URL is required for custom providers.' }, { status: 400 })
        }

        const baseUrl = provider === 'custom' ? apiUrl : undefined
        const client = createAIClient({ apiKey, baseUrl })
        const valid = await client.validateApiKey()

        return NextResponse.json({
            valid,
            message: valid
                ? 'Connected successfully.'
                : 'Could not connect — check the URL and key.',
        })
    } catch (error) {
        console.error('[test-key]', error)
        return NextResponse.json({
            valid: false,
            message: error instanceof Error ? error.message : 'Connection failed',
        }, { status: 400 })
    }
}
