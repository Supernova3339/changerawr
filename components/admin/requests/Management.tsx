'use client'

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import React, {useState} from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {Separator} from '@/components/ui/separator'
import {useToast} from '@/hooks/use-toast'
import {formatDistanceToNow, format} from 'date-fns'
import {
    Check,
    X,
    Loader2,
    AlertTriangle,
    Calendar,
    Clock,
    ChevronDown,
    ChevronRight,
    Eye,
    User,
    Building,
    FileText,
    Tag,
    Trash2,
} from 'lucide-react'
import {motion, AnimatePresence} from 'framer-motion'

// Updated type definitions
export type RequestType = 'DELETE_PROJECT' | 'DELETE_TAG' | 'DELETE_ENTRY' | 'ALLOW_PUBLISH' | 'ALLOW_SCHEDULE';

export const REQUEST_TYPES: Record<RequestType, {
    label: string;
    description: string;
    targetDisplay: (request: ChangelogRequest) => string;
    icon: React.ReactNode;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    severity: 'low' | 'medium' | 'high' | 'critical';
    getDetails: (request: ChangelogRequest) => React.ReactNode;
}> = {
    DELETE_PROJECT: {
        label: 'Delete Project',
        description: 'Permanently delete an entire project and all associated data',
        targetDisplay: () => 'Entire Project',
        icon: <AlertTriangle className="h-3 w-3"/>,
        variant: 'destructive',
        severity: 'critical',
        getDetails: (request) => (
            <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 font-medium">
                        <AlertTriangle className="h-4 w-4"/>
                        Critical Action - Irreversible
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                        This will permanently delete the entire project, including all changelog entries, tags, and
                        settings.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">Project:</span>
                        <p className="font-medium">{request.project.name}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Impact:</span>
                        <p className="font-medium text-red-600">All data will be lost</p>
                    </div>
                </div>
            </div>
        )
    },
    DELETE_TAG: {
        label: 'Delete Tag',
        description: 'Remove a specific changelog tag',
        targetDisplay: (request) => request.ChangelogTag?.name || 'Unknown Tag',
        icon: <Tag className="h-3 w-3"/>,
        variant: 'destructive',
        severity: 'medium',
        getDetails: (request) => (
            <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-800 font-medium">
                        <Tag className="h-4 w-4"/>
                        Tag Removal
                    </div>
                    <p className="text-sm text-amber-700 mt-1">
                        This tag will be removed from all changelog entries and the project defaults.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">Tag Name:</span>
                        <p className="font-medium">{request.ChangelogTag?.name || request.targetId || 'Unknown'}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Project:</span>
                        <p className="font-medium">{request.project.name}</p>
                    </div>
                </div>
            </div>
        )
    },
    DELETE_ENTRY: {
        label: 'Delete Entry',
        description: 'Remove a specific changelog entry',
        targetDisplay: (request) => request.ChangelogEntry?.title || 'Unknown Entry',
        icon: <Trash2 className="h-3 w-3"/>,
        variant: 'destructive',
        severity: 'high',
        getDetails: (request) => (
            <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 font-medium">
                        <FileText className="h-4 w-4"/>
                        Entry Deletion
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                        This changelog entry will be permanently removed and cannot be recovered.
                    </p>
                </div>
                <div className="space-y-2 text-sm">
                    <div>
                        <span className="text-muted-foreground">Entry Title:</span>
                        <p className="font-medium">{request.ChangelogEntry?.title || 'Unknown Entry'}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Project:</span>
                        <p className="font-medium">{request.project.name}</p>
                    </div>
                </div>
            </div>
        )
    },
    ALLOW_PUBLISH: {
        label: 'Publish Entry',
        description: 'Request approval to publish a changelog entry',
        targetDisplay: (request) => request.ChangelogEntry?.title || 'Unknown Entry',
        icon: <Check className="h-3 w-3"/>,
        variant: 'default',
        severity: 'low',
        getDetails: (request) => {
            const metadata = request.metadata as {customPublishedAt?: string} | null;
            const customPublishedAt = metadata?.customPublishedAt;
            const publishDate = customPublishedAt ? new Date(customPublishedAt) : null;

            return (
                <div className="space-y-3">
                    <div className={`p-3 rounded-lg border ${
                        customPublishedAt
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-blue-50 border-blue-200'
                    }`}>
                        <div className={`flex items-center gap-2 font-medium ${
                            customPublishedAt
                                ? 'text-amber-800'
                                : 'text-blue-800'
                        }`}>
                            <FileText className="h-4 w-4"/>
                            {customPublishedAt ? 'Publish with Custom Date' : 'Publish Request'}
                        </div>
                        <p className={`text-sm mt-1 ${
                            customPublishedAt
                                ? 'text-amber-700'
                                : 'text-blue-700'
                        }`}>
                            {customPublishedAt && publishDate
                                ? `Staff member wants to publish this entry with a backdated publish date of ${format(publishDate, 'PPP p')}.`
                                : 'Staff member wants to publish this changelog entry immediately.'
                            }
                        </p>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div>
                            <span className="text-muted-foreground">Entry Title:</span>
                            <p className="font-medium">{request.ChangelogEntry?.title || 'Unknown Entry'}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Project:</span>
                            <p className="font-medium">{request.project.name}</p>
                        </div>
                        {customPublishedAt && publishDate && (
                            <>
                                <div>
                                    <span className="text-muted-foreground">Requested Publish Date:</span>
                                    <p className="font-medium text-amber-700">{format(publishDate, 'PPP p')}</p>
                                </div>
                                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                                    ⚠️ This entry will show the custom date instead of the current date. Ensure this is intentional.
                                </div>
                            </>
                        )}
                    </div>
                </div>
            );
        }
    },
    ALLOW_SCHEDULE: {
        label: 'Schedule Entry',
        description: 'Request approval to schedule a changelog entry for automatic publishing',
        targetDisplay: (request) => {
            const title = request.ChangelogEntry?.title || 'Unknown Entry';
            const scheduledTime = request.targetId ? format(new Date(request.targetId), 'MMM d, h:mm a') : 'Unknown time';
            return `${title} (${scheduledTime})`;
        },
        icon: <Clock className="h-3 w-3"/>,
        variant: 'secondary',
        severity: 'low',
        getDetails: (request) => (
            <div className="space-y-3">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-800 font-medium">
                        <Calendar className="h-4 w-4"/>
                        Schedule Request
                    </div>
                    <p className="text-sm text-purple-700 mt-1">
                        Staff member wants to schedule this entry for automatic publishing.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">Entry Title:</span>
                        <p className="font-medium">{request.ChangelogEntry?.title || 'Unknown Entry'}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Scheduled For:</span>
                        <p className="font-medium text-purple-600">
                            {request.targetId
                                ? format(new Date(request.targetId), 'PPP p')
                                : 'Unknown time'
                            }
                        </p>
                    </div>
                </div>
                <div className="text-sm">
                    <span className="text-muted-foreground">Project:</span>
                    <p className="font-medium">{request.project.name}</p>
                </div>
                {request.targetId && (
                    <div className="text-sm">
                        <span className="text-muted-foreground">Time until publish:</span>
                        <p className="font-medium">
                            {formatDistanceToNow(new Date(request.targetId), {addSuffix: true})}
                        </p>
                    </div>
                )}
            </div>
        )
    }
};

