import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import ChangelogEntries from '@/components/changelog/ChangelogEntries';
import ShareButton from '@/components/changelog/ShareButton';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch, Clock, Rss } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip';
import Link from 'next/link';
import { Metadata } from 'next';
import SubscriptionForm from "@/components/subscription-form";
import {trackChangelogView} from "@/lib/middleware/analytics";
import {headers} from "next/headers";

interface ChangelogResponse {
    project: {
        id: string;
        name: string;
        description?: string;
        emailNotificationsEnabled?: boolean;
    };
    items: Array<{
        id: string;
        publishedAt: string;
        title?: string;
    }>;
    nextCursor?: string;
}

type ChangelogPageProps = {
    params: Promise<{ projectId: string }>;
};

async function getInitialData(projectId: string): Promise<ChangelogResponse | null> {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/changelog/${projectId}/entries/all`,
        { next: { revalidate: 300 } }
    );

    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch changelog');
    }

    return res.json();
}

export async function generateMetadata(
    { params }: ChangelogPageProps
): Promise<Metadata> {
    const { projectId } = await params;
    const data = await getInitialData(projectId);

    if (!data) {
        return {
            title: 'Changelog Not Found',
            description: 'The requested changelog could not be found.'
        };
    }

    const { project, items } = data;
    const latestUpdate = items[0]?.publishedAt
        ? new Date(items[0].publishedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : null;

    return {
        title: `${project.name} Changelog & Release Notes`,
        description: project.description ||
            `View the latest updates and changes for ${project.name}${latestUpdate ? ` - last updated ${latestUpdate}` : ''}.`,
        openGraph: {
            title: `${project.name} Changelog`,
            description: project.description ||
                `Stay up to date with the latest improvements, features, and bug fixes for ${project.name}.`,
            type: 'website',
        },
    };
}

// Loading component for Suspense
function ChangelogSkeleton() {
    return (
        <div className="space-y-12">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-4 animate-pulse">
                    <div className="space-y-3">
                        <Skeleton className="h-8 w-[300px]" />
                        <Skeleton className="h-5 w-[200px]" />
                    </div>
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <div className="flex gap-2 pt-4">
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default async function ChangelogPage({ params }: ChangelogPageProps) {
    // Using the proper Next.js 15 pattern with await
    const { projectId } = await params;
    const data = await getInitialData(projectId);

    if (!data) {
        notFound();
    }

    // Track the changelog view asynchronously (don't block rendering)
    try {
        const headersList = await headers();
        const request = new Request('http://localhost', {
            headers: headersList
        });

        // Track the main changelog page view
        await trackChangelogView(request, {
            projectId: data.project.id,
            // No specific entry ID for main page view
        });
    } catch (error) {
        // Don't let analytics tracking errors break the page
        console.error('Failed to track changelog view:', error);
    }

    const stats = {
        totalEntries: data.items.length + (data.nextCursor ? '+' : ''),
        lastUpdate: data.items[0]?.publishedAt,
    };

    // Generate current page URL for sharing
    const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/changelog/${projectId}`;

    return (
        <div className="min-h-screen bg-background">
            {/* Gradient background */}
            <div className="absolute top-0 inset-x-0 h-96 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(var(--primary-rgb),0.1),transparent)]" />
            </div>

            <div className="relative pb-24">
                <header className="relative py-16 md:py-24 px-4 max-w-6xl mx-auto">
                    <div className="text-center space-y-6">
                        {/* Project name */}
                        <h1
                            className={cn(
                                "text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight",
                                "bg-gradient-to-b from-foreground via-foreground/95 to-foreground/80",
                                "bg-clip-text text-transparent"
                            )}
                        >
                            {data.project.name}
                        </h1>

                        {/* Subtitle */}
                        <p className="text-xl md:text-2xl text-muted-foreground font-medium">
                            Changelog &amp; Release Notes
                        </p>

                        {/* Description if available */}
                        {data.project.description && (
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                {data.project.description}
                            </p>
                        )}

                        {/* Stats display with RSS and share links */}
                        <div className="flex flex-col items-center gap-6">
                            <div className="inline-flex flex-wrap justify-center items-center gap-4 md:gap-8 px-6 md:px-8 py-4
                            bg-background/60 backdrop-blur-sm
                            border border-border/40
                            rounded-full
                            hover:bg-background/80 hover:border-border/60
                            transition-all duration-300">
                                <div className="flex items-center gap-3">
                                    <GitBranch className="w-5 h-5 text-muted-foreground" />
                                    <span className="font-medium text-lg">
                    {stats.totalEntries} Updates
                  </span>
                                </div>

                                {stats.lastUpdate && (
                                    <>
                                        <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-border" />
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-5 h-5 text-muted-foreground" />
                                            <time
                                                dateTime={stats.lastUpdate}
                                                className="font-medium text-lg tabular-nums"
                                            >
                                                {new Intl.DateTimeFormat('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                }).format(new Date(stats.lastUpdate))}
                                            </time>
                                        </div>
                                    </>
                                )}

                                <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-border" />

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href={`/changelog/${projectId}/rss.xml`}
                                                className="flex items-center gap-2 text-muted-foreground hover:text-orange-500 transition-colors duration-200"
                                                aria-label="Subscribe to RSS feed"
                                            >
                                                <Rss className="w-5 h-5" />
                                                <span className="font-medium text-lg">RSS</span>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Subscribe to updates via RSS
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-border" />

                                {/* Client-side Share Button */}
                                <ShareButton
                                    url={pageUrl}
                                    title={`${data.project.name} Changelog`}
                                    text={data.project.description || `Check out the latest updates for ${data.project.name}`}
                                />
                            </div>
                        </div>
                        {/* Only show subscription form if email notifications are enabled */}
                        {data.project.emailNotificationsEnabled && (
                            <SubscriptionForm projectId={projectId} projectName={data.project.name} />
                        )}
                    </div>
                </header>

                <div className="relative max-w-7xl mx-auto px-4 md:px-6">
                    <Suspense fallback={<ChangelogSkeleton />}>
                        <ChangelogEntries projectId={projectId} />
                    </Suspense>
                </div>

                {/* Footer spacer */}
                <div className="h-12" />
            </div>
        </div>
    );
}