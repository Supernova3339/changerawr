// /app/dashboard/bookmarks/page.tsx

'use client'

import React, {useState, useMemo, useEffect} from 'react'
import Link from 'next/link'
import {useQuery} from '@tanstack/react-query'
import {
    Star,
    Search,
    MoreVertical,
    ExternalLink,
    Trash2,
    FolderOpen,
    FileText,
    Eye,
    Edit3,
    Clock,
    Download,
    Upload,
    RefreshCw,
    SortAsc,
    SearchIcon,
} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Badge} from '@/components/ui/badge'
import {Skeleton} from '@/components/ui/skeleton'
import {Card, CardContent} from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip'
import {formatDistanceToNow} from 'date-fns'
import {BookmarkService, type BookmarkedItem} from '@/lib/services/bookmarks/bookmark.service'

interface Project {
    id: string
    name: string
    isPublic?: boolean
}

interface EnhancedBookmark extends BookmarkedItem {
    project?: Project
    changelogEntry?: {
        version?: string
        publishedAt?: string
        isPublished: boolean
        tags: Array<{ id: string; name: string }>
    }
}

type SortOption = 'recent' | 'alphabetical' | 'project'

export default function BookmarksPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<SortOption>('recent')
    const [allBookmarks, setAllBookmarks] = useState<BookmarkedItem[]>([])
    const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true)

    // Load all bookmarks using the service directly
    useEffect(() => {
        const loadBookmarks = () => {
            try {
                setIsLoadingBookmarks(true)
                const bookmarksByProject = BookmarkService.getAllBookmarks()
                const flatBookmarks: BookmarkedItem[] = []

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                Object.entries(bookmarksByProject).forEach(([projectId, bookmarks]) => {
                    flatBookmarks.push(...bookmarks.map(b => ({
                        ...b,
                        bookmarkedAt: b.bookmarkedAt || new Date().toISOString()
                    })))
                })

                setAllBookmarks(flatBookmarks)
            } catch (error) {
                console.error('Failed to load bookmarks:', error)
                setAllBookmarks([])
            } finally {
                setIsLoadingBookmarks(false)
            }
        }

        loadBookmarks()

        // Listen for storage changes to update bookmarks in real-time
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key?.startsWith('bookmarked-') || event.key === 'changerawr-global-bookmarks') {
                loadBookmarks()
            }
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [])

    // Get unique project IDs from bookmarks
    const projectIds = useMemo(() =>
            [...new Set(allBookmarks.map(b => b.projectId))],
        [allBookmarks]
    )

    // Fetch project details for all bookmarked projects
    const {data: projects = [], isLoading: isLoadingProjects} = useQuery<Project[]>({
        queryKey: ['projects-minimal', projectIds],
        queryFn: async () => {
            if (projectIds.length === 0) return []

            const projectPromises = projectIds.map(async (projectId) => {
                try {
                    const response = await fetch(`/api/projects/${projectId}`)
                    if (!response.ok) {
                        return {id: projectId, name: 'Unknown Project'}
                    }
                    const project = await response.json()
                    return {
                        id: project.id,
                        name: project.name,
                        isPublic: project.isPublic
                    }
                } catch {
                    return {id: projectId, name: 'Unknown Project'}
                }
            })

            return Promise.all(projectPromises)
        },
        enabled: projectIds.length > 0,
        staleTime: 300000,
    })

    // Fetch changelog entry details for bookmarks
    const {data: enrichedBookmarks = [], isLoading: isLoadingEntries} = useQuery<EnhancedBookmark[]>({
        queryKey: ['enriched-bookmarks', allBookmarks, projects],
        queryFn: async () => {
            if (allBookmarks.length === 0) return []

            const enriched = await Promise.all(
                allBookmarks.map(async (bookmark) => {
                    const project = projects.find(p => p.id === bookmark.projectId) || {
                        id: bookmark.projectId,
                        name: 'Unknown Project'
                    }

                    let changelogEntry = undefined

                    try {
                        const response = await fetch(
                            `/api/projects/${bookmark.projectId}/changelog/${bookmark.id}`
                        )
                        if (response.ok) {
                            const entry = await response.json()
                            changelogEntry = {
                                version: entry.version,
                                publishedAt: entry.publishedAt,
                                isPublished: !!entry.publishedAt,
                                tags: entry.tags || []
                            }
                        }
                    } catch {
                        changelogEntry = {
                            version: undefined,
                            publishedAt: undefined,
                            isPublished: false,
                            tags: []
                        }
                    }

                    return {
                        ...bookmark,
                        project,
                        changelogEntry
                    }
                })
            )

            return enriched
        },
        enabled: allBookmarks.length > 0,
        staleTime: 60000,
    })

    // Group bookmarks by project
    const groupedBookmarks = useMemo(() => {
        const filtered = enrichedBookmarks.filter(bookmark => {
            if (!searchQuery.trim()) return true
            const query = searchQuery.toLowerCase()
            return bookmark.title.toLowerCase().includes(query) ||
                bookmark.project?.name.toLowerCase().includes(query)
        })

        // Sort bookmarks
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'recent':
                    return new Date(b.bookmarkedAt || 0).getTime() - new Date(a.bookmarkedAt || 0).getTime()
                case 'alphabetical':
                    return a.title.localeCompare(b.title)
                case 'project':
                    return (a.project?.name || '').localeCompare(b.project?.name || '')
                default:
                    return 0
            }
        })

        // Group by project
        const grouped: Record<string, EnhancedBookmark[]> = {}
        filtered.forEach(bookmark => {
            const projectName = bookmark.project?.name || 'Unknown Project'
            if (!grouped[projectName]) {
                grouped[projectName] = []
            }
            grouped[projectName].push(bookmark)
        })

        return grouped
    }, [enrichedBookmarks, searchQuery, sortBy])

    // Handlers
    const handleRemoveBookmark = async (bookmark: EnhancedBookmark) => {
        const success = BookmarkService.removeBookmark(bookmark.id, bookmark.projectId)
        if (success) {
            setAllBookmarks(prev => prev.filter(b => !(b.id === bookmark.id && b.projectId === bookmark.projectId)))
        }
    }

    const handleExportBookmarks = () => {
        const data = BookmarkService.exportBookmarks()
        const blob = new Blob([data], {type: 'application/json'})
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `changerawr-bookmarks-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleImportBookmarks = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string
                const success = BookmarkService.importBookmarks(content)
                if (success) {
                    window.location.reload()
                } else {
                    alert('Failed to import bookmarks. Please check the file format.')
                }
            } catch {
                alert('Failed to read the import file.')
            }
        }
        reader.readAsText(file)
        event.target.value = ''
    }

    const isLoading = isLoadingBookmarks || isLoadingProjects || isLoadingEntries
    const totalBookmarks = enrichedBookmarks.length
    const filteredCount = Object.values(groupedBookmarks).flat().length

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-card border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <Star className="h-6 w-6 text-amber-500"/>
                                <h1 className="text-xl font-semibold text-foreground">Bookmarks</h1>
                                {!isLoading && (
                                    <span className="text-sm text-muted-foreground">
                                        {filteredCount !== totalBookmarks
                                            ? `${filteredCount} of ${totalBookmarks} bookmarks`
                                            : `${totalBookmarks} bookmarks`
                                        }
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search */}
                            <div className="relative">
                                <Search
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                <Input
                                    startIcon={<SearchIcon />}
                                    placeholder="Search bookmarks"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 w-64"
                                />
                            </div>

                            {/* Sort */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        {sortBy === 'recent' && <Clock className="h-4 w-4 mr-2"/>}
                                        {sortBy === 'alphabetical' && <SortAsc className="h-4 w-4 mr-2"/>}
                                        {sortBy === 'project' && <FolderOpen className="h-4 w-4 mr-2"/>}
                                        Sort
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setSortBy('recent')}>
                                        <Clock className="h-4 w-4 mr-2"/>
                                        Recently added
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSortBy('alphabetical')}>
                                        <SortAsc className="h-4 w-4 mr-2"/>
                                        Alphabetical
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSortBy('project')}>
                                        <FolderOpen className="h-4 w-4 mr-2"/>
                                        By project
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* More Actions */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <MoreVertical className="h-4 w-4"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleExportBookmarks}>
                                        <Download className="h-4 w-4 mr-2"/>
                                        Export bookmarks
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <label className="cursor-pointer flex items-center">
                                            <Upload className="h-4 w-4 mr-2"/>
                                            Import bookmarks
                                            <input
                                                type="file"
                                                accept=".json"
                                                onChange={handleImportBookmarks}
                                                className="hidden"
                                            />
                                        </label>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem onClick={() => window.location.reload()}>
                                        <RefreshCw className="h-4 w-4 mr-2"/>
                                        Refresh
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {isLoading ? (
                    <div className="space-y-6">
                        {Array.from({length: 3}).map((_, i) => (
                            <div key={i} className="space-y-3">
                                <Skeleton className="h-6 w-48"/>
                                <div className="space-y-2">
                                    {Array.from({length: 3}).map((_, j) => (
                                        <Card key={j}>
                                            <CardContent className="flex items-center gap-4 p-3">
                                                <Skeleton className="h-4 w-4"/>
                                                <Skeleton className="h-5 w-1/3"/>
                                                <Skeleton className="h-4 w-1/4"/>
                                                <Skeleton className="h-4 w-1/6"/>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : Object.keys(groupedBookmarks).length === 0 ? (
                    <div className="text-center py-12">
                        <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4"/>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            {allBookmarks.length === 0 ? 'No bookmarks yet' : 'No bookmarks match your search'}
                        </h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            {allBookmarks.length === 0
                                ? 'Start bookmarking changelog entries from the editor to see them here.'
                                : 'Try adjusting your search terms or clear the search to see all bookmarks.'
                            }
                        </p>
                        {allBookmarks.length === 0 && (
                            <Button asChild>
                                <Link href="/dashboard/projects">
                                    Browse Projects
                                </Link>
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedBookmarks).map(([projectName, bookmarks]) => (
                            <div key={projectName} className="space-y-3">
                                {/* Project Header */}
                                <div className="flex items-center gap-3 pb-2 border-b">
                                    <FolderOpen className="h-5 w-5 text-primary"/>
                                    <h2 className="text-lg font-semibold text-foreground">{projectName}</h2>
                                    <span className="text-sm text-muted-foreground">({bookmarks.length})</span>
                                </div>

                                {/* Bookmarks List */}
                                <div className="space-y-1">
                                    {bookmarks.map((bookmark) => (
                                        <BookmarkRow
                                            key={`${bookmark.projectId}-${bookmark.id}`}
                                            bookmark={bookmark}
                                            onRemove={() => handleRemoveBookmark(bookmark)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// Chrome-style Bookmark Row
interface BookmarkRowProps {
    bookmark: EnhancedBookmark
    onRemove: () => void
}

function BookmarkRow({bookmark, onRemove}: BookmarkRowProps) {
    const isPublished = bookmark.changelogEntry?.isPublished
    const version = bookmark.changelogEntry?.version

    return (
        <Card className="group hover:bg-accent/50 transition-colors">
            <CardContent className="flex items-center gap-4 p-3">
                {/* Favicon/Icon */}
                <div className="flex-shrink-0">
                    <div className="h-4 w-4 bg-primary/10 rounded flex items-center justify-center">
                        <FileText className="h-3 w-3 text-primary"/>
                    </div>
                </div>

                {/* Title and URL */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Link
                            href={`/dashboard/projects/${bookmark.projectId}/changelog/${bookmark.id}`}
                            className="font-medium text-primary hover:text-primary/80 hover:underline truncate text-sm"
                        >
                            {bookmark.title}
                        </Link>

                        {/* Status Badge */}
                        {isPublished ? (
                            <Badge variant="secondary"
                                   className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-xs px-1.5 py-0.5">
                                <Eye className="h-2.5 w-2.5 mr-1"/>
                                Live
                            </Badge>
                        ) : (
                            <Badge variant="secondary"
                                   className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs px-1.5 py-0.5">
                                <Edit3 className="h-2.5 w-2.5 mr-1"/>
                                Draft
                            </Badge>
                        )}

                        {/* Version */}
                        {version && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                {version.startsWith('v') ? version : `v${version}`}
                            </Badge>
                        )}
                    </div>

                    {/* URL/Path */}
                    <p className="text-xs text-muted-foreground truncate">
                        /dashboard/projects/{bookmark.projectId}/changelog/{bookmark.id}
                        {bookmark.bookmarkedAt && (
                            <span className="ml-2">
                                • Added {formatDistanceToNow(new Date(bookmark.bookmarkedAt))} ago
                            </span>
                        )}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    asChild
                                >
                                    <Link
                                        href={`/dashboard/projects/${bookmark.projectId}/changelog/${bookmark.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5"/>
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open in new tab</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreVertical className="h-3.5 w-3.5"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/dashboard/projects/${bookmark.projectId}/changelog/${bookmark.id}`}>
                                    <FileText className="h-4 w-4 mr-2"/>
                                    Open
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link
                                    href={`/dashboard/projects/${bookmark.projectId}/changelog/${bookmark.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="h-4 w-4 mr-2"/>
                                    Open in new tab
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem
                                onClick={onRemove}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-2"/>
                                Remove
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    )
}