// Updated types
export interface ChangelogRequest {
    id: string;
    type: RequestType;
    targetId?: string | null;
    metadata?: {customPublishedAt?: string} | null;
    project: {
        name: string;
    };
    staff: {
        name: string | null;
        email: string;
    };
    ChangelogTag?: {
        name: string;
    };
    ChangelogEntry?: {
        title: string;
    };
    createdAt: string;
}

export type RequestStatus = 'APPROVED' | 'REJECTED';

type ProcessingRequest = {
    id: string;
    status: RequestStatus;
} | null;

export function RequestManagement() {
    const {toast} = useToast()
    const queryClient = useQueryClient()
    const [processingRequest, setProcessingRequest] = useState<ProcessingRequest>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [selectedRequest, setSelectedRequest] = useState<ChangelogRequest | null>(null)
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

    const {data: requests, isLoading, error} = useQuery<ChangelogRequest[]>({
        queryKey: ['changelog-requests'],
        queryFn: async () => {
            const response = await fetch('/api/changelog/requests')
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to fetch requests')
            }
            return response.json()
        }
    })

    const processRequest = useMutation({
        mutationFn: async ({
                               requestId,
                               status
                           }: {
            requestId: string
            status: RequestStatus
        }) => {
            const response = await fetch(`/api/changelog/requests/${requestId}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({status})
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to process request')
            }

            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['changelog-requests']})
            toast({
                title: 'Success',
                description: `Request ${processingRequest?.status?.toLowerCase() || ''} successfully`
            })
            setIsDialogOpen(false)
            setProcessingRequest(null)
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            })
            setIsDialogOpen(false)
            setProcessingRequest(null)
        }
    })

    const handleProcessRequest = (requestId: string, status: RequestStatus) => {
        setProcessingRequest({id: requestId, status})
        setIsDialogOpen(true)
    }

    const confirmProcessRequest = () => {
        if (!processingRequest) return

        processRequest.mutate({
            requestId: processingRequest.id,
            status: processingRequest.status
        })
    }

    const toggleRowExpansion = (requestId: string) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(requestId)) {
            newExpanded.delete(requestId)
        } else {
            newExpanded.add(requestId)
        }
        setExpandedRows(newExpanded)
    }

    const openDetailDialog = (request: ChangelogRequest) => {
        setSelectedRequest(request)
        setIsDetailDialogOpen(true)
    }

    const getRequestTypeInfo = (type: RequestType) => {
        return REQUEST_TYPES[type] || {
            label: type,
            description: 'Unknown request type',
            targetDisplay: () => 'Unknown',
            icon: <AlertTriangle className="h-3 w-3"/>,
            variant: 'outline' as const,
            severity: 'medium' as const,
            getDetails: () => <div>No details available</div>
        };
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-200'
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-200'
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'low':
                return 'bg-green-100 text-green-800 border-green-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertTriangle className="h-8 w-8 text-destructive"/>
                <p className="text-sm text-muted-foreground">Failed to load requests</p>
            </div>
        )
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Pending Requests</CardTitle>
                    <CardDescription>
                        Review and manage action requests from staff members. Click on any row for detailed information.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!requests?.length ? (
                        <div className="text-center py-12">
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-3 bg-muted rounded-full">
                                    <Calendar className="h-8 w-8 text-muted-foreground"/>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">No pending requests</p>
                                    <p className="text-xs text-muted-foreground">All requests have been processed</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {requests.map((request) => {
                                const typeInfo = getRequestTypeInfo(request.type);
                                const isExpanded = expandedRows.has(request.id);

                                return (
                                    <motion.div
                                        key={request.id}
                                        initial={{opacity: 0, y: 20}}
                                        animate={{opacity: 1, y: 0}}
                                        className="border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
                                    >
                                        <Collapsible
                                            open={isExpanded}
                                            onOpenChange={() => toggleRowExpansion(request.id)}
                                        >
                                            <CollapsibleTrigger asChild>
                                                <div className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                {isExpanded ? (
                                                                    <ChevronDown
                                                                        className="h-4 w-4 text-muted-foreground"/>
                                                                ) : (
                                                                    <ChevronRight
                                                                        className="h-4 w-4 text-muted-foreground"/>
                                                                )}
                                                                <Badge
                                                                    variant={typeInfo.variant}
                                                                    className={`gap-1 ${getSeverityColor(typeInfo.severity)}`}
                                                                >
                                                                    {typeInfo.icon}
                                                                    {typeInfo.label}
                                                                </Badge>
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <Building
                                                                        className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                                                                    <span className="font-medium text-sm truncate">
                                                                        {request.project.name}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <User
                                                                        className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                                                                    <span
                                                                        className="text-sm text-muted-foreground truncate">
                                                                        {request.staff.name || request.staff.email}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="text-right">
                                                                <div className="text-sm font-medium">
                                                                    {typeInfo.targetDisplay(request)}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                    {formatDistanceToNow(new Date(request.createdAt), {
                                                                        addSuffix: true
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 ml-4">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openDetailDialog(request);
                                                                }}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <Eye className="h-4 w-4"/>
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="success"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleProcessRequest(request.id, 'APPROVED');
                                                                }}
                                                                disabled={processRequest.isPending}
                                                            >
                                                                <Check className="h-4 w-4"/>
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleProcessRequest(request.id, 'REJECTED');
                                                                }}
                                                                disabled={processRequest.isPending}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <X className="h-4 w-4"/>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CollapsibleTrigger>

                                            <CollapsibleContent>
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{opacity: 0, height: 0}}
                                                            animate={{opacity: 1, height: 'auto'}}
                                                            exit={{opacity: 0, height: 0}}
                                                            transition={{duration: 0.2}}
                                                        >
                                                            <Separator/>
                                                            <div className="p-4 bg-muted/25">
                                                                {typeInfo.getDetails(request)}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                <DialogContent className="max-w-2xl">
                    {selectedRequest && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-2">
                                    {REQUEST_TYPES[selectedRequest.type].icon}
                                    <DialogTitle>
                                        {REQUEST_TYPES[selectedRequest.type].label} Request
                                    </DialogTitle>
                                </div>
                                <DialogDescription>
                                    Detailed information about this request
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                                {REQUEST_TYPES[selectedRequest.type].getDetails(selectedRequest)}

                                <Separator/>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Requested by:</span>
                                        <div className="font-medium">
                                            {selectedRequest.staff.name || 'Unnamed User'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {selectedRequest.staff.email}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Requested:</span>
                                        <p className="font-medium">
                                            {formatDistanceToNow(new Date(selectedRequest.createdAt), {
                                                addSuffix: true
                                            })}
                                        </p>
                                        <div className="text-xs text-muted-foreground">
                                            {format(new Date(selectedRequest.createdAt), 'PPP p')}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        onClick={() => {
                                            setIsDetailDialogOpen(false);
                                            handleProcessRequest(selectedRequest.id, 'APPROVED');
                                        }}
                                        variant="success"
                                    >
                                        <Check className="h-4 w-4 mr-2"/>
                                        Approve Request
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            setIsDetailDialogOpen(false);
                                            handleProcessRequest(selectedRequest.id, 'REJECTED');
                                        }}
                                        className="flex-1"
                                    >
                                        <X className="h-4 w-4 mr-2"/>
                                        Reject Request
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {processingRequest?.status === 'APPROVED' ? 'Approve Request?' : 'Reject Request?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {processingRequest?.status === 'APPROVED'
                                ? 'This will approve the request and execute the requested action immediately.'
                                : 'This will reject the request. The requested action will not be performed and the staff member will be notified.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setProcessingRequest(null)
                            setIsDialogOpen(false)
                        }}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmProcessRequest}
                        >
                            {processRequest.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin"/>
                            ) : processingRequest?.status === 'APPROVED' ? (
                                'Approve'
                            ) : (
                                'Reject'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}