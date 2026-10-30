'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { motion } from 'framer-motion'
import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
    RefreshCw,
    XCircle,
    Info,
    Calendar as CalendarIcon,
    Filter,
    Download,
    Loader2,
    Search,
    Copy,
    Check,
    Pause,
    Play,
    User,
    UserX,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// Type definitions
interface PreservedUserData {
    id: string;
    email: string;
    name: string | null;
    role: string;
    deletedAt: string;
    deletedBy: string;
}

interface AuditLogDetails {
    [key: string]: unknown;
    _preservedUser?: PreservedUserData;
    _preservedTargetUser?: PreservedUserData;
}

interface UserInfo {
    name?: string | null
    email?: string | null
    isDeleted?: boolean
}

interface AuditLog {
    id: string
    action: string
    userId: string | null
    targetUserId?: string | null
    details?: AuditLogDetails | string
    createdAt: string
    user?: UserInfo | null
    targetUser?: UserInfo | null
    performer?: UserInfo | null
    target?: UserInfo | null
    performer_email?: string | null
    target_email?: string | null
}

interface AuditLogsResponse {
    logs: AuditLog[]
    total: number
    nextCursor?: string | null
}

interface AuditAction {
    action: string
    count: number
}

interface FilterState {
    search: string
    action: string
    dateRange: DateRange
    userId?: string
    targetId?: string
}

// User Display Component
interface UserDisplayProps {
    user: UserInfo | null
    showEmail?: boolean
    className?: string
    size?: 'sm' | 'md'
}

function UserDisplay({ user, showEmail = true, className, size = 'sm' }: UserDisplayProps) {
    if (!user) {
        return (
            <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
                <User className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">Unknown User</span>
            </div>
        );
    }

    const displayName = user.name || user.email || 'Unknown User';
    const isDeleted = user.isDeleted;

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {isDeleted ? (
                <UserX className="h-4 w-4 text-red-500 flex-shrink-0" />
            ) : (
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}

            <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "font-medium truncate",
                        size === 'sm' ? 'text-sm' : 'text-base',
                        isDeleted && "text-red-600 dark:text-red-400"
                    )}>
                        {displayName}
                    </span>

                    {isDeleted && (
                        <Badge variant="destructive" className="text-xs flex-shrink-0">
                            Deleted
                        </Badge>
                    )}
                </div>

                {showEmail && user.email && user.name && (
                    <span className={cn(
                        "text-xs text-muted-foreground truncate",
                        isDeleted && "text-red-500 dark:text-red-400"
                    )}>
                        {user.email}
                    </span>
                )}
            </div>
        </div>
    );
}

// Utility functions
const formatLogDetails = (details?: string | AuditLogDetails): string => {
    if (!details) return 'No additional details'

    try {
        const parsedDetails = typeof details === 'string' ? JSON.parse(details) : details
        return JSON.stringify(parsedDetails, null, 2)
    } catch {
        return typeof details === 'string' ? details : 'Unable to parse log details'
    }
}

// Get user info with fallback to preserved data
const getUserInfo = (log: AuditLog, isTarget = false): UserInfo | null => {
    // Try new API format first
    if (isTarget && log.target) {
        return log.target;
    }
    if (!isTarget && log.performer) {
        return log.performer;
    }

    // Fallback to old format
    const user = isTarget ? log.targetUser : log.user;
    return user || null;
}

// Helper function to safely access preserved user data
const getPreservedUserData = (details: AuditLogDetails | string | undefined, key: '_preservedUser' | '_preservedTargetUser'): PreservedUserData | null => {
    if (!details || typeof details === 'string') {
        return null;
    }

    const preservedData = details[key];
    if (!preservedData || typeof preservedData !== 'object') {
        return null;
    }

    return preservedData as PreservedUserData;
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}

