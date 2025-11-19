import {NextResponse} from 'next/server';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {db} from '@/lib/db';
import {z} from 'zod';
import {SectonClient} from '@/lib/utils/ai/secton';
import {AIMessage} from '@/lib/utils/ai/types';

const aiSummarySchema = z.object({
    since: z.string(),
    entries: z.array(z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        version: z.string().nullable(),
        publishedAt: z.string().nullable(),
        tags: z.array(z.object({
            id: z.string(),
            name: z.string(),
            color: z.string().nullable(),
        })),
    })),
    summary: z.object({
        features: z.number(),
        fixes: z.number(),
        other: z.number(),
    }),
    fromDate: z.string(),
});

type AISummaryRequest = z.infer<typeof aiSummarySchema>;

interface CatchUpEntry {
    id: string;
    title: string;
    content: string;
    version: string | null;
    publishedAt: string | null;
    tags: Array<{
        id: string;
        name: string;
        color: string | null;
    }>;
}

/**
 * @method POST
 * @description Generate an AI-powered catch-up summary for changelog entries
 * @body {
 *   "type": "object",
 *   "required": ["since", "entries", "summary", "fromDate"],
 *   "properties": {
 *     "since": {
 *       "type": "string",
 *       "description": "The time period for the catch-up"
 *     },
 *     "entries": {
 *       "type": "array",
 *       "description": "Array of changelog entries to summarize"
 *     },
 *     "summary": {
 *       "type": "object",
 *       "description": "Summary statistics of the entries"
 *     },
 *     "fromDate": {
 *       "type": "string",
 *       "description": "Start date for the catch-up period"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "summary": {
 *       "type": "string",
 *       "description": "AI-generated narrative summary"
 *     },
 *     "highlights": {
 *       "type": "array",
 *       "items": { "type": "string" },
 *       "description": "Key highlights extracted from the changes"
 *     },
 *     "readingTime": {
 *       "type": "number",
 *       "description": "Estimated reading time in minutes"
 *     }
 *   }
 * }
 * @error 400 Invalid request data
 * @error 401 Unauthorized
 * @error 404 Project not found
 * @error 500 AI not configured or generation failed
 */
export async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const {projectId} = await context.params;

        const body = await request.json();
        const validatedData: AISummaryRequest = aiSummarySchema.parse(body);

        // Verify project exists
        const project = await db.project.findUnique({
            where: {id: projectId},
            select: {id: true, name: true},
        });

        if (!project) {
            return NextResponse.json(
                {error: 'Project not found'},
                {status: 404}
            );
        }

        // Check if AI is enabled and configured
        const systemConfig = await db.systemConfig.findFirst({
            where: {id: 1},
            select: {
                enableAIAssistant: true,
                aiApiKey: true,
                aiDefaultModel: true,
            },
        });

        if (!systemConfig?.enableAIAssistant) {
            return NextResponse.json(
                {error: 'AI assistant is not enabled'},
                {status: 500}
            );
        }

        if (!systemConfig.aiApiKey) {
            return NextResponse.json(
                {error: 'AI API key is not configured'},
                {status: 500}
            );
        }

        if (validatedData.entries.length === 0) {
            return NextResponse.json(
                {error: 'No entries to summarize'},
                {status: 400}
            );
        }

        try {
            // Decrypt the API key directly
            // const decryptedKey = decryptToken(systemConfig.aiApiKey);

            // Create the AI client
            const aiClient = new SectonClient({
                apiKey: systemConfig.aiApiKey,
                defaultModel: systemConfig.aiDefaultModel || 'copilot-zero',
            });

            // Validate API key
            const isValid = await aiClient.validateApiKey();
            if (!isValid) {
                return NextResponse.json(
                    {error: 'AI API key is invalid'},
                    {status: 500}
                );
            }

            // Create prompt
            const prompt = createPrompt(project.name, validatedData.entries, validatedData.fromDate);

            const messages: AIMessage[] = [
                {role: 'user', content: prompt}
            ];

            // Generate AI summary
            const response = await aiClient.createCompletion({
                model: systemConfig.aiDefaultModel || 'copilot-zero',
                messages,
                temperature: 0.3,
                max_tokens: 600,
            });

            const aiContent = response.messages[response.messages.length - 1]?.content;

            if (!aiContent || aiContent.trim().length < 20) {
                return NextResponse.json(
                    {error: 'AI generated empty or invalid response'},
                    {status: 500}
                );
            }

            // Generate highlights
            const highlights = validatedData.entries
                .slice(0, 5)
                .map(entry => {
                    const version = entry.version ? ` (${entry.version})` : '';
                    const topTags = entry.tags.slice(0, 2).map(tag => tag.name);
                    const tagText = topTags.length > 0 ? ` • ${topTags.join(', ')}` : '';
                    return `${entry.title}${version}${tagText}`;
                });

            // Calculate reading time
            const wordCount = aiContent.split(/\s+/).length;
            const readingTime = Math.max(1, Math.ceil(wordCount / 200));

            return NextResponse.json({
                summary: aiContent.trim(),
                highlights,
                readingTime,
            });

        } catch (aiError) {
            console.error('AI generation error:', aiError);
            return NextResponse.json(
                {error: 'Failed to generate AI summary'},
                {status: 500}
            );
        }

    } catch (error) {
        console.error('Error in AI summary endpoint:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {error: 'Invalid request data', details: error.errors},
                {status: 400}
            );
        }

        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        );
    }
}

function createPrompt(projectName: string, entries: CatchUpEntry[], fromDate: string): string {
    const cleanProjectName = projectName.replace(/[^\w\s]/g, '').trim();
    const cleanFromDate = new Date(fromDate).toLocaleDateString();

    const entryTexts = entries.slice(0, 5).map((entry, index) => {
        const title = entry.title.replace(/[^\w\s.,!?-]/g, '').trim();
        const content = entry.content.replace(/[^\w\s.,!?-]/g, '').trim().substring(0, 150);
        const version = entry.version ? ` (${entry.version})` : '';
        const tags = entry.tags.slice(0, 3).map(tag => tag.name).join(', ');

        return `${index + 1}. ${title}${version}
${content}
${tags ? `Tags: ${tags}` : ''}`;
    }).join('\n\n');

    return `Write a friendly project update summary for ${cleanProjectName}.

Time period: Since ${cleanFromDate}
Total updates: ${entries.length}

Recent changes:
${entryTexts}

Create a polished 3-4 paragraph summary of these updates in markdown format. Focus on the impact and benefits of the changes, using a professional but conversational tone. Explain what has improved and why these updates matter for the project. End with insights about the project's current direction based on these developments.`;
}