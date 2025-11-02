// components/markdown-editor/MarkdownEditor.tsx

'use client';

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {Badge} from '@/components/ui/badge';
import {
    Bold,
    Italic,
    Link,
    List,
    ListOrdered,
    Quote,
    Code,
    Heading1,
    Heading2,
    Heading3,
    Image,
    Zap
} from 'lucide-react';

// Import existing components
import MarkdownToolbar, {ToolbarGroup, ToolbarDropdown} from '@/components/markdown-editor/MarkdownToolbar';

// Import our markdown renderer with custom extensions
import {renderMarkdown, parseMarkdown} from '@/lib/services/core/markdown/useCustomExtensions';

// Import AI integration
import useAIAssistant from '@/hooks/useAIAssistant';
import {AICompletionType} from '@/lib/utils/ai/types';
import AIAssistantPanel from '@/components/markdown-editor/ai/AIAssistantPanel';

// Import CUM modals
import {CUMButtonModal, CUMAlertModal, CUMEmbedModal, CUMTableModal} from '@/components/markdown-editor/modals';
import {useCUMModals} from '@/components/markdown-editor/hooks/useCUMModals';

export interface MarkdownEditorProps {
    initialValue?: string;
    onChange?: (value: string) => void;
    onSave?: (value: string) => void;
    onExport?: (value: string) => void;
    placeholder?: string;
    className?: string;
    height?: string;
    autoFocus?: boolean;
    readOnly?: boolean;
    enableAI?: boolean;
    enableCUM?: boolean;
    aiApiKey?: string;
    maxLength?: number;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
                                                                  initialValue = '',
                                                                  onChange,
                                                                  onSave,
                                                                  onExport,
                                                                  placeholder = 'Start writing your markdown...',
                                                                  className = '',
                                                                  height = '400px',
                                                                  autoFocus = false,
                                                                  readOnly = false,
                                                                  enableAI = false,
                                                                  enableCUM = process.env.NEXT_PUBLIC_ENABLE_CUM !== 'false',
                                                                  aiApiKey,
                                                                  maxLength
                                                              }) => {
    // Core editor state
    const [content, setContent] = useState(initialValue);
    const [view, setView] = useState<'edit' | 'preview' | 'split'>('edit');
    const [history, setHistory] = useState<string[]>([initialValue]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const [isSaved, setIsSaved] = useState(true);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // AI integration - ALWAYS call the hook
    const ai = useAIAssistant({apiKey: aiApiKey});

    // CUM modals state
    const {modals, openModal, closeModal} = useCUMModals();

    // Initialize content
    useEffect(() => {
        if (initialValue !== content) {
            setContent(initialValue);
            setHistory([initialValue]);
            setHistoryIndex(0);
        }
    }, [initialValue, content]);

    // Update metrics
    useEffect(() => {
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const chars = content.length;
        setWordCount(words);
        setCharCount(chars);
    }, [content]);

    // Auto focus
    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [autoFocus]);

    // History management
    const addToHistory = useCallback((newContent: string) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(newContent);
            if (newHistory.length > 50) newHistory.shift();
            return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, 49));
    }, [historyIndex]);

    // Content change handler
    const handleContentChange = useCallback((newContent: string) => {
        setContent(newContent);
        setIsSaved(false);
        onChange?.(newContent);
        addToHistory(newContent);
    }, [onChange, addToHistory]);

    // Undo/Redo
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const handleUndo = useCallback(() => {
        if (canUndo) {
            const newIndex = historyIndex - 1;
            const newContent = history[newIndex];
            setContent(newContent);
            setHistoryIndex(newIndex);
            onChange?.(newContent);
        }
    }, [canUndo, historyIndex, history, onChange]);

    const handleRedo = useCallback(() => {
        if (canRedo) {
            const newIndex = historyIndex + 1;
            const newContent = history[newIndex];
            setContent(newContent);
            setHistoryIndex(newIndex);
            onChange?.(newContent);
        }
    }, [canRedo, historyIndex, history, onChange]);

    // Text manipulation helpers
    const insertAtCursor = useCallback((text: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = content.slice(0, start) + text + content.slice(end);

        handleContentChange(newContent);

        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + text.length;
            textarea.focus();
        }, 0);
    }, [content, handleContentChange]);

    const wrapSelection = useCallback((prefix: string, suffix: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.slice(start, end);
        const replacement = prefix + selectedText + suffix;

        const newContent = content.slice(0, start) + replacement + content.slice(end);
        handleContentChange(newContent);

        setTimeout(() => {
            textarea.selectionStart = start + prefix.length;
            textarea.selectionEnd = start + prefix.length + selectedText.length;
            textarea.focus();
        }, 0);
    }, [content, handleContentChange]);

    // Basic markdown action handlers
    const handleBold = useCallback(() => wrapSelection('**', '**'), [wrapSelection]);
    const handleItalic = useCallback(() => wrapSelection('*', '*'), [wrapSelection]);
    const handleCode = useCallback(() => wrapSelection('`', '`'), [wrapSelection]);
    const handleLink = useCallback(() => wrapSelection('[', '](url)'), [wrapSelection]);
    const handleImage = useCallback(() => wrapSelection('![', '](url)'), [wrapSelection]);
    const handleQuote = useCallback(() => insertAtCursor('\n> '), [insertAtCursor]);
    const handleBulletList = useCallback(() => insertAtCursor('\n- '), [insertAtCursor]);
    const handleNumberedList = useCallback(() => insertAtCursor('\n1. '), [insertAtCursor]);
    const handleHeading1 = useCallback(() => insertAtCursor('\n# '), [insertAtCursor]);
    const handleHeading2 = useCallback(() => insertAtCursor('\n## '), [insertAtCursor]);
    const handleHeading3 = useCallback(() => insertAtCursor('\n### '), [insertAtCursor]);

    // CUM modal handlers
    const handleCUMButton = useCallback(() => openModal('button'), [openModal]);
    const handleCUMAlert = useCallback(() => openModal('alert'), [openModal]);
    const handleCUMEmbed = useCallback(() => openModal('embed'), [openModal]);
    const handleCUMTable = useCallback(() => openModal('table'), [openModal]);

    // Modal insertion handler
    const handleModalInsert = useCallback((markdown: string) => {
        insertAtCursor(`\n${markdown}\n`);
    }, [insertAtCursor]);

    // Save handler
    const handleSave = useCallback(() => {
        onSave?.(content);
        setIsSaved(true);
    }, [content, onSave]);

    // Export handler
    const handleExport = useCallback(() => {
        onExport?.(content);
    }, [content, onExport]);

    // AI helper functions
    const getContextForAI = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return content;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (start !== end) {
            return content.slice(start, end);
        }

        const lines = content.split('\n');
        const position = start;
        let currentPos = 0;
        let lineIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            if (currentPos + lines[i].length >= position) {
                lineIndex = i;
                break;
            }
            currentPos += lines[i].length + 1;
        }

        const startLine = Math.max(0, lineIndex - 2);
        const endLine = Math.min(lines.length, lineIndex + 3);
        return lines.slice(startLine, endLine).join('\n');
    }, [content]);

    const handleApplyAIContent = useCallback((text: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        let newContent;
        let newCursorPos;

        if (start !== end) {
            newContent = content.slice(0, start) + text + content.slice(end);
            newCursorPos = start + text.length;
        } else {
            newContent = content.slice(0, start) + text + content.slice(start);
            newCursorPos = start + text.length;
        }

        handleContentChange(newContent);

        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = newCursorPos;
            textarea.selectionEnd = newCursorPos;
        }, 0);
    }, [content, handleContentChange]);

    const handleGenerateAI = useCallback(() => {
        if (!enableAI || !ai) return;

        const contextText = getContextForAI();

        if (!contextText.trim()) {
            return;
        }

        ai.generateCompletion({
            type: ai.state.completionType,
            content: contextText,
            customPrompt: ai.state.customPrompt,
            options: {
                temperature: ai.state.temperature
            }
        }).catch(error => {
            console.error('Error generating AI content:', error);
        });
    }, [enableAI, ai, getContextForAI]);

    // Keyboard shortcuts
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Save shortcut: Ctrl+S
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            handleSave();
        }

        // Bold: Ctrl+B
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            handleBold();
        }

        // Italic: Ctrl+I
        if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            handleItalic();
        }

        // Link: Ctrl+K
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            handleLink();
        }

        // Undo: Ctrl+Z
        if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
            e.preventDefault();
            handleUndo();
        }

        // Redo: Ctrl+Shift+Z or Ctrl+Y
        if ((e.ctrlKey && e.shiftKey && e.key === 'z') ||
            (e.ctrlKey && e.key === 'y')) {
            e.preventDefault();
            handleRedo();
        }

        // Headings: Ctrl+1, Ctrl+2, Ctrl+3
        if (e.ctrlKey && e.key === '1') {
            e.preventDefault();
            handleHeading1();
        }
        if (e.ctrlKey && e.key === '2') {
            e.preventDefault();
            handleHeading2();
        }
        if (e.ctrlKey && e.key === '3') {
            e.preventDefault();
            handleHeading3();
        }

        // AI Assistant: Alt+A
        if (e.altKey && e.key === 'a' && enableAI && ai) {
            e.preventDefault();
            ai.openAssistant(AICompletionType.COMPLETE);
        }
    }, [
        handleSave, handleUndo, handleRedo,
        handleBold, handleItalic, handleLink,
        handleHeading1, handleHeading2, handleHeading3,
        enableAI, ai
    ]);

    // Render markdown using our NEW renderer
    const tokens = parseMarkdown(content);
    const renderedHtml = renderMarkdown(content);

    // Create clean toolbar structure
    const toolbarGroups: ToolbarGroup[] = [
        {
            name: 'Formatting',
            actions: [
                {
                    icon: <Bold size={16}/>,
                    label: 'Bold',
                    onClick: handleBold,
                    shortcut: 'Ctrl+B',
                },
                {
                    icon: <Italic size={16}/>,
                    label: 'Italic',
                    onClick: handleItalic,
                    shortcut: 'Ctrl+I',
                },
                {
                    icon: <Code size={16}/>,
                    label: 'Code',
                    onClick: handleCode,
                },
                {
                    icon: <Link size={16}/>,
                    label: 'Link',
                    onClick: handleLink,
                    shortcut: 'Ctrl+K',
                },
            ],
        },
        {
            name: 'Structure',
            actions: [
                {
                    icon: <List size={16}/>,
                    label: 'Bullet List',
                    onClick: handleBulletList,
                },
                {
                    icon: <ListOrdered size={16}/>,
                    label: 'Numbered List',
                    onClick: handleNumberedList,
                },
                {
                    icon: <Quote size={16}/>,
                    label: 'Blockquote',
                    onClick: handleQuote,
                },
                {
                    icon: <Image size={16}/>,
                    label: 'Image',
                    onClick: handleImage,
                },
            ],
        },
    ];

    // Create toolbar dropdowns with CUM extensions
    const toolbarDropdowns: ToolbarDropdown[] = [
        {
            name: 'Headings',
            icon: <Heading2 size={16}/>,
            actions: [
                {
                    icon: <Heading1 size={16}/>,
                    label: 'Heading 1',
                    onClick: handleHeading1,
                    shortcut: 'Ctrl+1',
                },
                {
                    icon: <Heading2 size={16}/>,
                    label: 'Heading 2',
                    onClick: handleHeading2,
                    shortcut: 'Ctrl+2',
                },
                {
                    icon: <Heading3 size={16}/>,
                    label: 'Heading 3',
                    onClick: handleHeading3,
                    shortcut: 'Ctrl+3',
                },
            ],
        },
    ];

    // Add CUM Extensions dropdown if enabled
    if (enableCUM) {
        toolbarDropdowns.push({
            name: 'CUM Extensions',
            icon: <Zap size={16}/>,
            actions: [
                {
                    icon: <Zap size={16}/>,
                    label: 'Button',
                    onClick: handleCUMButton,
                },
                {
                    icon: <Zap size={16}/>,
                    label: 'Alert',
                    onClick: handleCUMAlert,
                },
                {
                    icon: <Zap size={16}/>,
                    label: 'Embed',
                    onClick: handleCUMEmbed,
                },
                {
                    icon: <Zap size={16}/>,
                    label: 'Table',
                    onClick: handleCUMTable,
                },
            ],
        });
    }

    return (
        <div className={`flex flex-col border rounded-md shadow-sm bg-background ${className}`}>
            {/* Toolbar */}
            <MarkdownToolbar
                groups={toolbarGroups}
                dropdowns={toolbarDropdowns}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onSave={onSave ? handleSave : undefined}
                onExport={onExport ? handleExport : undefined}
                viewMode={view}
                onViewModeChange={(mode: 'edit' | 'preview' | 'split') => setView(mode)}
                onAIAssist={enableAI && ai ? () => ai.openAssistant?.(AICompletionType.COMPLETE) : undefined}
                enableAI={enableAI}
                onBold={handleBold}
                onItalic={handleItalic}
                onLink={handleLink}
                onHeading1={handleHeading1}
                onHeading2={handleHeading2}
                onHeading3={handleHeading3}
                onBulletList={handleBulletList}
                onNumberedList={handleNumberedList}
                onQuote={handleQuote}
                onCode={handleCode}
                onImage={handleImage}
            />

            {/* Editor content */}
            <div className="flex flex-1" style={{height}}>
                {/* Edit mode */}
                {(view === 'edit' || view === 'split') && (
                    <div className={`flex flex-col ${view === 'split' ? 'w-1/2 border-r' : 'w-full'}`}>
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full h-full p-4 font-mono text-sm border-0 bg-background focus-visible:ring-0 focus-visible:outline-none resize-none"
                readOnly={readOnly}
                maxLength={maxLength}
            />
                    </div>
                )}

                {/* Preview mode */}
                {(view === 'preview' || view === 'split') && (
                    <div className={`flex flex-col overflow-auto ${view === 'split' ? 'w-1/2' : 'w-full'}`}>
                        <div className="flex-1 p-4">
                            <div
                                className="prose max-w-none prose-img:my-4 prose-headings:mt-6 prose-headings:mb-4 prose-p:mb-4 prose-pre:my-4 prose-blockquote:my-4"
                                dangerouslySetInnerHTML={{__html: renderedHtml}}
                                suppressHydrationWarning
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Status bar with your updated styling */}
            <div
                className="flex items-center justify-between h-6 px-3 py-1 text-xs text-muted-foreground border-t bg-muted/20">
                <div className="flex items-center gap-4">
                    <span>{wordCount} words</span>
                    <span>{charCount} characters</span>
                    {maxLength && (
                        <Badge variant={charCount > maxLength * 0.9 ? 'destructive' : 'secondary'}>
                            {charCount}/{maxLength}
                        </Badge>
                    )}
                    {!isSaved && <Badge variant="outline">Unsaved</Badge>}
                </div>

                <div className="flex items-center gap-2">
                    {enableCUM && (
                        <Badge variant="outline" className="text-xs">
                            CUM Enabled
                        </Badge>
                    )}
                    <span className="capitalize">{view} mode</span>
                </div>
            </div>

            {/* CUM Modals */}
            {enableCUM && (
                <>
                    <CUMButtonModal
                        isOpen={modals.buttonModal}
                        onClose={() => closeModal('button')}
                        onInsert={handleModalInsert}
                    />
                    <CUMAlertModal
                        isOpen={modals.alertModal}
                        onClose={() => closeModal('alert')}
                        onInsert={handleModalInsert}
                    />
                    <CUMEmbedModal
                        isOpen={modals.embedModal}
                        onClose={() => closeModal('embed')}
                        onInsert={handleModalInsert}
                    />
                    <CUMTableModal
                        isOpen={modals.tableModal}
                        onClose={() => closeModal('table')}
                        onInsert={handleModalInsert}
                    />
                </>
            )}

            {/* AI Assistant Panel */}
            {enableAI && ai && (
                <AIAssistantPanel
                    isVisible={ai.state.isVisible}
                    content={getContextForAI()}
                    completionType={ai.state.completionType}
                    customPrompt={ai.state.customPrompt}
                    isLoading={ai.state.isLoading}
                    generatedResult={ai.state.lastResult}
                    error={ai.state.error}
                    temperature={ai.state.temperature}
                    onTemperatureChange={ai.setTemperature}
                    onClose={ai.closeAssistant}
                    onCompletionTypeChange={ai.setCompletionType}
                    onCustomPromptChange={ai.setCustomPrompt}
                    onGenerate={handleGenerateAI}
                    onApply={handleApplyAIContent}
                    onRegenerate={handleGenerateAI}
                    isApiKeyValid={ai.state.apiKeyValid}
                    onSetApiKey={ai.setApiKey}
                />
            )}
        </div>
    );
};