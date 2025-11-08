import {useState} from 'react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group'
import {Checkbox} from '@/components/ui/checkbox'
import {Label} from '@/components/ui/label'
import {Separator} from '@/components/ui/separator'
import {Badge} from '@/components/ui/badge'
import {Card, CardContent, CardHeader} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {useToast} from '@/hooks/use-toast'
import {
    Globe,
    Loader2,
    PackageOpen,
    Trash2,
    Calendar,
    Mail,
    Users,
    Clock,
    AlertTriangle,
    CheckCircle,
    Ban,
    AlertCircle
} from 'lucide-react'
import {useAuth} from '@/context/auth'
import {cn} from '@/lib/utils'
import {truncateText} from '@/lib/utils/text'

type ActionType = 'PUBLISH' | 'UNPUBLISH' | 'DELETE' | 'ALLOW_SCHEDULE';
type RequestType = 'ALLOW_PUBLISH' | 'DELETE_ENTRY' | 'ALLOW_SCHEDULE';
type ButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost' | 'secondary';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';
type RecipientType = 'SUBSCRIBERS' | 'MANUAL' | 'BOTH';
type SubscriptionType = 'ALL_UPDATES' | 'MAJOR_ONLY' | 'DIGEST_ONLY';

interface PendingRequest {
    id: string;
    type: RequestType;
    status: string;
    createdAt: string;
    staff: {
        name: string;
        email: string;
    };
}

interface ChangelogActionRequestProps {
    projectId: string;
    entryId: string;
    action: ActionType;
    title: string;
    isPublished?: boolean;
    onSuccess?: () => void;
    className?: string;
    variant?: ButtonVariant;
    disabled?: boolean;
    size?: ButtonSize;
}

