import {NextResponse} from 'next/server';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {db} from '@/lib/db';
import {z} from 'zod';
import {sendChangelogEmail} from '@/lib/services/email/notification';

// Validation schema for send email request
const sendEmailSchema = z.object({
    // Manual recipients array (optional)
    recipients: z.array(z.string().email('Invalid email address')).optional(),

    // Email subject
    subject: z.string().min(1, 'Subject is required'),

    // Changelog entry ID (can be 'digest' for digest emails)
    changelogEntryId: z.string().optional(),

    // Flag for sending a digest instead of a single entry
    isDigest: z.boolean().default(false),

    // Subscription types to include (if sending to subscribers)
    subscriptionTypes: z.array(
        z.enum(['ALL_UPDATES', 'MAJOR_ONLY', 'DIGEST_ONLY'])
    ).optional()
});

/**
 * @method POST
 * @description Sends a changelog email to specified recipients or subscribers
 */
export async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const {projectId} = await context.params;

        // Verify project access
        const project = await db.project.findUnique({
            where: {id: projectId},
            include: {emailConfig: true}
        });

        if (!project) {
            return NextResponse.json({error: 'Project not found'}, {status: 404});
        }

        if (!project.emailConfig || !project.emailConfig.enabled) {
            return NextResponse.json({
                error: 'Email notifications are not properly configured or enabled for this project'
            }, {status: 400});
        }

        // Detect custom domain from request headers
        const host = request.headers.get('host');
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
        let customDomain: string | undefined;

        try {
            const appDomain = new URL(appUrl).hostname;
            if (host && host !== appDomain && !host.includes('localhost') && !host.includes('127.0.0.1')) {
                customDomain = host;
            }
        } catch (error) {
            console.error('Error parsing app URL:', error);
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = sendEmailSchema.parse(body);

        // Check if we have any recipient specification
        const hasRecipients = validatedData.recipients && validatedData.recipients.length > 0;
        const hasSubscriptionTypes = validatedData.subscriptionTypes && validatedData.subscriptionTypes.length > 0;

        if (!hasRecipients && !hasSubscriptionTypes) {
            return NextResponse.json({
                error: 'No recipients specified. You must provide either direct recipients or subscription types for subscribers.'
            }, {status: 400});
        }

        // If sending to subscribers, fetch subscribers based on subscription types
        let subscriberIds: string[] = [];

        if (hasSubscriptionTypes) {
            const subscribers = await db.emailSubscriber.findMany({
                where: {
                    isActive: true,
                    subscriptions: {
                        some: {
                            projectId,
                            subscriptionType: {
                                in: validatedData.subscriptionTypes
                            }
                        }
                    }
                },
                select: {
                    id: true
                }
            });

            subscriberIds = subscribers.map(sub => sub.id);
        }

        // Send the email using our service
        const result = await sendChangelogEmail({
            projectId,
            subject: validatedData.subject,
            changelogEntryId: validatedData.isDigest ? undefined : validatedData.changelogEntryId,
            recipients: validatedData.recipients,
            isDigest: validatedData.isDigest,
            subscriberIds: subscriberIds.length > 0 ? subscriberIds : undefined,
            customDomain
        });

        return NextResponse.json({
            success: true,
            message: `Email sent successfully to ${result.recipientCount} recipients`,
            recipientCount: result.recipientCount,
            messageId: result.messageId
        });
    } catch (error) {
        console.error('Failed to send changelog email:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {error: 'Validation failed', details: error.errors},
                {status: 400}
            );
        }

        return NextResponse.json(
            {
                error: 'Failed to send changelog email',
                message: (error instanceof Error) ? error.message : 'Unknown error',
                stack: process.env.NODE_ENV === 'development' && (error instanceof Error) ? error.stack : undefined
            },
            {status: 500}
        );
    }
}