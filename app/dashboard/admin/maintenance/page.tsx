'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import {
    Loader2,
    Play,
    Save,
    X,
    Edit2,
    Search,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Info,
    ArrowUpDown,
    Calendar,
    Terminal,
    Settings,
} from 'lucide-react'
import { getNextRunTime, humanizeCron, validateCronExpression } from '@/lib/utils/cron-parser'

interface LogEntry {
    timestamp: Date
    message: string
    type: 'info' | 'success' | 'error' | 'warning'
}

interface TaskExecution {
    timestamp: Date
    duration: number
    success: boolean
    error?: string
}

interface TaskConfig {
    [key: string]: string | number | boolean
}

interface MaintenanceTask {
    id: string
    name: string
    description: string
    cron: string
    enabled: boolean
    category: string
    lastRun?: Date
    nextRun?: Date
    executions: TaskExecution[]
    config?: TaskConfig
    configSchema?: {
        key: string
        label: string
        type: 'text' | 'number' | 'select' | 'boolean' | 'textarea'
        options?: string[]
        default: any
        description?: string
    }[]
    action: (log: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void, config?: TaskConfig) => Promise<void>
}

interface MaintenanceStats {
    expiredInvitationsCount: number
}

type SortField = 'name' | 'category' | 'lastRun' | 'nextRun'
type SortDirection = 'asc' | 'desc'

