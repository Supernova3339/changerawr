import {NextResponse} from 'next/server';
import {z} from 'zod';
import {setupEasypanelProvider} from '@/lib/auth/providers/easypanel';
import {setupPocketIDProvider} from '@/lib/auth/providers/pocketid';
import {isSetupCompleted} from '@/lib/services/core/setup-completion';

/**
 * Schema for validating OAuth provider setup request.
 */
const oauthSetupSchema = z.object({
    provider: z.string(),
    baseUrl: z.string().url('Base URL must be a valid URL'),
    clientId: z.string().min(1, 'Client ID is required'),
    clientSecret: z.string().min(1, 'Client Secret is required')
});

/**
 * @method POST
 * @description Sets up an OAuth provider during initial system setup
 */
export async function POST(request: Request) {
    try {
        // Block access once the wizard has actually been finished
        if (await isSetupCompleted()) {
            return NextResponse.json(
                { error: 'Setup already completed. Use the admin panel to manage OAuth providers.' },
                { status: 403 }
            )
        }

        // Validate request data
        const body = await request.json();
        const {provider, baseUrl, clientId, clientSecret} = oauthSetupSchema.parse(body);

        let result;

        // Set up appropriate provider
        switch (provider.toLowerCase()) {
            case 'easypanel':
                result = await setupEasypanelProvider({
                    baseUrl,
                    clientId,
                    clientSecret
                });
                break;
            case 'pocketid':
                result = await setupPocketIDProvider({
                    baseUrl,
                    clientId,
                    clientSecret
                });
                break;
            default:
                return NextResponse.json(
                    {error: `Unsupported provider: ${provider}`},
                    {status: 400}
                );
        }

        return NextResponse.json({
            success: true,
            provider: {
                id: result.id,
                name: result.name
            }
        });
    } catch (error) {
        console.error('OAuth setup error:', (error as Error).stack);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {error: 'Validation failed', details: error.errors},
                {status: 400}
            );
        }

        return NextResponse.json(
            {error: 'Failed to set up OAuth provider'},
            {status: 500}
        );
    }
}