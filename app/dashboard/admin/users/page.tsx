'use client'

import React, {useState} from 'react';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Skeleton} from '@/components/ui/skeleton';
import {toast} from '@/hooks/use-toast';
import {
    User, UserPlus, Copy, MoreVertical, Pencil,
    Trash2, Search, X, Shield, Check
} from 'lucide-react';
import {format} from 'date-fns';
import {motion, AnimatePresence} from 'framer-motion';
import {Role} from '@prisma/client';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';

interface UserData {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    createdAt: string;
    lastLoginAt: string | null;
}

interface InvitationLink {
    id: string;
    email: string;
    role: Role;
    token: string;
    createdAt: string;
    expiresAt: string;
    usedAt: string | null;
}

export default function UsersPage() {
    const queryClient = useQueryClient();
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('STAFF');
    const [newInvitationUrl, setNewInvitationUrl] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState<Role>('STAFF');

    const {data: users, isLoading} = useQuery<UserData[]>({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await fetch('/api/admin/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            return data.filter((user: UserData) => !user.email.endsWith('@changerawr.sys'));
        },
    });

    const {data: invitations} = useQuery<InvitationLink[]>({
        queryKey: ['invitations'],
        queryFn: async () => {
            const response = await fetch('/api/admin/users/invitations');
            if (!response.ok) throw new Error('Failed to fetch invitations');
            return response.json();
        },
    });

    const updateUser = useMutation<
        UserData,
        Error,
        { userId: string; data: { name?: string; role?: Role } }
    >({
        mutationFn: async ({userId, data}: { userId: string; data: { name?: string; role?: Role } }) => {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update user');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['users']});
            toast({
                title: 'User Updated',
                description: 'The user has been updated successfully.',
            });
            setIsEditDialogOpen(false);
        },
        onError: (error: Error) => {
            toast({
                title: 'Update Failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const deleteUser = useMutation<
        { message: string },
        Error,
        string
    >({
        mutationFn: async (userId: string) => {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete user');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['users']});
            toast({
                title: 'User Deleted',
                description: 'The user has been deleted successfully.',
            });
            setIsDeleteDialogOpen(false);
        },
        onError: (error: Error) => {
            toast({
                title: 'Deletion Failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const createInvitation = useMutation<
        { invitation: { url: string } },
        Error,
        { email: string; role: Role }
    >({
        mutationFn: async (data: { email: string; role: Role }) => {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create invitation');
            }
            return response.json();
        },
        onSuccess: (data) => {
            setNewInvitationUrl(data.invitation.url);
            queryClient.invalidateQueries({queryKey: ['invitations']});
            toast({
                title: 'Invitation Created',
                description: 'The invitation link has been created successfully.',
            });
            setIsInviteDialogOpen(false);
        },
        onError: (error: Error) => {
            toast({
                title: 'Invitation Failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const revokeInvitation = useMutation<
        { message: string },
        Error,
        string
    >({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/admin/users/invitations/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to revoke invitation');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['invitations']});
            toast({
                title: 'Invitation Revoked',
                description: 'The invitation link has been revoked.',
            });
        },
    });

    const handleEditUser = (user: UserData) => {
        setSelectedUser(user);
        setEditName(user.name || '');
        setEditRole(user.role);
        setIsEditDialogOpen(true);
    };

    const handleDeleteUser = (user: UserData) => {
        // Get current user's ID from the auth context
        const currentUserEmail = users?.find(u => u.role === 'ADMIN')?.email;

        if (user.email === currentUserEmail) {
            toast({
                title: "Cannot Delete User",
                description: "You cannot delete your own account.",
                variant: "destructive",
            });
            return;
        }

        setSelectedUser(user);
        setIsDeleteDialogOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;

        const updates: { name?: string; role?: Role } = {};
        if (editName !== (selectedUser.name || '')) updates.name = editName;
        if (editRole !== selectedUser.role) updates.role = editRole;

        if (Object.keys(updates).length > 0) {
            await updateUser.mutate({userId: selectedUser.id, data: updates});
        }
    };

    const handleCreateInvitation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        await createInvitation.mutate({
            email: inviteEmail,
            role: inviteRole,
        });
        setInviteEmail('');
    };

    const handleCopyInvitationLink = (url: string) => {
        navigator.clipboard.writeText(url);
        toast({
            title: 'Link Copied',
            description: 'The invitation link has been copied to your clipboard.',
        });
    };

    const filteredUsers = users?.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-[200px]"/>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-7 w-[150px]"/>
                        <Skeleton className="h-4 w-[250px] mt-2"/>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Array.from({length: 5}).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full"/>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            className="space-y-6"
        >
            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user details and permissions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="User's name"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={editRole}
                                onValueChange={(value) => setEditRole(value as Role)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="STAFF">Staff</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateUser}
                            disabled={updateUser.isPending}
                        >
                            {updateUser.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete User Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedUser?.email}? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => selectedUser && deleteUser.mutate(selectedUser.id)}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {deleteUser.isPending ? 'Deleting...' : 'Delete User'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Invite User Dialog */}
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite New User</DialogTitle>
                        <DialogDescription>
                            Create an invitation link for a new user to join.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateInvitation}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    value={inviteRole}
                                    onValueChange={(value) => setInviteRole(value as Role)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STAFF">Staff</SelectItem>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={!inviteEmail.trim() || createInvitation.isPending}
                            >
                                {createInvitation.isPending ? 'Creating...' : 'Create Invitation'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* New Invitation URL Alert */}
            <AnimatePresence>
                {newInvitationUrl && (
                    <AlertDialog open onOpenChange={() => setNewInvitationUrl(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Invitation Link Created</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Copy this invitation link and share it with the user. The link will expire in 7
                                    days.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                <code className="flex-1 text-sm break-all">{newInvitationUrl}</code>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCopyInvitationLink(newInvitationUrl)}
                                >
                                    <Copy className="h-4 w-4"/>
                                </Button>
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogAction onClick={() => setNewInvitationUrl(null)}>
                                    Done
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </AnimatePresence>

            {/* Page Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage team members and their permissions.
                    </p>
                </div>
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2"/>
                    Invite User
                </Button>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                    <Input
                        placeholder="Search users by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                {searchTerm && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchTerm('')}
                        className="px-2"
                    >
                        <X className="h-4 w-4"/>
                    </Button>
                )}
            </div>

            {/* Main Content */}
            <Tabs defaultValue="users" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="users" className="relative">
                        Users
                        {users?.length ? (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                {users.length}
                            </span>
                        ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="invitations" className="relative">
                        Pending Invitations
                        {invitations?.filter(i => !i.usedAt)?.length ? (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                {invitations.filter(i => !i.usedAt).length}
                            </span>
                        ) : null}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>Users</CardTitle>
                            <CardDescription>
                                Manage user accounts and their permissions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead>Last Login</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers?.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                        <User className="h-4 w-4 text-muted-foreground"/>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{user.name || 'No name'}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        user.role === 'ADMIN'
                                                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                    }`}
                                                >
                                                    {user.role === 'ADMIN' && <Shield className="h-3 w-3"/>}
                                                    {user.role}
                                                </span>
                                            </TableCell>
                                            <TableCell>{format(new Date(user.createdAt), 'PP')}</TableCell>
                                            <TableCell>
                                                {user.lastLoginAt
                                                    ? format(new Date(user.lastLoginAt), 'PP')
                                                    : 'Never'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="h-4 w-4"/>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                                            <Pencil className="h-4 w-4 mr-2"/>
                                                            Edit User
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator/>
                                                        <DropdownMenuItem
                                                            className="text-red-600 dark:text-red-400"
                                                            onClick={() => handleDeleteUser(user)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2"/>
                                                            Delete User
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!filteredUsers || filteredUsers.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <User className="h-12 w-12 text-muted-foreground mb-4"/>
                                                    <h3 className="font-medium mb-1">No Users Found</h3>
                                                    <p className="text-sm text-muted-foreground mb-4">
                                                        {searchTerm
                                                            ? 'No users match your search criteria.'
                                                            : 'Start by inviting team members.'}
                                                    </p>
                                                    {!searchTerm && (
                                                        <Button
                                                            onClick={() => setIsInviteDialogOpen(true)}
                                                            size="sm"
                                                        >
                                                            <UserPlus className="h-4 w-4 mr-2"/>
                                                            Invite User
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invitations">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Invitations</CardTitle>
                            <CardDescription>
                                Manage outstanding invitation links.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Expires</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invitations?.map((invitation) => {
                                        const isExpired = new Date(invitation.expiresAt) < new Date();
                                        const isUsed = !!invitation.usedAt;
                                        const isActive = !isExpired && !isUsed;

                                        return (
                                            <TableRow key={invitation.id}>
                                                <TableCell>{invitation.email}</TableCell>
                                                <TableCell>
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            invitation.role === 'ADMIN'
                                                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                        }`}
                                                    >
                                                        {invitation.role === 'ADMIN' && <Shield className="h-3 w-3"/>}
                                                        {invitation.role}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{format(new Date(invitation.createdAt), 'PP')}</TableCell>
                                                <TableCell>{format(new Date(invitation.expiresAt), 'PP')}</TableCell>
                                                <TableCell>
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            isActive
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                : isUsed
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                        }`}
                                                    >
                                                        {isActive && <Check className="h-3 w-3"/>}
                                                        {isActive ? 'Active' : isUsed ? 'Used' : 'Expired'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {isActive && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleCopyInvitationLink(
                                                                        `${window.location.origin}/register/${invitation.token}`
                                                                    )}
                                                                >
                                                                    <Copy className="h-4 w-4"/>
                                                                </Button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
                                                                        >
                                                                            <Trash2 className="h-4 w-4"/>
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Revoke
                                                                                Invitation</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                This will invalidate the invitation link
                                                                                for {invitation.email}.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction
                                                                                onClick={() => revokeInvitation.mutate(invitation.id)}
                                                                                className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                                                                            >
                                                                                Revoke Invitation
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {(!invitations || invitations.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <User className="h-12 w-12 text-muted-foreground mb-4"/>
                                                    <h3 className="font-medium mb-1">No Pending Invitations</h3>
                                                    <p className="text-sm text-muted-foreground mb-4">
                                                        Create an invitation to add new team members.
                                                    </p>
                                                    <Button
                                                        onClick={() => setIsInviteDialogOpen(true)}
                                                        size="sm"
                                                    >
                                                        <UserPlus className="h-4 w-4 mr-2"/>
                                                        Invite User
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </motion.div>
    );
}