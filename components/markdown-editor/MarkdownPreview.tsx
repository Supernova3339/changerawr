// components/markdown-editor/MarkdownPreview.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { renderMarkdown, renderMarkdownStreamed } from '@/lib/services/core/markdown/useCustomExtensions';

interface MarkdownPreviewProps {
    content: string;
    className?: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
                                                                    content,
                                                                    className = ''
                                                                }) => {
    const [html, setHtml] = useState('');

    useEffect(() => {
        const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

        const renderContent = async () => {
            if (wordCount > 10000) {
                try {
                    const rendered = await renderMarkdownStreamed(content);
                    setHtml(rendered);
                } catch (error) {
                    console.error('Streaming render failed:', error);
                    setHtml(renderMarkdown(content));
                }
            } else {
                setHtml(renderMarkdown(content));
            }
        };

        renderContent();
    }, [content]);

    return (
        <div
            className={`prose max-w-none prose-img:my-4 prose-headings:mt-6 prose-headings:mb-4 prose-p:mb-4 prose-pre:my-4 prose-blockquote:my-4 ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
            suppressHydrationWarning
        />
    );
};