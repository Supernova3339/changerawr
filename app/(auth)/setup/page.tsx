'use client';

import React, {useState, useEffect} from 'react';
import {Loader2, CheckCircle2} from 'lucide-react';
import {WelcomeStep} from '@/components/setup/steps/welcome-step';
import {AdminStep} from '@/components/setup/steps/admin-step';
import {SettingsStep} from '@/components/setup/steps/settings-step';
import {OAuthStep} from '@/components/setup/steps/oauth-step';
import {TeamStep} from '@/components/setup/steps/team-step'; // New import
import {CompletionStep} from '@/components/setup/steps/completion-step';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import Link from 'next/link';
import {SetupProvider, useSetup} from '@/components/setup/setup-context';
import {motion, AnimatePresence} from 'framer-motion';

function StepIndicator() {
    const {currentStep} = useSetup();
    const steps = ['welcome', 'admin', 'settings', 'oauth', 'team', 'complete'];
    const currentIndex = steps.indexOf(currentStep);

    return (
        <div className="flex justify-center items-center gap-2 mb-6">
            {steps.map((step, index) => (
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

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-6">
            <StepIndicator/>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -10}}
                    transition={{duration: 0.3}}
                    className="w-full"
                >
                    {currentStep === 'welcome' && (
                        <WelcomeStep onNext={goToNextStep}/>
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
    );
}

export default function SetupPage() {
    const [error, setError] = useState<string>('');
    const [isChecking, setIsChecking] = useState(true);
    const [canSetup, setCanSetup] = useState(false);

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
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                    <p>Checking setup status...</p>
                </div>
            </div>
        );
    }

    if (!canSetup) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
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

                    <Button asChild className="w-full">
                        <Link href="/login">Go to Login</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <SetupProvider>
            <SetupContent/>
        </SetupProvider>
    );
}