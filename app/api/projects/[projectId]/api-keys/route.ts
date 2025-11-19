import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth/api-key';
import { createAuditLog } from '@/lib/utils/auditLog';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { Prisma } from '@prisma/client';

const createApiKeySchema = z.object({
    name: z.string().min(1).max(100),
    expiresAt: z.string().datetime().optional(),
    permissions: z.array(z.string()).optional(),
    isGlobal: z.boolean().optional(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const ctx = await authenticateRequest(request);

        if (!ctx) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { projectId } = await params;
        const { searchParams } = new URL(request.url);
        const userIdFilter = searchParams.get('userId');

        // Verify project exists and user has access
        const project = await db.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        // Check if user is admin
        const user = await db.user.findUnique({
            where: { id: ctx.userId },
            select: { role: true }
        });

        const isAdmin = user?.role === 'ADMIN';

        // Build the where clause based on user role
        const whereClause: Prisma.ApiKeyWhereInput = {
            projectId,
        };

        if (isAdmin) {
            // Admins can see:
            // 1. Their own keys (both global and private)
            // 2. Other users' global keys
            // 3. If userIdFilter is provided, filter by that user
            if (userIdFilter) {
                whereClause.userId = userIdFilter;
            } else {
                whereClause.OR = [
                    { userId: ctx.userId }, // Own keys
                    { isGlobal: true }      // Others' global keys
                ];
            }
        } else {
            // Non-admins can only see their own keys
            whereClause.userId = ctx.userId;
        }

        // Fetch project-specific API keys
        const apiKeys = await db.apiKey.findMany({
            where: whereClause,
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
                isGlobal: true,
                userId: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(apiKeys);
    } catch (error) {
        console.error('Failed to fetch project API keys:', error);
        return NextResponse.json(
            { error: 'Failed to fetch API keys' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const ctx = await authenticateRequest(request);

        if (!ctx) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { projectId } = await params;

        // Check if admin-only API key creation is enabled
        const systemConfig = await db.systemConfig.findFirst({
            where: { id: 1 },
            select: { adminOnlyApiKeyCreation: true }
        });

        if (systemConfig?.adminOnlyApiKeyCreation) {
            // Verify user is an admin
            const user = await db.user.findUnique({
                where: { id: ctx.userId },
                select: { role: true }
            });

            if (user?.role !== 'ADMIN') {
                return NextResponse.json(
                    { error: 'Only administrators can create API keys. Please request an API key from an administrator.' },
                    { status: 403 }
                );
            }
        }

        // Verify project exists
        const project = await db.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const validatedData = createApiKeySchema.parse(body);

        // Generate unique API key
        const apiKeyString = `chr_${nanoid(32)}`;

        const apiKey = await db.apiKey.create({
            data: {
                name: validatedData.name,
                key: apiKeyString,
                expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
                permissions: validatedData.permissions || [],
                userId: ctx.userId,
                projectId, // Automatically scope to project
                isGlobal: validatedData.isGlobal ?? false
            }
        });

        // Create audit log
        try {
            await createAuditLog(
                'CREATE_PROJECT_API_KEY',
                ctx.userId,
                ctx.userId,
                {
                    apiKeyId: apiKey.id,
                    apiKeyName: apiKey.name,
                    projectId,
                    projectName: project.name,
                    permissions: apiKey.permissions || []
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        return NextResponse.json({
            ...apiKey,
            key: apiKeyString // Only return full key on creation
        }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Failed to create project API key:', error);
        return NextResponse.json(
            { error: 'Failed to create API key' },
            { status: 500 }
        );
    }
}