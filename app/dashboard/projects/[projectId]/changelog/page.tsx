'use client'

import {use, useState} from 'react'
import Link from 'next/link'
import {useQuery} from '@tanstack/react-query'
import {useDebounce} from 'use-debounce'
import {format} from 'date-fns'
import {AnimatePresence, motion} from 'framer-motion'
import {ArrowUpDown, Calendar, ChevronRight, LayoutGrid, List, Plus, Search, Tag} from 'lucide-react'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {Card, CardContent} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {compareVersions} from 'compare-versions'
import {ChangelogEntry, ChangelogTag as ChTag} from '@/lib/types/changelog'
import {CatchUpView} from "@/components/project/catch-up/CatchUpView";

interface ChangelogPageProps {
    params: Promise<{ projectId: string }>
}

type ViewMode = 'grid' | 'list'
type SortOrder = 'newest' | 'oldest' | 'version'

export default function ChangelogPage({params}: ChangelogPageProps) {
    const {projectId} = use(params)
    const [searchInput, setSearchInput] = useState('')
    const [search] = useDebounce(searchInput, 500)
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>('grid')
    const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

    const {data, isLoading} = useQuery({
        queryKey: ['changelog', projectId, search, selectedTag],
        queryFn: async () => {
            const searchParams = new URLSearchParams({
                ...(search && {search}),
                ...(selectedTag && {tag: selectedTag})
            })

            const response = await fetch(
                `/api/projects/${projectId}/changelog?${searchParams}`
            )
            if (!response.ok) throw new Error('Failed to fetch changelog')
            return response.json()
        }
    })

    const sortedEntries = data?.entries ? [...data.entries].sort((a, b) => {
        if (sortOrder === 'newest') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        if (sortOrder === 'oldest') {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        }
        if (a.version && b.version) {
            try {
                return -compareVersions(a.version, b.version)
            } catch {
                return 0
            }
        }
        if (a.version) return -1
        if (b.version) return 1
        return 0
    }) : []

    const container = {
        hidden: {opacity: 0},
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    }

    const item = {
        hidden: {y: 20, opacity: 0},
        show: {y: 0, opacity: 1}
    }

    const fadeIn = {
        initial: {opacity: 0, y: 20},
        animate: {opacity: 1, y: 0},
        transition: {duration: 0.5}
    };

    return (
        <div className="h-full min-h-screen bg-background">
            <div className="container py-8 space-y-8">
                {/* Header */}
                <div
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 mb-8 shadow-lg">
                    <div className="absolute inset-0 bg-grid-white/[0.2] bg-[size:16px_16px]"/>
                    <div
                        className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Changelog Management</h1>
                            <p className="text-blue-100">Manage and organize your changelog entries</p>
                        </div>
                        <Button
                            asChild
                            className="bg-white/90 hover:bg-white text-blue-600 border-none shadow-md hover:shadow-lg transition-all"
                        >
                            <Link href={`/dashboard/projects/${projectId}/changelog/new`}>
                                <Plus className="h-4 w-4 mr-2"/>
                                New Entry
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Controls */}
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                <Input
                                    placeholder="Search entries..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setSortOrder(current => {
                                        const orders: SortOrder[] = ['newest', 'oldest', 'version']
                                        const currentIndex = orders.indexOf(current)
                                        return orders[(currentIndex + 1) % orders.length]
                                    })}
                                >
                                    <ArrowUpDown className="h-4 w-4 mr-2"/>
                                    {sortOrder === 'newest' ? 'Newest' :
                                        sortOrder === 'oldest' ? 'Oldest' : 'Version'}
                                </Button>
                                <div className="flex rounded-md overflow-hidden border">
                                    <Button
                                        variant={viewMode === 'grid' ? "default" : "ghost"}
                                        onClick={() => setViewMode('grid')}
                                        className="rounded-none px-3"
                                    >
                                        <LayoutGrid className="h-4 w-4"/>
                                    </Button>
                                    <Button
                                        variant={viewMode === 'list' ? "default" : "ghost"}
                                        onClick={() => setViewMode('list')}
                                        className="rounded-none px-3"
                                    >
                                        <List className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Tag Filter Section with Colors */}
                        {data?.tags && data.tags.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-muted-foreground"/>
                                    <span className="text-sm font-medium text-muted-foreground">Filter by tags:</span>
                                    {selectedTag && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedTag(null)}
                                            className="h-6 px-2 text-xs"
                                        >
                                            Clear filter
                                        </Button>
                                    )}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {data.tags.map((tag: ChTag) => {
                                        const isSelected = selectedTag === tag.name;
                                        return (
                                            <Button
                                                key={tag.id}
                                                variant={isSelected ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setSelectedTag(isSelected ? null : tag.name)}
                                                className="flex items-center gap-2"
                                            >
                                                {tag.color && (
                                                    <div
                                                        className="h-3 w-3 rounded-full border border-white/20"
                                                        style={{backgroundColor: tag.color}}
                                                    />
                                                )}
                                                {tag.name}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Catch-Up Section - NEW */}
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeIn}
                >
                    <CatchUpView projectId={projectId} />
                </motion.div>

                {/* Entries */}
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div
                            key="loading"
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            className={viewMode === 'grid' ?
                                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" :
                                "space-y-4"
                            }
                        >
                            {[...Array(6)].map((_, i) => (
                                <Card key={i} className="animate-pulse">
                                    <CardContent className="p-6">
                                        <div className="h-4 bg-muted rounded w-3/4 mb-4"/>
                                        <div className="h-4 bg-muted rounded w-1/2 mb-3"/>
                                        <div className="flex gap-2">
                                            <div className="h-6 bg-muted rounded w-16"/>
                                            <div className="h-6 bg-muted rounded w-20"/>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            variants={container}
                            initial="hidden"
                            animate="show"
                            className={viewMode === 'grid' ?
                                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" :
                                "space-y-4"
                            }
                        >
                            {sortedEntries.map((entry: ChangelogEntry) => (
                                <motion.div
                                    key={entry.id}
                                    variants={item}
                                    whileHover={{y: -2}}
                                >
                                    <Card className="group transition-colors hover:border-primary/50">
                                        <CardContent className="p-6">
                                            <Link
                                                href={`/dashboard/projects/${projectId}/changelog/${entry.id}`}
                                                className="block"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                                        {entry.title}
                                                    </h3>
                                                    <ChevronRight
                                                        className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all transform group-hover:translate-x-1 ml-2 flex-shrink-0"/>
                                                </div>

                                                <div
                                                    className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                                    {entry.version && (
                                                        <Badge variant="outline" size="sm">
                                                            <Tag className="h-3 w-3 mr-1"/>
                                                            {entry.version}
                                                        </Badge>
                                                    )}
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3"/>
                                                        <span>{format(new Date(entry.createdAt), 'MMM d, yyyy')}</span>
                                                    </div>
                                                </div>

                                                {/* Tags */}
                                                {entry.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {entry.tags.map((tag: ChTag) => (
                                                            <Badge
                                                                key={tag.id}
                                                                variant="secondary"
                                                                color={tag.color || undefined}
                                                                size="sm"
                                                                className="flex items-center gap-1.5"
                                                            >
                                                                {tag.name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </Link>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty State */}
                {!isLoading && data?.entries.length === 0 && (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <div
                                className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Plus className="h-6 w-6 text-primary"/>
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                {search || selectedTag ? 'No entries match your filters' : 'No entries found'}
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                {search || selectedTag
                                    ? 'Try adjusting your search or tag filters to find what you\'re looking for.'
                                    : 'Get started by creating your first changelog entry'
                                }
                            </p>
                            {search || selectedTag ? (
                                <div className="flex gap-2 justify-center">
                                    {search && (
                                        <Button
                                            variant="outline"
                                            onClick={() => setSearchInput('')}
                                        >
                                            Clear search
                                        </Button>
                                    )}
                                    {selectedTag && (
                                        <Button
                                            variant="outline"
                                            onClick={() => setSelectedTag(null)}
                                        >
                                            Clear tag filter
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <Button asChild>
                                    <Link href={`/dashboard/projects/${projectId}/changelog/new`}>
                                        <Plus className="h-4 w-4 mr-2"/>
                                        Create Entry
                                    </Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}