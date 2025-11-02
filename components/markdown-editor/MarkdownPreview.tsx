// components/markdown-editor/MarkdownPreview.tsx

'use client';

import React from 'react';
import { renderMarkdown } from '@/lib/services/core/markdown/useCustomExtensions';

interface MarkdownPreviewProps {
    content: string;
    className?: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
                                                                    content,
                                                                    className = ''
                                                                }) => {
    const html = renderMarkdown(content);

    return (
        <div
            className={`prose max-w-none prose-img:my-4 prose-headings:mt-6 prose-headings:mb-4 prose-p:mb-4 prose-pre:my-4 prose-blockquote:my-4 ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
            suppressHydrationWarning
        />
    );
};