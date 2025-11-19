'use client';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Skeleton} from '@/components/ui/skeleton';
import {Copy, Clock, Tag, TrendingUp, Bug, Zap, GitBranch, Calendar, Sparkles, Bot} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';
import {SinceSelector} from './SinceSelector';
import type {CatchUpResponse} from '@/lib/types/projects/catch-up/types';
import {formatDistanceToNow, format} from 'date-fns';
import Link from 'next/link';

interface CatchUpViewProps {
    projectId: string;
}

interface TimelineEntryProps {
    entry: CatchUpResponse['entries'][0];
    isLast: boolean;
}

function TimelineEntry({entry, isLast}: TimelineEntryProps) {
    const publishedDate = entry.publishedAt ? new Date(entry.publishedAt) : null;
    const isPublished = !!entry.publishedAt;

    return (
        <div className="relative">
            {/* Timeline line */}
            {!isLast && (
                <div className="absolute left-6 top-16 bottom-0 w-px bg-gradient-to-b from-border to-transparent"/>
            )}

            {/* Timeline dot */}
            <div className="relative flex items-start gap-6">
                <div className={`
          relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-sm
          ${isPublished
                    ? 'bg-green-100 border-green-300 dark:bg-green-900/20 dark:border-green-600'
                    : 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-600'
                }
        `}>
                    {entry.version ? (
                        <GitBranch
                            className={`h-5 w-5 ${isPublished ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}/>
                    ) : (
                        <Clock
                            className={`h-5 w-5 ${isPublished ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}/>
                    )}

                    {/* Pulse animation for recent entries */}
                    {publishedDate && Date.now() - publishedDate.getTime() < 7 * 24 * 60 * 60 * 1000 && (
                        <div
                            className={`absolute inset-0 rounded-full animate-ping ${isPublished ? 'bg-green-400' : 'bg-yellow-400'} opacity-20`}/>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                    <Card className="transition-all hover:shadow-md border-l-4 border-l-primary/20">
                        <CardContent className="p-6">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant={isPublished ? "default" : "secondary"} className="text-xs">
                                            {isPublished ? 'Published' : 'Draft'}
                                        </Badge>
                                        {entry.version && (
                                            <Badge variant="outline" className="text-xs font-mono">
                                                {entry.version}
                                            </Badge>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-lg leading-tight mb-2">
                                        {entry.title}
                                    </h3>
                                </div>

                                {publishedDate && (
                                    <div className="text-right text-sm text-muted-foreground">
                                        <div className="font-medium">
                                            {formatDistanceToNow(publishedDate, {addSuffix: true})}
                                        </div>
                                        <div className="text-xs">
                                            {format(publishedDate, 'MMM d, yyyy')}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            {entry.tags && entry.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {entry.tags.map((tag) => (
                                        <Badge
                                            key={tag.id}
                                            variant="secondary"
                                            className="text-xs"
                                            style={
                                                tag.color
                                                    ? {
                                                        backgroundColor: `${tag.color}15`,
                                                        borderColor: `${tag.color}40`,
                                                        color: tag.color,
                                                    }
                                                    : undefined
                                            }
                                        >
                                            {tag.name}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Content preview */}
                            {entry.content && (
                                <div className="text-sm text-muted-foreground leading-relaxed">
                                    {entry.content.length > 150
                                        ? `${entry.content.substring(0, 150)}...`
                                        : entry.content
                                    }
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export function CatchUpView({projectId}: CatchUpViewProps) {
    const [since, setSince] = useState('auto');
    const {toast} = useToast();

    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery<CatchUpResponse>({
        queryKey: ['catch-up', projectId, since],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/catch-up?since=${encodeURIComponent(since)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch catch-up data');
            }
            return response.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const handleCopySummary = async () => {
        if (!data) return;

        const summary = `Changelog Summary

From: ${new Date(data.fromDate).toLocaleDateString()}${data.fromVersion ? ` (${data.fromVersion})` : ''}
To: ${data.toVersion || 'Latest'}

📊 ${data.totalEntries} total updates
✨ ${data.summary.features} features
🐛 ${data.summary.fixes} fixes  
📝 ${data.summary.other} other changes

${data.entries.map(entry =>
            `• ${entry.title}${entry.version ? ` (${entry.version})` : ''}`
        ).join('\n')}`;

        try {
            await navigator.clipboard.writeText(summary);
            toast({
                title: "Success",
                description: "Summary copied to clipboard!",
            });
        } catch {
            toast({
                title: "Error",
                description: "Failed to copy summary",
                variant: "destructive",
            });
        }
    };

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Error</CardTitle>
                    <CardDescription>
                        Failed to load catch-up data. Please try again.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => refetch()} variant="outline">
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Enhanced Feature Promotion */}
            <Card
                className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-purple/5 relative overflow-hidden">
                <div
                    className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16"/>
                <CardHeader className="relative">
                    <div className="flex items-start justify-between">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-primary"/>
                                </div>
                                <div>
                                    <CardTitle className="text-2xl">Catch-Up</CardTitle>
                                    <CardDescription className="text-base mt-1">
                                        Here&apos;s what happened while you were away
                                    </CardDescription>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pl-13">
                                <Button asChild className="gap-2 shadow-lg">
                                    <Link href={`/dashboard/projects/${projectId}/catch-up`}>
                                        <Bot className="h-4 w-4"/>
                                        Enhanced Catch-Up
                                        <Badge variant="secondary" className="gap-1 text-xs ml-1 bg-background/80">
                                            <Sparkles className="h-3 w-3"/>
                                            AI
                                        </Badge>
                                    </Link>
                                </Button>

                                <div className="text-xs text-muted-foreground">
                                    Get smart summaries and insights
                                    <br/>
                                    <span className="font-medium">Note:</span> Requires AI features enabled
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={() => refetch()}
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                        >
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <SinceSelector value={since} onChange={setSince} projectId={projectId}/>
                </CardContent>
            </Card>

            {/* Summary Stats */}
            {isLoading ? (
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-48"/>
                            <div className="flex gap-2">
                                <Skeleton className="h-6 w-20"/>
                                <Skeleton className="h-6 w-20"/>
                                <Skeleton className="h-6 w-20"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : data ? (
                <Card className="bg-gradient-to-r from-muted/30 to-muted/10 border-muted">
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="text-center">
                                {data.totalEntries === 0 ? (
                                    <div className="py-4">
                                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                            All caught up! 🎉
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            No new changes
                                            since {formatDistanceToNow(new Date(data.fromDate), {addSuffix: true})}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold">
                                            📖 {data.totalEntries} update{data.totalEntries !== 1 ? 's' : ''} since{' '}
                                            {formatDistanceToNow(new Date(data.fromDate), {addSuffix: true})}
                                            {data.fromVersion && ` (${data.fromVersion})`}
                                        </h3>

                                        <div className="flex justify-center gap-4 flex-wrap">
                                            {data.summary.features > 0 && (
                                                <div
                                                    className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                                                    <Zap className="h-4 w-4 text-green-600 dark:text-green-400"/>
                                                    <span
                                                        className="text-sm font-medium text-green-700 dark:text-green-300">
                                                        {data.summary.features} feature{data.summary.features !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            )}

                                            {data.summary.fixes > 0 && (
                                                <div
                                                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                                                    <Bug className="h-4 w-4 text-blue-600 dark:text-blue-400"/>
                                                    <span
                                                        className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                                        {data.summary.fixes} fix{data.summary.fixes !== 1 ? 'es' : ''}
                                                    </span>
                                                </div>
                                            )}

                                            {data.summary.other > 0 && (
                                                <div
                                                    className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                                                    <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400"/>
                                                    <span
                                                        className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                                        {data.summary.other} other
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            onClick={handleCopySummary}
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 bg-background/80"
                                        >
                                            <Copy className="h-4 w-4"/>
                                            Copy Summary
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {/* Timeline */}
            {data && data.entries.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-muted-foreground"/>
                        <h3 className="text-xl font-semibold">Timeline</h3>
                        <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent"/>
                    </div>

                    <div className="space-y-0">
                        {data.entries.map((entry, index) => (
                            <TimelineEntry
                                key={entry.id}
                                entry={entry}
                                isLast={index === data.entries.length - 1}
                            />
                        ))}
                    </div>

                    {/* Timeline end */}
                    <div className="flex items-center justify-center py-6">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="h-px w-12 bg-gradient-to-r from-transparent to-border"/>
                            <Calendar className="h-4 w-4"/>
                            <span>You&apos;re all caught up!</span>
                            <div className="h-px w-12 bg-gradient-to-l from-transparent to-border"/>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}