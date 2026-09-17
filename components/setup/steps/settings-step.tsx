// components/setup/steps/settings-step.tsx
'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SetupStep } from '@/components/setup/setup-step';
import { Label } from '@/components/ui/label';
import { useSetup } from '@/components/setup/setup-context';
import { toast } from '@/hooks/use-toast';
import { Globe } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getTimezonesByRegion } from '@/lib/constants/timezones';

interface SettingsStepProps {
    onNext: () => void;
    onBack: () => void;
}

// Only the timezone matters at install time (it affects date-based version
// templates and scheduling from the first entry onward). Everything else
// SystemConfig exposes (changelog limits, approval workflow, analytics,
// notifications, invitation expiry, etc.) already has sane defaults and is
// fully editable later in Admin -> System. Theme lives on the account
// itself and is picked in the very first wizard step instead.
const settingsSchema = z.object({
    timezone: z.string().min(1).max(100).default('UTC'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function SettingsStep({ onNext, onBack }: SettingsStepProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { markStepCompleted, isStepCompleted } = useSetup();
    const isCompleted = isStepCompleted('settings');

    const {
        handleSubmit,
        setValue,
        watch,
    } = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }
    });

    const saveSettings = async (data: SettingsFormValues) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/setup/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || 'Failed to save system settings');
            }

            markStepCompleted('settings');
            toast({
                title: 'Success',
                description: 'System settings saved successfully',
            });
            onNext();
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to save system settings',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const onSubmit = async (data: SettingsFormValues) => {
        if (isCompleted) {
            onNext();
            return;
        }
        await saveSettings(data);
    };

    const handleSkip = async () => {
        if (isCompleted) {
            onNext();
            return;
        }
        // Still creates SystemConfig (required for setup to be considered
        // complete) but with every default, including the browser-detected timezone.
        await saveSettings({ timezone: watch('timezone') });
    };

    return (
        <SetupStep
            title="Timezone"
            description="Used for date-based version templates and scheduling"
            icon={<Globe className="h-10 w-10 text-primary" />}
            onNext={isCompleted ? onNext : undefined}
            onBack={onBack}
            isLoading={isSubmitting}
            isComplete={isCompleted}
            hideFooter={!isCompleted}
        >
            <form id="settingsForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        Timezone
                    </Label>
                    <SearchableSelect
                        value={watch('timezone')}
                        onValueChange={(value) => setValue('timezone', value)}
                        placeholder="Select timezone"
                        searchPlaceholder="Search timezones..."
                        groups={Object.entries(getTimezonesByRegion()).map(([region, tzs]) => ({
                            heading: region,
                            items: tzs.map(tz => ({
                                value: tz.value,
                                label: `${tz.label} (${tz.value})`,
                                searchValue: `${tz.label} ${tz.value} ${region}`,
                            })),
                        }))}
                    />
                    <p className="text-sm text-muted-foreground">
                        Everything else (changelog limits, approval workflow, analytics,
                        notifications, invitation expiry) has a sensible default and can be
                        changed any time in Admin → System.
                    </p>
                </div>

                {!isCompleted && (
                    <div className="pt-4 space-y-2">
                        <button
                            type="submit"
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-md font-medium disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : 'Continue'}
                        </button>
                        <button
                            type="button"
                            onClick={handleSkip}
                            disabled={isSubmitting}
                            className="w-full text-sm text-muted-foreground hover:text-foreground py-1 disabled:opacity-50"
                        >
                            Skip — use defaults
                        </button>
                    </div>
                )}
            </form>
        </SetupStep>
    );
}
