'use client';

import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { RenderMarkdown } from '@/components/markdown-editor/RenderMarkdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    tags: Array<{
        id: string;
        name: string;
        color: string | null;
    }>;
}

interface EntryContentProps {
    domain: string;
    projectId: string;
    projectName: string;
    entry: ChangelogEntry;
}

export function EntryContent({ domain, projectId, projectName, entry }: EntryContentProps) {
    const entryRef = useEntryViewTracking(entry.id, projectId);

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Back Button */}
                <div className="mb-8">
                    <Link href={`/changelog/custom-domain/${domain}`}>
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to {projectName}
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
                                url={`https://${domain}/${entry.id}`}
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

                            <Link href={`/changelog/custom-domain/${domain}`}>
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