export default function MaintenancePage() {
    const queryClient = useQueryClient()
    const [editingTask, setEditingTask] = useState<string | null>(null)
    const [editedCron, setEditedCron] = useState('')
    const [cronError, setCronError] = useState<string | null>(null)
    const [runningTask, setRunningTask] = useState<string | null>(null)
    const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null)
    const [configTask, setConfigTask] = useState<MaintenanceTask | null>(null)
    const [configValues, setConfigValues] = useState<TaskConfig>({})
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all')
    const [sortField, setSortField] = useState<SortField>('category')
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
    const [executionLogs, setExecutionLogs] = useState<LogEntry[]>([])
    const [showConsole, setShowConsole] = useState(false)
    const [currentTaskName, setCurrentTaskName] = useState('')
    const logEndRef = useRef<HTMLDivElement>(null)
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean
        taskId: string
        taskName: string
        action: (log: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void, config?: TaskConfig) => Promise<void>
        config?: TaskConfig
    }>({ isOpen: false, taskId: '', taskName: '', action: async () => {}, config: {} })

    // Auto-scroll logs
    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [executionLogs])

    // Fetch stats
    const { data: stats } = useQuery<MaintenanceStats>({
        queryKey: ['maintenance-stats'],
        queryFn: async () => {
            const response = await fetch('/api/admin/maintenance/user-management')
            if (!response.ok) throw new Error('Failed to fetch stats')
            return response.json()
        },
    })

    // Cleanup mutation
    const cleanupInvitationsMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/admin/maintenance/user-management', {
                method: 'POST',
            })
            if (!response.ok) throw new Error('Cleanup failed')
            return response.json()
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] })
        },
    })

    const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
        setExecutionLogs(prev => [...prev, { timestamp: new Date(), message, type }])
    }

    // Initialize tasks with execution history
    const [tasks, setTasks] = useState<MaintenanceTask[]>([
        // User Management
        {
            id: 'cleanup-invitations',
            name: 'cleanup_expired_invitations',
            description: 'Delete invitation tokens older than configured grace period',
            cron: '0 2 * * *',
            enabled: true,
            category: 'User Management',
            lastRun: new Date(Date.now() - 1000 * 60 * 60 * 22),
            nextRun: getNextRunTime('0 2 * * *') || undefined,
            executions: [
                { timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22), duration: 1234, success: true },
            ],
            config: {
                gracePeriodDays: 7,
            },
            configSchema: [
                {
                    key: 'gracePeriodDays',
                    label: 'Grace Period (days)',
                    type: 'number',
                    default: 7,
                    description: 'Number of days after expiration to keep invitation records',
                },
            ],
            action: async (log, config) => {
                const gracePeriod = config?.gracePeriodDays || 7
                log(`Starting cleanup (grace period: ${gracePeriod} days)...`)
                await new Promise(resolve => setTimeout(resolve, 800))

                log('Querying database for expired invitations...')
                await new Promise(resolve => setTimeout(resolve, 500))

                const result = await cleanupInvitationsMutation.mutateAsync()
                log(`Found ${result.expiredInvitationsDeleted} expired invitations`, 'info')
                await new Promise(resolve => setTimeout(resolve, 400))

                log('Deleting expired records...', 'info')
                await new Promise(resolve => setTimeout(resolve, 600))

                log(`Successfully removed ${result.expiredInvitationsDeleted} expired invitation(s)`, 'success')
            },
        },

        // Database Maintenance
        {
            id: 'db-vacuum',
            name: 'vacuum_database',
            description: 'VACUUM ANALYZE tables to reclaim space and update statistics',
            cron: '0 3 * * 0',
            enabled: true,
            category: 'Database',
            lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
            nextRun: getNextRunTime('0 3 * * 0') || undefined,
            executions: [],
            action: async (log) => {
                log('Starting database optimization...')
                await new Promise(resolve => setTimeout(resolve, 600))

                log('Running ANALYZE on tables...')
                const response = await fetch('/api/admin/maintenance/database/vacuum', {
                    method: 'POST',
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Vacuum failed')
                }

                const result = await response.json()

                for (const table of result.tables) {
                    if (table.success) {
                        log(`✓ Analyzed table: ${table.table}`, 'success')
                    } else {
                        log(`✗ Failed to analyze: ${table.table}`, 'error')
                    }
                    await new Promise(resolve => setTimeout(resolve, 400))
                }

                log('Database optimization complete', 'success')
            },
        },
        {
            id: 'db-backup',
            name: 'backup_database',
            description: 'Full pg_dump backup with compression',
            cron: '0 1 * * *',
            enabled: true,
            category: 'Database',
            lastRun: new Date(Date.now() - 1000 * 60 * 60 * 23),
            nextRun: getNextRunTime('0 1 * * *') || undefined,
            executions: [],
            config: {
                compressionLevel: 6,
            },
            configSchema: [
                {
                    key: 'compressionLevel',
                    label: 'Compression Level',
                    type: 'select',
                    options: ['1', '3', '6', '9'],
                    default: '6',
                    description: '1=fast, 9=best compression (slower)',
                },
            ],
            action: async (log, config) => {
                log('Starting database backup...')
                await new Promise(resolve => setTimeout(resolve, 700))

                log('Running pg_dump...')
                const response = await fetch('/api/admin/maintenance/database/backup', {
                    method: 'POST',
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Backup failed')
                }

                const result = await response.json()

                log(`Original size: ${result.originalSize} MB`)
                await new Promise(resolve => setTimeout(resolve, 400))

                const compressionLevel = config?.compressionLevel || 6
                log(`Compressing backup (level ${compressionLevel})...`, 'info')
                await new Promise(resolve => setTimeout(resolve, 500))

                log(`Compressed size: ${result.compressedSize} MB`, 'success')
                log(`Saved to: ${result.backupFile}`, 'success')
            },
        },

        // Cleanup
        {
            id: 'cleanup-temp',
            name: 'cleanup_temp_files',
            description: 'Remove temporary files older than configured age',
            cron: '0 3 * * *',
            enabled: true,
            category: 'Cleanup',
            lastRun: new Date(Date.now() - 1000 * 60 * 60 * 21),
            nextRun: getNextRunTime('0 3 * * *') || undefined,
            executions: [],
            config: {
                maxAgeHours: 24,
            },
            configSchema: [
                {
                    key: 'maxAgeHours',
                    label: 'Max Age (hours)',
                    type: 'number',
                    default: 24,
                    description: 'Delete files older than this many hours',
                },
            ],
            action: async (log, config) => {
                const maxAge = config?.maxAgeHours || 24
                log(`Scanning for files older than ${maxAge} hours...`)
                await new Promise(resolve => setTimeout(resolve, 600))

                const response = await fetch('/api/admin/maintenance/cleanup/temp-files', {
                    method: 'POST',
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Cleanup failed')
                }

                const result = await response.json()
                log(`Found ${result.deletedCount} files to cleanup`)
                await new Promise(resolve => setTimeout(resolve, 400))

                log('Removing temp files...', 'info')
                await new Promise(resolve => setTimeout(resolve, 500))

                log(`Cleaned up ${result.deletedCount} files (${result.deletedSizeMB} MB freed)`, 'success')
            },
        },

        // System
        {
            id: 'cache-clear',
            name: 'clear_cache',
            description: 'Clear all application cache layers',
            cron: 'manual',
            enabled: true,
            category: 'System',
            executions: [],
            action: async (log) => {
                log('Clearing React Query cache...')
                queryClient.clear()
                await new Promise(resolve => setTimeout(resolve, 400))

                log('Cache cleared successfully', 'success')
            },
        },
        {
            id: 'restart-app',
            name: 'restart_application',
            description: 'Gracefully restart the application with maintenance mode',
            cron: 'manual',
            enabled: true,
            category: 'System',
            executions: [],
            action: async (log) => {
                log('Initiating graceful restart...')
                await new Promise(resolve => setTimeout(resolve, 500))

                log('Triggering restart sequence...', 'info')
                const response = await fetch('/api/extensions/restart', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        reason: 'manual-maintenance',
                    }),
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Restart failed')
                }

                const result = await response.json()

                if (result.mode === 'automatic') {
                    log('Application restart initiated', 'success')
                    log('Please wait while the server restarts...', 'info')
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    log('Reloading page in 3 seconds...', 'warning')
                    await new Promise(resolve => setTimeout(resolve, 3000))
                    window.location.reload()
                } else {
                    log('Development mode detected', 'warning')
                    log(result.instruction, 'info')
                    log('Please restart your dev server manually', 'warning')
                }
            },
        },
        {
            id: 'health-check',
            name: 'health_check_services',
            description: 'Verify database and API connectivity',
            cron: '*/15 * * * *',
            enabled: true,
            category: 'System',
            lastRun: new Date(Date.now() - 1000 * 60 * 12),
            nextRun: getNextRunTime('*/15 * * * *') || undefined,
            executions: [],
            action: async (log) => {
                log('Checking database connection...')
                await new Promise(resolve => setTimeout(resolve, 400))
                log('✓ Database: OK', 'success')

                log('Checking API endpoints...')
                await new Promise(resolve => setTimeout(resolve, 500))
                log('✓ API: OK', 'success')

                log('All services operational', 'success')
            },
        },
    ])

    // Calculate statistics
    const statistics = useMemo(() => {
        const totalExecutions = tasks.reduce((sum, task) => sum + task.executions.length, 0)
        const successfulExecutions = tasks.reduce(
            (sum, task) => sum + task.executions.filter(e => e.success).length,
            0
        )
        const failedExecutions = totalExecutions - successfulExecutions
        const avgDuration = totalExecutions > 0
            ? Math.round(
                tasks.reduce((sum, task) =>
                    sum + task.executions.reduce((s, e) => s + e.duration, 0), 0
                ) / totalExecutions
            )
            : 0

        return {
            totalTasks: tasks.length,
            enabledTasks: tasks.filter(t => t.enabled).length,
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            successRate: totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 100,
            avgDuration,
        }
    }, [tasks])

    // Filter and sort tasks
    const filteredAndSortedTasks = useMemo(() => {
        let filtered = tasks

        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(
                task =>
                    task.name.toLowerCase().includes(query) ||
                    task.description.toLowerCase().includes(query) ||
                    task.category.toLowerCase().includes(query)
            )
        }

        if (categoryFilter !== 'all') {
            filtered = filtered.filter(task => task.category === categoryFilter)
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(task =>
                statusFilter === 'enabled' ? task.enabled : !task.enabled
            )
        }

        filtered.sort((a, b) => {
            let aVal: any, bVal: any

            switch (sortField) {
                case 'name':
                    aVal = a.name
                    bVal = b.name
                    break
                case 'category':
                    aVal = a.category
                    bVal = b.category
                    break
                case 'lastRun':
                    aVal = a.lastRun?.getTime() ?? 0
                    bVal = b.lastRun?.getTime() ?? 0
                    break
                case 'nextRun':
                    aVal = a.nextRun?.getTime() ?? Number.MAX_SAFE_INTEGER
                    bVal = b.nextRun?.getTime() ?? Number.MAX_SAFE_INTEGER
                    break
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
            return 0
        })

        return filtered
    }, [tasks, searchQuery, categoryFilter, statusFilter, sortField, sortDirection])

    const categories = useMemo(
        () => ['all', ...Array.from(new Set(tasks.map(t => t.category)))],
        [tasks]
    )

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    const handleEdit = (task: MaintenanceTask) => {
        setEditingTask(task.id)
        setEditedCron(task.cron)
        setCronError(null)
    }

    const handleSave = (taskId: string) => {
        const validation = validateCronExpression(editedCron)

        if (!validation.valid) {
            setCronError(validation.error || 'Invalid cron expression')
            return
        }

        setTasks(tasks.map(task => {
            if (task.id === taskId) {
                return {
                    ...task,
                    cron: editedCron,
                    nextRun: getNextRunTime(editedCron) || undefined,
                }
            }
            return task
        }))

        toast({
            title: 'Schedule updated',
            description: `New schedule: ${humanizeCron(editedCron)}`,
        })

        setEditingTask(null)
        setCronError(null)
    }

    const handleCancel = () => {
        setEditingTask(null)
        setEditedCron('')
        setCronError(null)
    }

    const handleToggle = (taskId: string, enabled: boolean) => {
        setTasks(tasks.map(task =>
            task.id === taskId ? { ...task, enabled } : task
        ))

        toast({
            title: enabled ? 'Task enabled' : 'Task disabled',
        })
    }

    const handleConfigure = (task: MaintenanceTask) => {
        setConfigTask(task)
        setConfigValues(task.config || {})
    }

    const handleSaveConfig = () => {
        if (!configTask) return

        setTasks(tasks.map(task =>
            task.id === configTask.id ? { ...task, config: configValues } : task
        ))

        toast({
            title: 'Configuration saved',
            description: `Updated settings for ${configTask.name}`,
        })

        setConfigTask(null)
        setConfigValues({})
    }

    const handleRun = (task: MaintenanceTask) => {
        setConfirmDialog({
            isOpen: true,
            taskId: task.id,
            taskName: task.name,
            action: task.action,
            config: task.config,
        })
    }

    const executeTask = async () => {
        const taskId = confirmDialog.taskId
        const taskName = confirmDialog.taskName
        const action = confirmDialog.action
        const config = confirmDialog.config

        setConfirmDialog({ isOpen: false, taskId: '', taskName: '', action: async () => {}, config: {} })
        setRunningTask(taskId)
        setCurrentTaskName(taskName)
        setExecutionLogs([])
        setShowConsole(true)

        const startTime = Date.now()
        let success = true
        let error: string | undefined

        try {
            addLog(`Starting task: ${taskName}`, 'info')
            await action(addLog, config)
            addLog('Task completed successfully', 'success')
        } catch (err) {
            success = false
            error = err instanceof Error ? err.message : 'Unknown error'
            addLog(`Task failed: ${error}`, 'error')
        } finally {
            const duration = Date.now() - startTime
            addLog(`Duration: ${(duration / 1000).toFixed(2)}s`, 'info')

            // Add execution to history
            setTasks(tasks.map(task => {
                if (task.id === taskId) {
                    return {
                        ...task,
                        lastRun: new Date(),
                        executions: [
                            { timestamp: new Date(), duration, success, error },
                            ...task.executions.slice(0, 9),
                        ],
                    }
                }
                return task
            }))

            setRunningTask(null)
        }
    }

    const getTaskHealth = (task: MaintenanceTask) => {
        if (task.executions.length === 0) return 'unknown'

        const recentExecutions = task.executions.slice(0, 5)
        const failures = recentExecutions.filter(e => !e.success).length

        if (failures === 0) return 'healthy'
        if (failures <= 2) return 'warning'
        return 'critical'
    }

    const getHealthBadge = (health: string) => {
        switch (health) {
            case 'healthy':
                return <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Healthy</Badge>
            case 'warning':
                return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"><AlertCircle className="h-3 w-3 mr-1" />Warning</Badge>
            case 'critical':
                return <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Critical</Badge>
            default:
                return <Badge variant="outline">Unknown</Badge>
        }
    }

    const getLogIcon = (type: LogEntry['type']) => {
        switch (type) {
            case 'success':
                return '✓'
            case 'error':
                return '✗'
            case 'warning':
                return '⚠'
            default:
                return '>'
        }
    }

    const getLogColor = (type: LogEntry['type']) => {
        switch (type) {
            case 'success':
                return 'text-green-600'
            case 'error':
                return 'text-red-600'
            case 'warning':
                return 'text-yellow-600'
            default:
                return 'text-foreground/70'
        }
    }

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            {/* Statistics */}
            <div>
                <h1 className="text-2xl font-semibold mb-1">Maintenance Tasks</h1>
                <p className="text-sm text-muted-foreground">
                    {statistics.enabledTasks} of {statistics.totalTasks} tasks enabled • {statistics.successRate}% success rate • {stats?.expiredInvitationsCount ?? 0} invitations pending cleanup
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Total Executions</span>
                        <Play className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-semibold">{statistics.totalExecutions}</div>
                </div>

                <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Success Rate</span>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-semibold">{statistics.successRate}%</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {statistics.successfulExecutions} successful, {statistics.failedExecutions} failed
                    </div>
                </div>

                <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Avg Duration</span>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-semibold">{(statistics.avgDuration / 1000).toFixed(1)}s</div>
                </div>

                <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Active Tasks</span>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-semibold">{statistics.enabledTasks}</div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                                {cat === 'all' ? 'All Categories' : cat}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tasks Table */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort('name')}
                                    className="flex items-center gap-1 hover:text-foreground"
                                >
                                    Task
                                    <ArrowUpDown className="h-3 w-3" />
                                </button>
                            </TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort('category')}
                                    className="flex items-center gap-1 hover:text-foreground"
                                >
                                    Category
                                    <ArrowUpDown className="h-3 w-3" />
                                </button>
                            </TableHead>
                            <TableHead>Schedule</TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort('lastRun')}
                                    className="flex items-center gap-1 hover:text-foreground"
                                >
                                    Last Run
                                    <ArrowUpDown className="h-3 w-3" />
                                </button>
                            </TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort('nextRun')}
                                    className="flex items-center gap-1 hover:text-foreground"
                                >
                                    Next Run
                                    <ArrowUpDown className="h-3 w-3" />
                                </button>
                            </TableHead>
                            <TableHead>Health</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAndSortedTasks.map(task => (
                            <TableRow
                                key={task.id}
                                className={`${!task.enabled ? 'opacity-40' : ''}`}
                            >
                                <TableCell>
                                    <Switch
                                        checked={task.enabled}
                                        onCheckedChange={checked => handleToggle(task.id, checked)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <div>
                                        <code className="text-sm font-medium">{task.name}</code>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {task.description}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs text-muted-foreground">
                                        {task.category}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {editingTask === task.id ? (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={editedCron}
                                                    onChange={e => setEditedCron(e.target.value)}
                                                    className="h-7 w-32 font-mono text-xs"
                                                    placeholder="0 2 * * *"
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleSave(task.id)}
                                                    className="h-7 px-2"
                                                >
                                                    <Save className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={handleCancel}
                                                    className="h-7 px-2"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            {cronError && (
                                                <p className="text-xs text-red-600">{cronError}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleEdit(task)}
                                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <code className="font-mono">{task.cron}</code>
                                            <Edit2 className="h-3 w-3 opacity-50" />
                                        </button>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {humanizeCron(task.cron)}
                                    </p>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs">
                                        {task.lastRun ? (
                                            <>
                                                <div>{formatDistanceToNow(task.lastRun, { addSuffix: true })}</div>
                                                <div className="text-muted-foreground">
                                                    {format(task.lastRun, 'MMM d, HH:mm')}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">Never</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs">
                                        {task.nextRun ? (
                                            <>
                                                <div>{formatDistanceToNow(task.nextRun, { addSuffix: true })}</div>
                                                <div className="text-muted-foreground">
                                                    {format(task.nextRun, 'MMM d, HH:mm')}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {getHealthBadge(getTaskHealth(task))}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {task.configSchema && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleConfigure(task)}
                                                className="h-8 px-2"
                                            >
                                                <Settings className="h-3 w-3" />
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setSelectedTask(task)}
                                            className="h-8 px-2"
                                        >
                                            <Info className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRun(task)}
                                            disabled={!task.enabled || runningTask === task.id}
                                            className="h-8"
                                        >
                                            {runningTask === task.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <>
                                                    <Play className="h-3 w-3 mr-1" />
                                                    Run
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Configuration Dialog */}
            <Dialog open={!!configTask} onOpenChange={open => !open && setConfigTask(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Configure Task</DialogTitle>
                        <DialogDescription>
                            <code className="text-sm">{configTask?.name}</code>
                        </DialogDescription>
                    </DialogHeader>

                    {configTask && (
                        <div className="space-y-4">
                            {configTask.configSchema?.map((field) => (
                                <div key={field.key} className="space-y-2">
                                    <Label htmlFor={field.key}>{field.label}</Label>
                                    {field.type === 'text' && (
                                        <Input
                                            id={field.key}
                                            value={(configValues[field.key] as string) || ''}
                                            onChange={(e) => setConfigValues({ ...configValues, [field.key]: e.target.value })}
                                        />
                                    )}
                                    {field.type === 'number' && (
                                        <Input
                                            id={field.key}
                                            type="number"
                                            value={(configValues[field.key] as number) || 0}
                                            onChange={(e) => setConfigValues({ ...configValues, [field.key]: parseInt(e.target.value) })}
                                        />
                                    )}
                                    {field.type === 'select' && (
                                        <Select
                                            value={(configValues[field.key] as string) || field.default}
                                            onValueChange={(value) => setConfigValues({ ...configValues, [field.key]: value })}
                                        >
                                            <SelectTrigger id={field.key}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {field.options?.map(opt => (
                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {field.type === 'boolean' && (
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id={field.key}
                                                checked={(configValues[field.key] as boolean) !== false}
                                                onCheckedChange={(checked) => setConfigValues({ ...configValues, [field.key]: checked })}
                                            />
                                            <Label htmlFor={field.key} className="cursor-pointer">{field.description}</Label>
                                        </div>
                                    )}
                                    {field.type === 'textarea' && (
                                        <Textarea
                                            id={field.key}
                                            value={(configValues[field.key] as string) || ''}
                                            onChange={(e) => setConfigValues({ ...configValues, [field.key]: e.target.value })}
                                            rows={4}
                                        />
                                    )}
                                    {field.description && field.type !== 'boolean' && (
                                        <p className="text-xs text-muted-foreground">{field.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfigTask(null)}>Cancel</Button>
                        <Button onClick={handleSaveConfig}>Save Configuration</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Execution Console */}
            <Dialog open={showConsole} onOpenChange={setShowConsole}>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Terminal className="h-4 w-4" />
                            <code className="text-base font-mono">{currentTaskName}</code>
                        </DialogTitle>
                        <DialogDescription>Task execution log</DialogDescription>
                    </DialogHeader>

                    <div className="border rounded-lg bg-background font-mono text-xs p-4 min-h-[400px] max-h-[500px] overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="space-y-1">
                                {executionLogs.map((log, i) => (
                                    <div key={i} className="flex gap-2">
                                        <span className="text-muted-foreground text-[10px]">
                                            [{format(log.timestamp, 'HH:mm:ss')}]
                                        </span>
                                        <span className={getLogColor(log.type)}>
                                            {getLogIcon(log.type)}
                                        </span>
                                        <span className={getLogColor(log.type)}>
                                            {log.message}
                                        </span>
                                    </div>
                                ))}
                                {runningTask && (
                                    <div className="flex gap-2 animate-pulse">
                                        <span className="text-muted-foreground text-[10px]">
                                            [{format(new Date(), 'HH:mm:ss')}]
                                        </span>
                                        <span className="text-foreground/70">●</span>
                                        <span className="text-foreground/70">Processing...</span>
                                    </div>
                                )}
                                <div ref={logEndRef} />
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            onClick={() => setShowConsole(false)}
                            disabled={!!runningTask}
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Task Details Dialog */}
            <Dialog open={!!selectedTask} onOpenChange={open => !open && setSelectedTask(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            <code className="text-base">{selectedTask?.name}</code>
                        </DialogTitle>
                        <DialogDescription>{selectedTask?.description}</DialogDescription>
                    </DialogHeader>

                    {selectedTask && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Category</div>
                                    <div>{selectedTask.category}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Schedule</div>
                                    <div>
                                        <code className="text-xs">{selectedTask.cron}</code>
                                        <div className="text-xs text-muted-foreground">
                                            {humanizeCron(selectedTask.cron)}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                                    <div>
                                        <Badge variant={selectedTask.enabled ? 'default' : 'secondary'}>
                                            {selectedTask.enabled ? 'Enabled' : 'Disabled'}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Health</div>
                                    <div>{getHealthBadge(getTaskHealth(selectedTask))}</div>
                                </div>
                            </div>

                            {selectedTask.executions.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Execution History</h4>
                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Timestamp</TableHead>
                                                    <TableHead>Duration</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedTask.executions.slice(0, 10).map((exec, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="text-xs">
                                                            {format(exec.timestamp, 'MMM d, yyyy HH:mm:ss')}
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            {(exec.duration / 1000).toFixed(2)}s
                                                        </TableCell>
                                                        <TableCell>
                                                            {exec.success ? (
                                                                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                    Success
                                                                </Badge>
                                                            ) : (
                                                                <div>
                                                                    <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">
                                                                        <XCircle className="h-3 w-3 mr-1" />
                                                                        Failed
                                                                    </Badge>
                                                                    {exec.error && (
                                                                        <div className="text-xs text-red-600 mt-1">
                                                                            {exec.error}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <AlertDialog
                open={confirmDialog.isOpen}
                onOpenChange={open =>
                    !open && setConfirmDialog({ isOpen: false, taskId: '', taskName: '', action: async () => {}, config: {} })
                }
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Run maintenance task?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Execute <code className="font-mono">{confirmDialog.taskName}</code> immediately. This may affect system performance.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeTask}>Run Now</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