export function ChangelogActionRequest({
                                           projectId,
                                           entryId,
                                           action,
                                           title,
                                           isPublished = false,
                                           onSuccess,
                                           className,
                                           variant = 'default',
                                           disabled = false,
                                           size = 'default'
                                       }: ChangelogActionRequestProps) {
    const {user} = useAuth();
    const {toast} = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Email notification state
    const [sendEmails, setSendEmails] = useState(false);
    const [recipientType, setRecipientType] = useState<RecipientType>('SUBSCRIBERS');
    const [subscriptionTypes, setSubscriptionTypes] = useState<SubscriptionType[]>(['ALL_UPDATES']);

    // Custom publish date state
    const [useCustomPublishedAt, setUseCustomPublishedAt] = useState(false);
    const [customPublishedAt, setCustomPublishedAt] = useState<string>('');

    const isAdmin = user?.role === 'ADMIN';
    const isStaff = user?.role === 'STAFF';
    const canPerformAction = isAdmin || isStaff;

    // Map action to request type for checking pending requests
    const getRequestType = (actionType: ActionType): RequestType | null => {
        const mapping: Record<ActionType, RequestType | null> = {
            'PUBLISH': 'ALLOW_PUBLISH',
            'DELETE': 'DELETE_ENTRY',
            'ALLOW_SCHEDULE': 'ALLOW_SCHEDULE',
            'UNPUBLISH': null // Unpublish doesn't create requests
        };
        return mapping[actionType];
    };

    // Fetch pending requests for this entry
    const {data: pendingRequests = []} = useQuery<PendingRequest[]>({
        queryKey: ['pending-requests', projectId, entryId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/changelog/${entryId}/requests`);
            if (!response.ok) return [];
            return response.json();
        },
        enabled: canPerformAction && !!entryId
    });

    // Check project settings for approval requirement
    const {data: projectSettings} = useQuery({
        queryKey: ['project-settings', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/settings`);
            if (!response.ok) return null;
            return response.json();
        },
        enabled: action === 'PUBLISH' && isStaff
    });

    // Check if email notifications are enabled
    const {data: emailConfig} = useQuery({
        queryKey: ['email-config', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/integrations/email`);
            if (!response.ok) return null;
            return response.json();
        },
        enabled: action === 'PUBLISH'
    });

    // Check if there's a pending request for this specific action
    const requestType = getRequestType(action);
    const pendingRequest = requestType
        ? pendingRequests.find(req => req.type === requestType)
        : null;

    const requiresApproval = isStaff && projectSettings?.requireApproval && !projectSettings?.allowAutoPublish;
    const showEmailOptions = action === 'PUBLISH' && emailConfig?.enabled && !requiresApproval;

    // Handle subscription type changes
    const handleSubscriptionTypeChange = (type: SubscriptionType, checked: boolean) => {
        if (checked) {
            setSubscriptionTypes(prev => [...prev, type]);
        } else {
            setSubscriptionTypes(prev => prev.filter(t => t !== type));
        }
    };

    // Update entry mutation
    const updateEntry = useMutation({
        mutationFn: async () => {
            setIsSubmitting(true);
            try {
                const payload: {action: string; publishedAt?: string} = {
                    action: action.toLowerCase()
                };

                if (action === 'PUBLISH' && useCustomPublishedAt && customPublishedAt) {
                    payload.publishedAt = new Date(customPublishedAt).toISOString();
                }

                const response = await fetch(`/api/projects/${projectId}/changelog/${entryId}`, {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || `Failed to ${action.toLowerCase()} entry`);
                }

                const publishResult = await response.json();

                // Send emails if it's a direct publish (not requiring approval)
                if (action === 'PUBLISH' && sendEmails && showEmailOptions && !publishResult.requiresApproval) {
                    try {
                        const emailResponse = await fetch(`/api/projects/${projectId}/integrations/email/send`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                subject: `New Update - ${title}`,
                                changelogEntryId: entryId,
                                recipientType,
                                subscriptionTypes
                            })
                        });

                        if (!emailResponse.ok) {
                            console.warn('Failed to send email notifications, but publish succeeded');
                        }
                    } catch (emailError) {
                        console.warn('Email sending failed:', emailError);
                    }
                }

                return publishResult;
            } finally {
                setIsSubmitting(false);
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({queryKey: ['changelog-entry', entryId]});
            queryClient.invalidateQueries({queryKey: ['changelog-entries', projectId]});
            queryClient.invalidateQueries({queryKey: ['pending-requests', projectId, entryId]});
            queryClient.setQueryData(['changelog-entry', entryId], data);

            if (data.requiresApproval) {
                toast({
                    title: 'Request Submitted',
                    description: 'Your request has been sent to an administrator for approval.',
                    duration: 4000
                });
            } else {
                const actionMessages = {
                    'PUBLISH': {
                        title: 'Entry Published',
                        description: sendEmails && showEmailOptions
                            ? 'Entry published and email notifications sent.'
                            : 'Entry published successfully.'
                    },
                    'UNPUBLISH': {
                        title: 'Entry Unpublished',
                        description: 'Entry has been unpublished.'
                    },
                    'ALLOW_SCHEDULE': {
                        title: 'Schedule Allowed',
                        description: 'Entry approved for scheduling.'
                    }
                };

                const message = actionMessages[action as keyof typeof actionMessages];
                toast({
                    title: message.title,
                    description: message.description
                });
            }

            setIsOpen(false);
            onSuccess?.();
        },
        onError: (error: Error) => {
            toast({
                title: `Failed to ${action.toLowerCase().replace('_', ' ')}`,
                description: error.message,
                variant: 'destructive'
            });
            setIsOpen(false);
        }
    });

    // Delete entry mutation
    const deleteEntry = useMutation({
        mutationFn: async () => {
            setIsSubmitting(true);
            try {
                const response = await fetch(`/api/projects/${projectId}/changelog/${entryId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to process deletion');
                }

                const data = await response.json();
                return {data, status: response.status};
            } finally {
                setIsSubmitting(false);
            }
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({queryKey: ['pending-requests', projectId, entryId]});

            if (isStaff && result.status === 202) {
                toast({
                    title: 'Deletion Request Submitted',
                    description: 'Your request has been sent for approval.',
                    duration: 4000
                });
            } else {
                queryClient.invalidateQueries({queryKey: ['changelog-entries', projectId]});
                queryClient.removeQueries({queryKey: ['changelog-entry', entryId]});
                toast({
                    title: 'Entry Deleted',
                    description: 'Entry has been deleted successfully.'
                });
            }
            setIsOpen(false);
            onSuccess?.();
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to process request',
                variant: 'destructive'
            });
            setIsOpen(false);
        }
    });

    if (!canPerformAction) return null;

    const handleAction = () => {
        if (action === 'DELETE') {
            deleteEntry.mutate();
        } else {
            updateEntry.mutate();
        }
    };

    const getButtonConfig = () => {
        const isPending = !!pendingRequest;

        const configs = {
            'PUBLISH': {
                icon: isPending ? Clock : Globe,
                label: isPending ? 'Publish Pending' : 'Publish',
                loadingLabel: 'Publishing...',
                variant: (isPending ? 'secondary' : (variant || 'default')) as ButtonVariant,
                disabled: isPending
            },
            'UNPUBLISH': {
                icon: PackageOpen,
                label: 'Unpublish',
                loadingLabel: 'Unpublishing...',
                variant: (variant || 'outline') as ButtonVariant,
                disabled: false
            },
            'DELETE': {
                icon: isPending ? Clock : Trash2,
                label: isPending ? 'Delete Pending' : 'Delete',
                loadingLabel: 'Processing...',
                variant: (isPending ? 'secondary' : 'destructive') as ButtonVariant,
                disabled: isPending
            },
            'ALLOW_SCHEDULE': {
                icon: isPending ? Clock : Calendar,
                label: isPending ? 'Schedule Pending' : 'Allow Schedule',
                loadingLabel: 'Processing...',
                variant: (isPending ? 'secondary' : (variant || 'default')) as ButtonVariant,
                disabled: isPending
            }
        };
        return configs[action];
    };

    const config = getButtonConfig();
    const IconComponent = config.icon;

    // Don't render publish button if already published
    if (action === 'PUBLISH' && isPublished) return null;

    const renderButton = () => (
        <Button
            onClick={() => setIsOpen(true)}
            disabled={disabled || isSubmitting || config.disabled}
            variant={config.variant}
            size={size}
            className={cn("gap-2", className, config.disabled && "opacity-75")}
        >
            {isSubmitting ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin"/>
                    {config.loadingLabel}
                </>
            ) : (
                <>
                    <IconComponent className="h-4 w-4"/>
                    {config.label}
                </>
            )}
        </Button>
    );

    const getDialogContent = () => {
        if (pendingRequest) {
            const requestDate = new Date(pendingRequest.createdAt).toLocaleDateString();
            return {
                title: `${action.charAt(0) + action.slice(1).toLowerCase().replace('_', ' ')} Request Pending`,
                description: `A ${action.toLowerCase()} request for this entry is already pending approval (submitted ${requestDate} by ${pendingRequest.staff.name}).`,
                showForm: false,
                isPending: true
            };
        }

        const descriptions = {
            'PUBLISH': requiresApproval
                ? 'This will send a publish request to administrators for approval.'
                : 'This entry will be visible to all users.',
            'UNPUBLISH': 'This entry will no longer be visible to users.',
            'DELETE': isStaff
                ? 'This will send a deletion request to administrators for approval.'
                : 'This action cannot be undone.',
            'ALLOW_SCHEDULE': 'This will allow the entry to be scheduled for future publication.'
        };

        return {
            title: `${action === 'DELETE' && isStaff ? 'Request' : ''} ${action.charAt(0) + action.slice(1).toLowerCase().replace('_', ' ')} Entry`,
            description: descriptions[action],
            showForm: true,
            isPending: false
        };
    };

    const dialogContent = getDialogContent();

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {renderButton()}
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconComponent className={cn("w-5 h-5", dialogContent.isPending && "text-amber-500")}/>
                        {dialogContent.title}
                    </DialogTitle>
                    <DialogDescription>
                        {dialogContent.description}
                    </DialogDescription>
                </DialogHeader>

                {dialogContent.isPending && (
                    <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                    <Clock className="w-5 h-5 text-amber-600"/>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-amber-800">
                                        Request awaiting approval
                                    </p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        Submitted
                                        by {pendingRequest?.staff.name} on {new Date(pendingRequest?.createdAt || '').toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {dialogContent.showForm && (
                    <div className="space-y-4">
                        {/* Entry Details Card */}
                        <Card className="border-dashed">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"/>
                                    <span className="font-medium text-sm">Entry Details</span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-sm font-medium" title={title}>{truncateText(title, 50)}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant={isPublished ? 'default' : 'secondary'} className="text-xs">
                                        {isPublished ? (
                                            <>
                                                <CheckCircle className="w-3 h-3 mr-1"/>
                                                Published
                                            </>
                                        ) : (
                                            <>
                                                <Ban className="w-3 h-3 mr-1"/>
                                                Draft
                                            </>
                                        )}
                                    </Badge>
                                    {requiresApproval && (
                                        <Badge variant="outline" className="text-xs">
                                            <AlertTriangle className="w-3 h-3 mr-1"/>
                                            Requires Approval
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Custom Publish Date */}
                        {action === 'PUBLISH' && (
                            <Card className="border border-amber-200 bg-gradient-to-br from-amber-50/40 to-orange-50/20">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-100/60 rounded-lg">
                                                <Calendar className="w-4 h-4 text-amber-700"/>
                                            </div>
                                            <div className="flex-1">
                                                <span className="font-semibold text-sm text-amber-950">Custom Publish Date</span>
                                                <p className="text-xs text-amber-700/70">Set a specific date instead of
                                                    now</p>
                                            </div>
                                        </div>
                                        <Checkbox
                                            checked={useCustomPublishedAt}
                                            onCheckedChange={(checked) => setUseCustomPublishedAt(checked === true)}
                                            className="border-amber-400"
                                        />
                                    </div>
                                </CardHeader>

                                {useCustomPublishedAt && (
                                    <CardContent className="pt-0 space-y-4">
                                        <div className="space-y-2.5">
                                            <Label htmlFor="publishedAt"
                                                   className="text-sm font-medium text-gray-900">Publish Date & Time</Label>
                                            <Input
                                                id="publishedAt"
                                                type="datetime-local"
                                                value={customPublishedAt}
                                                onChange={(e) => setCustomPublishedAt(e.target.value)}
                                                className="text-sm border-amber-200 focus:border-amber-400 focus:ring-amber-100"
                                            />
                                        </div>

                                        <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-lg flex gap-3">
                                            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5"/>
                                            <div>
                                                <p className="text-xs font-medium text-amber-900">
                                                    Backdating changes history
                                                </p>
                                                <p className="text-xs text-amber-700 mt-1">
                                                    Setting a custom date may not accurately reflect when this update was actually published. Use this responsibly.
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        )}

                        {/* Email Options */}
                        {showEmailOptions && (
                            <Card className="border-dashed border-blue-200 bg-blue-50/30">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-blue-600"/>
                                            <span
                                                className="font-medium text-sm text-blue-900">Email Notifications</span>
                                            <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">
                                                Optional
                                            </Badge>
                                        </div>
                                        <Checkbox
                                            checked={sendEmails}
                                            onCheckedChange={(checked) => setSendEmails(checked === true)}
                                            className="border-blue-400"
                                        />
                                    </div>
                                </CardHeader>

                                {sendEmails && (
                                    <CardContent className="pt-0 space-y-4">
                                        <div className="space-y-3">
                                            <div>
                                                <Label
                                                    className="text-xs font-medium text-gray-700 uppercase tracking-wide">Recipients</Label>
                                                <RadioGroup
                                                    value={recipientType}
                                                    onValueChange={(value: RecipientType) => setRecipientType(value)}
                                                    className="mt-2 space-y-2"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <RadioGroupItem value="SUBSCRIBERS" id="subscribers"
                                                                        className="w-4 h-4"/>
                                                        <Label htmlFor="subscribers"
                                                               className="text-sm flex items-center gap-2">
                                                            <Users className="w-4 h-4 text-gray-500"/>
                                                            Subscribers only
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <RadioGroupItem value="MANUAL" id="manual" className="w-4 h-4"/>
                                                        <Label htmlFor="manual"
                                                               className="text-sm flex items-center gap-2">
                                                            <Mail className="w-4 h-4 text-gray-500"/>
                                                            Manual recipients
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <RadioGroupItem value="BOTH" id="both" className="w-4 h-4"/>
                                                        <Label htmlFor="both" className="text-sm">Both subscribers &
                                                            manual</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>

                                            <Separator className="opacity-30"/>

                                            <div>
                                                <Label
                                                    className="text-xs font-medium text-gray-700 uppercase tracking-wide">Subscription
                                                    Types</Label>
                                                <div className="mt-2 space-y-2">
                                                    {[
                                                        {
                                                            id: 'ALL_UPDATES',
                                                            label: 'All Updates',
                                                            desc: 'Every changelog entry'
                                                        },
                                                        {
                                                            id: 'MAJOR_ONLY',
                                                            label: 'Major Updates',
                                                            desc: 'Important releases only'
                                                        },
                                                        {
                                                            id: 'DIGEST_ONLY',
                                                            label: 'Digest Emails',
                                                            desc: 'Weekly/monthly summaries'
                                                        }
                                                    ].map((type) => (
                                                        <div key={type.id} className="flex items-start space-x-3">
                                                            <Checkbox
                                                                id={type.id}
                                                                className="w-4 h-4 mt-0.5"
                                                                checked={subscriptionTypes.includes(type.id as SubscriptionType)}
                                                                onCheckedChange={(checked) =>
                                                                    handleSubscriptionTypeChange(type.id as SubscriptionType, checked === true)
                                                                }
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <Label htmlFor={type.id}
                                                                       className="text-sm font-medium">
                                                                    {type.label}
                                                                </Label>
                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                    {type.desc}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancel
                    </Button>

                    {dialogContent.showForm && (
                        <Button
                            onClick={handleAction}
                            disabled={disabled || isSubmitting}
                            variant={action === 'DELETE' ? 'destructive' : 'default'}
                            className="gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin"/>
                                    {config.loadingLabel}
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4"/>
                                    Confirm {action.charAt(0) + action.slice(1).toLowerCase().replace('_', ' ')}
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}