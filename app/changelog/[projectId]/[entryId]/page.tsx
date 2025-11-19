'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { RenderMarkdown } from '@/components/markdown-editor/RenderMarkdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format } from 'date-fns';
import ShareButton from '@/components/changelog/ShareButton';
import { useEntryViewTracking } from '@/app/changelog/[projectId]/changelog-view';

interface ChangelogEntry {
    id: string;
    title: string;
    content: string;
    excerpt?: string;
    version?: string;
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
    changelogId: string;
    tags: Array<{
        id: string;
        name: string;
        color: string | null;
    }>;
}

interface EntryResponse {
    project: {
        id: string;
        name: string;
        description?: string;
    };
    entry: ChangelogEntry;
}

type EntryPageProps = {
    params: Promise<{ projectId: string; entryId: string }>;
};

export default function EntryPage({ params }: EntryPageProps) {
    const router = useRouter();
    const [data, setData] = useState<EntryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [projectId, setProjectId] = useState<string>('');
    const [entryId, setEntryId] = useState<string>('');

    // Call the tracking hook at the top level with safe defaults
    // It will only track once data is loaded
    const entryRef = useEntryViewTracking(
        data?.entry?.id || '',
        data?.project?.id || ''
    );

    useEffect(() => {
        params.then(({ projectId, entryId }) => {
            setProjectId(projectId);
            setEntryId(entryId);

            // Fetch entry data
            fetch(`/api/changelog/entries/${entryId}`)
                .then(res => {
                    if (!res.ok) {
                        throw new Error('Failed to fetch entry');
                    }
                    return res.json();
                })
                .then((data: EntryResponse) => {
                    setData(data);
                })
                .catch(() => {
                    setError(true);
                })
                .finally(() => {
                    setLoading(false);
                });
        });
    }, [params]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Skeleton className="h-10 w-32 mb-8" />
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-12 w-3/4" />
                            <div className="flex gap-4">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-28" />
                            </div>
                        </div>
                        <Skeleton className="h-px w-full" />
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Entry Not Found</h1>
                    <p className="text-muted-foreground mb-8">
                        The changelog entry you're looking for doesn't exist or has been removed.
                    </p>
                    <Link href={`/changelog/${projectId}`}>
                        <Button>Back to Changelog</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const { project, entry } = data;

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Back Button */}
                <div className="mb-8">
                    <Link href={`/changelog/${projectId}`}>
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to {project.name}
                        </Button>
                    </Link>
                </div>

                {/* Entry Header */}
                <article ref={entryRef} className="space-y-8">
                    <header className="space-y-4">
                        {/* Tags */}
                        {entry.tags && entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {entry.tags.map((tag) => (
                                    <Badge
                                        key={tag.id}
                                        variant="secondary"
                                        style={{
                                            backgroundColor: tag.color ? `${tag.color}20` : undefined,
                                            color: tag.color || undefined,
                                            borderColor: tag.color || undefined,
                                        }}
                                    >
                                        {tag.name}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Title */}
                        <h1 className="text-4xl font-bold tracking-tight">
                            {entry.title}
                        </h1>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {entry.version && (
                                <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="font-mono">
                                        v{entry.version}
                                    </Badge>
                                </div>
                            )}

                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <time dateTime={entry.publishedAt}>
                                    {format(new Date(entry.publishedAt), 'MMMM d, yyyy')}
                                </time>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                {formatDistanceToNow(new Date(entry.publishedAt), { addSuffix: true })}
                            </div>

                            <ShareButton
                                url={`${window.location.origin}/changelog/${projectId}/${entryId}`}
                                title={entry.title}
                            />
                        </div>
                    </header>

                    {/* Divider */}
                    <hr className="border-border" />

                    {/* Content */}
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                        <RenderMarkdown>
                            {entry.content}
                        </RenderMarkdown>
                    </div>

                    {/* Footer */}
                    <footer className="pt-8 border-t border-border">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Last updated: {format(new Date(entry.updatedAt), 'MMMM d, yyyy')}
                            </div>

                            <Link href={`/changelog/${projectId}`}>
                                <Button variant="outline" size="sm">
                                    View All Updates
                                </Button>
                            </Link>
                        </div>
                    </footer>
                </article>
            </div>
        </div>
    );
}
