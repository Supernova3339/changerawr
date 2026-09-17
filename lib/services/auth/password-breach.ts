import crypto from 'crypto';

interface PasswordBreachResult {
    isBreached: boolean;
    breachCount: number;
}

/**
 * Check if a password has been compromised in known data breaches
 * Uses HaveIBeenPwned's Pwned Passwords API v3 (k-anonymity model)
 * @param password The password to check
 * @returns Promise with breach status and count
 */
export async function checkPasswordBreach(password: string): Promise<PasswordBreachResult> {
    // In local development, don't hit the real HIBP API or block on it —
    // seed.ts and manual testing both use throwaway passwords like
    // "password123" that are guaranteed to show up as breached, which would
    // otherwise block every local admin/seed/register flow. Never skip this
    // in production or any other NODE_ENV.
    if (process.env.NODE_ENV === 'development') {
        return {isBreached: false, breachCount: 0};
    }

    try {
        // Hash the password with SHA-1
        const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();

        // Take the first 5 characters for k-anonymity
        const hashPrefix = sha1Hash.substring(0, 5);
        const hashSuffix = sha1Hash.substring(5);

        // Don't let a slow/unresponsive HIBP API stall account creation —
        // fail open (treat as not breached) after a short timeout instead.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        let response: Response;
        try {
            response = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Changerawr-App',
                },
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            // If their API is down, don't block login but log the error
            console.error('Failed to check password breach:', response.status);
            return {isBreached: false, breachCount: 0};
        }

        const responseText = await response.text();

        // Parse response to find our hash suffix
        const lines = responseText.split('\n');
        for (const line of lines) {
            const [suffix, count] = line.trim().split(':');
            if (suffix.toUpperCase() === hashSuffix) {
                return {
                    isBreached: true,
                    breachCount: parseInt(count, 10)
                };
            }
        }

        // Hash was not found in breaches
        return {isBreached: false, breachCount: 0};

    } catch (error) {
        // Network error, timeout/abort, etc. — don't block login but log it
        console.error('Error checking password breach:', error);
        return {isBreached: false, breachCount: 0};
    }
}

/**
 * Standard error payload for rejecting a breached password at creation/change time.
 * Unlike login (which offers a bypass for existing accounts), a brand-new or
 * changed password has no reason to be accepted if it's already known-compromised.
 */
export function passwordBreachErrorPayload(breachCount: number) {
    return {
        error: 'password_breached',
        message: `This password has appeared in ${breachCount.toLocaleString()} known data breach${breachCount === 1 ? '' : 'es'}. Please choose a different password.`,
        breachCount,
    };
}