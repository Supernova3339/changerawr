'use client';

import React, {useState, useEffect} from 'react';
import {Loader2, CheckCircle2} from 'lucide-react';
import {ThemeStep} from '@/components/setup/steps/theme-step';
import {WelcomeStep} from '@/components/setup/steps/welcome-step';
import {AdminStep} from '@/components/setup/steps/admin-step';
import {SettingsStep} from '@/components/setup/steps/settings-step';
import {OAuthStep} from '@/components/setup/steps/oauth-step';
import {TeamStep} from '@/components/setup/steps/team-step'; // New import
import {CompletionStep} from '@/components/setup/steps/completion-step';
import {SetupBackground} from '@/components/setup/setup-background';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import Link from 'next/link';
import {SetupProvider, useSetup} from '@/components/setup/setup-context';
import {motion, AnimatePresence} from 'framer-motion';

const VISIBLE_STEPS = ['welcome', 'admin', 'settings', 'oauth', 'team', 'complete'];

function StepIndicator() {
    const {currentStep} = useSetup();
    const currentIndex = VISIBLE_STEPS.indexOf(currentStep);

    return (
        <div className="flex justify-center items-center gap-2 mb-6">
            {VISIBLE_STEPS.map((step, index) => (
                <div
                    key={step}
                    className={`h-2 rounded-full transition-all ${
                        index === currentIndex
                            ? 'bg-primary w-8'
                            : index < currentIndex
                                ? 'bg-primary w-2'
                                : 'bg-muted w-2'
                    }`}
                />
            ))}
        </div>
    );
}

function SetupContent() {
    const {currentStep, goToNextStep, goToPreviousStep, skipCurrentStep} = useSetup();
    const isTheme = currentStep === 'theme';

    // The theme step is a full-bleed, full-screen experience with its own
    // background — it replaces the normal card layout entirely rather than
    // sitting inside it. Both branches share one AnimatePresence so going
    // back from Welcome into the theme picker cross-fades instead of
    // hard-cutting between the two layouts.
    return (
        <AnimatePresence mode="wait">
            {isTheme ? (
                <motion.div
                    key="theme"
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    transition={{duration: 0.4}}
                >
                    <ThemeStep onNext={goToNextStep}/>
                </motion.div>
            ) : (
                <motion.div
                    key="wizard"
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    transition={{duration: 0.4}}
                >
                    <SetupBackground/>
                    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 space-y-6">
                        <StepIndicator/>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{opacity: 0, y: 10}}
                                animate={{opacity: 1, y: 0}}
                                exit={{opacity: 0, y: -10}}
                                transition={{duration: 0.3}}
                                className="w-full flex justify-center"
                            >
                                {currentStep === 'welcome' && (
                                    <WelcomeStep onNext={goToNextStep} onBack={goToPreviousStep}/>
                                )}

                                {currentStep === 'admin' && (
                                    <AdminStep onNext={goToNextStep} onBack={goToPreviousStep}/>
                                )}

                                {currentStep === 'settings' && (
                                    <SettingsStep onNext={goToNextStep} onBack={goToPreviousStep}/>
                                )}

                                {currentStep === 'oauth' && (
                                    <OAuthStep onNext={goToNextStep} onBack={goToPreviousStep}/>
                                )}

                                {currentStep === 'team' && (
                                    <TeamStep
                                        onNext={goToNextStep}
                                        onBack={goToPreviousStep}
                                        onSkip={skipCurrentStep}
                                    />
                                )}

                                {currentStep === 'complete' && (
                                    <CompletionStep/>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default function SetupPage() {
    const [error, setError] = useState<string>('');
    const [isChecking, setIsChecking] = useState(true);
    const [canSetup, setCanSetup] = useState(false);
    const [copied, setCopied] = useState(false);

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

    useEffect(() => {
        const checkSetup = async () => {
            try {
                const response = await fetch('/api/setup/status');

                if (!response.ok) {
                    throw new Error('Failed to check setup status');
                }

                const data = await response.json();

                setCanSetup(!data.isComplete);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to check setup status');
            } finally {
                setIsChecking(false);
            }
        };

        checkSetup();
    }, []);

    if (isChecking) {
        return (
            <>
                <SetupBackground/>
                <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                        <p>Checking setup status...</p>
                    </div>
                </div>
            </>
        );
    }

    if (!canSetup) {

        return (
            <>
                <SetupBackground/>
                <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-4">
                    <div className="text-center space-y-2">
                        <CheckCircle2 className="h-12 w-12 text-primary mx-auto"/>
                        <h1 className="text-2xl font-bold">Setup Already Completed</h1>
                        <p className="text-muted-foreground">The system has already been configured.</p>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex items-start space-x-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                        <div className="flex-1">
                            <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-2">Next Step</h3>
                            <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                                Add this to your <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded text-xs">.env</code> file:
                            </p>

                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded font-mono text-sm">
                                    {envVariable}
                                </code>
                                <Button
                                    onClick={copyToClipboard}
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0"
                                >
                                    {copied ? 'Copied!' : 'Copy'}
                                </Button>
                            </div>

                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                                Restart your service after adding this variable.
                            </p>
                        </div>
                    </div>

                    <Button asChild className="w-full">
                        <Link href="/login">Go to Login</Link>
                    </Button>
                </div>
                </div>
            </>
        );
    }

    return (
        <SetupProvider>
            <SetupContent/>
        </SetupProvider>
    );
}