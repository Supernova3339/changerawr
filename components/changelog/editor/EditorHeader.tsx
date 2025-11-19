import React, {useCallback, useMemo} from 'react';
import {Button} from '@/components/ui/button';
import {AlertTriangle, CheckCircle2, ChevronLeft, Clock, Edit3, Loader2, Save, Star, ExternalLink} from 'lucide-react';
import {Separator} from '@/components/ui/separator';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {ChangelogActionRequest} from "@/components/changelog/ChangelogActionRequest";
import {ScheduleEntryDialog} from "@/components/changelog/editor/scheduler/ScheduleEntryDialog";
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {AnimatePresence, motion} from 'framer-motion';
import {cn} from '@/lib/utils';
import {formatDistanceToNow, isAfter} from 'date-fns';
import TagSelector from './TagSelector';
import VersionSelector from './VersionSelector';
import AITitleGenerator from './AITitleGenerator';
import {useBookmarks} from "@/hooks/useBookmarks";
import {toast} from "@/hooks/use-toast";

// ===== Type Definitions =====

interface Tag {
    id: string;
    name: string;
}

interface EntryData {
    publishedAt?: string;
    scheduledAt?: string;
    title: string;
    version: string;
    content: string;
    tags: Tag[];
    createdAt?: string;
    updatedAt?: string;
}

interface ProjectData {
    id: string;
    name: string;
    requireApproval: boolean;
    allowAutoPublish: boolean;
    emailConfig?: {
        enabled: boolean;
    };
}

interface UserData {
    id: string;
    email: string;
    role: 'ADMIN' | 'STAFF' | 'VIEWER';
}

interface EditorHeaderProps {
    title: string;
    isSaving: boolean;
    hasUnsavedChanges: boolean;
    lastSaveError: string | null;
    onManualSave: () => Promise<void>;
    onBack: () => void;
    isPublished: boolean;
    projectId: string;
    entryId?: string;
    version: string;
    onVersionChange: (version: string) => void;
    onVersionConflict?: (hasConflict: boolean) => void;
    hasVersionConflict?: boolean;
    selectedTags: Tag[];
    availableTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
    onTitleChange: (title: string) => void;
    content: string;
    aiApiKey?: string;
}

// ===== Bookmark Button Component =====

interface BookmarkButtonProps {
    entryId?: string;
    projectId: string;
    title: string;
}

function BookmarkButton({entryId, projectId, title}: BookmarkButtonProps) {
    const {toggleBookmark, isBookmarked} = useBookmarks({
        projectId,
        entryId: entryId || undefined
    });

    const handleBookmarkClick = useCallback(async () => {
        if (!entryId) return;
        await toggleBookmark(entryId, title, projectId);
    }, [entryId, title, projectId, toggleBookmark]);

    // Don't show bookmark button for new entries (no entryId)
    if (!entryId) {
        return null;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBookmarkClick}
                        className={cn(
                            "flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors",
                            isBookmarked && "text-amber-600 hover:text-amber-700"
                        )}
                    >
                        <Star
                            className={cn(
                                "h-3.5 w-3.5",
                                isBookmarked && "fill-amber-500 text-amber-500"
                            )}
                        />
                        <span className="text-xs font-medium">
                            {isBookmarked ? "Bookmarked" : "Bookmark"}
                        </span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs">
                        {isBookmarked
                            ? "Remove bookmark from sidebar"
                            : "Add bookmark to sidebar"
                        }
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ===== WWC Open Button Component =====

interface WWCOpenButtonProps {
    title: string;
    content: string;
    version: string;
    tags: Tag[];
    projectId: string;
    entryId?: string;
}

function WWCOpenButton({title, content, version, tags, projectId, entryId}: WWCOpenButtonProps) {
    const handleOpenInWWC = useCallback(() => {
        try {
            // Generate WWC protocol URL
            const baseUrl = 'wwc://open';
            const url = new URL(baseUrl);

            // Add path segments
            if (projectId) {
                url.pathname = `/${projectId}`;
                if (entryId) {
                    url.pathname += `/${entryId}`;
                }
            }

            // Add query parameters
            url.searchParams.set('serverUrl', window.location.origin);
            url.searchParams.set('instanceType', 'changerawr');
            url.searchParams.set('action', entryId ? 'edit' : 'create');

            if (title) {
                url.searchParams.set('title', encodeURIComponent(title));
            }
            if (content) {
                url.searchParams.set('content', encodeURIComponent(content));
            }
            if (version) {
                url.searchParams.set('version', encodeURIComponent(version));
            }
            if (tags && tags.length > 0) {
                const tagsString = tags.map(tag => encodeURIComponent(tag.name)).join(',');
                url.searchParams.set('tags', tagsString);
            }

            const wwcUrl = url.toString();

            // Try to open the protocol URL directly
            window.location.href = wwcUrl;

            toast({
                title: "Opening in WriteWithCum",
                description: "If the app doesn't open, please ensure WriteWithCum is installed.",
                duration: 3000
            });
        } catch (error) {
            console.error('Failed to generate WWC URL:', error);
            toast({
                title: "Failed to open",
                description: "Could not generate the protocol URL to open in WriteWithCum.",
                variant: "destructive"
            });
        }
    }, [title, content, version, tags, projectId, entryId]);

    // Only show if there's meaningful content to share
    const hasContent = title.trim() || content.trim() || version.trim();
    if (!hasContent) {
        return null;
    }

    if (process.env.NEXT_PUBLIC_SHOW_WWC_TOOLING !== 'true') return null;

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInWWC}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors border-dashed"
        >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Open in WWC</span>
        </Button>
    );
}

