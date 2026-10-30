import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Pencil, Lock, UnlockIcon, Wand2, Lightbulb, Check, X, Palette, ChevronDown, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { createHalesisClient } from '@/lib/utils/ai/halesis';
import confetti from 'canvas-confetti';
import { createPortal } from 'react-dom';

interface AITitleGeneratorProps {
    content: string;
    onSelectTitle: (title: string) => void;
    apiKey?: string;
    initialTitle?: string;
}

interface TitleSuggestion {
    text: string;
    isLocked: boolean;
    style: 'primary' | 'creative' | 'technical';
    score: number; // AI confidence score (1-100)
}

// Extract the most important content from markdown
const extractImportantContent = (markdown: string, maxLength: number = 500): string => {
    if (!markdown || markdown.length === 0) return "";

    // Extract headings for better context
    const headings = markdown.split('\n')
        .filter(line => line.trim().startsWith('#'))
        .map(line => line.replace(/^#+\s+/, '').trim())
        .join(' ');

    // Get first substantial paragraph
    const firstParagraph = markdown.split('\n\n')[0] || '';

    // Combine and ensure we don't exceed max length
    let extracted = headings ? `${headings}. ${firstParagraph}` : firstParagraph;
    if (extracted.length > maxLength) {
        extracted = extracted.substring(0, maxLength - 3) + '...';
    }

    return extracted;
};

// Title generation prompt
const getTitleGenerationPrompt = (content: string, lockedTitles: TitleSuggestion[] = []): string => {
    let contextSection = "";
    if (lockedTitles.length > 0) {
        // Pass locked titles with their styles and scores to influence AI
        contextSection = `\nContext: User has locked these titles as preferred styles:\n`;
        lockedTitles.forEach(title => {
            contextSection += `- "${title.text}" (Style: ${title.style}, Score: ${title.score})\n`;
        });
    }

    return `Generate 3 distinct, impactful title suggestions for a changelog entry.
Content: "${content}"
${contextSection}
For each title, assign:
1. A style tag: primary (clear, direct), creative (metaphorical), or technical (developer-focused)
2. A confidence score (1-100) representing how well it fits the content

Based on the locked titles (if any), prioritize generating titles that complement their style and maintain similar themes.

Format exactly as follows:
TITLE: [Title text]
STYLE: [style]
SCORE: [score]

TITLE: [Title text]
STYLE: [style]
SCORE: [score]

TITLE: [Title text]
STYLE: [style]
SCORE: [score]`;
};

export default function AITitleGenerator({ content, onSelectTitle, apiKey, initialTitle }: AITitleGeneratorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [titles, setTitles] = useState<TitleSuggestion[]>([]);
    const [selectedTitle, setSelectedTitle] = useState<string | null>(initialTitle || null);
    const [aiRecommendation, setAiRecommendation] = useState<number | null>(null);
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);
    const [hasSelectedBefore, setHasSelectedBefore] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    // Create a ref to handle clicks outside the modal
    const handleOutsideClick = (e: MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            if (!showSuccessScreen) { // Don't close during success animation
                setIsOpen(false);
            }
        }
    };

    // Reset success screen when modal is reopened
    useEffect(() => {
        if (isOpen) {
            setShowSuccessScreen(false);
        }
    }, [isOpen]);

    // Set up listener for outside clicks
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('mousedown', handleOutsideClick);
        } else {
            document.removeEventListener('mousedown', handleOutsideClick);
        }

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isOpen, showSuccessScreen]);

    // When modal opens, generate titles if needed
    useEffect(() => {
        if (isOpen && !titles.length && !isLoading) {
            generateTitles();
        }
    }, [isOpen, titles.length, isLoading]);

    // Add selected title to titles list if provided and not already there
    useEffect(() => {
        if (initialTitle && !hasSelectedBefore) {
            const titleExists = titles.some(title => title.text === initialTitle);

            if (!titleExists) {
                setTitles(prevTitles => [
                    ...prevTitles,
                    {
                        text: initialTitle,
                        isLocked: true,
                        style: 'primary', // Default style
                        score: 85 // Default high score
                    }
                ]);
            }
        }
    }, [initialTitle, titles, hasSelectedBefore]);

    // Show confetti effect on selection
    useEffect(() => {
        if (showSuccessScreen) {
            // Multiple confetti bursts for a more impressive effect
            const duration = 1500;
            const animationEnd = Date.now() + duration;

            // Configure different types of confetti
            const confettiOptions = {
                particleCount: 80,
                spread: 100,
                origin: { x: 0.5, y: 0.3 },
                colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'],
                disableForReducedMotion: true,
            };

            const interval = setInterval(() => {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    clearInterval(interval);
                    // Close modal after animation finishes with delay for a better UX
                    setTimeout(() => {
                        setShowSuccessScreen(false);
                        setHasSelectedBefore(true);
                        // Now we delay the closing to allow the animation to complete
                        setTimeout(() => setIsOpen(false), 300);
                    }, 500);
                    return;
                }

                // Launch confetti from different positions
                confetti({
                    ...confettiOptions,
                    origin: { x: 0.3, y: 0.5 },
                });
                confetti({
                    ...confettiOptions,
                    origin: { x: 0.7, y: 0.5 },
                });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [showSuccessScreen]);

    // Parse titles from AI response
    const parseTitles = (text: string): TitleSuggestion[] => {
        const titleRegex = /TITLE: (.*)\nSTYLE: (.*)\nSCORE: (\d+)/gi;
        const matches = [...text.matchAll(titleRegex)];

        const parsedTitles = matches.map(match => ({
            text: match[1].trim(),
            isLocked: false,
            style: match[2].trim().toLowerCase() as 'primary' | 'creative' | 'technical',
            score: parseInt(match[3].trim(), 10)
        }));

        // Find the title with the highest score to recommend
        let highestScoreIndex = 0;
        let highestScore = 0;

        parsedTitles.forEach((title, index) => {
            if (title.score > highestScore) {
                highestScore = title.score;
                highestScoreIndex = index;
            }
        });

        setAiRecommendation(highestScoreIndex);

        return parsedTitles.slice(0, 3); // Ensure we have at most 3 titles
    };

    // Generate title suggestions
    const generateTitles = async () => {
        if (!apiKey || !content.trim()) {
            setError(new Error(content.trim() ? "API key is required" : "Content is required"));
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Create a Halesis client instance
            const halesisClient = createHalesisClient({
                apiKey,
                defaultModel: 'copilot-zero',
            });

            // Process content to extract the most important parts
            const processedContent = extractImportantContent(content);

            // Get locked titles for context - we pass the full title object to influence AI
            const lockedTitles = titles.filter(title => title.isLocked);

            // Generate titles
            const prompt = getTitleGenerationPrompt(processedContent, lockedTitles);
            const generatedText = await halesisClient.generateText(prompt, {
                temperature: 0.8,
                max_tokens: 200,
            });

            // Parse the titles
            const parsedTitles = parseTitles(generatedText);

            if (parsedTitles.length === 0) {
                throw new Error("Failed to generate valid titles");
            }

            // Keep locked titles, add new ones
            const lockedTitlesSet = new Set(lockedTitles.map(t => t.text));

            // Keep locked titles and replace unlocked titles with new ones
            const newTitles = [
                ...titles.filter(t => t.isLocked),
                ...parsedTitles.filter(t => !lockedTitlesSet.has(t.text))
            ];

            // Ensure we have at most 3 titles, prioritizing locked titles
            const finalTitles = newTitles.slice(0, 3);

            // Make sure there's at least one title of each style if possible
            const styles = ['primary', 'creative', 'technical'];
            const existingStyles = new Set(finalTitles.map(t => t.style));

            // If there are missing styles and we have space, add them from parsedTitles
            if (finalTitles.length < 3) {
                const missingStyles = styles.filter(style => !existingStyles.has(style as 'primary' | 'creative' | 'technical'));

                for (const style of missingStyles) {
                    const titleOfStyle = parsedTitles.find(t =>
                        t.style === style && !lockedTitlesSet.has(t.text) &&
                        !finalTitles.some(ft => ft.text === t.text)
                    );

                    if (titleOfStyle && finalTitles.length < 3) {
                        finalTitles.push(titleOfStyle);
                    }
                }
            }

            setTitles(finalTitles);
        } catch (err) {
            console.error("Error generating titles:", err);
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle lock status for a title
    const toggleLockTitle = (index: number) => {
        setTitles(prevTitles =>
            prevTitles.map((title, i) =>
                i === index ? { ...title, isLocked: !title.isLocked } : title
            )
        );
    };

    // Handle title selection
    const handleSelectTitle = (title: string) => {
        setSelectedTitle(title);
        setShowSuccessScreen(true);
        onSelectTitle(title);
    };

    // Reset and generate new titles
    const handleReset = () => {
        // Keep locked titles but regenerate
        generateTitles();
    };

    // Get background style based on title style
    const getTitleBackground = (style: 'primary' | 'creative' | 'technical', isRecommended: boolean) => {
        const gradientMap = {
            primary: isRecommended
                ? "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-800/20"
                : "bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900/40 dark:to-blue-900/10 border-slate-200 dark:border-slate-800/20",
            creative: isRecommended
                ? "bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800/20"
                : "bg-gradient-to-r from-slate-50 to-purple-50 dark:from-slate-900/40 dark:to-purple-900/10 border-slate-200 dark:border-slate-800/20",
            technical: isRecommended
                ? "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 border-emerald-200 dark:border-emerald-800/20"
                : "bg-gradient-to-r from-slate-50 to-emerald-50 dark:from-slate-900/40 dark:to-emerald-900/10 border-slate-200 dark:border-slate-800/20",
        };

        return gradientMap[style];
    };

    // Get icon based on title style
    const getTitleIcon = (style: 'primary' | 'creative' | 'technical') => {
        switch(style) {
            case 'primary': return <Check className="h-3.5 w-3.5" />;
            case 'creative': return <Wand2 className="h-3.5 w-3.5" />;
            case 'technical': return <ChevronDown className="h-3.5 w-3.5" />;
            default: return <Check className="h-3.5 w-3.5" />;
        }
    };

    // Get color for style badge
    const getStyleColor = (style: 'primary' | 'creative' | 'technical') => {
        switch(style) {
            case 'primary': return "text-blue-700 dark:text-blue-400";
            case 'creative': return "text-purple-700 dark:text-purple-400";
            case 'technical': return "text-emerald-700 dark:text-emerald-400";
            default: return "text-slate-700 dark:text-slate-400";
        }
    };

    // Animation variants
    const overlayVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 }
    };

    const modalVariants: Variants = {
        hidden: { y: 20, scale: 0.95, opacity: 0 },
        visible: { y: 0, scale: 1, opacity: 1, transition: { type: "spring", duration: 0.5, delay: 0.1 } },
        exit: { y: -20, scale: 0.95, opacity: 0, transition: { duration: 0.2 } }
    };

    const successVariants: Variants = {
        hidden: { scale: 0.8, opacity: 0 },
        visible: { scale: 1, opacity: 1, transition: { type: "spring", damping: 12 } },
        exit: { scale: 1.2, opacity: 0 }
    };

    // Custom modal implementation
    const Modal = isOpen ? createPortal(
        <AnimatePresence mode="wait">
            <motion.div
                key="overlay"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={overlayVariants}
                className="fixed inset-0 z-50 backdrop-blur-sm bg-black/50 flex items-center justify-center p-4"
            >
                <motion.div
                    ref={modalRef}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={modalVariants}
                    className="max-w-md w-full overflow-hidden"
                >
                    {/* Success Screen */}
                    {showSuccessScreen ? (
                        <motion.div
                            key="success"
                            variants={successVariants}
                            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-green-100 dark:border-green-900 overflow-hidden"
                        >
                            <div className="p-6 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Perfect Title Selected!</h3>
                                <p className="text-lg text-muted-foreground mb-4">Your changelog is going to look great!</p>
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 p-4 rounded-lg border border-green-100 dark:border-green-800/30 mt-4">
                                    <p className="font-medium">{selectedTitle}</p>
                                </div>

                                <div className="mt-6 flex justify-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setShowSuccessScreen(false);
                                        }}
                                    >
                                        <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                        Pick Another Title
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b p-5 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="bg-primary/10 p-1.5 rounded-md">
                                        <Pencil className="w-5 h-5 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-lg">Title Generator</h3>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsOpen(false)}
                                    className="h-8 w-8 rounded-full"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Content */}
                            <div className="p-5">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <div className="relative w-16 h-16">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                className="absolute inset-0 rounded-full border-t-2 border-primary"
                                            />
                                            <Sparkles className="h-6 w-6 text-primary absolute inset-0 m-auto" />
                                        </div>
                                        <p className="text-muted-foreground mt-4">Crafting perfect titles for your changelog...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-8">
                                        <p className="text-destructive mb-4">
                                            {error.message || 'Failed to generate titles'}
                                        </p>
                                        <Button onClick={() => generateTitles()}>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Try Again
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between mb-5">
                                            <p className="text-sm text-muted-foreground">
                                                Select the perfect title for your changelog.
                                            </p>
                                            {selectedTitle && (
                                                <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 py-1 px-2 rounded-full flex items-center gap-1">
                                                    <Check className="h-3 w-3" />
                                                    <span>Title selected</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            {titles.map((title, index) => (
                                                <div
                                                    key={index}
                                                    className={cn(
                                                        "relative rounded-lg border transition-all duration-200",
                                                        getTitleBackground(title.style, index === aiRecommendation),
                                                        title.isLocked ? "ring-2 ring-primary/30" : "",
                                                        index === aiRecommendation ? "shadow-md" : "",
                                                        title.text === selectedTitle ? "ring-2 ring-green-400" : ""
                                                    )}
                                                >
                                                    {/* AI recommendation badge */}
                                                    {index === aiRecommendation && (
                                                        <div className="absolute -top-2 -right-2 bg-[hsl(var(--secondary)_/_1)] z-50 text-white text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                                            <Lightbulb className="h-3 w-3" />
                                                            <span>AI Pick</span>
                                                        </div>
                                                    )}

                                                    <div
                                                        className="p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                                        onClick={() => handleSelectTitle(title.text)}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div
                                                                className={cn(
                                                                    "text-xs font-medium rounded-full py-0.5 px-2 bg-white/60 dark:bg-gray-800/40 flex items-center gap-1",
                                                                    getStyleColor(title.style)
                                                                )}
                                                            >
                                                                {getTitleIcon(title.style)}
                                                                <span className="capitalize">{title.style}</span>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 rounded-full"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleLockTitle(index);
                                                                }}
                                                            >
                                                                {title.isLocked ? (
                                                                    <Lock className="h-3.5 w-3.5 text-primary" />
                                                                ) : (
                                                                    <UnlockIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                        <p className="text-base font-medium">{title.text}</p>

                                                        <div className="mt-2 flex items-center gap-1">
                                                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full flex-grow">
                                                                <div
                                                                    className={cn(
                                                                        "h-full rounded-full",
                                                                        title.style === 'primary' ? "bg-blue-500" :
                                                                            title.style === 'creative' ? "bg-purple-500" :
                                                                                "bg-emerald-500"
                                                                    )}
                                                                    style={{ width: `${title.score}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">{title.score}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-2 justify-center items-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleReset}
                                                className="gap-1"
                                            >
                                                <Palette className="h-3.5 w-3.5" />
                                                <span>Generate New Options</span>
                                            </Button>

                                            <div className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                                                <Lock className="h-3 w-3" />
                                                <span>Lock titles to keep them</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    ) : null;

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-8 w-8 p-0",
                            selectedTitle ? "text-primary bg-primary/10" : ""
                        )}
                        onClick={() => setIsOpen(true)}
                    >
                        <Sparkles className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                    {selectedTitle ? "Change AI-generated title" : "Generate title with AI"}
                </TooltipContent>
            </Tooltip>

            {Modal}
        </>
    );
}