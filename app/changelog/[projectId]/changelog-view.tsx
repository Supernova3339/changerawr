'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Rss } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ChangelogEntry {
    id: string;
    title: string;
    content: string;
    version?: string;
    publishedAt: Date;
    tags: Array<{ id: string; name: string }>;
}

interface ChangelogData {
    project: {
        id: string;
        name: string;
    };
    items: ChangelogEntry[];
}

interface ChangelogViewProps {
    data: ChangelogData;
}

// Track entry view when it becomes visible
export function useEntryViewTracking(entryId: string, projectId: string) {
    const elementRef = useRef<HTMLDivElement>(null);
    const hasTracked = useRef(false);

    useEffect(() => {
        const element = elementRef.current;
        if (!element || hasTracked.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasTracked.current) {
                        hasTracked.current = true;

                        // Track the entry view
                        fetch('/api/analytics/track', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                projectId,
                                changelogEntryId: entryId,
                            }),
                        }).catch((error) => {
                            console.error('Failed to track entry view:', error);
                        });
                    }
                });
            },
            {
                threshold: 0.5, // Track when 50% of the entry is visible
                rootMargin: '0px 0px -100px 0px', // Trigger earlier
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [entryId, projectId]);

    return elementRef;
}

function ChangelogEntry({ entry, projectId }: { entry: ChangelogEntry; projectId: string }) {
    const entryRef = useEntryViewTracking(entry.id, projectId);

    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 }
    };

    return (
        <motion.article
            ref={entryRef}
            variants={fadeIn}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            className="group relative"
        >
            <div className={cn(
                "relative p-8 rounded-2xl border bg-card/50 backdrop-blur-sm",
                "hover:shadow-lg hover:shadow-primary/5 transition-all duration-300",
                "hover:border-primary/20"
            )}>
                {/* Entry header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-semibold tracking-tight group-hover:text-primary transition-colors">
                                {entry.title}
                            </h2>
                            {entry.version && (
                                <Badge variant="secondary" className="font-mono text-xs">
                                    v{entry.version}
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-2" />
                            {new Date(entry.publishedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </div>
                    </div>

                    {/* Tags */}
                    {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {entry.tags.map((tag) => (
                                <Badge key={tag.id} variant="outline" className="text-xs">
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Entry content */}
                <div
                    className="prose prose-neutral dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: entry.content }}
                />
            </div>
        </motion.article>
    );
}

export default function ChangelogView({ data }: ChangelogViewProps) {
    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 }
    };

    const staggerChildren = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    // Generate current page URL for sharing
    const pageUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/changelog/${data.project.id}`
        : '';

    return (
        <div className="min-h-screen bg-background">
            {/* Gradient background */}
            <div className="absolute top-0 inset-x-0 h-96 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(var(--primary-rgb),0.1),transparent)]" />
            </div>

            <div className="relative pb-24">
                <motion.header
                    className="relative py-16 md:py-24 px-4 max-w-6xl mx-auto"
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                >
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

                        {/* Action buttons */}
                        <div className="flex items-center justify-center gap-4 pt-4">
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`${pageUrl}/rss.xml`} target="_blank">
                                    <Rss className="h-4 w-4 mr-2" />
                                    RSS Feed
                                </Link>
                            </Button>
                        </div>
                    </div>
                </motion.header>

                {/* Changelog entries */}
                <main className="max-w-4xl mx-auto px-4">
                    {data.items.length === 0 ? (
                        <motion.div
                            className="text-center py-16"
                            variants={fadeIn}
                            initial="initial"
                            animate="animate"
                        >
                            <p className="text-muted-foreground text-lg">
                                No changelog entries yet. Check back soon!
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            className="space-y-12"
                            variants={staggerChildren}
                            initial="initial"
                            animate="animate"
                        >
                            {data.items.map((entry) => (
                                <ChangelogEntry
                                    key={entry.id}
                                    entry={entry}
                                    projectId={data.project.id}
                                />
                            ))}
                        </motion.div>
                    )}
                </main>
            </div>
        </div>
    );
}