// components/changelog/editor/TagSelector.tsx
import React, {useState, useCallback} from 'react';
import {Button} from '@/components/ui/button';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator
} from "@/components/ui/command";
import {Tags, Check, Plus, Sparkles, Loader2, X, AlertCircle, CheckCircle, Palette, Lightbulb} from 'lucide-react';
import {Separator} from '@/components/ui/separator';
import {Badge} from "@/components/ui/badge";
import {cn} from '@/lib/utils';
import {motion, AnimatePresence} from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from '@/components/ui/tooltip';
import {Input} from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {ColorPicker, ColoredTag} from '@/components/changelog/editor/TagColorPicker';
import {TAG_COLOR_OPTIONS} from '@/lib/types/changelog';

interface Tag {
    id: string;
    name: string;
    color?: string | null;
}

interface TagSelectorProps {
    selectedTags: Tag[];
    availableTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
    content?: string; // For AI-powered tag suggestions
    aiApiKey?: string; // API key for AI features
    projectId: string; // Needed for creating new tags
}

// AI content processing parameters
const MAX_CHARS_PER_SECTION = 150; // Characters per extracted section
const SECTIONS_TO_EXTRACT = 3;     // Number of sections to extract
const SECTIONS_TO_ANALYZE = 3;     // Number of sections to actually send to AI

// Tag suggestions shown when no tags exist - hardcoded suggestions
interface TagSuggestion {
    name: string;
    colorValue: string; // Reference to TAG_COLOR_OPTIONS value
}

const TAG_SUGGESTIONS: TagSuggestion[] = [
    {name: 'Feature', colorValue: 'green'},
    {name: 'Bug Fixes', colorValue: 'red'},
    {name: 'Improvement', colorValue: 'blue'},
    {name: 'Other', colorValue: 'gray'},
];