export default function AuditLogsPage() {
    // State for all logs
    const [allLogs, setAllLogs] = useState<AuditLog[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [isError, setIsError] = useState(false)
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(true)
    const [total, setTotal] = useState(0)
    const [loadProgress, setLoadProgress] = useState(0)
    const [tableHeight, setTableHeight] = useState(450)
    const [isAutoLoading, setIsAutoLoading] = useState(true)
    const [isPaused, setIsPaused] = useState(false)

    // Available actions from API
    const [availableActions, setAvailableActions] = useState<AuditAction[]>([])
    const [isLoadingActions, setIsLoadingActions] = useState(false)

    // UI state
    const [searchInput, setSearchInput] = useState('')
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const [activeFilters, setActiveFilters] = useState(0)

    // Filters state
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        action: '',
        dateRange: {
            from: subDays(new Date(), 31),
            to: new Date()
        }
    })

    // Constants
    const chunkSize = 100

    // Debounced search
    const debouncedSearch = useDebounce(searchInput)

    // Fetch available actions for filter dropdown
    const fetchAvailableActions = useCallback(async () => {
        try {
            setIsLoadingActions(true)
            const response = await fetch('/api/admin/audit-logs/actions')
            if (!response.ok) throw new Error('Failed to fetch actions')

            const data = await response.json()
            setAvailableActions(data.actions || [])
        } catch (error) {
            console.error('Error fetching available actions:', error)
        } finally {
            setIsLoadingActions(false)
        }
    }, [])

    // Load available actions on mount
    useEffect(() => {
        fetchAvailableActions()
    }, [fetchAvailableActions])

    // UseEffect to calculate available height for the table
    useEffect(() => {
        const calculateHeight = () => {
            const windowHeight = window.innerHeight;
            const otherElementsHeight = 220;
            const availableHeight = Math.max(350, windowHeight - otherElementsHeight);
            setTableHeight(availableHeight);
        };

        calculateHeight();
        window.addEventListener('resize', calculateHeight);
        return () => window.removeEventListener('resize', calculateHeight);
    }, []);

    // Update filters when debounced search changes
    useEffect(() => {
        setFilters(prev => ({ ...prev, search: debouncedSearch }));
        if (allLogs.length > 0) {
            resetData();
        }
    }, [debouncedSearch]);

    // Count active filters
    useEffect(() => {
        let count = 0;
        if (filters.action) count++;
        if (filters.dateRange.from || filters.dateRange.to) count++;
        if (filters.userId) count++;
        if (filters.targetId) count++;
        setActiveFilters(count);
    }, [filters]);

    // Auto-load all data when filters change
    useEffect(() => {
        if (isAutoLoading && hasMore && !isLoadingMore && !isPaused && allLogs.length > 0) {
            const timeoutId = setTimeout(() => {
                loadMoreLogs()
            }, 100) // Small delay to prevent overwhelming the API

            return () => clearTimeout(timeoutId)
        }
    }, [allLogs, hasMore, isLoadingMore, isAutoLoading, isPaused])

    // Function to reset data
    const resetData = useCallback(() => {
        setAllLogs([]);
        setNextCursor(null);
        setHasMore(true);
        setLoadProgress(0);
        setIsError(false);
        setIsPaused(false);
        fetchInitialData();
    }, [filters]); // Added filters dependency

    // Function to fetch initial data
    const fetchInitialData = useCallback(async () => {
        try {
            setIsLoading(true);
            setIsError(false);

            const params = new URLSearchParams({
                useChunking: 'true',
                chunkSize: chunkSize.toString(),
                search: filters.search,
                action: filters.action,
                from: filters.dateRange.from?.toISOString() || '',
                to: filters.dateRange.to?.toISOString() || '',
                userId: filters.userId || '',
                targetId: filters.targetId || ''
            });

            const response = await fetch(`/api/admin/audit-logs?${params}`);

            if (!response.ok) throw new Error('Failed to fetch audit logs');

            const data: AuditLogsResponse = await response.json();

            setAllLogs(data.logs || []);
            setNextCursor(data.nextCursor || null);
            setHasMore(!!data.nextCursor);
            setTotal(data.total || 0);

            if (data.total > 0) {
                setLoadProgress(Math.min(100, ((data.logs?.length || 0) / data.total) * 100));
            } else {
                setLoadProgress(0);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    }, [filters, chunkSize]);

    // Function to load more data
    const loadMoreLogs = useCallback(async () => {
        if (isLoadingMore || !hasMore || !nextCursor || isPaused) return;

        try {
            setIsLoadingMore(true);

            const params = new URLSearchParams({
                useChunking: 'true',
                cursor: nextCursor,
                chunkSize: chunkSize.toString(),
                search: filters.search,
                action: filters.action,
                from: filters.dateRange.from?.toISOString() || '',
                to: filters.dateRange.to?.toISOString() || '',
                userId: filters.userId || '',
                targetId: filters.targetId || ''
            });

            const response = await fetch(`/api/admin/audit-logs?${params}`);

            if (!response.ok) throw new Error('Failed to fetch more audit logs');

            const data: AuditLogsResponse = await response.json();

            // Merge new logs with existing logs (avoiding duplicates)
            const existingIds = new Set(allLogs.map(log => log.id));
            const uniqueNewLogs = (data.logs || []).filter(log => !existingIds.has(log.id));

            if (uniqueNewLogs.length > 0) {
                setAllLogs(prev => [...prev, ...uniqueNewLogs]);
            }

            setNextCursor(data.nextCursor || null);
            setHasMore(!!data.nextCursor);

            // Update progress percentage
            if (data.total > 0) {
                setLoadProgress(Math.min(100, ((allLogs.length + uniqueNewLogs.length) / data.total) * 100));
            }
        } catch (error) {
            console.error('Error fetching more audit logs:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [allLogs, nextCursor, hasMore, isLoadingMore, filters, chunkSize, isPaused]);

    // Load initial data
    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Copy details to clipboard
    const copyDetails = useCallback(() => {
        if (!selectedLog) return;

        const detailsText = formatLogDetails(selectedLog.details);
        navigator.clipboard.writeText(detailsText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [selectedLog]);

    // Export function
    const exportLogs = async () => {
        try {
            const params = new URLSearchParams({
                search: filters.search,
                action: filters.action,
                from: filters.dateRange.from?.toISOString() || '',
                to: filters.dateRange.to?.toISOString() || '',
                userId: filters.userId || '',
                targetId: filters.targetId || '',
                export: 'true'
            });

            const response = await fetch(`/api/admin/audit-logs?${params}`);
            if (!response.ok) throw new Error('Failed to export logs');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    // Reset filters
    const resetFilters = () => {
        setSearchInput('');
        setFilters({
            search: '',
            action: '',
            dateRange: {
                from: subDays(new Date(), 31),
                to: new Date()
            }
        });
        setIsFilterOpen(false);
        resetData();
    };

    // Toggle auto-loading
    const toggleAutoLoading = () => {
        setIsAutoLoading(!isAutoLoading);
        if (!isAutoLoading && hasMore) {
            setIsPaused(false);
        }
    };

    // Pause/resume loading
    const togglePause = () => {
        setIsPaused(!isPaused);
    };

    // Action badge variant
    const getActionVariant = (action: string) => {
        if (action.includes('CREATE') || action.includes('ADD')) return 'success';
        if (action.includes('DELETE') || action.includes('REMOVE')) return 'destructive';
        if (action.includes('UPDATE') || action.includes('EDIT')) return 'warning';
        if (action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('VIEW')) return 'default';
        if (action.includes('REVOKE') || action.includes('REVOCATION')) return 'outline';
        return 'secondary';
    };

    // Handle scroll to bottom for loading more
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!hasMore || isLoadingMore || !isAutoLoading || isPaused) return;

        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            loadMoreLogs();
        }
    };

    return (
        <div className="container mx-auto py-6">
            <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between px-6 py-4 space-y-0 border-b">
                    <div>
                        <h2 className="text-xl font-semibold leading-none tracking-tight">Audit Logs</h2>
                        <p className="text-sm text-muted-foreground mt-1">Track and monitor system activities</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={exportLogs}
                            disabled={isLoading || allLogs.length === 0}
                            className="flex items-center gap-1"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetData}
                            disabled={isLoading}
                            className="flex items-center gap-1"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-6">
                    {/* Progress indicator with auto-loading controls */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center text-sm mb-1.5">
                            <div className="flex items-center gap-1">
                                <span className="font-medium">{allLogs.length}</span>
                                <span className="text-muted-foreground">of</span>
                                <span className="font-medium">{total}</span>
                                <span className="text-muted-foreground">logs</span>
                                {(isLoading || isLoadingMore) && (
                                    <span className="inline-flex items-center gap-1 ml-2 text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        {isLoading ? 'Loading...' : 'Loading more...'}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleAutoLoading}
                                        className="h-7 px-2"
                                    >
                                        {isAutoLoading ? 'Auto-load: ON' : 'Auto-load: OFF'}
                                    </Button>
                                    {hasMore && isAutoLoading && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={togglePause}
                                            className="h-7 px-2"
                                        >
                                            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                                        </Button>
                                    )}
                                </div>
                                <span className="text-muted-foreground">{Math.floor(loadProgress)}% loaded</span>
                            </div>
                        </div>
                        <Progress value={loadProgress} className="h-2" />
                    </div>

                    {/* Search and filters */}
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search logs, users, actions..."
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    Filters
                                    {activeFilters > 0 && (
                                        <Badge variant="secondary" className="ml-1">
                                            {activeFilters}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="end">
                                <div className="space-y-4">
                                    <h3 className="font-medium">Filter Logs</h3>
                                    {/* Action filter */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Action Type</label>
                                        <Select
                                            value={filters.action}
                                            onValueChange={(value) => {
                                                setFilters(prev => ({
                                                    ...prev,
                                                    action: value === 'all' ? '' : value
                                                }));
                                            }}
                                            disabled={isLoadingActions}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={isLoadingActions ? "Loading actions..." : "Select action"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Actions</SelectItem>
                                                {availableActions.map((actionItem) => (
                                                    <SelectItem key={actionItem.action} value={actionItem.action}>
                                                        {actionItem.action} ({actionItem.count})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Date range filter */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Date Range</label>
                                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-sm">
                                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                            <span>
                                                {filters.dateRange.from
                                                    ? format(filters.dateRange.from, 'MMM d, yyyy')
                                                    : 'Start date'
                                                }
                                                {' → '}
                                                {filters.dateRange.to
                                                    ? format(filters.dateRange.to, 'MMM d, yyyy')
                                                    : 'End date'
                                                }
                                            </span>
                                        </div>
                                        <Calendar
                                            mode="range"
                                            selected={filters.dateRange}
                                            onSelect={(range) => {
                                                setFilters(prev => ({
                                                    ...prev,
                                                    dateRange: range || {}
                                                }));
                                            }}
                                            className="border rounded-md p-3"
                                        />
                                    </div>

                                    <div className="flex justify-between pt-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={resetFilters}
                                        >
                                            Reset
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                resetData();
                                                setIsFilterOpen(false);
                                            }}
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {(filters.search || filters.action || filters.dateRange.from || filters.dateRange.to) && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={resetFilters}
                                title="Clear all filters"
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* Simple Table */}
                    <div className="border rounded-md">
                        {isError ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="text-center">
                                    <p className="text-sm text-destructive font-medium mb-2">Failed to load audit logs</p>
                                    <Button
                                        onClick={resetData}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            </div>
                        ) : allLogs.length === 0 && !isLoading ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="text-center">
                                    <p className="text-sm font-medium mb-1">No audit logs found</p>
                                    <p className="text-sm text-muted-foreground mb-4">Try adjusting your search criteria</p>
                                    {(filters.search || filters.action || filters.dateRange.from || filters.dateRange.to) && (
                                        <Button
                                            onClick={resetFilters}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Reset Filters
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div
                                className="overflow-auto relative"
                                style={{ height: tableHeight }}
                                onScroll={handleScroll}
                            >
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-background z-10">
                                    <tr className="border-b">
                                        <th className="text-left p-3 font-medium text-muted-foreground text-sm">Timestamp</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground text-sm">Action</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground text-sm w-48">Performer</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground text-sm w-48">Target</th>
                                        <th className="text-right p-3 font-medium text-muted-foreground text-sm w-20">Details</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {allLogs.map((log, index) => {
                                        const performer = getUserInfo(log, false);
                                        const target = getUserInfo(log, true);

                                        return (
                                            <motion.tr
                                                key={log.id}
                                                className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'} hover:bg-muted/20 cursor-pointer`}
                                                onClick={() => setSelectedLog(log)}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.2, delay: index * 0.01 }}
                                            >
                                                <td className="p-3 text-sm whitespace-nowrap">
                                                    {format(parseISO(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                                                </td>
                                                <td className="p-3">
                                                    <Badge variant={getActionVariant(log.action)} className="font-medium">
                                                        {log.action}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 max-w-48">
                                                    <UserDisplay
                                                        user={performer}
                                                        showEmail={false}
                                                        className="max-w-full"
                                                    />
                                                </td>
                                                <td className="p-3 max-w-48">
                                                    {target ? (
                                                        <UserDisplay
                                                            user={target}
                                                            showEmail={false}
                                                            className="max-w-full"
                                                        />
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">—</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="ml-auto h-8 w-8"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedLog(log);
                                                        }}
                                                    >
                                                        <Info className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                    </tbody>
                                </table>

                                {isLoadingMore && (
                                    <div className="text-center py-3 bg-background bg-opacity-75 backdrop-blur-sm">
                                        <div className="flex items-center justify-center gap-2 text-sm">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Loading more logs...</span>
                                        </div>
                                    </div>
                                )}

                                {!hasMore && allLogs.length > 0 && (
                                    <div className="text-center py-3 text-sm text-muted-foreground bg-background bg-opacity-75 backdrop-blur-sm">
                                        All logs loaded ({allLogs.length} records)
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Details Dialog */}
            <Dialog
                open={!!selectedLog}
                onOpenChange={(open) => !open && setSelectedLog(null)}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                            Log Details
                            {selectedLog && (
                                <Badge
                                    variant={getActionVariant(selectedLog.action)}
                                    className="ml-2"
                                >
                                    {selectedLog.action}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedLog && format(parseISO(selectedLog.createdAt), 'PPpp')}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <ScrollArea className="max-h-[60vh]">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    {/* Performer */}
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Performer</h4>
                                        <div className="bg-muted p-3 rounded-md">
                                            <UserDisplay
                                                user={getUserInfo(selectedLog, false)}
                                                showEmail={true}
                                                size="md"
                                            />
                                        </div>
                                    </div>

                                    {/* Target (if exists) */}
                                    {getUserInfo(selectedLog, true) && (
                                        <div>
                                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Target</h4>
                                            <div className="bg-muted p-3 rounded-md">
                                                <UserDisplay
                                                    user={getUserInfo(selectedLog, true)}
                                                    showEmail={true}
                                                    size="md"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {selectedLog.details && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-medium text-muted-foreground">Details</h4>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={copyDetails}
                                            >
                                                {copied ? (
                                                    <>
                                                        <Check className="h-3.5 w-3.5 mr-1" />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3.5 w-3.5 mr-1" />
                                                        Copy
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        <div className="bg-muted/50 rounded-md overflow-hidden">
                                            <pre className="p-3 text-sm whitespace-pre-wrap font-mono overflow-auto max-h-64">
                                                {formatLogDetails(selectedLog.details)}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">System Information</h4>
                                    <div className="grid grid-cols-1 gap-3 text-sm">
                                        <div className="bg-muted/50 p-3 rounded-md">
                                            <p className="text-muted-foreground mb-1">Log ID</p>
                                            <p className="font-mono break-all">{selectedLog.id}</p>
                                        </div>

                                        {selectedLog.userId && (
                                            <div className="bg-muted/50 p-3 rounded-md">
                                                <p className="text-muted-foreground mb-1">User ID</p>
                                                <p className="font-mono break-all">{selectedLog.userId}</p>
                                            </div>
                                        )}

                                        {selectedLog.targetUserId && (
                                            <div className="bg-muted/50 p-3 rounded-md">
                                                <p className="text-muted-foreground mb-1">Target User ID</p>
                                                <p className="font-mono break-all">{selectedLog.targetUserId}</p>
                                            </div>
                                        )}

                                        {/* Show preserved user info if available */}
                                        {(() => {
                                            const preservedUser = getPreservedUserData(selectedLog.details, '_preservedUser');
                                            if (!preservedUser) return null;

                                            return (
                                                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                                                    <p className="text-red-600 dark:text-red-400 mb-1 text-xs font-medium">
                                                        Preserved User Data (Account Deleted)
                                                    </p>
                                                    <div className="text-xs space-y-1">
                                                        <p><span className="font-medium">Email:</span> {preservedUser.email}</p>
                                                        <p><span className="font-medium">Name:</span> {preservedUser.name || 'N/A'}</p>
                                                        <p><span className="font-medium">Role:</span> {preservedUser.role}</p>
                                                        <p><span className="font-medium">Deleted:</span> {format(parseISO(preservedUser.deletedAt), 'PPpp')}</p>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {(() => {
                                            const preservedTargetUser = getPreservedUserData(selectedLog.details, '_preservedTargetUser');
                                            if (!preservedTargetUser) return null;

                                            return (
                                                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                                                    <p className="text-red-600 dark:text-red-400 mb-1 text-xs font-medium">
                                                        Preserved Target User Data (Account Deleted)
                                                    </p>
                                                    <div className="text-xs space-y-1">
                                                        <p><span className="font-medium">Email:</span> {preservedTargetUser.email}</p>
                                                        <p><span className="font-medium">Name:</span> {preservedTargetUser.name || 'N/A'}</p>
                                                        <p><span className="font-medium">Role:</span> {preservedTargetUser.role}</p>
                                                        <p><span className="font-medium">Deleted:</span> {format(parseISO(preservedTargetUser.deletedAt), 'PPpp')}</p>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    )}

                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => setSelectedLog(null)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}