// components/changelog/ChangelogEntries.tsx
'use client'

import {useEffect, useRef, useState, useCallback} from 'react'
import {motion, useInView, useScroll, useSpring, AnimatePresence} from 'framer-motion'
import {format} from 'date-fns'
import {Badge} from '@/components/ui/badge'
import {Card, CardContent} from '@/components/ui/card'
import {Skeleton} from '@/components/ui/skeleton'
import {
    ChevronRight,
    Clock,
    GitCommit,
    Loader2,
    Tag,
    Search,
    Filter,
    SortDesc,
    SortAsc,
    X
} from 'lucide-react'
import {useInfiniteQuery} from '@tanstack/react-query'
import type {ChangelogEntry} from '@/lib/types/changelog'
import {cn} from '@/lib/utils'
import {RenderMarkdown} from "@/components/markdown-editor/RenderMarkdown"
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from '@/components/ui/command'
import {ColoredTag} from '@/components/changelog/editor/TagColorPicker'

interface ChangelogEntriesProps {
    projectId: string
}

// Define the API response structure
interface ChangelogApiResponse {
    items: ChangelogEntry[];
    nextCursor: string | null;
}

// Animation variants
const container = {
    hidden: {opacity: 0},
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const item = {
    hidden: {opacity: 0, y: 20},
    show: {opacity: 1, y: 0, transition: {duration: 0.4}}
}

const fadeIn = {
    hidden: {opacity: 0},
    show: {opacity: 1, transition: {duration: 0.3}}
}

// Enhanced tag interface with color support
interface TagWithColor {
    id: string;
    name: string;
    color?: string | null;
}

// Skeleton components
const SkeletonEntry = () => (
    <Card className="relative overflow-hidden border-primary/5">
        <CardContent className="p-6">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64"/>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-24"/>
                        </div>
                    </div>
                    <Skeleton className="h-5 w-32"/>
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-4 w-full"/>
                    <Skeleton className="h-4 w-3/4"/>
                    <Skeleton className="h-4 w-5/6"/>
                </div>
                <div className="pt-6 border-t border-border">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-16"/>
                        <Skeleton className="h-6 w-16"/>
                        <Skeleton className="h-6 w-16"/>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
)

const SkeletonSidebarItem = () => (
    <div className="px-3 py-2">
        <Skeleton className="h-6 w-full"/>
    </div>
)

// Filter types
type SortOption = 'newest' | 'oldest';
type FilterState = {
    search: string;
    sort: SortOption;
    tags: string[];
}

export default function ChangelogEntries({projectId}: ChangelogEntriesProps) {
    const loadMoreRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [activeEntry, setActiveEntry] = useState<string | null>(null)

    // New state for filters and search
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        sort: 'newest',
        tags: []
    })
    const [searchInput, setSearchInput] = useState('')
    const [availableTags, setAvailableTags] = useState<TagWithColor[]>([])
    const [isFilterApplied, setIsFilterApplied] = useState(false)

    const isLoadMoreVisible = useInView(loadMoreRef, {
        margin: "200px 0px 0px 0px",
    })

    // Query with filters
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
        error,
        refetch
    } = useInfiniteQuery({
        queryKey: ['changelog-entries', projectId, filters],
        queryFn: async ({pageParam}): Promise<ChangelogApiResponse> => {
            const searchParams = new URLSearchParams()
            if (pageParam !== undefined) {
                searchParams.set('cursor', String(pageParam))
            }
            if (filters.search) {
                searchParams.set('search', filters.search)
            }
            if (filters.sort) {
                searchParams.set('sort', filters.sort)
            }
            if (filters.tags.length > 0) {
                searchParams.set('tags', filters.tags.join(','))
            }

            const res = await fetch(
                `/api/changelog/${projectId}/entries/all?${searchParams.toString()}`
            )
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to fetch entries')
            }
            return res.json()
        },
        getNextPageParam: (lastPage: ChangelogApiResponse) => lastPage.nextCursor ?? undefined,
        initialPageParam: undefined,
        refetchOnWindowFocus: false,
    })

    // Extract all tags for the filter with color support
    useEffect(() => {
        if (data?.pages) {
            const tags = new Map<string, TagWithColor>();
            data.pages.forEach((page) => {
                (page as ChangelogApiResponse).items.forEach((entry: ChangelogEntry) => {
                    entry.tags?.forEach(tag => {
                        tags.set(tag.id, {
                            id: tag.id,
                            name: tag.name,
                            color: tag.color || null
                        });
                    });
                });
            });
            setAvailableTags(Array.from(tags.values()));
        }
    }, [data?.pages]);

    // Infinite scroll
    useEffect(() => {
        if (isLoadMoreVisible && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
        }
    }, [isLoadMoreVisible, hasNextPage, isFetchingNextPage, fetchNextPage])

    // Scroll progress indicator
    const {scrollYProgress} = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    })

    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    })

    // Track active entry while scrolling
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return

            const entries = containerRef.current.querySelectorAll('[data-entry-id]')
            const viewportMiddle = window.innerHeight / 2
            let closestEntry = null
            let closestDistance = Infinity

            entries.forEach((entry) => {
                const rect = entry.getBoundingClientRect()
                const entryMiddle = rect.top + rect.height / 2
                const distance = Math.abs(entryMiddle - viewportMiddle)

                if (distance < closestDistance) {
                    closestDistance = distance
                    closestEntry = entry.getAttribute('data-entry-id')
                }
            })

            setActiveEntry(closestEntry)
        }

        window.addEventListener('scroll', handleScroll, {passive: true})
        handleScroll()

        return () => window.removeEventListener('scroll', handleScroll)
    }, [data?.pages])

    // Handle filter application
    const applyFilters = useCallback(() => {
        setFilters(prev => ({
            ...prev,
            search: searchInput
        }))
        setIsFilterApplied(!!searchInput || filters.tags.length > 0 || filters.sort !== 'newest')
    }, [searchInput, filters.tags, filters.sort])

    // Handle tags selection
    const toggleTag = useCallback((tagId: string) => {
        setFilters(prev => {
            const newTags = prev.tags.includes(tagId)
                ? prev.tags.filter(id => id !== tagId)
                : [...prev.tags, tagId]

            return {
                ...prev,
                tags: newTags
            }
        })
        setIsFilterApplied(true)
    }, [])

    // Reset filters
    const resetFilters = useCallback(() => {
        setSearchInput('')
        setFilters({
            search: '',
            sort: 'newest',
            tags: []
        })
        setIsFilterApplied(false)
    }, [])

    // Handle sort change
    const handleSortChange = useCallback((value: string) => {
        setFilters(prev => ({
            ...prev,
            sort: value as SortOption
        }))
        setIsFilterApplied(true)
    }, [])

    // Error handling
    if (status === 'error') {
        return (
            <div className="text-center py-12">
                <p className="text-destructive">
                    Error loading changelog entries: {error instanceof Error ? error.message : 'Unknown error'}
                </p>
                <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => refetch()}
                >
                    Try Again
                </Button>
            </div>
        )
    }

    const isLoading = status === 'pending'
    const allEntries = data?.pages.flatMap(page => (page as ChangelogApiResponse).items) || []

    return (
        <div ref={containerRef} className="relative min-h-[50vh]">
            {/* Progress bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-primary/10 z-50"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.5}}
            >
                <motion.div
                    className="h-full bg-gradient-to-r from-primary/40 to-primary origin-left"
                    style={{scaleX}}
                />
            </motion.div>

            {/* Filters Section */}
            <motion.div
                className="mb-8 p-4 bg-background/80 backdrop-blur-sm rounded-lg border border-border/40"
                variants={fadeIn}
                initial="hidden"
                animate="show"
            >
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 flex items-center gap-2">
                        <Input
                            placeholder="Search releases..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            className="bg-background"
                        />
                        <Button onClick={applyFilters} variant="secondary" size="icon">
                            <Search className="h-4 w-4"/>
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select
                            value={filters.sort}
                            onValueChange={handleSortChange}
                        >
                            <SelectTrigger className="w-[140px] bg-background">
                                <SelectValue placeholder="Sort by"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">
                                    <div className="flex items-center gap-2">
                                        <SortDesc className="h-4 w-4"/>
                                        <span>Newest</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="oldest">
                                    <div className="flex items-center gap-2">
                                        <SortAsc className="h-4 w-4"/>
                                        <span>Oldest</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="bg-background">
                                    <Filter className="h-4 w-4 mr-2"/>
                                    Tags
                                    {filters.tags.length > 0 && (
                                        <Badge variant="secondary" className="ml-2">
                                            {filters.tags.length}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0" align="end">
                                <Command>
                                    <CommandInput placeholder="Search tags..."/>
                                    <CommandEmpty>No tags found.</CommandEmpty>
                                    <CommandGroup>
                                        {availableTags.map(tag => (
                                            <CommandItem
                                                key={tag.id}
                                                onSelect={() => toggleTag(tag.id)}
                                                className="flex items-center gap-2"
                                            >
                                                <div className={cn(
                                                    "w-4 h-4 rounded-sm border",
                                                    filters.tags.includes(tag.id)
                                                        ? "bg-primary border-primary"
                                                        : "border-border"
                                                )}/>
                                                {tag.color && (
                                                    <div
                                                        className="h-3 w-3 rounded-full border border-gray-300"
                                                        style={{ backgroundColor: tag.color }}
                                                    />
                                                )}
                                                <span>{tag.name}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {isFilterApplied && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={resetFilters}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4"/>
                            </Button>
                        )}
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-16"
                >
                    {isLoading ? (
                        <div className="space-y-16">
                            {[...Array(3)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    variants={item}
                                    initial="hidden"
                                    animate="show"
                                >
                                    <SkeletonEntry/>
                                </motion.div>
                            ))}
                        </div>
                    ) : allEntries.length === 0 ? (
                        <motion.div
                            className="text-center py-12"
                            variants={fadeIn}
                            initial="hidden"
                            animate="show"
                        >
                            <p className="text-muted-foreground text-lg">
                                No entries found matching your criteria.
                            </p>
                            {isFilterApplied && (
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={resetFilters}
                                >
                                    Reset Filters
                                </Button>
                            )}
                        </motion.div>
                    ) : (
                        <>
                            <AnimatePresence>
                                {data?.pages.map((page, pageIndex) => (
                                    <div key={pageIndex} className="space-y-16">
                                        {(page as ChangelogApiResponse).items.map((entry: ChangelogEntry) => (
                                            <motion.div
                                                key={entry.id}
                                                variants={item}
                                                data-entry-id={entry.id}
                                                className={cn(
                                                    "relative transition-all duration-300",
                                                    activeEntry === entry.id && "scale-[1.02]"
                                                )}
                                            >
                                                {/* Active indicator */}
                                                <motion.div
                                                    className={cn(
                                                        "absolute -left-4 top-1/2 -translate-y-1/2 w-2 h-8 rounded-full bg-primary/40"
                                                    )}
                                                    initial={{opacity: 0}}
                                                    animate={{opacity: activeEntry === entry.id ? 1 : 0}}
                                                    transition={{duration: 0.2}}
                                                />

                                                <Card
                                                    className="relative overflow-hidden border-primary/5 hover:border-primary/20 transition-all group shadow-sm hover:shadow"
                                                >
                                                    <CardContent className="p-6">
                                                        <div className="space-y-6">
                                                            {/* Header */}
                                                            <div
                                                                className="flex flex-col md:flex-row md:items-start md:justify-between gap-4"
                                                            >
                                                                <div className="space-y-2">
                                                                    <h3 className="text-2xl font-semibold tracking-tight group-hover:text-primary transition-colors">
                                                                        {entry.title}
                                                                    </h3>
                                                                    {entry.version && (
                                                                        <div className="flex items-center gap-2">
                                                                            <GitCommit
                                                                                className="w-4 h-4 text-muted-foreground"/>
                                                                            <Badge variant="outline"
                                                                                   className="font-mono">
                                                                                {entry.version}
                                                                            </Badge>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {entry.publishedAt && (
                                                                    <div
                                                                        className="flex items-center gap-2 text-muted-foreground"
                                                                    >
                                                                        <Clock className="w-4 h-4"/>
                                                                        <time
                                                                            dateTime={typeof entry.publishedAt === 'string'
                                                                                ? entry.publishedAt
                                                                                : entry.publishedAt.toISOString()}
                                                                            className="text-sm tabular-nums"
                                                                        >
                                                                            {format(
                                                                                typeof entry.publishedAt === 'string'
                                                                                    ? new Date(entry.publishedAt)
                                                                                    : entry.publishedAt,
                                                                                'MMMM d, yyyy'
                                                                            )}
                                                                        </time>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Content with animation */}
                                                            <motion.div
                                                                initial={{opacity: 0.8}}
                                                                animate={{opacity: 1}}
                                                                transition={{duration: 0.5}}
                                                                className="prose prose-lg max-w-none prose-neutral dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border"
                                                            >
                                                                <RenderMarkdown>
                                                                    {entry.content}
                                                                </RenderMarkdown>
                                                            </motion.div>

                                                            {/* Tags with Color Support */}
                                                            {entry.tags?.length > 0 && (
                                                                <div className="pt-6 border-t border-border">
                                                                    <div className="flex items-start gap-2">
                                                                        <Tag
                                                                            className="w-4 h-4 text-muted-foreground mt-1"/>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {entry.tags.map((tag) => (
                                                                                <ColoredTag
                                                                                    key={tag.id}
                                                                                    name={tag.name}
                                                                                    color={tag.color}
                                                                                    size="sm"
                                                                                    onClick={() => toggleTag(tag.id)}
                                                                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                ))}
                            </AnimatePresence>
                        </>
                    )}

                    {/* Load more section */}
                    <div
                        ref={loadMoreRef}
                        className={cn(
                            "h-20 flex items-center justify-center",
                            !hasNextPage && "hidden"
                        )}
                    >
                        {isFetchingNextPage && (
                            <motion.div
                                className="flex items-center gap-2 text-muted-foreground"
                                initial={{opacity: 0, y: 20}}
                                animate={{opacity: 1, y: 0}}
                            >
                                <Loader2 className="w-4 h-4 animate-spin"/>
                                <span>Loading more entries...</span>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* Side panel */}
                <div className="hidden lg:block">
                    <div className="sticky top-4 space-y-4">
                        <Card className="shadow-sm">
                            <CardContent className="p-4">
                                <h4 className="font-semibold mb-4">Quick Navigation</h4>
                                <div
                                    className="space-y-1 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20"
                                >
                                    {isLoading ? (
                                        <div className="space-y-1">
                                            {[...Array(5)].map((_, i) => (
                                                <SkeletonSidebarItem key={i}/>
                                            ))}
                                        </div>
                                    ) : allEntries.length === 0 ? (
                                        <p className="text-sm text-muted-foreground px-3 py-2">
                                            No entries available
                                        </p>
                                    ) : (
                                        <>
                                            {/* Filter count summary if filters applied */}
                                            {isFilterApplied && (
                                                <div className="px-3 py-2 mb-2 bg-muted/50 rounded-md text-sm">
                                                    <p className="text-muted-foreground">
                                                        Showing {allEntries.length} filtered
                                                        result{allEntries.length !== 1 ? 's' : ''}
                                                    </p>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="mt-1 h-7 w-full text-xs"
                                                        onClick={resetFilters}
                                                    >
                                                        Clear All Filters
                                                    </Button>
                                                </div>
                                            )}

                                            {data?.pages.flatMap((page) =>
                                                    (page as ChangelogApiResponse).items.map((entry: ChangelogEntry) => (
                                                        <motion.button
                                                            key={entry.id}
                                                            onClick={() => {
                                                                document
                                                                    .querySelector(`[data-entry-id="${entry.id}"]`)
                                                                    ?.scrollIntoView({behavior: 'smooth'})
                                                            }}
                                                            className={cn(
                                                                "flex items-center w-full text-left px-3 py-2 rounded-md transition-all",
                                                                "text-sm hover:bg-primary/10",
                                                                activeEntry === entry.id ?
                                                                    "bg-primary/20 text-primary font-medium" :
                                                                    "text-muted-foreground"
                                                            )}
                                                            initial={{opacity: 0, x: -20}}
                                                            animate={{opacity: 1, x: 0}}
                                                            transition={{delay: 0.1}}
                                                        >
                                                            <ChevronRight className={cn(
                                                                "w-4 h-4 mr-2 transition-transform",
                                                                activeEntry === entry.id && "rotate-90"
                                                            )}/>
                                                            <div className="truncate">
                                                                <span className="truncate">{entry.title}</span>
                                                                {entry.version && (
                                                                    <span className="ml-2 text-xs opacity-70 font-mono">
                                  {entry.version}
                                </span>
                                                                )}
                                                            </div>
                                                        </motion.button>
                                                    ))
                                            )}
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tag filter card with colors */}
                        {availableTags.length > 0 && (
                            <Card className="shadow-sm">
                                <CardContent className="p-4">
                                    <h4 className="font-semibold mb-4">Filter by Tags</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {availableTags.map(tag => (
                                            <ColoredTag
                                                key={tag.id}
                                                name={tag.name}
                                                color={tag.color}
                                                size="sm"
                                                variant={filters.tags.includes(tag.id) ? "default" : "outline"}
                                                onClick={() => toggleTag(tag.id)}
                                                removable={filters.tags.includes(tag.id)}
                                                onRemove={filters.tags.includes(tag.id) ? () => toggleTag(tag.id) : undefined}
                                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                            />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}