'use client';

import React from 'react';
import { SetupStep } from '@/components/setup/setup-step';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Bell, ArrowRight, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

// Use a type alias instead of an interface ( migration )
type CompletionStepProps = Record<string, never>;

export function CompletionStep({}: CompletionStepProps) {
    const router = useRouter();
    const [copied, setCopied] = React.useState(false);

    const envVariable = 'SETUP_COMPLETE=true';

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(envVariable);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Mark the wizard as finished server-side. Setup-only endpoints
    // (settings/oauth/invitations) stay reachable until this fires, since an
    // admin account already exists well before this point.
    React.useEffect(() => {
        fetch('/api/setup/complete', { method: 'POST' }).catch((err) => {
            console.error('Failed to mark setup as complete:', err);
        });
    }, []);

    // Trigger confetti on mount
    React.useEffect(() => {
        // Only run in browser
        if (typeof window !== 'undefined') {
            const duration = 3000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#16a34a', '#3b82f6', '#8b5cf6']
                });

                confetti({
                    particleCount: 2,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#16a34a', '#3b82f6', '#8b5cf6']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };

            frame();
        }
    }, []);

    return (
        <SetupStep
            title="Setup Complete!"
            description="Your system has been configured successfully"
            icon={
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 10,
                        delay: 0.2
                    }}
                >
                    <CheckCircle2 className="h-16 w-16 text-primary" />
                </motion.div>
            }
            hideFooter={true}
        >
            <div className="space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-4"
                >
                    <div className="p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900 rounded-lg">
                        <p className="text-green-800 dark:text-green-300">
                            Your setup is complete! You can now access all features of Changerawr.
                        </p>
                    </div>

                    <div className="flex items-start space-x-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                        <Bell className="h-6 w-6 mt-1 text-amber-600 dark:text-amber-400" />
                        <div className="flex-1">
                            <h3 className="font-medium text-amber-900 dark:text-amber-100">Important: Update Your Environment</h3>
                            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                                Add the following variable to your <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded text-xs">.env</code> file:
                            </p>

                            <div className="mt-3 flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded font-mono text-sm">
                                    {envVariable}
                                </code>
                                <Button
                                    onClick={copyToClipboard}
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-4 w-4 mr-1" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4 mr-1" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </div>

                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                                After adding this to your .env file, restart your service for the changes to take effect.
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                >
                    <Button
                        onClick={() => router.push('/login')}
                        className="w-full"
                        size="lg"
                    >
                        Go to Login
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </motion.div>
            </div>
        </SetupStep>
    );
}