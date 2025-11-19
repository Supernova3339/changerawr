import { OAuthUserInfo } from '@/lib/types/oauth';
import { db } from '@/lib/db';
import { generateTokens } from '@/lib/auth/tokens';
import { Role } from '@prisma/client';

export async function getOAuthProviders(includeDisabled = false) {
    const providers = await db.oAuthProvider.findMany({
        where: includeDisabled ? {} : { enabled: true },
        orderBy: { name: 'asc' }
    });

    // Add a normalized name property for URL slug generation
    return providers.map(provider => ({
        ...provider,
        // Add a normalized version of the name for URL paths
        urlName: provider.name.toLowerCase().replace(/\s+/g, '-')
    }));
}

export async function getDefaultProvider() {
    const provider = await db.oAuthProvider.findFirst({
        where: { isDefault: true, enabled: true }
    });

    return provider;
}

export async function getOAuthLoginUrl(providerId: string, state?: string) {
    const provider = await db.oAuthProvider.findUnique({
        where: { id: providerId }
    });

    if (!provider) {
        throw new Error('Provider not found');
    }

    const params = new URLSearchParams({
        client_id: provider.clientId,
        redirect_uri: provider.callbackUrl,
        response_type: 'code',
        scope: provider.scopes.join(' ')
    });

    if (state) {
        params.append('state', state);
    }

    return `${provider.authorizationUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(providerId: string, code: string) {
    try {
        const provider = await db.oAuthProvider.findUnique({
            where: { id: providerId }
        });

        if (!provider) {
            throw new Error(`Provider not found with ID: ${providerId}`);
        }

        console.log('Exchanging code for token with provider:', {
            providerName: provider.name,
            authorizationUrl: provider.authorizationUrl,
            tokenUrl: provider.tokenUrl,
            callbackUrl: provider.callbackUrl
        });

        // Construct the token request
        const tokenRequestBody = new URLSearchParams({
            client_id: provider.clientId,
            client_secret: provider.clientSecret,
            code,
            redirect_uri: provider.callbackUrl,
            grant_type: 'authorization_code'
        }).toString();

        console.log('Token request parameters:', {
            clientIdLength: provider.clientId.length,
            clientSecretLength: provider.clientSecret.length,
            codeLength: code.length,
            redirectUri: provider.callbackUrl
        });

        // Make the token request
        const response = await fetch(provider.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: tokenRequestBody
        });

        // Log response status
        console.log('Token response status:', response.status);

        // Handle non-OK responses with detailed error
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Token exchange failed:', {
                status: response.status,
                statusText: response.statusText,
                errorText,
                providerName: provider.name
            });
            throw new Error(`Failed to exchange code for token: ${response.status} ${response.statusText} - ${errorText}`);
        }

        // Parse response
        const responseData = await response.json();

        // Log token response (with sensitive data masked)
        console.log('Token response received:', {
            responseKeys: Object.keys(responseData),
            accessTokenReceived: !!responseData.access_token,
            refreshTokenReceived: !!responseData.refresh_token,
            expiresIn: responseData.expires_in,
            tokenType: responseData.token_type,
            userInfoReceived: !!responseData.userInfo
        });

        // Add additional error checking for missing access token
        if (!responseData.access_token) {
            throw new Error('Access token missing from OAuth provider response');
        }

        // If the response includes an id_token (common in OpenID Connect), decode it to get user info
        if (responseData.id_token) {
            try {
                console.log('ID token found, attempting to decode');
                // Simple base64 decoding for JWT (for demonstration)
                const idTokenParts = responseData.id_token.split('.');
                if (idTokenParts.length >= 2) {
                    const payload = JSON.parse(
                        Buffer.from(idTokenParts[1], 'base64').toString()
                    );
                    console.log('Decoded ID token payload:', {
                        sub: payload.sub,
                        email: payload.email,
                        hasName: !!payload.name
                    });
                    // Add userInfo to the response
                    responseData.userInfo = payload;
                }
            } catch (decodeError) {
                console.warn('Failed to decode ID token:', decodeError);
                // Continue without userInfo from ID token
            }
        }

        return responseData;
    } catch (error) {
        console.error('Token exchange error:', {
            message: (error as Error).message,
            stack: (error as Error).stack
        });
        throw error;
    }
}

export async function fetchUserInfo(providerId: string, accessToken: string): Promise<OAuthUserInfo> {
    const provider = await db.oAuthProvider.findUnique({
        where: { id: providerId }
    });

    if (!provider) {
        throw new Error('Provider not found');
    }

    const response = await fetch(provider.userInfoUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        console.error('User info fetch failed:', await response.text());
        throw new Error('Failed to fetch user info');
    }

    return await response.json();
}

export async function handleOAuthCallback(providerName: string, code: string) {
    // Find provider by name
    const provider = await db.oAuthProvider.findFirst({
        where: {
            name: {
                equals: providerName,
                mode: 'insensitive'
            },
            enabled: true
        }
    });

    if (!provider) {
        throw new Error(`Provider not found: ${providerName}`);
    }

    // Use the provider ID for the rest of the process
    const providerId = provider.id;

    try {
        // 1. Exchange code for token
        const tokenResponse = await exchangeCodeForToken(providerId, code);
        const { access_token, refresh_token, expires_in, userInfo: tokenUserInfo } = tokenResponse;

        // Try to get user info from token response first
        let userInfo = tokenUserInfo;

        // If userInfo is not in token response, fetch it separately
        if (!userInfo) {
            try {
                console.log('User info not found in token response, fetching from userInfo endpoint...');
                userInfo = await fetchUserInfo(providerId, access_token);
            } catch (userInfoError) {
                console.error('Failed to fetch user info:', userInfoError);
                throw new Error('Failed to retrieve user information from OAuth provider');
            }
        }

        // Validate user info
        if (!userInfo) {
            throw new Error('No user information received from OAuth provider');
        }

        const userDetails = {
            id: userInfo.sub || userInfo.id,
            email: userInfo.email,
            name: userInfo.name || userInfo.email
        };

        if (!userDetails.email) {
            throw new Error('Email is required from OAuth provider');
        }

        // 3. Find or create user and establish connection
        const existingConnection = await db.oAuthConnection.findUnique({
            where: {
                providerId_providerUserId: {
                    providerId,
                    providerUserId: userDetails.id
                }
            },
            include: {
                user: true
            }
        });

        // If connection exists, use existing user
        if (existingConnection) {
            const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

            // Update connection with new tokens
            await db.oAuthConnection.update({
                where: { id: existingConnection.id },
                data: {
                    accessToken: access_token,
                    refreshToken: refresh_token || null,
                    expiresAt
                }
            });

            // Update last login timestamp
            await db.user.update({
                where: { id: existingConnection.user.id },
                data: { lastLoginAt: new Date() }
            });

            // Generate app tokens
            const tokens = await generateTokens(existingConnection.user.id);

            return {
                user: existingConnection.user,
                ...tokens
            };
        }

        // Check if user exists with the same email
        const existingUser = await db.user.findUnique({
            where: { email: userDetails.email }
        });

        let user;

        if (existingUser) {
            // Link existing user to the OAuth provider
            user = existingUser;
        } else {
            // Create new user
            user = await db.user.create({
                data: {
                    email: userDetails.email,
                    name: userDetails.name || null,
                    password: '', // Empty password for OAuth users
                    role: Role.STAFF, // Default to STAFF role for new OAuth users
                    lastLoginAt: new Date()
                }
            });

            // Create default settings for new user
            await db.settings.create({
                data: {
                    userId: user.id,
                    theme: 'light'
                }
            });
        }

        // Create or update OAuth connection using upsert
        const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;
        await db.oAuthConnection.upsert({
            where: {
                providerId_userId: {
                    providerId,
                    userId: user.id
                }
            },
            create: {
                providerId,
                userId: user.id,
                providerUserId: userDetails.id,
                accessToken: access_token,
                refreshToken: refresh_token || null,
                expiresAt
            },
            update: {
                providerUserId: userDetails.id,
                accessToken: access_token,
                refreshToken: refresh_token || null,
                expiresAt,
                updatedAt: new Date()
            }
        });

        // Generate app tokens
        const tokens = await generateTokens(user.id);

        return {
            user,
            ...tokens
        };
    } catch (error) {
        console.error('OAuth Callback Error:', {
            providerName,
            errorMessage: (error as Error).message,
            stack: (error as Error).stack
        });
        throw error;
    }
}