'use client';

import React from 'react';
import { Globe, Heart, ShieldCheck, User, Users } from 'lucide-react';
import { SetupStep } from '@/components/setup/setup-step';
import { appInfo } from '@/lib/app-info';

interface WelcomeStepProps {
    onNext: () => void;
    onBack: () => void;
}

const roadmap = [
    { icon: User, title: 'Admin Account', description: 'Create your administrator login' },
    { icon: Globe, title: 'Preferences', description: 'Timezone for dates and scheduling' },
    { icon: ShieldCheck, title: 'Single Sign-On', description: 'Optional — connect an SSO provider' },
    { icon: Users, title: 'Invite Your Team', description: 'Optional — send invite links' },
];

const LICENSE_URL = 'https://github.com/Supernova3339/changerawr/blob/master/LICENSE';

export function WelcomeStep({ onNext, onBack }: WelcomeStepProps) {
    return (
        <SetupStep
            title="Welcome to Changerawr"
            description="Thanks for choosing SuperSoft (Supernova Software, LLC) as your changelogging provider. Here's what's next:"
            onNext={onNext}
            onBack={onBack}
            hideFooter={false}
            nextLabel="Get Started"
        >
            <div className="space-y-6">
                <div className="space-y-4">
                    {roadmap.map(({ icon: Icon, title, description }) => (
                        <div key={title} className="flex items-start gap-3">
                            <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                                <div className="text-sm font-medium">{title}</div>
                                <div className="text-sm text-muted-foreground">{description}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <a
                    href={appInfo.sponsors_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit"
                >
                    <Heart className="h-4 w-4" />
                    <span className="underline underline-offset-4">
                        Sponsor Changerawr for an extended license
                    </span>
                </a>

                <p className="text-xs text-muted-foreground">
                    By installing this software, you agree to the{' '}
                    <a
                        href={LICENSE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                    >
                        Changerawr License
                    </a>
                    , whether you&apos;ve read it or not.
                </p>
            </div>
        </SetupStep>
    );
}
