'use client';

import {useEffect, useState, Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {CheckCircle, Terminal, ExternalLink} from 'lucide-react';

interface AuthState {
    status: 'checking' | 'authenticated' | 'unauthenticated' | 'generating' | 'success' | 'error';
    user?: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
    error?: string;
    authCode?: string;
    callbackUrl?: string;
}

// Separate component that uses useSearchParams
function CLIAuthContent() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callback');
    const [authState, setAuthState] = useState<AuthState>({status: 'checking'});

    const isChecking = authState.status === 'checking';
    const isAuthenticated = authState.status === 'authenticated';
    const isUnauthenticated = authState.status === 'unauthenticated';
    const isGenerating = authState.status === 'generating';
    const isSuccess = authState.status === 'success';
    const isError = authState.status === 'error';

    // Determine branding based on callback URL
    const isWriteWithCum = callbackUrl?.startsWith('wwc://');
    const appName = isWriteWithCum ? 'WriteWithCum' : 'Changerawr CLI';

    useEffect(() => {
        checkAuthenticationStatus();
    }, []);

    const checkAuthenticationStatus = async (): Promise<void> => {
        try {
            const response = await fetch('/api/auth/me');

            if (response.ok) {
                const user = await response.json();
                setAuthState({
                    status: 'authenticated',
                    user,
                    callbackUrl: callbackUrl || undefined
                });
            } else {
                setAuthState({status: 'unauthenticated'});
            }
        } catch {
            setAuthState({
                status: 'error',
                error: 'Failed to check authentication status'
            });
        }
    };

    const generateAuthCode = async (): Promise<void> => {
        if (!callbackUrl) {
            setAuthState({
                status: 'error',
                error: 'No callback URL provided'
            });
            return;
        }

        setAuthState(prev => ({...prev, status: 'generating'}));

        try {
            const response = await fetch('/api/auth/cli/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({callbackUrl}),
            });

            if (response.ok) {
                const {code, expires} = await response.json();

                const redirectUrl = new URL(callbackUrl);
                redirectUrl.searchParams.set('code', code);
                redirectUrl.searchParams.set('expires', expires.toString());
                redirectUrl.searchParams.set('instance', window.location.origin);

                setAuthState({
                    status: 'success',
                    authCode: code,
                    callbackUrl
                });

                setTimeout(() => {
                    window.location.href = redirectUrl.toString();
                }, 2000);

            } else {
                const errorData = await response.json();
                setAuthState({
                    status: 'error',
                    error: errorData.error || 'Failed to generate authentication code'
                });
            }
        } catch {
            setAuthState({
                status: 'error',
                error: 'Network error while generating authentication code'
            });
        }
    };

    const handleLoginRedirect = (): void => {
        const loginUrl = new URL('/login', window.location.origin);
        loginUrl.searchParams.set('redirect', window.location.pathname + window.location.search);
        window.location.href = loginUrl.toString();
    };

    return (
        <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Terminal className="w-6 h-6 text-blue-600"/>
                    </div>
                    <CardTitle>{appName} Authorization</CardTitle>
                    <CardDescription>
                        Authorize {appName} to access your account
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {isChecking && (
                        <div className="text-center py-8">
                            <div
                                className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-600">Checking authentication status...</p>
                        </div>
                    )}

                    {isUnauthenticated && (
                        <>
                            <Alert>
                                <AlertDescription>
                                    You need to be logged in to authorize {appName}.
                                </AlertDescription>
                            </Alert>
                            <Button
                                onClick={handleLoginRedirect}
                                className="w-full"
                                size="lg"
                            >
                                <ExternalLink className="w-4 h-4 mr-2"/>
                                Login to Changerawr
                            </Button>
                        </>
                    )}

                    {isAuthenticated && authState.user && (
                        <>
                            <div className="text-center py-4">
                                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2"/>
                                <p className="font-medium">Logged in as</p>
                                <p className="text-sm text-gray-600">{authState.user.email}</p>
                            </div>

                            {callbackUrl ? (
                                <>
                                    <Alert>
                                        <AlertDescription>
                                            {appName} is requesting access to your account.
                                            Click authorize to generate a temporary authentication code.
                                        </AlertDescription>
                                    </Alert>
                                    <Button
                                        onClick={generateAuthCode}
                                        className="w-full"
                                        size="lg"
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div
                                                    className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                                Generating Code...
                                            </>
                                        ) : (
                                            `Authorize ${appName} Access`
                                        )}
                                    </Button>
                                </>
                            ) : (
                                <Alert>
                                    <AlertDescription>
                                        No callback URL provided. Please use {appName} to initiate authentication.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </>
                    )}

                    {isGenerating && (
                        <div className="text-center py-4">
                            <div
                                className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-600">Generating authentication code...</p>
                        </div>
                    )}

                    {isSuccess && (
                        <div className="text-center py-4">
                            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2"/>
                            <p className="font-medium text-green-600">Authorization Successful!</p>
                            <p className="text-sm text-gray-600 mt-2">
                                Redirecting to {appName}... You can close this window if it doesn&apos;t redirect
                                automatically.
                            </p>
                        </div>
                    )}

                    {isError && (
                        <>
                            <Alert variant="destructive">
                                <AlertDescription>
                                    {authState.error}
                                </AlertDescription>
                            </Alert>
                            <Button
                                onClick={checkAuthenticationStatus}
                                variant="outline"
                                className="w-full"
                            >
                                Try Again
                            </Button>
                        </>
                    )}

                    <div className="text-center pt-4 border-t">
                        <p className="text-xs text-gray-500">
                            This will give {appName} access to your Changerawr projects.
                            You can revoke this access at any time from your account settings.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Loading fallback component
function CLIAuthLoading() {
    return (
        <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Terminal className="w-6 h-6 text-blue-600"/>
                    </div>
                    <CardTitle>Authorization</CardTitle>
                    <CardDescription>
                        Loading...
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center py-8">
                        <div
                            className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading page...</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Main component with Suspense boundary
export default function CLIAuthPage() {
    return (
        <Suspense fallback={<CLIAuthLoading/>}>
            <CLIAuthContent/>
        </Suspense>
    );
}