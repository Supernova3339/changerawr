'use client';

import { useState, useEffect } from 'react';
import { useTimezone } from '@/hooks/use-timezone';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// UI Components
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ArrowLeftIcon,
    PlusIcon,
    TrashIcon,
    UserIcon,
    UsersIcon,
    MailIcon,
    BellIcon,
    BellOffIcon,
    CalendarIcon,
    SearchIcon,
    EditIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CheckIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Form schemas
const subscriberSchema = z.object({
    email: z.string().email('Invalid email address'),
    name: z.string().optional(),
    subscriptionType: z.enum(['ALL_UPDATES', 'MAJOR_ONLY', 'DIGEST_ONLY']).default('ALL_UPDATES'),
});

type SubscriberFormValues = z.infer<typeof subscriberSchema>;

// Update subscriber schema
const updateSubscriberSchema = z.object({
    name: z.string().optional(),
    subscriptionType: z.enum(['ALL_UPDATES', 'MAJOR_ONLY', 'DIGEST_ONLY']),
});

type UpdateSubscriberFormValues = z.infer<typeof updateSubscriberSchema>;

type Subscriber = {
    id: string;
    email: string;
    name?: string;
    subscriptionType: 'ALL_UPDATES' | 'MAJOR_ONLY' | 'DIGEST_ONLY';
    createdAt: string;
    lastEmailSentAt?: string;
};

