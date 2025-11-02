'use client';

import React from 'react';
import { renderMarkdown } from '@/lib/services/core/markdown/useCustomExtensions';

interface RenderMarkdownProps {
    children: string;
    className?: string;
    enableCUM?: boolean;
}

export const RenderMarkdown: React.FC<RenderMarkdownProps> = ({
                                                                  children,
                                                                  className = ''
                                                              }) => {
    // Use our new markdown renderer
    const html = renderMarkdown(children);

    return (
        <div
            className={`prose max-w-none prose-img:my-4 prose-headings:mt-6 prose-headings:mb-4 prose-p:mb-4 prose-pre:my-4 prose-blockquote:my-4 ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
            suppressHydrationWarning
        />
    );
};