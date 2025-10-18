import {SignJWT, jwtVerify} from 'jose';
import {db} from '../db';
import {nanoid} from 'nanoid';
import {User} from '@prisma/client';

const ACCESS_SECRET = new TextEncoder().encode(
    process.env.JWT_ACCESS_SECRET || 'your-access-secret-key'
);

export async function generateTokens(userId: string) {
    console.log(`Generating tokens for user: ${userId}`);

    try {
        // Generate access token (short-lived - 15 minutes)
        const accessToken = await new SignJWT({userId})
            .setProtectedHeader({alg: 'HS256'})
            .setExpirationTime('15m')
            .setIssuedAt()
            .sign(ACCESS_SECRET);

        console.log('Access token generated successfully');

        // Generate refresh token (long-lived - 7 days)
        const refreshToken = nanoid(64);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Store refresh token in database
        await db.refreshToken.create({
            data: {
                userId,
                token: refreshToken,
                expiresAt,
            },
        });

        console.log('Refresh token created and stored in database');

        return {
            accessToken,
            refreshToken
        };
    } catch (error) {
        console.error('Token generation error:', error);
        throw error;
    }
}

export async function generateCLITokens(userId: string) {
    console.log(`Generating CLI tokens for user: ${userId}`);

    try {
        // Generate access token (30 days for CLI usage)
        const accessToken = await new SignJWT({userId, type: 'cli'})
            .setProtectedHeader({alg: 'HS256'})
            .setExpirationTime('30d')
            .setIssuedAt()
            .sign(ACCESS_SECRET);

        console.log('CLI access token generated successfully');

        // Generate refresh token (90 days for CLI usage)
        const refreshToken = nanoid(64);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

        // Store refresh token in database
        await db.refreshToken.create({
            data: {
                userId,
                token: refreshToken,
                expiresAt,
            },
        });

        console.log('CLI refresh token created and stored in database');

        return {
            accessToken,
            refreshToken
        };
    } catch (error) {
        console.error('CLI token generation error:', error);
        throw error;
    }
}

export async function verifyAccessToken(token: string) {
    try {
        const {payload} = await jwtVerify(token, ACCESS_SECRET);
        return payload.userId as string;
    } catch {
        return null;
    }
}

interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export async function refreshAccessToken(currentRefreshToken: string): Promise<TokenResponse | null> {
    try {
        // Find and validate the refresh token
        const existingToken = await db.refreshToken.findUnique({
            where: {
                token: currentRefreshToken
            },
            include: {
                user: true
            }
        });

        // Check if token exists and is valid
        if (!existingToken || existingToken.invalidated || existingToken.expiresAt < new Date()) {
            // Invalidate the token if it exists but is expired
            if (existingToken) {
                await db.refreshToken.update({
                    where: {id: existingToken.id},
                    data: {invalidated: true}
                });
            }
            return null;
        }

        // Generate new access token
        const accessToken = await new SignJWT({userId: existingToken.user.id})
            .setProtectedHeader({alg: 'HS256'})
            .setExpirationTime('15m')
            .setIssuedAt()
            .sign(ACCESS_SECRET);

        // Generate new refresh token
        const refreshToken = nanoid(64);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Store new refresh token
        await db.refreshToken.create({
            data: {
                userId: existingToken.user.id,
                token: refreshToken,
                expiresAt,
            },
        });

        // Invalidate the old refresh token
        await db.refreshToken.update({
            where: {id: existingToken.id},
            data: {invalidated: true}
        });

        return {
            accessToken,
            refreshToken,
            user: existingToken.user
        };
    } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
    }
}

export async function refreshCLIAccessToken(currentRefreshToken: string): Promise<TokenResponse | null> {
    try {
        // Find and validate the refresh token
        const existingToken = await db.refreshToken.findUnique({
            where: {
                token: currentRefreshToken
            },
            include: {
                user: true
            }
        });

        // Check if token exists and is valid
        if (!existingToken || existingToken.invalidated || existingToken.expiresAt < new Date()) {
            // Invalidate the token if it exists but is expired
            if (existingToken) {
                await db.refreshToken.update({
                    where: {id: existingToken.id},
                    data: {invalidated: true}
                });
            }
            return null;
        }

        // Generate new CLI access token (30 days)
        const accessToken = await new SignJWT({userId: existingToken.user.id, type: 'cli'})
            .setProtectedHeader({alg: 'HS256'})
            .setExpirationTime('30d')
            .setIssuedAt()
            .sign(ACCESS_SECRET);

        // Generate new refresh token (90 days)
        const refreshToken = nanoid(64);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

        // Store new refresh token
        await db.refreshToken.create({
            data: {
                userId: existingToken.user.id,
                token: refreshToken,
                expiresAt,
            },
        });

        // Invalidate the old refresh token
        await db.refreshToken.update({
            where: {id: existingToken.id},
            data: {invalidated: true}
        });

        return {
            accessToken,
            refreshToken,
            user: existingToken.user
        };
    } catch (error) {
        console.error('Error refreshing CLI token:', error);
        return null;
    }
}