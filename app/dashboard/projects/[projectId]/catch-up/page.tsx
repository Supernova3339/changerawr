'use client';

import {use, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {motion} from 'framer-motion';
import Link from 'next/link';
import {Calendar, Clock, Copy, FileText, TrendingUp, Sparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {Badge} from '@/components/ui/badge';
import {useToast} from '@/hooks/use-toast';
import {SinceSelector} from '@/components/project/catch-up/SinceSelector';
import type {CatchUpResponse} from '@/lib/types/projects/catch-up/types';
import {formatDistanceToNow, format} from 'date-fns';
import {RenderMarkdown} from "@/components/markdown-editor/RenderMarkdown";

interface CatchUpPageProps {
    params: Promise<{ projectId: string }>;
}

interface ProjectSummaryResponse {
    summary: string;
    highlights: string[];
    tone: 'exciting' | 'steady' | 'minimal';
    readingTime: number;
}

const fadeIn = {
    initial: {opacity: 0, y: 30},
    animate: {opacity: 1, y: 0},
    transition: {duration: 0.7, ease: "easeOut"}
};

const slideIn = {
    initial: {opacity: 0, x: -20},
    animate: {opacity: 1, x: 0},
    transition: {duration: 0.6, ease: "easeOut"}
};

export default function CatchUpPage({params}: CatchUpPageProps) {
    const {projectId} = use(params);
    const [since, setSince] = useState('auto');
    const {toast} = useToast();

    // Fetch catch-up data
    const {
        data: catchUpData,
        isLoading: isLoadingCatchUp,
        error: catchUpError,
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

    // Fetch project summary
    const {
        data: projectSummary,
        isLoading: isLoadingSummary,
        error: summaryError,
    } = useQuery<ProjectSummaryResponse>({
        queryKey: ['project-summary', projectId, since],
        queryFn: async () => {
            if (!catchUpData || catchUpData.totalEntries === 0) {
                return null;
            }

            const response = await fetch(`/api/projects/${projectId}/catch-up/ai-summary`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    since,
                    entries: catchUpData.entries,
                    summary: catchUpData.summary,
                    fromDate: catchUpData.fromDate,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate project summary');
            }

            return response.json();
        },
        enabled: !!catchUpData && catchUpData.totalEntries > 0,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    const handleCopyPost = async () => {
        if (!projectSummary || !catchUpData) return;

        const post = `# What's New Since ${format(new Date(catchUpData.fromDate), 'MMMM do')}

${projectSummary.summary}

---

Published on ${new Date().toLocaleDateString()}`;

        try {
            await navigator.clipboard.writeText(post);
            toast({
                title: "Copied!",
                description: "Post copied to clipboard",
            });
        } catch {
            toast({
                title: "Error",
                description: "Failed to copy post",
                variant: "destructive",
            });
        }
    };

    const isLoading = isLoadingCatchUp || isLoadingSummary;
    const hasError = catchUpError || summaryError;

    if (hasError) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <Card className="max-w-lg w-full">
                    <CardContent className="pt-16 pb-16 text-center space-y-6">
                        <div className="text-8xl">💔</div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-bold">Something went wrong</h2>
                            <p className="text-muted-foreground text-lg">
                                Unable to load your project update right now.
                            </p>
                        </div>
                        <Button onClick={() => window.location.reload()} size="lg">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
            {/* Full Width Header */}
            <div className="w-full border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <div className="flex items-center justify-between">
                        <motion.div initial="initial" animate="animate" variants={slideIn}>
                            <Badge variant="outline" className="gap-2 text-sm">
                                <Calendar className="h-4 w-4"/>
                                {format(new Date(), 'EEEE, MMMM do, yyyy')}
                            </Badge>
                        </motion.div>

                        {projectSummary && (
                            <motion.div
                                initial="initial"
                                animate="animate"
                                variants={slideIn}
                                className="flex items-center gap-4"
                            >
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4"/>
                                        {projectSummary.readingTime} min
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Sparkles className="h-4 w-4"/>
                                        Fresh content
                                    </div>
                                </div>
                                <Button onClick={handleCopyPost} variant="outline" size="sm" className="gap-2">
                                    <Copy className="h-4 w-4"/>
                                    Copy
                                </Button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-12">
                <div className="grid grid-cols-12 gap-12">
                    {/* Left Sidebar - Controls */}
                    <div className="col-span-12 lg:col-span-3 space-y-8">
                        <motion.div
                            initial="initial"
                            animate="animate"
                            variants={fadeIn}
                        >
                            <Card className="sticky top-32">
                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-3">
                                        <h3 className="font-semibold">Time Period</h3>
                                        <p className="text-sm text-muted-foreground">
                                            See what&apos;s changed since a specific point
                                        </p>
                                    </div>
                                    <SinceSelector value={since} onChange={setSince} projectId={projectId}/>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Stats Sidebar */}
                        {catchUpData && catchUpData.totalEntries > 0 && (
                            <motion.div
                                initial="initial"
                                animate="animate"
                                variants={fadeIn}
                                transition={{delay: 0.2}}
                            >
                                <Card>
                                    <CardContent className="p-6 space-y-6">
                                        <h3 className="font-semibold">Update Summary</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Features</span>
                                                <Badge variant="secondary"
                                                       className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                                    {catchUpData.summary.features}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Bug Fixes</span>
                                                <Badge variant="secondary"
                                                       className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                    {catchUpData.summary.fixes}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Improvements</span>
                                                <Badge variant="secondary"
                                                       className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                                    {catchUpData.summary.other}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </div>

                    {/* Main Content Area */}
                    <div className="col-span-12 lg:col-span-9">
                        {/* Hero Section */}
                        <motion.div
                            initial="initial"
                            animate="animate"
                            variants={fadeIn}
                            className="space-y-8 mb-12"
                        >
                            <div className="space-y-6">
                                <h1 className="text-6xl md:text-7xl font-bold leading-tight">
                                    {catchUpData && catchUpData.totalEntries > 0 ? (
                                        <>What&apos;s New Since {format(new Date(catchUpData.fromDate), 'MMMM do')}</>
                                    ) : (
                                        'Project Update'
                                    )}
                                </h1>

                                <p className="text-2xl text-muted-foreground leading-relaxed max-w-4xl">
                                    {catchUpData && catchUpData.totalEntries > 0 ? (
                                        `Catching you up on ${catchUpData.totalEntries} update${catchUpData.totalEntries !== 1 ? 's' : ''} and what they mean for the project`
                                    ) : (
                                        'Stay current with the latest developments and improvements'
                                    )}
                                </p>
                            </div>
                        </motion.div>

                        {/* Loading State */}
                        {isLoading && (
                            <motion.div
                                initial="initial"
                                animate="animate"
                                variants={fadeIn}
                                className="space-y-12"
                            >
                                <div className="space-y-4">
                                    <Skeleton className="h-12 w-full"/>
                                    <Skeleton className="h-8 w-3/4"/>
                                    <Skeleton className="h-6 w-full"/>
                                    <Skeleton className="h-6 w-full"/>
                                    <Skeleton className="h-6 w-2/3"/>
                                </div>
                                <div className="space-y-4">
                                    <Skeleton className="h-6 w-full"/>
                                    <Skeleton className="h-6 w-full"/>
                                    <Skeleton className="h-6 w-4/5"/>
                                </div>
                            </motion.div>
                        )}

                        {/* Empty State */}
                        {catchUpData && catchUpData.totalEntries === 0 && (
                            <motion.div
                                initial="initial"
                                animate="animate"
                                variants={fadeIn}
                                className="text-center py-24"
                            >
                                <div className="space-y-8">
                                    <div className="text-9xl">🎯</div>
                                    <div className="space-y-4">
                                        <h2 className="text-5xl font-bold">You&apos;re All Caught Up!</h2>
                                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                            No new updates
                                            since {formatDistanceToNow(new Date(catchUpData.fromDate), {addSuffix: true})}.
                                            Everything is current and up to date.
                                        </p>
                                    </div>
                                    <Button asChild size="lg" className="rounded-full px-8">
                                        <Link href={`/dashboard/projects/${projectId}/changelog/new`}>
                                            <FileText className="h-5 w-5 mr-2"/>
                                            Create New Update
                                        </Link>
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Main Content */}
                        {catchUpData && projectSummary && catchUpData.totalEntries > 0 && (
                            <motion.div
                                initial="initial"
                                animate="animate"
                                variants={fadeIn}
                                className="space-y-12"
                            >
                                {/* Main Article */}
                                <Card className="border-0 shadow-xl">
                                    <CardContent className="p-16">
                                        <div
                                            className="prose prose-xl dark:prose-invert max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-p:text-lg">
                                            <RenderMarkdown>{projectSummary.summary}</RenderMarkdown>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Key Highlights */}
                                {projectSummary.highlights && projectSummary.highlights.length > 0 && (
                                    <Card className="border-primary/20 bg-primary/5">
                                        <CardContent className="p-12">
                                            <div className="space-y-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-primary/20 rounded-xl">
                                                        <TrendingUp className="h-6 w-6 text-primary"/>
                                                    </div>
                                                    <h3 className="text-2xl font-bold">Key Highlights</h3>
                                                </div>

                                                <div className="grid gap-6">
                                                    {projectSummary.highlights.map((highlight, index) => (
                                                        <motion.div
                                                            key={index}
                                                            initial={{opacity: 0, x: -20}}
                                                            animate={{opacity: 1, x: 0}}
                                                            transition={{delay: index * 0.1}}
                                                            className="flex items-start gap-6 p-6 bg-background/80 backdrop-blur-sm rounded-xl border"
                                                        >
                                                            <div
                                                                className="h-3 w-3 rounded-full bg-primary mt-2 flex-shrink-0"/>
                                                            <p className="text-lg leading-relaxed">{highlight}</p>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Footer */}
                                <div className="text-center py-12 space-y-6">
                                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"/>
                                    <p className="text-lg text-muted-foreground">
                                        Thanks for staying up to date with the project progress!
                                    </p>
                                    <Button onClick={handleCopyPost} variant="outline" size="lg" className="gap-3">
                                        <Copy className="h-5 w-5"/>
                                        Copy This Update
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}