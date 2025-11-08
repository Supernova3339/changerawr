import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth/api-key';
import { createAuditLog } from '@/lib/utils/auditLog';
import { db } from '@/lib/db';

const updateApiKeySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    isRevoked: z.boolean().optional(),
    permissions: z.array(z.string()).optional(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; keyId: string }> }
) {
    try {
        const ctx = await authenticateRequest(request);

        if (!ctx) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { projectId, keyId } = await params;

        const apiKey = await db.apiKey.findFirst({
            where: {
                id: keyId,
                projectId,
                userId: ctx.userId
            },
            select: {
                id: true,
                name: true,
                key: true,
                lastUsed: true,
                createdAt: true,
                expiresAt: true,
                isRevoked: true,
                permissions: true,
                projectId: true,
            }
        });

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            );
        }

        // Mask the key - don't return full key
        return NextResponse.json({
            ...apiKey,
            key: apiKey.key.slice(0, 12) + '...'
        });
    } catch (error) {
        console.error('Failed to fetch API key:', error);
        return NextResponse.json(
            { error: 'Failed to fetch API key' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; keyId: string }> }
) {
    try {
        const ctx = await authenticateRequest(request);

        if (!ctx) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { projectId, keyId } = await params;

        // Verify ownership
        const existingKey = await db.apiKey.findFirst({
            where: {
                id: keyId,
                projectId,
                userId: ctx.userId
            }
        });

        if (!existingKey) {
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const validatedData = updateApiKeySchema.parse(body);

        const updatedKey = await db.apiKey.update({
            where: { id: keyId },
            data: validatedData
        });

        // Create audit log
        try {
            await createAuditLog(
                'UPDATE_PROJECT_API_KEY',
                ctx.userId,
                ctx.userId,
                {
                    apiKeyId: keyId,
                    apiKeyName: updatedKey.name,
                    projectId,
                    changes: validatedData
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        return NextResponse.json({
            ...updatedKey,
            key: updatedKey.key.slice(0, 12) + '...' // Mask key
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Failed to update API key:', error);
        return NextResponse.json(
            { error: 'Failed to update API key' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; keyId: string }> }
) {
    try {
        const ctx = await authenticateRequest(request);

        if (!ctx) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { projectId, keyId } = await params;

        // Verify ownership
        const existingKey = await db.apiKey.findFirst({
            where: {
                id: keyId,
                projectId,
                userId: ctx.userId
            }
        });

        if (!existingKey) {
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            );
        }

        await db.apiKey.delete({
            where: { id: keyId }
        });

        // Create audit log
        try {
            await createAuditLog(
                'DELETE_PROJECT_API_KEY',
                ctx.userId,
                ctx.userId,
                {
                    apiKeyId: keyId,
                    apiKeyName: existingKey.name,
                    projectId
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete API key:', error);
        return NextResponse.json(
            { error: 'Failed to delete API key' },
            { status: 500 }
        );
    }
}