// components/changelog/DestructiveActionRequest.tsx ( this was the original name, kept for internal docs )
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Trash2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/auth'
import { Role, hasAdminAccess } from '@/lib/types/auth'

type ActionType = 'DELETE_PROJECT' | 'DELETE_TAG' | 'DELETE_ENTRY'

interface ChangelogRequest {
    id: string
    type: ActionType
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    projectId: string
    targetId?: string
    createdAt: string
}

interface DestructiveActionRequestProps {
    projectId: string
    action: ActionType
    targetId?: string
    targetName?: string
    onSuccess?: () => void
}

export function DestructiveActionRequest({
                                             projectId,
                                             action,
                                             targetId,
                                             targetName,
                                             onSuccess
                                         }: DestructiveActionRequestProps) {
    const { user } = useAuth()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const userRole = user?.role as (Role | null | undefined)

    // Query existing requests
    const { data: existingRequests, isFetched } = useQuery<ChangelogRequest[]>({
        queryKey: ['changelog-requests', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/changelog/requests?projectId=${projectId}`)
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to fetch requests')
            }
            return response.json()
        },
        enabled: !hasAdminAccess(userRole),
        staleTime: 30000,
    })

    // Check for existing pending request
    const existingRequest = existingRequests?.find(
        (req) =>
            req.status === 'PENDING' &&
            req.projectId === projectId &&
            req.type === action &&
            (action === 'DELETE_PROJECT' || req.targetId === targetId)
    )

    // Create request mutation
    const createRequest = useMutation({
        mutationFn: async () => {
            setIsSubmitting(true)
            try {
                const requestData = {
                    type: action,
                    projectId,
                    targetId: action !== 'DELETE_PROJECT' ? targetId : undefined
                }

                const response = await fetch('/api/changelog/requests', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Failed to create request')
                }

                return response.json()
            } catch (error) {
                console.error('Request creation error:', error)
                throw error
            } finally {
                setIsSubmitting(false)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['changelog-requests', projectId] })
            toast({
                title: 'Request Submitted',
                description: 'An admin will review your request shortly.',
            })
            setIsOpen(false)
            onSuccess?.()
        },
        onError: (error: Error) => {
            console.error('Request error:', error)
            toast({
                title: 'Error',
                description: error.message || 'Failed to submit request',
                variant: 'destructive',
            })
            setIsOpen(false)
        }
    })

    // If user is admin or data hasn't been fetched yet, don't render
    if (hasAdminAccess(userRole) || (!isFetched && !hasAdminAccess(userRole))) {
        return null
    }

    const actionLabel = action === 'DELETE_PROJECT'
        ? 'Delete Project'
        : `Delete ${action === 'DELETE_TAG' ? 'Tag' : 'Entry'} "${targetName}"`

    // Show disabled state for existing request
    if (existingRequest) {
        return (
            <div className="inline-flex items-center">
                {action === 'DELETE_TAG' || action === 'DELETE_ENTRY' ? (
                    <button
                        className="ml-1 text-muted-foreground cursor-not-allowed"
                        disabled
                        title="A deletion request is pending"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                ) : (
                    <Button
                        variant="outline"
                        disabled
                        className="inline-flex items-center gap-2"
                    >
                        <AlertCircle className="h-4 w-4" />
                        Request Pending
                    </Button>
                )}
            </div>
        )
    }

    const handleCreateRequest = () => {
        if (!projectId || isSubmitting) return
        createRequest.mutate()
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                {action === 'DELETE_TAG' || action === 'DELETE_ENTRY' ? (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="ml-1 hover:text-destructive"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                ) : (
                    <Button variant="destructive">{actionLabel}</Button>
                )}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Request {actionLabel}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {action === 'DELETE_PROJECT'
                            ? 'This will request deletion of the entire project and all its data.'
                            : `This will request deletion of the ${action === 'DELETE_TAG' ? 'tag' : 'entry'} "${targetName}" from this project.`}
                        <br /><br />
                        This action requires admin approval. Would you like to submit a request?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleCreateRequest}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Request'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}