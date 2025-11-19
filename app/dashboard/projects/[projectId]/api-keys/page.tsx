'use client'

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/auth';
import {
    Card,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import {
    Key,
    Plus,
    Trash2,
    Ban,
    Pencil,
    Copy,
    FileText,
    Shield,
    X,
    ExternalLink,
    Eye,
    EyeOff,
    Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import SDKShowcaseCompact from '@/components/admin/api/sdk-showcase-compact';
import { Badge } from '@/components/ui/badge';
import { PermissionsModal } from '@/components/admin/api/PermissionsModal';
import { PERMISSION_GROUPS } from '@/lib/api/permissions';

interface ApiKey {
    id: string;
    name: string;
    key: string;
    lastUsed: string | null;
    createdAt: string;
    expiresAt: string | null;
    isRevoked: boolean;
    projectId: string | null;
    permissions: string[];
    isGlobal: boolean;
    userId: string;
    user: {
        id: string;
        name: string | null;
        email: string;
    };
}

interface RenameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRename: (newName: string) => Promise<void>;
    currentName: string;
}

function RenameDialog({
                          open,
                          onOpenChange,
                          onRename,
                          currentName,
                      }: RenameDialogProps) {
    const [newName, setNewName] = useState(currentName);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || newName === currentName) return;

        setIsSubmitting(true);
        try {
            await onRename(newName);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to rename API key:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Rename API Key</DialogTitle>
                    <DialogDescription>
                        Enter a new name for your API key.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-name">New Name</Label>
                            <Input
                                id="new-name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g., Production API Key"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!newName.trim() || newName === currentName || isSubmitting}
                        >
                            {isSubmitting ? 'Renaming...' : 'Rename'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function NewKeyAlert({ keyData, onClose, onCopy }: { keyData: { key: string; id: string }; onClose: () => void; onCopy: (key: string) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900/50 rounded-lg mb-6"
        >
            <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                        <h4 className="font-medium text-yellow-800 dark:text-yellow-500">New API Key Created</h4>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-8 w-8 p-0 text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-600 hover:bg-transparent"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                    Save your API key now. For security reasons, you won&apos;t be able to view it again.
                </p>

                <div className="relative">
                    <div className="bg-yellow-100 dark:bg-yellow-950/60 border border-yellow-200 dark:border-yellow-900/30 rounded-md p-3 font-mono text-sm break-all text-yellow-800 dark:text-yellow-300">
                        {keyData.key}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCopy(keyData.key)}
                        className="absolute top-2 right-2 h-8 bg-yellow-100 dark:bg-yellow-950/70 border-yellow-200 dark:border-yellow-900/50 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900 hover:text-yellow-900 dark:hover:text-yellow-200"
                    >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

export default function ProjectApiKeysPage() {
    const params = useParams();
    const projectId = params.projectId as string;
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(PERMISSION_GROUPS.FULL_ACCESS);
    const [newKeyIsGlobal, setNewKeyIsGlobal] = useState(false);
    const [newKeyData, setNewKeyData] = useState<{ key: string; id: string } | null>(null);
    const [renameKey, setRenameKey] = useState<ApiKey | null>(null);
    const [userFilter, setUserFilter] = useState<string>('all');

    const { data: systemConfig } = useQuery<{ adminOnlyApiKeyCreation: boolean }>({
        queryKey: ['system-config-api-keys'],
        queryFn: async () => {
            const response = await fetch('/api/admin/config');
            if (!response.ok) return { adminOnlyApiKeyCreation: false };
            return response.json();
        },
    });

    const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
        queryKey: ['project-api-keys', projectId, userFilter],
        queryFn: async () => {
            const url = new URL(`/api/projects/${projectId}/api-keys`, window.location.origin);
            if (userFilter !== 'all') {
                url.searchParams.set('userId', userFilter);
            }
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error('Failed to fetch API keys');
            return response.json();
        },
        refetchInterval: 30000,
        staleTime: 15000,
    });

    const isAdmin = user?.role === 'ADMIN';
    const canCreateKeys = !systemConfig?.adminOnlyApiKeyCreation || isAdmin;

    // Get unique users from API keys for filter dropdown
    const uniqueUsers = React.useMemo(() => {
        if (!apiKeys || !isAdmin) return [];
        const usersMap = new Map<string, { id: string; name: string | null; email: string }>();
        apiKeys.forEach(key => {
            if (!usersMap.has(key.userId)) {
                usersMap.set(key.userId, key.user);
            }
        });
        return Array.from(usersMap.values());
    }, [apiKeys, isAdmin]);

    const createApiKey = useMutation({
        mutationFn: async ({ name, permissions, isGlobal }: { name: string; permissions: string[]; isGlobal: boolean }) => {
            const response = await fetch(`/api/projects/${projectId}/api-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, permissions, isGlobal }),
            });
            if (!response.ok) throw new Error('Failed to create API key');
            return response.json();
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['project-api-keys', projectId], (old: ApiKey[] | undefined) => {
                return old ? [...old, data] : [data];
            });
            setNewKeyData({ key: data.key, id: data.id });
            toast({
                title: 'API Key Created',
                description: 'The new API key has been created successfully.',
            });
        },
    });

    const renameApiKey = useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            const response = await fetch(`/api/projects/${projectId}/api-keys/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!response.ok) throw new Error('Failed to rename API key');
            return response.json();
        },
        onMutate: async ({ id, name }) => {
            await queryClient.cancelQueries({ queryKey: ['project-api-keys', projectId] });
            const previousKeys = queryClient.getQueryData(['project-api-keys', projectId]);

            queryClient.setQueryData(['project-api-keys', projectId], (old: ApiKey[] | undefined) => {
                return old?.map(key =>
                    key.id === id ? { ...key, name } : key
                );
            });

            return { previousKeys };
        },
        onError: (err, variables, context) => {
            if (context?.previousKeys) {
                queryClient.setQueryData(['project-api-keys', projectId], context.previousKeys);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['project-api-keys', projectId] });
        },
    });

    const revokeApiKey = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/projects/${projectId}/api-keys/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRevoked: true }),
            });
            if (!response.ok) throw new Error('Failed to revoke API key');
            return response.json();
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['project-api-keys', projectId] });
            const previousKeys = queryClient.getQueryData(['project-api-keys', projectId]);

            queryClient.setQueryData(['project-api-keys', projectId], (old: ApiKey[] | undefined) => {
                return old?.map(key =>
                    key.id === id ? { ...key, isRevoked: true } : key
                );
            });

            return { previousKeys };
        },
        onError: (err, id, context) => {
            if (context?.previousKeys) {
                queryClient.setQueryData(['project-api-keys', projectId], context.previousKeys);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['project-api-keys', projectId] });
        },
    });

    const deleteApiKey = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/projects/${projectId}/api-keys/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete API key');
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['project-api-keys', projectId] });
            const previousKeys = queryClient.getQueryData(['project-api-keys', projectId]);

            queryClient.setQueryData(['project-api-keys', projectId], (old: ApiKey[] | undefined) => {
                return old?.filter(key => key.id !== id);
            });

            return { previousKeys };
        },
        onError: (err, id, context) => {
            if (context?.previousKeys) {
                queryClient.setQueryData(['project-api-keys', projectId], context.previousKeys);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['project-api-keys', projectId] });
        },
    });

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;

        await createApiKey.mutate({ name: newKeyName, permissions: newKeyPermissions, isGlobal: newKeyIsGlobal });
        setNewKeyName('');
        setNewKeyPermissions(PERMISSION_GROUPS.FULL_ACCESS);
        setNewKeyIsGlobal(false);
        setIsCreateDialogOpen(false);
    };

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        toast({
            title: 'API Key Copied',
            description: 'The API key has been copied to your clipboard.',
        });
    };

    if (isLoading) {
        return (
            <div className="container max-w-screen-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex justify-between items-center">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Skeleton className="h-64 w-full rounded-lg" />
                    </div>
                    <div className="lg:col-span-1">
                        <Skeleton className="h-64 w-full rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-screen-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {/* Page header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">API Keys</h1>
                    <p className="text-muted-foreground mt-1">
                        Create and manage API keys for this project.
                    </p>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <Button variant="outline" size="sm" asChild className="h-9">
                        <Link href="/api-docs" className="flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            API Docs
                            <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                    {canCreateKeys && (
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-9">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Key
                                </Button>
                            </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Create New API Key</DialogTitle>
                                <DialogDescription>
                                    Give your API key a name to help you identify its use.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateKey}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">API Key Name</Label>
                                        <Input
                                            id="name"
                                            value={newKeyName}
                                            onChange={(e) => setNewKeyName(e.target.value)}
                                            placeholder="e.g., Production API Key"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Permissions</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsPermissionsModalOpen(true)}
                                            className="justify-start"
                                        >
                                            <Shield className="h-4 w-4 mr-2" />
                                            {newKeyPermissions.length} permission{newKeyPermissions.length !== 1 ? 's' : ''} selected
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border p-4">
                                        <div className="flex gap-2">
                                            {newKeyIsGlobal ? <Eye className="h-5 w-5 text-muted-foreground mt-0.5" /> : <EyeOff className="h-5 w-5 text-muted-foreground mt-0.5" />}
                                            <div className="space-y-0.5">
                                                <Label htmlFor="isGlobal" className="text-base cursor-pointer">
                                                    Visible to Administrators
                                                </Label>
                                                <p className="text-sm text-muted-foreground">
                                                    {newKeyIsGlobal
                                                        ? 'Administrators can see and manage this key'
                                                        : 'Only you can see and manage this key'}
                                                </p>
                                            </div>
                                        </div>
                                        <Switch
                                            id="isGlobal"
                                            checked={newKeyIsGlobal}
                                            onCheckedChange={setNewKeyIsGlobal}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={!newKeyName.trim()}>
                                        Create Key
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {newKeyData && (
                    <NewKeyAlert
                        keyData={newKeyData}
                        onClose={() => setNewKeyData(null)}
                        onCopy={handleCopyKey}
                    />
                )}
            </AnimatePresence>

            {/* Main Content - Table and SDK Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* API Keys Card */}
                <div className="lg:col-span-2">
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-medium">Your API Keys</CardTitle>
                            {isAdmin && uniqueUsers.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <Select value={userFilter} onValueChange={setUserFilter}>
                                        <SelectTrigger className="w-[200px] h-9">
                                            <SelectValue placeholder="Filter by user" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Users</SelectItem>
                                            {uniqueUsers.map((u) => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.name || u.email}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </CardHeader>

                        {/* API Keys Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="border-b">
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-6">
                                        Name
                                    </th>
                                    {isAdmin && (
                                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-6">
                                            Owner
                                        </th>
                                    )}
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-6">
                                        Visibility
                                    </th>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-6">
                                        Permissions
                                    </th>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-6">
                                        Created
                                    </th>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-6">
                                        Status
                                    </th>
                                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-6">
                                        Actions
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y">
                                {apiKeys && apiKeys.length > 0 ? (
                                    apiKeys.map((key) => (
                                        <tr
                                            key={key.id}
                                            className="hover:bg-muted/50 transition-colors"
                                        >
                                            <td className="py-4 px-6 text-sm font-medium">
                                                {key.name}
                                            </td>
                                            {isAdmin && (
                                                <td className="py-4 px-6 text-sm text-muted-foreground">
                                                    <div>
                                                        <div className="font-medium text-foreground">{key.user.name || 'Unknown'}</div>
                                                        <div className="text-xs">{key.user.email}</div>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="py-4 px-6 text-sm">
                                                {key.isGlobal ? (
                                                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                                                        <Eye className="h-3 w-3 mr-1" />
                                                        Global
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-muted-foreground">
                                                        <EyeOff className="h-3 w-3 mr-1" />
                                                        Private
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {key.permissions.length} permission{key.permissions.length !== 1 ? 's' : ''}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-muted-foreground">
                                                {format(new Date(key.createdAt), 'PPP')}
                                            </td>
                                            <td className="py-4 px-6 text-sm">
                                                {key.isRevoked ? (
                                                    <Badge variant="destructive">Revoked</Badge>
                                                ) : (
                                                    <Badge variant="default">Active</Badge>
                                                )}
                                            </td>
                                            <td className="py-2 px-6 text-sm text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!key.isRevoked && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setRenameKey(key)}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <span className="sr-only">Rename</span>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                                                                    >
                                                                        <span className="sr-only">Revoke</span>
                                                                        <Ban className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Are you sure you want to
                                                                            revoke &ldquo;{key.name}&rdquo;?
                                                                            This will immediately prevent any further use of
                                                                            this key.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => revokeApiKey.mutate(key.id)}
                                                                            className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
                                                                        >
                                                                            Revoke Key
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </>
                                                    )}
                                                    {key.isRevoked && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                                                                >
                                                                    <span className="sr-only">Delete</span>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Are you sure you want to permanently
                                                                        delete &ldquo;{key.name}&rdquo;?
                                                                        This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => deleteApiKey.mutate(key.id)}
                                                                        className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
                                                                    >
                                                                        Delete Key
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isAdmin ? 7 : 6} className="py-16 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="rounded-full p-4 mb-4 bg-muted">
                                                    <Key className="h-8 w-8 text-muted-foreground/60" />
                                                </div>
                                                <h3 className="text-lg font-medium mb-1">No API Keys</h3>
                                                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                                                    {canCreateKeys
                                                        ? 'Create an API key to get started with the Changerawr API.'
                                                        : 'Only administrators can create API keys for this project. Contact an administrator to request an API key.'
                                                    }
                                                </p>
                                                {canCreateKeys && (
                                                    <Button
                                                        onClick={() => setIsCreateDialogOpen(true)}
                                                        size="sm"
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Create Key
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* SDKs Showcase - Right Side */}
                <div className="lg:col-span-1">
                    <SDKShowcaseCompact />
                </div>
            </div>

            <RenameDialog
                open={!!renameKey}
                onOpenChange={(open) => !open && setRenameKey(null)}
                currentName={renameKey?.name ?? ''}
                onRename={async (newName) => {
                    if (!renameKey) return;
                    await renameApiKey.mutateAsync({ id: renameKey.id, name: newName });
                }}
            />

            <PermissionsModal
                open={isPermissionsModalOpen}
                onOpenChange={setIsPermissionsModalOpen}
                selectedPermissions={newKeyPermissions}
                onSave={setNewKeyPermissions}
            />
        </div>
    );
}