export default function SubscribersPage() {
    const params = useParams();
    const router = useRouter();
    const timezone = useTimezone();
    const { toast } = useToast();
    const projectId = params.projectId as string;

    // States
    const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);

    // Add form
    const form = useForm<SubscriberFormValues>({
        resolver: zodResolver(subscriberSchema),
        defaultValues: {
            email: '',
            name: '',
            subscriptionType: 'ALL_UPDATES',
        },
    });

    // Edit form
    const editForm = useForm<UpdateSubscriberFormValues>({
        resolver: zodResolver(updateSubscriberSchema),
        defaultValues: {
            name: '',
            subscriptionType: 'ALL_UPDATES',
        },
    });

    // Set edit form values when a subscriber is selected
    useEffect(() => {
        if (selectedSubscriber && isEditDialogOpen) {
            editForm.reset({
                name: selectedSubscriber.name || '',
                subscriptionType: selectedSubscriber.subscriptionType,
            });
        }
    }, [selectedSubscriber, isEditDialogOpen, editForm]);

    // Fetch subscribers with pagination
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['subscribers', projectId, currentPage, pageSize, searchQuery],
        queryFn: async () => {
            const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
            const response = await fetch(`/api/subscribers?projectId=${projectId}&page=${currentPage}&limit=${pageSize}${searchParam}`);
            if (!response.ok) throw new Error('Failed to fetch subscribers');
            return response.json();
        },
    });

    // Add subscriber mutation
    const addSubscriber = useMutation({
        mutationFn: async (data: SubscriberFormValues) => {
            const response = await fetch('/api/subscribers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    projectId,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add subscriber');
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: 'Subscriber Added',
                description: 'The subscriber has been added successfully.',
            });
            refetch();
            form.reset();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Update subscriber mutation
    const updateSubscriber = useMutation({
        mutationFn: async ({ subscriberId, data }: { subscriberId: string, data: UpdateSubscriberFormValues }) => {
            const response = await fetch(`/api/subscribers/${subscriberId}?projectId=${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update subscriber');
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: 'Subscriber Updated',
                description: 'The subscriber has been updated successfully.',
            });
            setIsEditDialogOpen(false);
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Delete subscriber mutation
    const deleteSubscriber = useMutation({
        mutationFn: async (subscriberId: string) => {
            const response = await fetch(`/api/subscribers/${subscriberId}?projectId=${projectId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete subscriber');
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: 'Subscriber Removed',
                description: 'The subscriber has been removed successfully.',
            });
            setIsDeleteDialogOpen(false);
            setSelectedSubscriber(null);
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const onSubmit = (values: SubscriberFormValues) => {
        addSubscriber.mutate(values);
    };

    const onUpdateSubmit = (values: UpdateSubscriberFormValues) => {
        if (selectedSubscriber) {
            updateSubscriber.mutate({
                subscriberId: selectedSubscriber.id,
                data: values
            });
        }
    };

    const handleEditClick = (subscriber: Subscriber) => {
        setSelectedSubscriber(subscriber);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (subscriber: Subscriber) => {
        setSelectedSubscriber(subscriber);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (selectedSubscriber) {
            deleteSubscriber.mutate(selectedSubscriber.id);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1); // Reset to first page when searching
        refetch();
    };

    const clearSearch = () => {
        setSearchQuery('');
        setCurrentPage(1);
        refetch();
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: timezone,
        });
    };

    const getSubscriptionTypeLabel = (type: string) => {
        switch (type) {
            case 'ALL_UPDATES':
                return 'All Updates';
            case 'MAJOR_ONLY':
                return 'Major Updates Only';
            case 'DIGEST_ONLY':
                return 'Digest Only';
            default:
                return type;
        }
    };

    // Calculate pagination
    const totalItems = data?.totalCount || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return (
        <div className="container max-w-5xl mx-auto py-6">
            <div className="flex items-center mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => router.push(`/dashboard/projects/${projectId}/integrations/email`)}
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Email Settings
                </Button>
                <h1 className="text-2xl font-bold ml-4">Subscriber Management</h1>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="mb-8">
                    <CardHeader>
                        <div className="flex items-center">
                            <UsersIcon className="h-5 w-5 mr-2 text-primary" />
                            <CardTitle>Add Subscriber</CardTitle>
                        </div>
                        <CardDescription>
                            Add a new subscriber to receive changelog notifications
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Address</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="user@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Name (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="subscriptionType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subscription Type</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select subscription type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ALL_UPDATES">All Updates</SelectItem>
                                                    <SelectItem value="MAJOR_ONLY">Major Updates Only</SelectItem>
                                                    <SelectItem value="DIGEST_ONLY">Digest Only</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Determines which types of updates the subscriber will receive
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={addSubscriber.isPending}
                                        className="w-full sm:w-auto"
                                    >
                                        {addSubscriber.isPending ? (
                                            <>
                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                Adding...
                                            </>
                                        ) : (
                                            <>
                                                <PlusIcon className="mr-2 h-4 w-4" />
                                                Add Subscriber
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <MailIcon className="h-5 w-5 mr-2 text-primary" />
                                <CardTitle>Subscribers List</CardTitle>
                            </div>

                            {/* Search form */}
                            <form onSubmit={handleSearch} className="relative max-w-sm">
                                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search by email or name..."
                                    className="pl-8 w-[250px]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {/*{searchQuery && (*/}
                                {/*    <Button*/}
                                {/*        type="button"*/}
                                {/*        variant="ghost"*/}
                                {/*        size="sm"*/}
                                {/*        className="absolute right-0 top-0 h-9 w-9 p-0"*/}
                                {/*        onClick={clearSearch}*/}
                                {/*    >*/}
                                {/*        <XIcon className="h-4 w-4" />*/}
                                {/*    </Button>*/}
                                {/*)}*/}
                            </form>
                        </div>
                        <CardDescription>
                            Manage existing subscribers and their preferences
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            </div>
                        ) : data?.subscribers?.length === 0 ? (
                            <div className="text-center py-12 border rounded-md">
                                <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-medium">No subscribers found</h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {searchQuery ? 'Try a different search term or ' : 'Add subscribers above to start sending them changelog updates.'}
                                    {searchQuery && (
                                        <Button variant="link" className="p-0 h-auto" onClick={clearSearch}>
                                            clear your search
                                        </Button>
                                    )}
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Subscription Type</TableHead>
                                            <TableHead>Subscribed On</TableHead>
                                            <TableHead>Last Email</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data?.subscribers?.map((subscriber: Subscriber) => (
                                            <TableRow key={subscriber.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center">
                                                        <MailIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                                        {subscriber.email}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center">
                                                        <UserIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                                        {subscriber.name || '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            subscriber.subscriptionType === 'ALL_UPDATES' ? 'default' :
                                                                subscriber.subscriptionType === 'MAJOR_ONLY' ? 'warning' : 'secondary'
                                                        }
                                                        className="whitespace-nowrap inline-flex items-center"
                                                    >
                                                        {subscriber.subscriptionType === 'ALL_UPDATES' && <BellIcon className="h-3 w-3 mr-1 flex-shrink-0" />}
                                                        {subscriber.subscriptionType === 'MAJOR_ONLY' && <BellOffIcon className="h-3 w-3 mr-1 flex-shrink-0" />}
                                                        {subscriber.subscriptionType === 'DIGEST_ONLY' && <CalendarIcon className="h-3 w-3 mr-1 flex-shrink-0" />}
                                                        <span className="truncate">{getSubscriptionTypeLabel(subscriber.subscriptionType)}</span>
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{formatDate(subscriber.createdAt)}</TableCell>
                                                <TableCell>
                                                    {subscriber.lastEmailSentAt ? formatDate(subscriber.lastEmailSentAt) : 'Never'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditClick(subscriber)}
                                                            title="Edit subscriber"
                                                        >
                                                            <EditIcon className="h-4 w-4 text-primary" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(subscriber)}
                                                            title="Remove subscriber"
                                                        >
                                                            <TrashIcon className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>

                    {/* Pagination */}
                    {!isLoading && data?.subscribers?.length > 0 && (
                        <CardFooter className="flex items-center justify-between px-6 pt-0">
                            <div className="text-sm text-muted-foreground">
                                Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                                <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span> of{" "}
                                <span className="font-medium">{totalItems}</span> subscribers
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeftIcon className="h-4 w-4" />
                                </Button>
                                <div className="text-sm">
                                    Page <span className="font-medium">{currentPage}</span> of{" "}
                                    <span className="font-medium">{totalPages || 1}</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage >= totalPages}
                                >
                                    <ChevronRightIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </motion.div>

            {/* Delete confirmation dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Removal</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <span className="font-medium">{selectedSubscriber?.email}</span> from subscribers? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete}>
                            {deleteSubscriber.isPending ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Removing...
                                </>
                            ) : (
                                'Remove Subscriber'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit subscriber dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Subscriber</DialogTitle>
                        <DialogDescription>
                            Update information for {selectedSubscriber?.email}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
                            <FormField
                                control={editForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={editForm.control}
                                name="subscriptionType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subscription Type</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select subscription type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="ALL_UPDATES">
                                                    <div className="flex items-center">
                                                        <BellIcon className="mr-2 h-4 w-4" />
                                                        All Updates
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="MAJOR_ONLY">
                                                    <div className="flex items-center">
                                                        <BellOffIcon className="mr-2 h-4 w-4" />
                                                        Major Updates Only
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="DIGEST_ONLY">
                                                    <div className="flex items-center">
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        Digest Only
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Determines which types of updates the subscriber will receive
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={updateSubscriber.isPending}
                                >
                                    {updateSubscriber.isPending ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <CheckIcon className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}