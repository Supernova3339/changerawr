'use client'

import React, {useEffect, useState} from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {z} from 'zod'
import {useAuth} from '@/context/auth'
import Link from "next/link"
import {useQuery} from '@tanstack/react-query'
import {motion, AnimatePresence} from 'framer-motion'
import confetti from 'canvas-confetti'
import {
    startAuthentication,
    browserSupportsWebAuthn,
} from '@simplewebauthn/browser'

// UI Components
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {Label} from '@/components/ui/label'
import {Alert, AlertTitle, AlertDescription} from '@/components/ui/alert'
import {Avatar, AvatarImage, AvatarFallback} from "@/components/ui/avatar"
import {Card, CardContent, CardFooter} from '@/components/ui/card'
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip"

// Icons
import {
    ArrowLeft,
    User,
    Fingerprint,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Mail,
    CheckCircle2,
    AlertTriangle,
    Shield,
    RefreshCw,
    ArrowRight,
    Key
} from 'lucide-react'
import {ProviderLogo} from "@/components/sso/ProviderLogo";

const emailSchema = z.object({
    email: z.string().email('Please enter a valid email')
})

const passwordSchema = z.object({
    password: z.string().min(1, 'Please enter your password')
})

type EmailForm = z.infer<typeof emailSchema>
type PasswordForm = z.infer<typeof passwordSchema>

interface UserPreview {
    name: string | null
    email: string
    avatarUrl: string
}

interface OAuthProvider {
    id: string
    name: string
    enabled: boolean
    isDefault: boolean
}

interface PasswordBreachData {
    breachCount: number
    resetUrl: string
}

// Smart confetti function from registration page
const fireConfetti = () => {
    const isMobile = window.innerWidth < 768;
    const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 0,
        disableForReducedMotion: true
    };

    // Check if reduced motion is preferred
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        // Only show minimal confetti for users who prefer reduced motion
        confetti({
            ...defaults,
            particleCount: 20,
            gravity: 1,
            origin: {y: 0.6, x: 0.5}
        });
        return;
    }

    // Initial burst from the center
    confetti({
        ...defaults,
        particleCount: isMobile ? 50 : 100,
        origin: {y: 0.6, x: 0.5}
    });

    // Create cannon effect
    setTimeout(() => {
        confetti({
            ...defaults,
            particleCount: isMobile ? 25 : 50,
            angle: 60,
            spread: 50,
            origin: {x: 0, y: 0.6}
        });

        confetti({
            ...defaults,
            particleCount: isMobile ? 25 : 50,
            angle: 120,
            spread: 50,
            origin: {x: 1, y: 0.6}
        });
    }, 250);

    // Final smaller bursts
    setTimeout(() => {
        confetti({
            ...defaults,
            particleCount: isMobile ? 15 : 30,
            angle: 90,
            gravity: 1.2,
            origin: {x: 0.5, y: 0.7}
        });
    }, 400);
};

