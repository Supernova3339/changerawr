// /components/project/ProjectSidebar.tsx

'use client'

import React from 'react'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useQuery} from '@tanstack/react-query'
import {
    ChevronLeft,
    LayoutDashboard,
    Settings,
    FileText,
    ExternalLink,
    Plus,
    Clock,
    Bookmark,
    Eye,
    Star,
    Code,
    History,
    UserSquare2,
    PenTool,
    MailIcon,
    Rss,
    type LucideIcon,
    ChartNoAxesCombined,
    Globe,
    Key
} from 'lucide-react';
import {SiGithub} from '@icons-pack/react-simple-icons';
import {Button} from '@/components/ui/button'
import {ScrollArea} from '@/components/ui/scroll-area'
import {Separator} from '@/components/ui/separator'
import {Skeleton} from '@/components/ui/skeleton'
import {Badge} from '@/components/ui/badge'
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {cn} from '@/lib/utils'
import {formatDistanceToNow} from 'date-fns'
import {useBookmarks} from '@/hooks/useBookmarks'

interface NavItemProps {
    href: string
    icon: LucideIcon
    label: string
    active?: boolean
    external?: boolean
    badge?: string
    disabled?: boolean
}

interface ChangelogEntry {
    id: string
    title: string
    createdAt: string
    updatedAt: string
    publishedAt: string | null
    version: string | null
}

interface ChangelogData {
    entries: ChangelogEntry[]
    totalCount: number
}

interface Project {
    id: string
    name: string
    isPublic: boolean
}