// ===== Main Component =====

const EditorHeader: React.FC<EditorHeaderProps> = ({
                                                       title,
                                                       isSaving,
                                                       hasUnsavedChanges,
                                                       lastSaveError,
                                                       onManualSave,
                                                       onBack,
                                                       // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                                       isPublished,
                                                       projectId,
                                                       entryId,
                                                       version,
                                                       onVersionChange,
                                                       onVersionConflict,
                                                       hasVersionConflict = false,
                                                       selectedTags,
                                                       availableTags,
                                                       onTagsChange,
                                                       onTitleChange,
                                                       content,
                                                       aiApiKey,
                                                   }) => {
    const queryClient = useQueryClient();

    // ===== Data Fetching =====
    const {data: entryData} = useQuery<EntryData>({
        queryKey: ['changelog-entry', projectId, entryId],
        queryFn: async (): Promise<EntryData> => {
            if (!entryId) throw new Error('No entry ID provided');
            const response = await fetch(`/api/projects/${projectId}/changelog/${entryId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch entry: ${response.statusText}`);
            }
            return response.json();
        },
        enabled: !!entryId,
        staleTime: 1000 * 60 * 2,
    });

    const {data: projectData} = useQuery<ProjectData>({
        queryKey: ['project-settings', projectId],
        queryFn: async (): Promise<ProjectData> => {
            const [settingsResponse, emailResponse] = await Promise.all([
                fetch(`/api/projects/${projectId}/settings`),
                fetch(`/api/projects/${projectId}/integrations/email`).catch(() => null)
            ]);

            if (!settingsResponse.ok) {
                throw new Error('Failed to fetch project settings');
            }

            const settings = await settingsResponse.json();
            let emailConfig = null;

            if (emailResponse?.ok) {
                emailConfig = await emailResponse.json();
            }

            return {
                ...settings,
                emailConfig
            };
        },
        staleTime: 1000 * 60 * 5,
    });

    const {data: userData} = useQuery<UserData>({
        queryKey: ['current-user'],
        queryFn: async (): Promise<UserData> => {
            const response = await fetch('/api/auth/me');
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            return response.json();
        },
        staleTime: 1000 * 60 * 10,
    });

    // ===== Computed Values =====
    const computedValues = useMemo(() => {
        // Use entryData.publishedAt as the source of truth for published status
        const currentPublishStatus = !!entryData?.publishedAt;
        const currentScheduleStatus = !!entryData?.scheduledAt;
        const scheduledAt = entryData?.scheduledAt;

        // Validation checks
        const hasTitle = title.trim() !== '';
        const hasContent = content.trim() !== '';
        const hasVersion = version.trim() !== '';
        const noConflict = !hasVersionConflict;

        // Can perform actions
        const canSave = hasUnsavedChanges && !isSaving && hasTitle && hasContent && hasVersion && noConflict;
        const canPublish = hasTitle && hasContent && hasVersion && noConflict;
        const canSchedule = hasTitle && hasContent && hasVersion && noConflict && !currentPublishStatus;

        // Schedule status info
        const isScheduledInFuture = scheduledAt && isAfter(new Date(scheduledAt), new Date());
        const scheduleTimeDistance = scheduledAt && isScheduledInFuture
            ? formatDistanceToNow(new Date(scheduledAt), {addSuffix: true})
            : null;

        // Entry metadata
        const isNewEntry = !entryId;
        const lastUpdated = entryData?.updatedAt ? formatDistanceToNow(new Date(entryData.updatedAt), {addSuffix: true}) : null;

        return {
            currentPublishStatus,
            currentScheduleStatus,
            scheduledAt,
            isScheduledInFuture,
            scheduleTimeDistance,
            canSave,
            canPublish,
            canSchedule,
            hasTitle,
            hasContent,
            hasVersion,
            noConflict,
            isNewEntry,
            lastUpdated
        };
    }, [
        entryData?.publishedAt, // This is the key change - rely on server data
        entryData?.scheduledAt,
        entryData?.updatedAt,
        title,
        content,
        version,
        hasVersionConflict,
        hasUnsavedChanges,
        isSaving,
        entryId
    ]); // Removed isPublished from dependencies since we use entryData

    // ===== Event Handlers =====
    const handleActionSuccess = useCallback(() => {
        // Invalidate all related queries to ensure fresh data
        queryClient.invalidateQueries({queryKey: ['changelog-entry', projectId, entryId]});
        queryClient.invalidateQueries({queryKey: ['project-versions', projectId]});
        queryClient.invalidateQueries({queryKey: ['changelog-entries', projectId]});

        // Force a refetch of the current entry data
        queryClient.refetchQueries({queryKey: ['changelog-entry', projectId, entryId]});
    }, [queryClient, projectId, entryId]);

    const handleScheduleChange = useCallback(() => {
        // Invalidate and refetch entry data when schedule changes
        queryClient.invalidateQueries({queryKey: ['changelog-entry', projectId, entryId]});
        queryClient.refetchQueries({queryKey: ['changelog-entry', projectId, entryId]});
    }, [queryClient, projectId, entryId]);

    const handleDeleteSuccess = useCallback(() => {
        queryClient.invalidateQueries({queryKey: ['changelog-entry', projectId]});
        onBack();
    }, [queryClient, projectId, onBack]);

    // ===== Enhanced Status Bar Component =====
    const StatusBar = useMemo(() => {
        const items = [];

        // Primary status (published/scheduled/draft)
        if (computedValues.currentPublishStatus) {
            items.push(
                <Badge
                    key="published"
                    variant="success"
                >
                    <CheckCircle2 className="h-3 w-3 mr-1"/>
                    Published
                    {computedValues.lastUpdated && (
                        <span className="ml-1 opacity-75">• {computedValues.lastUpdated}</span>
                    )}
                </Badge>
            );
        } else if (computedValues.currentScheduleStatus && computedValues.isScheduledInFuture) {
            items.push(
                <Badge
                    key="scheduled"
                    variant="info"
                >
                    <Clock className="h-3 w-3 mr-1"/>
                    Scheduled {computedValues.scheduleTimeDistance}
                </Badge>
            );
        } else if (!computedValues.isNewEntry) {
            items.push(
                <Badge
                    key="draft"
                    variant="outline"
                    className="text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    <Edit3 className="h-3 w-3 mr-1"/>
                    Draft
                    {computedValues.lastUpdated && (
                        <span className="ml-1 opacity-75">• {computedValues.lastUpdated}</span>
                    )}
                </Badge>
            );
        }

        // Save status
        if (isSaving) {
            items.push(
                <div key="saving" className="flex items-center text-sm text-blue-600 font-medium">
                    <Loader2 className="h-3 w-3 mr-2 animate-spin"/>
                    Saving changes...
                </div>
            );
        } else if (hasUnsavedChanges) {
            items.push(
                <div key="unsaved" className="flex items-center text-sm text-amber-600 font-medium">
                    <div className="h-2 w-2 bg-amber-500 rounded-full mr-2 animate-pulse"/>
                    Unsaved changes
                </div>
            );
        }

        // Conflict status
        if (hasVersionConflict) {
            items.push(
                <div key="conflict" className="flex items-center text-sm text-red-600 font-medium">
                    <AlertTriangle className="h-3 w-3 mr-2"/>
                    Version conflict
                </div>
            );
        }

        if (items.length === 0) return null;

        return (
            <div className="flex items-center gap-3">
                <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                        <motion.div
                            key={item.key}
                            initial={{opacity: 0, x: -20}}
                            animate={{opacity: 1, x: 0}}
                            exit={{opacity: 0, x: 20}}
                            transition={{duration: 0.2}}
                        >
                            {item}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        );
    }, [
        computedValues.currentPublishStatus,
        computedValues.currentScheduleStatus,
        computedValues.isScheduledInFuture,
        computedValues.scheduleTimeDistance,
        computedValues.lastUpdated,
        computedValues.isNewEntry,
        isSaving,
        hasUnsavedChanges,
        hasVersionConflict
    ]);

    // ===== Action Buttons =====
    const SaveButton = useMemo(() => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onManualSave}
                    disabled={!computedValues.canSave}
                    className={cn(
                        "transition-all duration-200 shadow-sm hover:shadow-md",
                        hasVersionConflict && "border-red-300 text-red-600 hover:bg-red-50",
                        computedValues.canSave && "border-blue-200 text-blue-700 hover:bg-blue-50"
                    )}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2"/>
                            Save
                        </>
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                {!computedValues.canSave
                    ? (isSaving ? "Saving in progress..." : hasVersionConflict ? "Resolve version conflict first" : "No changes to save")
                    : "Save your changes"}
            </TooltipContent>
        </Tooltip>
    ), [computedValues.canSave, hasVersionConflict, isSaving, onManualSave]);

    const ScheduleButton = useMemo(() => {
        if (!entryId || !projectData || !userData) return null;

        return (
            <ScheduleEntryDialog
                entryId={entryId}
                projectId={projectId}
                entryTitle={title}
                isScheduled={computedValues.currentScheduleStatus}
                scheduledAt={computedValues.scheduledAt}
                isPublished={computedValues.currentPublishStatus}
                projectRequiresApproval={projectData.requireApproval}
                projectHasEmailConfig={!!projectData.emailConfig?.enabled}
                userRole={userData.role}
                onScheduleChange={handleScheduleChange}
            />
        );
    }, [
        entryId,
        projectId,
        title,
        projectData,
        userData,
        computedValues.currentScheduleStatus,
        computedValues.scheduledAt,
        computedValues.currentPublishStatus,
        handleScheduleChange
    ]);

    const PublishButton = useMemo(() => {
        if (!entryId) return null;

        const isDisabled = (!computedValues.canPublish && !computedValues.currentPublishStatus) ||
            (computedValues.currentScheduleStatus && computedValues.isScheduledInFuture);

        return (
            <span>
                        <ChangelogActionRequest
                            projectId={projectId}
                            entryId={entryId}
                            action={computedValues.currentPublishStatus ? "UNPUBLISH" : "PUBLISH"}
                            title={title}
                            isPublished={computedValues.currentPublishStatus}
                            variant={computedValues.currentPublishStatus ? "outline" : "default"}
                            size="sm"
                            onSuccess={handleActionSuccess}
                            className={cn(
                                "transition-all duration-200 shadow-sm hover:shadow-md",
                                !computedValues.currentPublishStatus && !isDisabled,
                                isDisabled && "opacity-50"
                            )}
                        />
                    </span>

        );
    }, [
        entryId,
        projectId,
        computedValues.currentPublishStatus,
        computedValues.canPublish,
        computedValues.currentScheduleStatus,
        computedValues.isScheduledInFuture,
        title,
        handleActionSuccess
    ]);

    const DeleteButton = useMemo(() => {
        if (!entryId) return null;

        return (
            <ChangelogActionRequest
                projectId={projectId}
                entryId={entryId}
                action="DELETE"
                title={title}
                variant="destructive"
                onSuccess={handleDeleteSuccess}
                className="shadow-sm hover:shadow-md transition-all duration-200"
            />
        );
    }, [entryId, projectId, title, handleDeleteSuccess]);

    // ===== Error Alert =====
    const ErrorAlert = useMemo(() => {
        if (!lastSaveError && !hasVersionConflict) return null;

        return (
            <motion.div
                initial={{opacity: 0, y: -10}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -10}}
                transition={{duration: 0.2}}
            >
                <Alert
                    variant={hasVersionConflict ? "default" : "destructive"}
                    className={cn(
                        "max-w-md shadow-lg border-l-4",
                        hasVersionConflict ? "border-l-amber-500 bg-amber-50/50" : "border-l-red-500"
                    )}
                >
                    <AlertTriangle className="h-4 w-4"/>
                    <AlertDescription className="font-medium">
                        {hasVersionConflict
                            ? "Version conflict detected - please select a different version"
                            : lastSaveError
                        }
                    </AlertDescription>
                </Alert>
            </motion.div>
        );
    }, [lastSaveError, hasVersionConflict]);

    // ===== Main Render =====
    return (
        <TooltipProvider>
            <div
                className="border-b bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
                <div className="container max-w-7xl py-4">
                    <div className="flex flex-col gap-4">
                        {/* Top Row - Navigation and Primary Actions */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onBack}
                                    className="hover:bg-accent transition-colors duration-200 -ml-2"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1"/>
                                    Back
                                </Button>

                                {projectData && (
                                    <div className="text-sm text-muted-foreground font-medium">
                                        {projectData.name}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <AnimatePresence mode="wait">
                                    {ErrorAlert}
                                </AnimatePresence>

                                <div className="flex items-center gap-2">
                                    {/* WWC Open Button */}
                                    <WWCOpenButton
                                        title={title}
                                        content={content}
                                        version={version}
                                        tags={selectedTags}
                                        projectId={projectId}
                                        entryId={entryId}
                                    />

                                    {SaveButton}

                                    {entryId && (
                                        <>
                                            <Separator orientation="vertical" className="h-5"/>

                                            <div className="flex items-center gap-2">
                                                {ScheduleButton}
                                                {PublishButton}
                                            </div>

                                            <Separator orientation="vertical" className="h-5"/>
                                            {DeleteButton}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Middle Row - Title and Metadata */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                    <h1 className={cn(
                                        "text-2xl font-bold truncate",
                                        !computedValues.hasTitle && "text-muted-foreground italic"
                                    )}>
                                        {title || 'Untitled Entry'}
                                    </h1>

                                    {/* Bookmark Button */}
                                    <BookmarkButton
                                        entryId={entryId}
                                        projectId={projectId}
                                        title={title}
                                    />

                                    {/* AI Title Generator */}
                                    {aiApiKey && computedValues.hasContent && (
                                        <AITitleGenerator
                                            content={content}
                                            onSelectTitle={onTitleChange}
                                            apiKey={aiApiKey}
                                        />
                                    )}
                                </div>

                                {/* Status Bar */}
                                <div className="mt-2">
                                    {StatusBar}
                                </div>
                            </div>

                            {/* Controls - Tags and Version */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <TagSelector
                                    selectedTags={selectedTags}
                                    availableTags={availableTags}
                                    onTagsChange={onTagsChange}
                                    content={content}
                                    aiApiKey={aiApiKey}
                                    projectId={projectId}
                                />

                                <VersionSelector
                                    version={version}
                                    onVersionChange={onVersionChange}
                                    onConflictDetected={onVersionConflict}
                                    projectId={projectId}
                                    entryId={entryId}
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
};

export default EditorHeader;