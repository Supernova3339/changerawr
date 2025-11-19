import {z} from 'zod'
import {db} from '@/lib/db'
import {RequestStatus} from '@prisma/client'
import {cookies, headers} from "next/headers";
import type {AuthRequest} from '@/lib/auth/api-key';

// Zod Schemas
export const requestStatusSchema = z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED'] as const)
}) satisfies z.ZodType<{ status: RequestStatus }>

export const changelogEntrySchema = z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    version: z.string().optional(),
    tags: z.array(z.string()).optional()
})

export type ChangelogEntryInput = z.infer<typeof changelogEntrySchema>

// Auth Helper
export async function validateAuthAndGetUser() {
    // Create a NextRequest-like object from headers/cookies
    const headersList = await headers();
    const cookieStore = await cookies();

    // Build a minimal request object for authenticateRequest
    const requestLike: AuthRequest = {
        headers: {
            get: (name: string) => headersList.get(name)
        },
        cookies: {
            get: (name: string) => cookieStore.get(name)
        }
    };

    const { authenticateRequest } = await import('@/lib/auth/api-key');
    const ctx = await authenticateRequest(requestLike);

    if (!ctx) {
        throw new Error('Authentication required');
    }

    // Get the actual user from the database
    const user = await db.user.findUnique({
        where: { id: ctx.userId }
    });

    if (!user) {
        throw new Error('User not found');
    }

    return user;
}

// Response Helpers
export function sendError(message: string, status: number = 400) {
    return new Response(
        JSON.stringify({error: message}),
        {
            status,
            headers: {'Content-Type': 'application/json'}
        }
    )
}

export function sendSuccess(data: unknown, status: number = 200) {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {'Content-Type': 'application/json'}
        }
    )
}

// Excerpt Helper
const EXCERPT_LENGTH = 300;

export function generateExcerpt(content: string): string {
    if (!content) return '';

    // Basic markdown cleanup - remove common formatting
    const cleaned = content
        .replace(/^#{1,6}\s+/gm, '') // Remove headers
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
        .replace(/`([^`]+)`/g, '$1') // Remove inline code
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/\n+/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

    // Truncate to excerpt length
    if (cleaned.length <= EXCERPT_LENGTH) {
        return cleaned;
    }

    // Try to truncate at a word boundary
    const truncated = cleaned.substring(0, EXCERPT_LENGTH);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > EXCERPT_LENGTH * 0.8) {
        // If we found a space in the last 20%, use it
        return truncated.substring(0, lastSpace) + '...';
    }

    // Otherwise just truncate and add ellipsis
    return truncated + '...';
}