function NavItem({href, icon: Icon, label, active, external, badge, disabled}: NavItemProps) {
    if (disabled) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={cn(
                            "flex items-center justify-between py-2 px-3 text-sm rounded-md",
                            "text-muted-foreground/50 bg-muted/20 cursor-not-allowed"
                        )}>
                            <div className="flex items-center">
                                <Icon className="mr-2 h-4 w-4 flex-shrink-0"/>
                                <span className="truncate">{label}</span>
                            </div>
                            {badge && (
                                <Badge variant="outline" className="ml-2 text-xs opacity-50 flex-shrink-0">
                                    {badge}
                                </Badge>
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">Requires public project</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <Link
            href={href}
            className={cn(
                "flex items-center justify-between py-2 px-3 text-sm rounded-md transition-colors group",
                active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
            {...(external ? {target: "_blank", rel: "noopener noreferrer"} : {})}
        >
            <div className="flex items-center min-w-0">
                <Icon className="mr-2 h-4 w-4 flex-shrink-0"/>
                <span className="truncate">{label}</span>
            </div>
            {badge && (
                <Badge variant="outline" className="ml-2 text-xs bg-primary/5 group-hover:bg-primary/10 flex-shrink-0">
                    {badge}
                </Badge>
            )}
            {external && <ExternalLink className="ml-2 h-3 w-3 opacity-70 flex-shrink-0"/>}
        </Link>
    )
}

interface RecentChangelogProps {
    id: string
    projectId: string
    title: string
    date: string
    version?: string | null
    isPublished?: boolean
}

function RecentChangelog({
                             id,
                             projectId,
                             title,
                             date,
                             version,
                             isPublished
                         }: RecentChangelogProps) {
    const {toggleBookmark, isBookmarked} = useBookmarks({
        projectId,
        entryId: id
    });

    const handleBookmarkClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleBookmark(id, title, projectId);
    };

    return (
        <div className="group relative">
            <Link
                href={`/dashboard/projects/${projectId}/changelog/${id}`}
                className="block p-2 pr-10 hover:bg-accent/50 rounded-md transition-colors"
            >
                <div className="flex items-start gap-2">
                    <div
                        className="h-8 w-8 bg-primary/10 rounded-md flex items-center justify-center mt-0.5 flex-shrink-0">
                        <FileText className="h-4 w-4 text-primary"/>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5">
                            <h4 className="font-medium text-sm group-hover:text-primary transition-colors break-words line-clamp-2">
                                {title}
                                {!isPublished && (
                                    <Badge
                                        variant="outline"
                                        className="ml-1.5 inline-flex align-baseline h-5 px-1 text-xs bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-800/40"
                                    >
                                        Draft
                                    </Badge>
                                )}
                            </h4>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1"/>
                                <span>{formatDistanceToNow(new Date(date))} ago</span>
                            </div>
                            {version && (
                                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                                    {version}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
            <div className="absolute right-2 top-3">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={handleBookmarkClick}
                            >
                                <Star
                                    className={cn(
                                        "h-3.5 w-3.5",
                                        isBookmarked
                                            ? "text-amber-500 fill-amber-500"
                                            : "text-muted-foreground"
                                    )}
                                />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">{isBookmarked ? "Remove bookmark" : "Bookmark"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    )
}

interface BookmarkedChangelogProps {
    id: string
    projectId: string
    title: string
}

function BookmarkedChangelog({id, projectId, title}: BookmarkedChangelogProps) {
    const {removeBookmark} = useBookmarks({projectId});

    const handleRemoveBookmark = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await removeBookmark(id, projectId);
    };

    return (
        <div className="group relative">
            <Link
                href={`/dashboard/projects/${projectId}/changelog/${id}`}
                className="flex items-center gap-2 p-2 pr-10 hover:bg-accent/50 rounded-md text-sm transition-colors"
            >
                <Bookmark className="h-4 w-4 text-amber-500 flex-shrink-0"/>
                <span className="line-clamp-1 break-words">
                    {title}
                </span>
            </Link>
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={handleRemoveBookmark}
                            >
                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500"/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">Remove bookmark</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    )
}

export function ProjectSidebar({projectId}: { projectId: string }) {
    const pathname = usePathname()
    const {bookmarks, isLoading: isLoadingBookmarks} = useBookmarks({projectId});

    // Fetch project details
    const {data: project, isLoading: isLoadingProject} = useQuery<Project>({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}`)
            if (!response.ok) throw new Error('Failed to fetch project')
            return response.json()
        }
    })

    // Fetch recent changelogs
    const {data: changelogData, isLoading: isLoadingChangelogs} = useQuery<ChangelogData>({
        queryKey: ['recent-changelogs', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/changelog?limit=4`)
            if (!response.ok) throw new Error('Failed to fetch recent changelogs')
            return response.json()
        }
    })

    // Determine if project is public
    const isPublic = project?.isPublic || false;

    // Determine the changelog count
    const changelogCount = changelogData?.totalCount || 0;
    const publishedCount = changelogData?.entries?.filter((e) => e.publishedAt)?.length || 0;
    const draftCount = changelogData?.entries?.filter((e) => !e.publishedAt)?.length || 0;

    // Construct RSS feed URL
    const rssUrl = `/changelog/${projectId}/rss.xml`;

    if (isLoadingProject) {
        return (
            <div
                className="hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r bg-background w-64 transition-all duration-300">
                <div className="p-4 border-b">
                    <Skeleton className="h-8 w-36"/>
                </div>
                <div className="p-4 space-y-3">
                    {Array.from({length: 4}).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full"/>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div
            className="hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r bg-background w-64 transition-all duration-300">
            {/* Header */}
            <div className="h-16 flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-8 w-8 flex-shrink-0"
                    >
                        <Link href="/dashboard/projects">
                            <ChevronLeft className="h-4 w-4"/>
                            <span className="sr-only">Back to projects</span>
                        </Link>
                    </Button>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <h2 className="font-semibold truncate flex-1">{project?.name || 'Project'}</h2>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs">{project?.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                className="h-8 gap-1 flex-shrink-0"
                                asChild
                            >
                                <Link href={`/dashboard/projects/${projectId}/changelog/new`}>
                                    <Plus className="h-3.5 w-3.5"/>
                                    <span className="text-xs">New</span>
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">Create a new changelog entry</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1">
                <div className="py-4 px-3">
                    <nav className="space-y-1">
                        <NavItem
                            href={`/dashboard/projects/${projectId}`}
                            icon={LayoutDashboard}
                            label="Overview"
                            active={pathname === `/dashboard/projects/${projectId}`}
                        />

                        <NavItem
                            href={`/dashboard/projects/${projectId}/changelog`}
                            icon={FileText}
                            label="All Changelogs"
                            badge={changelogCount > 0 ? changelogCount.toString() : undefined}
                            active={
                                pathname.includes(`/dashboard/projects/${projectId}/changelog`) &&
                                !pathname.includes(`/new`)
                            }
                        />

                        <NavItem
                            href={`/changelog/${projectId}`}
                            icon={Eye}
                            label="View Public Page"
                            external={true}
                            disabled={!isPublic}
                        />
                    </nav>

                    <Separator className="my-3"/>

                    <div className="px-3 mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Integrations
                        </h3>
                    </div>

                    <nav className="space-y-1">
                        <NavItem
                            href={`/dashboard/projects/${projectId}/integrations/widget`}
                            icon={Code}
                            label="Widget"
                            active={pathname.includes(`/dashboard/projects/${projectId}/integrations/widget`)}
                            disabled={!isPublic}
                        />

                        <NavItem
                            href={`/dashboard/projects/${projectId}/integrations/email`}
                            icon={MailIcon}
                            label="Email"
                            active={pathname.includes(`/dashboard/projects/${projectId}/integrations/email`)}
                        />
                        <NavItem
                            href={`/dashboard/projects/${projectId}/integrations/github`}
                            icon={SiGithub}
                            label="GitHub"
                            active={pathname.includes(`/dashboard/projects/${projectId}/integrations/github`)}
                        />
                        <NavItem
                            href={`/dashboard/projects/${projectId}/analytics`}
                            icon={ChartNoAxesCombined}
                            label="Analytics"
                            active={pathname.includes(`/dashboard/projects/${projectId}/analytics`)}
                        />
                        <NavItem
                            href={`/dashboard/projects/${projectId}/domains`}
                            icon={Globe}
                            label="Domains"
                            active={pathname.includes(`/dashboard/projects/${projectId}/domains`)}
                            disabled={!isPublic}
                        />
                        <NavItem
                            href={`/dashboard/projects/${projectId}/api-keys`}
                            icon={Key}
                            label="API Keys"
                            active={pathname.includes(`/dashboard/projects/${projectId}/api-keys`)}
                        />
                    </nav>

                    <Separator className="my-3"/>

                    <nav className="space-y-1">
                        <NavItem
                            href={`/dashboard/projects/${projectId}/settings`}
                            icon={Settings}
                            label="Settings"
                            active={pathname === `/dashboard/projects/${projectId}/settings`}
                        />
                    </nav>
                </div>

                {/* Public Project Alert */}
                {!isPublic && (
                    <div className="px-3 py-2">
                        <Alert variant="warning" className="py-2 px-3">
                            <AlertDescription className="text-xs">
                                Make this project public in settings to enable all features.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Bookmarks Section */}
                {!isLoadingBookmarks && bookmarks.length > 0 && (
                    <div className="py-2 px-3 mt-2">
                        <div className="flex items-center mb-2">
                            <Star className="h-4 w-4 text-amber-500 mr-1.5"/>
                            <h3 className="text-xs font-semibold">Bookmarked</h3>
                        </div>

                        <div className="space-y-1">
                            {bookmarks.map((bookmark) => (
                                <BookmarkedChangelog
                                    key={bookmark.id}
                                    id={bookmark.id}
                                    projectId={projectId}
                                    title={bookmark.title}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Changelogs */}
                <div className="py-2 px-3 mt-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                            <History className="h-4 w-4 text-primary mr-1.5"/>
                            <h3 className="text-xs font-semibold">Recent Updates</h3>
                        </div>
                        {changelogCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-6 text-xs"
                            >
                                <Link href={`/dashboard/projects/${projectId}/changelog`}>
                                    View all
                                </Link>
                            </Button>
                        )}
                    </div>

                    <div className="space-y-1">
                        {isLoadingChangelogs ? (
                            Array.from({length: 3}).map((_, i) => (
                                <div key={i} className="p-2">
                                    <Skeleton className="h-5 w-full mb-2"/>
                                    <Skeleton className="h-3 w-24"/>
                                </div>
                            ))
                        ) : changelogData?.entries && changelogData.entries.length > 0 ? (
                            changelogData.entries.map((changelog) => (
                                <RecentChangelog
                                    key={changelog.id}
                                    id={changelog.id}
                                    projectId={projectId}
                                    title={changelog.title}
                                    date={changelog.updatedAt || changelog.createdAt}
                                    version={changelog.version}
                                    isPublished={!!changelog.publishedAt}
                                />
                            ))
                        ) : (
                            <div className="py-6 text-center">
                                <PenTool className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2"/>
                                <p className="text-sm text-muted-foreground">No changelogs yet</p>
                                <Button
                                    variant="link"
                                    asChild
                                    className="mt-2 h-auto p-0"
                                >
                                    <Link href={`/dashboard/projects/${projectId}/changelog/new`}>
                                        Create your first changelog
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Project Stats */}
                {changelogCount > 0 && (
                    <div className="py-2 px-3 mt-2">
                        <div className="flex items-center mb-2">
                            <UserSquare2 className="h-4 w-4 text-primary mr-1.5"/>
                            <h3 className="text-xs font-semibold">Project Stats</h3>
                        </div>

                        <div className="space-y-1 p-2 bg-muted/40 rounded-md">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Published entries</span>
                                <span className="font-medium">
                                    {isLoadingChangelogs ? (
                                        <Skeleton className="h-3 w-8 inline-block"/>
                                    ) : publishedCount}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Draft entries</span>
                                <span className="font-medium">
                                    {isLoadingChangelogs ? (
                                        <Skeleton className="h-3 w-8 inline-block"/>
                                    ) : draftCount}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Last updated</span>
                                <span className="font-medium">
                                    {isLoadingChangelogs || !changelogData?.entries?.length ? (
                                        <Skeleton className="h-3 w-16 inline-block"/>
                                    ) : (
                                        formatDistanceToNow(new Date(changelogData.entries[0].updatedAt || changelogData.entries[0].createdAt)) + ' ago'
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t flex items-center justify-between">
                <Button variant="outline" className="justify-start text-xs h-8" asChild>
                    <Link href="/dashboard/projects">
                        <ChevronLeft className="h-3.5 w-3.5 mr-1"/>
                        All Projects
                    </Link>
                </Button>

                {isPublic && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                    <Link href={rssUrl} target="_blank" rel="noopener noreferrer">
                                        <Rss className="h-4 w-4 text-orange-500"/>
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs">RSS Feed</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
    )
}