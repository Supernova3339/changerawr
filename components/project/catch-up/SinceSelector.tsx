'use client';

import {useQuery} from '@tanstack/react-query';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {Label} from '@/components/ui/label';
import {Calendar, Clock, GitBranch, User} from 'lucide-react';
import type {SinceOption} from '@/lib/types/projects/catch-up/types';

interface SinceSelectorProps {
    value: string;
    onChange: (value: string) => void;
    projectId: string;
}

export function SinceSelector({value, onChange, projectId}: SinceSelectorProps) {

    // Fetch recent versions for the selector
    const {data: versions} = useQuery<{ versions: string[] }>({
        queryKey: ['project-versions', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/versions`);
            if (!response.ok) throw new Error('Failed to fetch versions');
            return response.json();
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    const baseOptions: SinceOption[] = [
        {
            label: 'My last login',
            value: 'auto',
            type: 'auto',
            description: 'Show changes since I was last here',
        },
        {
            label: 'Last 24 hours',
            value: '1d',
            type: 'relative',
            description: 'Changes in the past day',
        },
        {
            label: 'Last 7 days',
            value: '7d',
            type: 'relative',
            description: 'Changes in the past week',
        },
        {
            label: 'Last 30 days',
            value: '30d',
            type: 'relative',
            description: 'Changes in the past month',
        },
    ];

    // Add recent versions to options
    const versionOptions: SinceOption[] = versions?.versions
        ?.slice(0, 5) // Only show last 5 versions
        ?.map(version => ({
            label: `Since ${version}`,
            value: version,
            type: 'version',
            description: `Changes since version ${version}`,
        })) || [];

    const allOptions = [
        ...baseOptions,
        ...(versionOptions.length > 0 ? versionOptions : []),
    ];

    const getIcon = (type: SinceOption['type']) => {
        switch (type) {
            case 'auto':
                return <User className="h-4 w-4"/>;
            case 'relative':
                return <Clock className="h-4 w-4"/>;
            case 'version':
                return <GitBranch className="h-4 w-4"/>;
            case 'date':
                return <Calendar className="h-4 w-4"/>;
            default:
                return <Clock className="h-4 w-4"/>;
        }
    };

    const selectedOption = allOptions.find(option => option.value === value);

    return (
        <div className="space-y-2">
            <Label htmlFor="since-selector" className="text-sm font-medium">
                Show me what&apos;s new since:
            </Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger id="since-selector" className="w-full">
                    <SelectValue>
                        <div className="flex items-center gap-2">
                            {selectedOption && getIcon(selectedOption.type)}
                            <span>{selectedOption?.label || value}</span>
                        </div>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {baseOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-start gap-2 py-1">
                                {getIcon(option.type)}
                                <div className="flex-1">
                                    <div className="font-medium">{option.label}</div>
                                    {option.description && (
                                        <div className="text-xs text-muted-foreground">
                                            {option.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </SelectItem>
                    ))}

                    {versionOptions.length > 0 && (
                        <>
                            <div className="px-2 py-1.5">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Recent Versions
                                </div>
                            </div>
                            {versionOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-start gap-2 py-1">
                                        {getIcon(option.type)}
                                        <div className="flex-1">
                                            <div className="font-medium">{option.label}</div>
                                            {option.description && (
                                                <div className="text-xs text-muted-foreground">
                                                    {option.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </SelectItem>
                            ))}
                        </>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}