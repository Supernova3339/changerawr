'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, GitBranch } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { CatchUpEntry as CatchUpEntryType } from '@/lib/types/projects/catch-up/types';

interface CatchUpEntryProps {
    entry: CatchUpEntryType;
}

export function CatchUpEntry({ entry }: CatchUpEntryProps) {
    const publishedDate = entry.publishedAt ? new Date(entry.publishedAt) : null;

    // Truncate content for summary view
    const truncateContent = (content: string, maxLength: number = 200): string => {
        if (content.length <= maxLength) return content;

        // Try to break at word boundary
        const truncated = content.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');

        if (lastSpace > maxLength * 0.8) {
            return truncated.substring(0, lastSpace) + '...';
        }

        return truncated + '...';
    };

    // Clean markdown from content for display
    const cleanContent = entry.content
        .replace(/#{1,6}\s+/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/`(.*?)`/g, '$1') // Remove inline code
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
        .replace(/\n\s*\n/g, '\n') // Remove double line breaks
        .replace(/^\s*[-*+]\s+/gm, '• ') // Convert list items to bullets
        .trim();

    return (
        <Card className="transition-all hover:shadow-md">
            <CardContent className="pt-4">
                <div className="space-y-3">
                    {/* Header with version and date */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h4 className="font-semibold text-lg leading-tight">
                                {entry.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                {entry.version && (
                                    <div className="flex items-center gap-1">
                                        <GitBranch className="h-3 w-3" />
                                        <span className="font-mono">{entry.version}</span>
                                    </div>
                                )}
                                {publishedDate && (
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                      {formatDistanceToNow(publishedDate, { addSuffix: true })}
                    </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {publishedDate && (
                            <div className="text-xs text-muted-foreground font-mono">
                                {format(publishedDate, 'MMM d, yyyy')}
                            </div>
                        )}
                    </div>

                    {/* Tags */}
                    {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
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
                    {cleanContent && (
                        <div className="prose prose-sm max-w-none">
                            <p className="text-muted-foreground leading-relaxed m-0">
                                {truncateContent(cleanContent)}
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}