export default function LoginPage() {
    const {user, isLoading: authLoading} = useAuth()
    const [error, setError] = useState('')
    const [step, setStep] = useState<'email' | 'password' | 'breach-warning'>('email')
    const [userPreview, setUserPreview] = useState<UserPreview | null>(null)
    const [passwordBreach, setPasswordBreach] = useState<PasswordBreachData | null>(null)
    const [supportsWebAuthn, setSupportsWebAuthn] = useState(false)
    const [isAuthenticating, setIsAuthenticating] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [redirectTo, setRedirectTo] = useState('/dashboard')

    // Fetch OAuth providers
    const {data: oauthProviders, isLoading: isLoadingProviders} = useQuery({
        queryKey: ['oauthProviders'],
        queryFn: async () => {
            try {
                const response = await fetch('/api/auth/oauth/providers')
                if (!response.ok) return []
                const data = await response.json()
                return data.providers
            } catch (error) {
                console.error('Failed to fetch OAuth providers:', error)
                return []
            }
        },
        staleTime: 60000 // 1 minute
    })

    const emailForm = useForm<EmailForm>({
        resolver: zodResolver(emailSchema),
        defaultValues: {
            email: ''
        }
    })

    const passwordForm = useForm<PasswordForm>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            password: ''
        }
    })

    useEffect(() => {
        setSupportsWebAuthn(browserSupportsWebAuthn())
    }, [])

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const redirectParam = searchParams.get('redirectTo') || searchParams.get('from')
        if (redirectParam) {
            setRedirectTo(redirectParam)
        }

        const handleOAuthRedirect = async () => {
            const oauthComplete = searchParams.get('oauth_complete')

            if (oauthComplete === 'true') {
                try {
                    // Show success state and confetti, then redirect
                    setIsSuccess(true)
                    setTimeout(() => {
                        fireConfetti()
                    }, 300)

                    // Redirect with window.location after a short delay
                    setTimeout(() => {
                        window.location.href = redirectTo || '/dashboard'
                    }, 1500)
                } catch (err) {
                    console.error('OAuth redirect error:', err)
                    setError('Failed to complete login')
                }
            }
        }

        if (user && !authLoading) {
            // Show success state and confetti, then redirect
            setIsSuccess(true)
            setTimeout(() => {
                fireConfetti()
            }, 300)

            setTimeout(() => {
                window.location.href = redirectTo
            }, 1500)
        } else {
            // Check for OAuth redirects only if not already logged in
            handleOAuthRedirect()
        }

        // Check for error in URL (typically from OAuth callback)
        const errorParam = searchParams.get('error')
        if (errorParam) {
            setError(decodeURIComponent(errorParam))
        }
    }, [user, authLoading, redirectTo])

    const formatBreachCount = (count: number): string => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toLocaleString();
    };

    const onEmailSubmit = async (data: EmailForm) => {
        try {
            setError('')
            const response = await fetch('/api/auth/preview', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email: data.email.toLowerCase()})
            })

            if (!response.ok) {
                throw new Error('Authentication failed')
            }

            const userData = await response.json()
            setUserPreview(userData)
            setStep('password')
        } catch (err: unknown) {
            setError('Unable to find your account')
            console.log(err)
        }
    }

    const onPasswordSubmit = async (data: PasswordForm) => {
        try {
            setError('')
            if (!userPreview) return

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    email: userPreview.email,
                    password: data.password,
                    bypassBreachWarning: false // Initial attempt without bypass
                }),
                credentials: 'include'
            })

            const responseData = await response.json()

            // Handle password breach warning
            if (response.status === 422 && responseData.error === 'password_breached') {
                setPasswordBreach({
                    breachCount: responseData.breachCount,
                    resetUrl: responseData.resetUrl
                });
                setStep('breach-warning')
                return;
            }

            // Handle 2FA requirement
            if (response.status === 403 && responseData.requiresSecondFactor) {
                sessionStorage.setItem('2faSessionToken', responseData.sessionToken)
                sessionStorage.setItem('2faType', responseData.secondFactorType)
                window.location.href = '/two-factor'
                return
            }

            if (!response.ok) {
                throw new Error(responseData.error || 'Authentication failed')
            }

            // Success state with confetti
            setIsSuccess(true)
            setTimeout(() => {
                fireConfetti()
            }, 300)

            // Redirect with window.location
            setTimeout(() => {
                window.location.href = redirectTo
            }, 1500)
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Authentication failed')
            passwordForm.reset()
        }
    }

    // Handle continuing despite breach warning
    const handleContinueWithBreachedPassword = async () => {
        try {
            setError('')
            if (!userPreview) return

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    email: userPreview.email,
                    password: passwordForm.getValues('password'),
                    bypassBreachWarning: true // Bypass the breach warning
                }),
                credentials: 'include'
            })

            const responseData = await response.json()

            // Handle 2FA requirement
            if (response.status === 403 && responseData.requiresSecondFactor) {
                sessionStorage.setItem('2faSessionToken', responseData.sessionToken)
                sessionStorage.setItem('2faType', responseData.secondFactorType)
                window.location.href = '/two-factor'
                return
            }

            if (!response.ok) {
                throw new Error(responseData.error || 'Authentication failed')
            }

            // Success state with confetti
            setIsSuccess(true)
            setTimeout(() => {
                fireConfetti()
            }, 300)

            // Redirect with window.location
            setTimeout(() => {
                window.location.href = redirectTo
            }, 1500)
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Authentication failed')
            setStep('password') // Go back to password form
            setPasswordBreach(null)
        }
    }

    // Handle password reset
    const handlePasswordReset = () => {
        if (passwordBreach?.resetUrl && userPreview?.email) {
            window.location.href = `${passwordBreach.resetUrl}?email=${encodeURIComponent(userPreview.email)}`;
        }
    }

    const handleBack = () => {
        if (step === 'breach-warning') {
            setStep('password')
            setPasswordBreach(null)
        } else {
            setStep('email')
            setError('')
            passwordForm.reset()
            emailForm.reset()
            setUserPreview(null)
        }
    }

    const handleOAuthLogin = (provider: OAuthProvider) => {
        // Create a URL-friendly version of the provider name
        const providerNameForUrl = provider.name
            .toLowerCase()
            .replace(/\s+/g, '') // Remove all whitespace
            .replace(/[^a-z0-9]/g, '') // Remove any non-alphanumeric characters

        // Include redirectTo parameter in the OAuth URL
        window.location.href = `/api/auth/oauth/authorize/${providerNameForUrl}?redirect=${encodeURIComponent(redirectTo)}`
    }

    const handlePasskeyLogin = async () => {
        try {
            setError('')
            setIsAuthenticating(true)

            // Get authentication options
            const optionsResponse = await fetch('/api/auth/passkeys/authenticate/options', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    email: userPreview?.email || emailForm.getValues('email') || undefined
                }),
            })

            if (!optionsResponse.ok) {
                throw new Error('Failed to get authentication options')
            }

            const {options, challenge} = await optionsResponse.json()

            // Start WebAuthn authentication
            const authenticationResponse = await startAuthentication(options)

            // Verify with server
            const verifyResponse = await fetch('/api/auth/passkeys/authenticate/verify', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    response: authenticationResponse,
                    challenge,
                }),
            })

            if (!verifyResponse.ok) {
                const errorData = await verifyResponse.json()
                throw new Error(errorData.error || 'Authentication failed')
            }

            const verifyData = await verifyResponse.json()

            // Check if 2FA is required
            if (verifyData.requiresSecondFactor) {
                sessionStorage.setItem('2faSessionToken', verifyData.sessionToken)
                sessionStorage.setItem('2faType', verifyData.secondFactorType)
                window.location.href = '/two-factor'
                return
            }

            // Success state with confetti
            setIsSuccess(true)
            setTimeout(() => {
                fireConfetti()
            }, 300)

            // Redirect with window.location
            setTimeout(() => {
                window.location.href = redirectTo
            }, 1500)
        } catch (err) {
            console.error('Passkey login error:', err)
            setError(err instanceof Error ? err.message : 'Failed to authenticate with passkey')
        } finally {
            setIsAuthenticating(false)
        }
    }

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword)
    }

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="w-14 h-14 bg-muted/30 rounded-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                </div>
                <p className="text-muted-foreground mt-4">Loading...</p>
            </div>
        )
    }

    return (
        <div>
            <AnimatePresence mode="wait">
                {isSuccess ? (
                    <motion.div
                        key="success"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        className="w-full max-w-sm mx-auto text-center"
                    >
                        <div className="mb-8">
                            <div
                                className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-full flex items-center justify-center mx-auto shadow-md">
                                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400"
                                              strokeWidth={1.5}/>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-2">Login Successful</h2>
                            <p className="text-muted-foreground mb-6">
                                You&apos;ve signed in successfully. Redirecting you now...
                            </p>
                        </div>
                    </motion.div>
                ) : (
                    <div className="w-full max-w-sm mx-auto">
                        <Card className="w-full shadow-lg border-t-4 border-t-primary">
                            <CardContent className="pt-6">
                                <AnimatePresence mode="wait">
                                    {step === 'email' ? (
                                        <motion.div
                                            key="email"
                                            initial={{opacity: 0}}
                                            animate={{opacity: 1}}
                                            exit={{opacity: 0}}
                                            className="space-y-6"
                                        >
                                            <div className="text-center space-y-2">
                                                <h1 className="text-2xl font-bold">Sign in to Changerawr</h1>
                                                <p className="text-sm text-muted-foreground">
                                                    Enter your email to get started
                                                </p>
                                            </div>

                                            {error && (
                                                <Alert variant="destructive">
                                                    <AlertDescription>{error}</AlertDescription>
                                                </Alert>
                                            )}

                                            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                                                  className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="email">Email address</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="email"
                                                            {...emailForm.register('email')}
                                                            type="email"
                                                            placeholder="you@example.com"
                                                            className="h-11 pl-10"
                                                            autoComplete="email"
                                                            autoFocus
                                                            startIcon={<Mail/>}
                                                        />
                                                    </div>
                                                    {emailForm.formState.errors.email && (
                                                        <p className="text-sm text-destructive mt-1">
                                                            {emailForm.formState.errors.email.message}
                                                        </p>
                                                    )}
                                                </div>

                                                <Button
                                                    type="submit"
                                                    className="w-full h-11"
                                                    disabled={emailForm.formState.isSubmitting}
                                                >
                                                    {emailForm.formState.isSubmitting ? (
                                                        <span className="flex items-center gap-2">
                                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                                            Checking...
                                                        </span>
                                                    ) : (
                                                        'Continue'
                                                    )}
                                                </Button>
                                            </form>

                                            {/* Auth Options */}
                                            {(supportsWebAuthn || (!isLoadingProviders && oauthProviders && oauthProviders.length > 0)) && (
                                                <div>
                                                    <div className="relative my-6">
                                                        <div className="absolute inset-0 flex items-center">
                                                            <span className="w-full border-t"/>
                                                        </div>
                                                        <div className="relative flex justify-center text-xs uppercase">
                                                            <span className="bg-background px-2 text-muted-foreground">
                                                                Or continue with
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-3 mt-6">
                                                        {/* Passkey Button */}
                                                        {supportsWebAuthn && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="w-full h-11"
                                                                onClick={handlePasskeyLogin}
                                                                disabled={isAuthenticating}
                                                            >
                                                                {isAuthenticating ? (
                                                                    <span className="flex items-center gap-2">
                                                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                                                        Authenticating...
                                                                    </span>
                                                                ) : (
                                                                    <>
                                                                        <Fingerprint className="mr-2 h-4 w-4"/>
                                                                        Sign in with Passkey
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}

                                                        {/* OAuth Provider Buttons */}
                                                        {!isLoadingProviders && oauthProviders && oauthProviders.map((provider: OAuthProvider) => (
                                                            <Button
                                                                key={provider.id}
                                                                variant="outline"
                                                                type="button"
                                                                className="w-full h-11 relative pl-10"
                                                                onClick={() => handleOAuthLogin(provider)}
                                                            >
                                                                <span
                                                                    className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                                                    <ProviderLogo providerName={provider.name}
                                                                                  size="sm"/>
                                                                </span>
                                                                <span>Continue with {provider.name}</span>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ) : step === 'password' ? (
                                        <motion.div
                                            key="password"
                                            initial={{opacity: 0}}
                                            animate={{opacity: 1}}
                                            exit={{opacity: 0}}
                                            className="space-y-6"
                                        >
                                            <Button
                                                variant="ghost"
                                                className="p-0 h-auto text-muted-foreground hover:text-foreground mb-2"
                                                onClick={handleBack}
                                            >
                                                <ArrowLeft size={16} className="mr-2"/>
                                                Back
                                            </Button>

                                            <div className="flex flex-col items-center space-y-4">
                                                <Avatar
                                                    className="h-20 w-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg shadow-sm">
                                                    <AvatarImage
                                                        src={userPreview?.avatarUrl}
                                                        alt={userPreview?.name || "User avatar"}
                                                    />
                                                    <AvatarFallback className="rounded-lg">
                                                        <User className="h-10 w-10 text-primary"/>
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="space-y-1 text-center">
                                                    <h2 className="text-xl font-semibold">
                                                        Welcome back{userPreview?.name ? `, ${userPreview.name}` : ''}
                                                    </h2>
                                                    <p className="text-sm text-muted-foreground">{userPreview?.email}</p>
                                                </div>
                                            </div>

                                            {error && (
                                                <Alert variant="destructive">
                                                    <AlertDescription>{error}</AlertDescription>
                                                </Alert>
                                            )}

                                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                                                  className="space-y-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor="password">Password</Label>
                                                        <Link
                                                            href="/forgot-password"
                                                            className="text-xs font-medium text-primary hover:underline"
                                                        >
                                                            Forgot password?
                                                        </Link>
                                                    </div>
                                                    <div className="relative">
                                                        <Lock
                                                            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                                        <Input
                                                            id="password"
                                                            {...passwordForm.register('password')}
                                                            type={showPassword ? 'text' : 'password'}
                                                            placeholder="••••••••"
                                                            className="h-11 pl-10 pr-10"
                                                            autoComplete="current-password"
                                                            autoFocus
                                                            startIcon={<Key/>}
                                                        />
                                                        <Button
                                                            type="button" variant="ghost"
                                                            size="sm"
                                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                            onClick={togglePasswordVisibility}
                                                        >
                                                            {showPassword ? (
                                                                <EyeOff className="h-4 w-4 text-muted-foreground"/>
                                                            ) : (
                                                                <Eye className="h-4 w-4 text-muted-foreground"/>
                                                            )}
                                                        </Button>
                                                    </div>
                                                    {passwordForm.formState.errors.password && (
                                                        <p className="text-sm text-destructive mt-1">
                                                            {passwordForm.formState.errors.password.message}
                                                        </p>
                                                    )}
                                                </div>

                                                <Button
                                                    type="submit"
                                                    className="w-full h-11"
                                                    disabled={passwordForm.formState.isSubmitting}
                                                >
                                                    {passwordForm.formState.isSubmitting ? (
                                                        <span className="flex items-center gap-2">
                                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                                            Signing in...
                                                        </span>
                                                    ) : (
                                                        'Sign in'
                                                    )}
                                                </Button>
                                            </form>

                                            {/* Show passkey option in password step too */}
                                            {supportsWebAuthn && (
                                                <div>
                                                    <div className="relative my-6">
                                                        <div className="absolute inset-0 flex items-center">
                                                            <span className="w-full border-t"/>
                                                        </div>
                                                        <div className="relative flex justify-center text-xs uppercase">
                                                            <span className="bg-background px-2 text-muted-foreground">
                                                                Or
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="w-full h-11"
                                                        onClick={handlePasskeyLogin}
                                                        disabled={isAuthenticating}
                                                    >
                                                        {isAuthenticating ? (
                                                            <span className="flex items-center gap-2">
                                                                <Loader2 className="h-4 w-4 animate-spin"/>
                                                                Authenticating...
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <Fingerprint className="mr-2 h-4 w-4"/>
                                                                Use Passkey Instead
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </motion.div>
                                    ) : step === 'breach-warning' ? (
                                        <motion.div
                                            key="breach-warning"
                                            initial={{opacity: 0, scale: 0.95}}
                                            animate={{opacity: 1, scale: 1}}
                                            exit={{opacity: 0, scale: 0.95}}
                                            className="space-y-6"
                                        >
                                            <Button
                                                variant="ghost"
                                                className="p-0 h-auto text-muted-foreground hover:text-foreground mb-2"
                                                onClick={handleBack}
                                            >
                                                <ArrowLeft size={16} className="mr-2"/>
                                                Back
                                            </Button>

                                            <div className="text-center space-y-4">
                                                <div
                                                    className="w-16 h-16 bg-gradient-to-br from-amber-100 to-red-100 dark:from-amber-900/30 dark:to-red-900/30 rounded-full flex items-center justify-center mx-auto">
                                                    <AlertTriangle
                                                        className="h-8 w-8 text-amber-600 dark:text-amber-400"/>
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100">
                                                        Password Security Alert
                                                    </h2>
                                                    <p className="text-sm text-muted-foreground mt-2">
                                                        Your password was found in a data breach
                                                    </p>
                                                </div>
                                            </div>

                                            <Alert
                                                variant="warning"
                                                icon={<Shield className="h-4 w-4"/>}
                                                className="border-amber-200 dark:border-amber-800"
                                            >
                                                <AlertTitle>Security Notice</AlertTitle>
                                                <AlertDescription>
                                                    This password has appeared in{' '}
                                                    <span className="font-semibold text-red-600 dark:text-red-400">
                                                        {passwordBreach ? formatBreachCount(passwordBreach.breachCount) : '0'} known data breach{passwordBreach && passwordBreach.breachCount === 1 ? '' : 'es'}
                                                    </span>
                                                    . Using it puts your account at risk.
                                                </AlertDescription>
                                            </Alert>

                                            <div className="space-y-3">
                                                <h4 className="font-medium text-sm">What does this mean?</h4>
                                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                                    <li>Your password has been compromised in past security incidents
                                                    </li>
                                                    <li>Attackers may have access to this password</li>
                                                    <li>Your account security could be at risk</li>
                                                </ul>
                                            </div>

                                            <div className="grid gap-3">
                                                <Button
                                                    onClick={handlePasswordReset}
                                                    className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
                                                    disabled={passwordForm.formState.isSubmitting}
                                                >
                                                    <RefreshCw className="mr-2 h-4 w-4"/>
                                                    Reset Password (Recommended)
                                                </Button>

                                                <div className="relative">
                                                    <div className="absolute inset-0 flex items-center">
                                                        <span className="w-full border-t border-muted-foreground/20"/>
                                                    </div>
                                                    <div className="relative flex justify-center text-xs uppercase">
                                                        <span className="bg-background px-2 text-muted-foreground">
                                                            Or
                                                        </span>
                                                    </div>
                                                </div>

                                                <Button
                                                    onClick={handleContinueWithBreachedPassword}
                                                    variant="outline"
                                                    className="w-full h-11 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/20"
                                                    disabled={passwordForm.formState.isSubmitting}
                                                >
                                                    <ArrowRight className="mr-2 h-4 w-4"/>
                                                    Continue Anyway (Not Recommended)
                                                </Button>
                                            </div>

                                            <div className="text-xs text-muted-foreground text-center space-y-1">
                                                <p>
                                                    Password checking powered by{' '}
                                                    <a
                                                        href="https://haveibeenpwned.com/Passwords"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline"
                                                    >
                                                        HaveIBeenPwned
                                                    </a>
                                                </p>
                                                <p>Your password is never transmitted - only a secure hash is
                                                    checked.</p>
                                            </div>
                                        </motion.div>
                                    ) : null}
                                </AnimatePresence>
                            </CardContent>

                            <CardFooter className="pb-6 flex justify-center">
                                {step === 'email' && (
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground">
                                            Don&apos;t have an account?{' '}
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="link" className="p-0 h-auto text-primary"
                                                                onClick={() => setError("Contact your administrator for an invitation to join.")}>
                                                            Request access
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="max-w-xs">You need an invitation to create an
                                                            account</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </p>
                                    </div>
                                )}
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}