export default function TagSelector({
                                        selectedTags,
                                        availableTags,
                                        onTagsChange,
                                        content = '',
                                        aiApiKey,
                                        projectId
                                    }: TagSelectorProps) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState<string | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // AI suggestion state
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestedTags, setSuggestedTags] = useState<Tag[]>([]);
    const [suggestionError, setSuggestionError] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Filter tags based on search
    const filteredTags = search
        ? availableTags.filter(tag =>
            tag.name.toLowerCase().includes(search.toLowerCase()))
        : availableTags;

    // Calculate which suggested tags haven't been selected yet
    const unselectedSuggestions = suggestedTags.filter(
        tag => !selectedTags.some(selected => selected.id === tag.id)
    );

    /**
     * Extract meaningful sections from content optimized for tag detection
     * This approach samples from beginning, middle and end of the document
     * to get a better representation of the full content.
     */
    const extractContentSections = (text: string): string[] => {
        if (!text) return [];

        const cleanedText = text.trim();
        if (cleanedText.length <= MAX_CHARS_PER_SECTION * SECTIONS_TO_EXTRACT) {
            return [cleanedText]; // Return all content if it's short enough
        }

        const sections: string[] = [];

        // Extract beginning section (always include)
        sections.push(extractSection(cleanedText, 0, MAX_CHARS_PER_SECTION));

        // If there's more content, extract middle section
        if (cleanedText.length > MAX_CHARS_PER_SECTION * 2) {
            const middleStart = Math.floor(cleanedText.length / 2) - (MAX_CHARS_PER_SECTION / 2);
            sections.push(extractSection(cleanedText, middleStart, MAX_CHARS_PER_SECTION));
        }

        // If there's more content, extract ending section
        if (cleanedText.length > MAX_CHARS_PER_SECTION * 3) {
            const endStart = Math.max(0, cleanedText.length - MAX_CHARS_PER_SECTION);
            sections.push(extractSection(cleanedText, endStart, MAX_CHARS_PER_SECTION));
        }

        // Extract headings if there are any (often contains important context)
        const headingMatches = cleanedText.match(/#+\s+.*$/gm) || [];
        if (headingMatches.length > 0) {
            const headings = headingMatches.slice(0, 5).join('\n');
            if (headings.length > 0) {
                sections.push(`Key sections:\n${headings}`);
            }
        }

        return sections;
    };

    /**
     * Extract a section of content with intelligent boundaries
     */
    const extractSection = (text: string, startPos: number, length: number): string => {
        // Safety checks
        if (!text || startPos >= text.length) return '';

        // Find start at paragraph or sentence boundary if possible
        let actualStart = startPos;
        let actualEnd = Math.min(text.length, startPos + length);

        // If not starting at beginning, find a good start boundary
        if (startPos > 0) {
            // Try to find paragraph start
            const paraStart = text.lastIndexOf('\n\n', startPos) + 2;
            if (paraStart > 0 && paraStart < startPos && (startPos - paraStart) < length / 2) {
                actualStart = paraStart;
            } else {
                // Try to find sentence start
                const sentStart = text.lastIndexOf('. ', startPos) + 2;
                if (sentStart > 0 && sentStart < startPos && (startPos - sentStart) < length / 3) {
                    actualStart = sentStart;
                }
            }
        }

        // Find a good end boundary
        if (actualEnd < text.length) {
            // Try to find paragraph end
            const paraEnd = text.indexOf('\n\n', actualEnd - 20);
            if (paraEnd > 0 && paraEnd < (actualEnd + length / 3)) {
                actualEnd = paraEnd;
            } else {
                // Try to find sentence end
                const sentEnd = text.indexOf('. ', actualEnd - 20);
                if (sentEnd > 0 && sentEnd < (actualEnd + length / 4)) {
                    actualEnd = sentEnd + 1; // Include the period
                }
            }
        }

        // If this is not the beginning, add indication
        const prefix = actualStart > 0 ? '... ' : '';
        // If this is not the end, add indication
        const suffix = actualEnd < text.length ? ' ...' : '';

        return prefix + text.substring(actualStart, actualEnd) + suffix;
    };

    // Apply all suggested tags at once
    const applyAllSuggestions = () => {
        if (unselectedSuggestions.length === 0) return;

        // Add all suggested tags that aren't already selected
        const newTags = [...selectedTags, ...unselectedSuggestions];
        onTagsChange(newTags);
    };

    // Handle creating a new tag with color support
    const handleCreateTag = useCallback(async (name: string, color?: string | null) => {
        if (!name.trim()) return;

        setIsCreating(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/changelog/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name.trim(),
                    color: color !== undefined ? color : newTagColor
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create tag');
            }

            const newTag = await response.json();

            // Add new tag to selected tags
            onTagsChange([...selectedTags, newTag]);

            // Reset form
            setSearch('');
            setNewTagName('');
            setNewTagColor(null);
            setShowColorPicker(false);
        } catch (error) {
            console.error('Error creating tag:', error);
        } finally {
            setIsCreating(false);
        }
    }, [projectId, selectedTags, onTagsChange, newTagColor]);

    // Handle AI tag suggestions
    const generateTagSuggestions = useCallback(async () => {
        if (!content || !aiApiKey || !availableTags.length) {
            setSuggestionError('Cannot generate suggestions without content or available tags');
            return;
        }

        if (content.trim().length < 20) {
            setSuggestionError('Content is too short for meaningful tag suggestions');
            return;
        }

        setIsGenerating(true);
        setSuggestionError(null);

        try {
            // Prepare prompt for the AI
            const tagNames = availableTags.map(tag => tag.name).join(', ');

            // Extract key sections from the content
            const contentSections = extractContentSections(content);

            // Limit number of sections if too many
            const sectionsToUse = contentSections.slice(0, SECTIONS_TO_ANALYZE);

            // Combine sections with section numbers for readability
            const formattedSections = sectionsToUse.map((section, index) =>
                `Section ${index + 1}:\n${section}`
            ).join('\n\n');

            const prompt = `
I need to categorize the following changelog content with appropriate tags.
Available tags: ${tagNames}

I'll provide key sections from the content below. Based on these sections, which tags (maximum 3) would be most relevant? 
Only respond with tags from the provided list above, separated by commas.
Do not add any explanations, just return the tag names.

${formattedSections}
            `.trim();

            // Call AI API
            const response = await fetch('https://api.secton.org/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiApiKey}`
                },
                body: JSON.stringify({
                    model: 'copilot-zero',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a skilled content tagger for a changelog system. Your job is to select the most appropriate tags for content.'
                        },
                        {role: 'user', content: prompt}
                    ],
                    temperature: 0.3,
                    max_tokens: 30 // Reduced to save tokens
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get tag suggestions');
            }

            const result = await response.json();
            const suggestedTagsText = result.messages[result.messages.length - 1]?.content || '';

            // Process the AI's response
            const suggestedTagNames = suggestedTagsText
                .split(',')
                .map((tag: string) => tag.trim())
                .filter(Boolean);

            // Map the suggested tag names to actual tag objects
            const validSuggestions = suggestedTagNames
                .map((name: string) => {
                    // Find case-insensitive match
                    return availableTags.find(tag =>
                        tag.name.toLowerCase() === name.toLowerCase()
                    );
                })
                .filter(Boolean) as Tag[];

            if (validSuggestions.length === 0) {
                setSuggestionError('Could not generate suitable tag suggestions');
            } else {
                setSuggestedTags(validSuggestions);
                setShowSuggestions(true);
            }
        } catch (err) {
            console.error('Error suggesting tags:', err);
            setSuggestionError(err instanceof Error ? err.message : 'Failed to analyze content');
        } finally {
            setIsGenerating(false);
        }
    }, [content, aiApiKey, availableTags]);

    // Toggle tag selection
    const toggleTag = useCallback((tag: Tag) => {
        const isSelected = selectedTags.some(t => t.id === tag.id);

        if (isSelected) {
            onTagsChange(selectedTags.filter(t => t.id !== tag.id));
        } else {
            onTagsChange([...selectedTags, tag]);
        }
    }, [selectedTags, onTagsChange]);

    // Clear all selected tags
    const clearTags = () => {
        if (selectedTags.length === 0) return;
        onTagsChange([]);
    };

    return (
        <TooltipProvider>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 border-dashed">
                        <Tags className="mr-2 h-4 w-4"/>
                        {selectedTags?.length > 0 ? (
                            <>
                                <span className="hidden md:inline-block">
                                  {selectedTags.length} selected
                                </span>
                                <Separator orientation="vertical" className="mx-2 h-4"/>
                            </>
                        ) : (
                            <span className="hidden md:inline-block">Select tags</span>
                        )}
                        <Badge
                            variant="secondary"
                            className="rounded-sm px-1 font-normal"
                        >
                            {selectedTags?.length}
                        </Badge>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                    {/* Header section with actions */}
                    <div className="flex items-center justify-between p-2 border-b">
                        <div className="flex items-center gap-2">
                            <Tags className="h-4 w-4 text-muted-foreground"/>
                            <span className="text-sm font-medium">Tags</span>
                        </div>

                        <div className="flex items-center gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2"
                                        onClick={clearTags}
                                        disabled={selectedTags.length === 0}
                                    >
                                        <X className="h-3.5 w-3.5 mr-1"/>
                                        <span className="text-xs">Clear</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Clear all selected tags</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    <Command>
                        <div className="flex items-center border-b p-1">
                            <CommandInput
                                placeholder="Search tags..."
                                value={search}
                                onValueChange={setSearch}
                                className="flex-1"
                            />
                            {aiApiKey && content.length > 20 && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 ml-1"
                                            disabled={isGenerating}
                                            onClick={() => {
                                                generateTagSuggestions();
                                            }}
                                        >
                                            {isGenerating ? (
                                                <Loader2 className="h-4 w-4 animate-spin"/>
                                            ) : (
                                                <Sparkles className="h-4 w-4"/>
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        Suggest tags with AI
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>

                        <CommandList>
                            {/* AI Suggestions Section */}
                            <AnimatePresence>
                                {showSuggestions && suggestedTags.length > 0 && (
                                    <motion.div
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: 'auto'}}
                                        exit={{opacity: 0, height: 0}}
                                        transition={{duration: 0.2}}
                                        className="overflow-hidden"
                                    >
                                        <Card className="border-0 shadow-none rounded-none bg-primary/5">
                                            <CardHeader className="p-2 pb-0">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <Sparkles className="h-3.5 w-3.5 text-primary"/>
                                                    AI Suggested Tags
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Based on your changelog content
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="p-2 pt-0">
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {suggestedTags.map((tag, index) => {
                                                        const isSelected = selectedTags.some(t => t.id === tag.id);

                                                        return (
                                                            <Badge
                                                                key={`suggested-${tag.id}-${index}`}
                                                                variant={isSelected ? "default" : "outline"}
                                                                color={tag.color || undefined}
                                                                className={cn(
                                                                    "cursor-pointer transition-all duration-200",
                                                                    !tag.color && (isSelected ? "bg-primary" : "bg-primary/10 hover:bg-primary/20")
                                                                )}
                                                                onClick={() => toggleTag(tag)}
                                                            >
                                                                {isSelected && <Check className="h-3 w-3 mr-1"/>}
                                                                {tag.name}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>

                                            <CardFooter className="p-2 pt-0 flex justify-between">
                                                {unselectedSuggestions.length > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={applyAllSuggestions}
                                                    >
                                                        <CheckCircle className="h-3 w-3 mr-1"/>
                                                        Apply all
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn("h-7 text-xs", unselectedSuggestions.length > 0 ? "" : "ml-auto")}
                                                    onClick={() => setShowSuggestions(false)}
                                                >
                                                    Hide
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                        <CommandSeparator/>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {suggestionError && (
                                <div className="px-2 py-2 text-xs text-destructive flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5"/>
                                    <span>{suggestionError}</span>
                                </div>
                            )}

                            <CommandEmpty>
                                <div className="py-3 px-4 text-center text-sm">
                                    {!search && availableTags.length === 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-center gap-2 pb-2">
                                                <Lightbulb className="h-4 w-4 text-yellow-500"/>
                                                <p className="text-sm font-medium text-foreground">Quick start tags</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {TAG_SUGGESTIONS.map((suggestion) => {
                                                    const colorOption = TAG_COLOR_OPTIONS.find(opt => opt.value === suggestion.colorValue);
                                                    return (
                                                        <button
                                                            key={suggestion.name}
                                                            onClick={() => {
                                                                handleCreateTag(suggestion.name, colorOption?.color || null);
                                                            }}
                                                            className="group transition-all hover:scale-105"
                                                        >
                                                            <ColoredTag
                                                                name={suggestion.name}
                                                                color={colorOption?.color}
                                                                size="sm"
                                                                className="cursor-pointer opacity-70 group-hover:opacity-100"
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {search && (
                                        <>
                                            <p className="text-muted-foreground mb-2">No tags found</p>
                                        </>
                                    )}
                                    {search && (
                                        <div className="mt-2 space-y-3">
                                            <p className="text-xs text-muted-foreground mb-2">Create a new tag:</p>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="text"
                                                    value={newTagName || search}
                                                    onChange={(e) => setNewTagName(e.target.value)}
                                                    className="flex-1 h-8 px-2 text-sm border border-input rounded-md"
                                                    placeholder="Tag name"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-2"
                                                    onClick={() => setShowColorPicker(!showColorPicker)}
                                                >
                                                    <Palette className="h-3.5 w-3.5"/>
                                                </Button>
                                            </div>

                                            {showColorPicker && (
                                                <div className="w-full">
                                                    <ColorPicker
                                                        value={newTagColor}
                                                        onChange={setNewTagColor}
                                                        placeholder="Choose tag color"
                                                        showCustomInput={true}
                                                    />
                                                </div>
                                            )}

                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="h-8 w-full"
                                                disabled={isCreating || !(newTagName || search).trim()}
                                                onClick={() => handleCreateTag(newTagName || search)}
                                            >
                                                {isCreating ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1"/>
                                                ) : (
                                                    <Plus className="h-3.5 w-3.5 mr-1"/>
                                                )}
                                                Create &ldquo;{(newTagName || search).trim()}&rdquo;
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CommandEmpty>

                            <CommandGroup heading="Available Tags">
                                <div className="max-h-[200px] overflow-y-auto">
                                    {filteredTags.map((tag) => {
                                        const isSelected = selectedTags.some(
                                            (selectedTag) => selectedTag.id === tag.id
                                        );
                                        const isSuggested = suggestedTags.some(
                                            (suggestedTag) => suggestedTag.id === tag.id
                                        );

                                        return (
                                            <CommandItem
                                                key={tag.id}
                                                onSelect={() => toggleTag(tag)}
                                                className={cn(
                                                    isSuggested && !isSelected && "bg-primary/5"
                                                )}
                                            >
                                                <div className={cn(
                                                    "mr-2 h-4 w-4 flex items-center justify-center rounded-sm",
                                                    isSelected ? "bg-primary text-primary-foreground" : "border border-primary/20"
                                                )}>
                                                    {isSelected && <Check className="h-3 w-3"/>}
                                                </div>

                                                {tag.color && (
                                                    <div
                                                        className="h-3 w-3 rounded-full border border-gray-300 mr-2"
                                                        style={{backgroundColor: tag.color}}
                                                    />
                                                )}

                                                <span className="flex-1">{tag.name}</span>
                                                <div className="flex items-center gap-1">
                                                    {isSuggested && !isSelected && (
                                                        <Badge variant="outline"
                                                               className="ml-auto text-xs bg-primary/10">
                                                            Suggested
                                                        </Badge>
                                                    )}
                                                    {isSelected && (
                                                        <Badge variant="default" className="ml-auto text-xs">
                                                            Selected
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CommandItem>
                                        );
                                    })}
                                </div>
                            </CommandGroup>

                            {selectedTags.length > 0 && (
                                <div className="border-t p-2 bg-muted/10">
                                    <div className="flex flex-wrap gap-1 mb-1">
                                        <p className="text-xs text-muted-foreground w-full mb-1">Selected tags:</p>
                                        {selectedTags.map((tag, index) => (
                                            <Badge
                                                key={`selected-${tag.id}-${index}`}
                                                variant="default"
                                                color={tag.color || undefined}
                                                className={cn(
                                                    "text-xs cursor-pointer flex items-center gap-1",
                                                    !tag.color && "bg-primary"
                                                )}
                                                onClick={() => toggleTag(tag)}
                                            >
                                                {tag.name}
                                                <X className="h-3 w-3 ml-1"/>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </TooltipProvider>
    );
}