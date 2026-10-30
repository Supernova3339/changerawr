'use client'

/**
 * Revamped User Management Page
 *
 * Features:
 * - User statistics dashboard
 * - Advanced filtering and sorting
 * - Bulk operations (delete, role change, export)
 * - User activity tracking
 * - Invitation management
 * - Export to CSV
 * - Better UX with loading states
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
    DropdownMenuLabel,
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
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
    User,
    UserPlus,
    Copy,
    MoreVertical,
    Pencil,
    Trash2,
    Search,
    X,
    Shield,
    Check,
    Download,
    Filter,
    ArrowUpDown,
    Users,
    UserCheck,
    Clock,
    Mail,
    Trash,
    RefreshCw,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Role } from '@prisma/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loading, LoadingPage } from '@/components/ui/loading';

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

type SortField = 'name' | 'email' | 'role' | 'createdAt' | 'lastLoginAt';
type SortDirection = 'asc' | 'desc';

export default function UsersPageRevamped() {
    const queryClient = useQueryClient();

    // Dialog states
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [newInvitationUrl, setNewInvitationUrl] = useState<string | null>(null);

    // Form states
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('STAFF');
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState<Role>('STAFF');
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

    // Filter and sort states
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<SortField>('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Bulk operations
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

    // Fetch users
    const { data: users, isLoading } = useQuery<UserData[]>({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await fetch('/api/admin/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            return data.filter((user: UserData) => !user.email.endsWith('@changerawr.sys'));
        },
    });

    // Fetch invitations
    const { data: invitations, isLoading: isLoadingInvitations } = useQuery<InvitationLink[]>({
        queryKey: ['invitations'],
        queryFn: async () => {
            const response = await fetch('/api/admin/users/invitations');
            if (!response.ok) throw new Error('Failed to fetch invitations');
            return response.json();
        },
    });

    // Statistics
    const stats = useMemo(() => {
        if (!users) return null;

        const now = new Date();
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        return {
            total: users.length,
            admins: users.filter((u) => u.role === 'ADMIN').length,
            staff: users.filter((u) => u.role === 'STAFF').length,
            activeLastWeek: users.filter(
                (u) => u.lastLoginAt && new Date(u.lastLoginAt) > last7Days
            ).length,
            activeLastMonth: users.filter(
                (u) => u.lastLoginAt && new Date(u.lastLoginAt) > last30Days
            ).length,
            newLastMonth: users.filter((u) => new Date(u.createdAt) > last30Days).length,
            neverLoggedIn: users.filter((u) => !u.lastLoginAt).length,
            pendingInvitations: invitations?.filter((i) => !i.usedAt && new Date(i.expiresAt) > now)
                .length || 0,
        };
    }, [users, invitations]);

    // Filtered and sorted users
    const filteredUsers = useMemo(() => {
        if (!users) return [];

        let filtered = users.filter((user) => {
            const matchesSearch =
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());

            const matchesRole = roleFilter === 'all' || user.role === roleFilter;

            return matchesSearch && matchesRole;
        });

        // Sort
        filtered.sort((a, b) => {
            let aVal: any = a[sortField];
            let bVal: any = b[sortField];

            if (sortField === 'name') {
                aVal = aVal?.toLowerCase() || '';
                bVal = bVal?.toLowerCase() || '';
            } else if (sortField === 'createdAt' || sortField === 'lastLoginAt') {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            }

            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        return filtered;
    }, [users, searchTerm, roleFilter, sortField, sortDirection]);

    // Mutations
    const updateUser = useMutation({
        mutationFn: async ({ userId, data }: { userId: string; data: { name?: string; role?: Role } }) => {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update user');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast({ title: 'User Updated', description: 'The user has been updated successfully.' });
            setIsEditDialogOpen(false);
        },
        onError: (error: Error) => {
            toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
        },
    });

    const deleteUser = useMutation({
        mutationFn: async (userId: string) => {
            const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete user');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast({ title: 'User Deleted', description: 'The user has been deleted successfully.' });
            setIsDeleteDialogOpen(false);
        },
        onError: (error: Error) => {
            toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' });
        },
    });

    const createInvitation = useMutation({
        mutationFn: async (data: { email: string; role: Role }) => {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            toast({
                title: 'Invitation Created',
                description: 'The invitation link has been created successfully.',
            });
            setIsInviteDialogOpen(false);
        },
        onError: (error: Error) => {
            toast({ title: 'Invitation Failed', description: error.message, variant: 'destructive' });
        },
    });

    const revokeInvitation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/admin/users/invitations/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to revoke invitation');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            toast({ title: 'Invitation Revoked', description: 'The invitation link has been revoked.' });
        },
    });

    // Handlers
    const handleEditUser = (user: UserData) => {
        setSelectedUser(user);
        setEditName(user.name || '');
        setEditRole(user.role);
        setIsEditDialogOpen(true);
    };

    const handleDeleteUser = (user: UserData) => {
        setSelectedUser(user);
        setIsDeleteDialogOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;

        const updates: { name?: string; role?: Role } = {};
        if (editName !== (selectedUser.name || '')) updates.name = editName;
        if (editRole !== selectedUser.role) updates.role = editRole;

        if (Object.keys(updates).length > 0) {
            await updateUser.mutateAsync({ userId: selectedUser.id, data: updates });
        }
    };

    const handleCreateInvitation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        await createInvitation.mutateAsync({ email: inviteEmail, role: inviteRole });
        setInviteEmail('');
    };

    const handleCopyInvitationLink = (url: string) => {
        navigator.clipboard.writeText(url);
        toast({ title: 'Link Copied', description: 'The invitation link has been copied to your clipboard.' });
    };

    const toggleUserSelection = (userId: string) => {
        const newSelection = new Set(selectedUsers);
        if (newSelection.has(userId)) {
            newSelection.delete(userId);
        } else {
            newSelection.add(userId);
        }
        setSelectedUsers(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === filteredUsers.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
        }
    };

    const handleBulkDelete = async () => {
        // Delete selected users
        const promises = Array.from(selectedUsers).map((id) => deleteUser.mutateAsync(id));
        await Promise.all(promises);
        setSelectedUsers(new Set());
        setIsBulkDeleteDialogOpen(false);
        toast({
            title: 'Users Deleted',
            description: `${selectedUsers.size} user(s) have been deleted successfully.`,
        });
    };

    const handleExportUsers = () => {
        if (!users) return;

        const csv = [
            ['Name', 'Email', 'Role', 'Created At', 'Last Login'],
            ...users.map((u) => [
                u.name || '',
                u.email,
                u.role,
                format(new Date(u.createdAt), 'PPpp'),
                u.lastLoginAt ? format(new Date(u.lastLoginAt), 'PPpp') : 'Never',
            ]),
        ]
            .map((row) => row.map((cell) => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast({ title: 'Export Complete', description: 'Users have been exported to CSV.' });
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    if (isLoading) {
        return <LoadingPage message="Loading users..." />;
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground mt-2">Manage team members, permissions, and invitations.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportUsers}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button onClick={() => setIsInviteDialogOpen(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite User
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.admins} admin{stats.admins !== 1 ? 's' : ''}, {stats.staff} staff
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.activeLastWeek}</div>
                            <p className="text-xs text-muted-foreground">
                                Active in the last 7 days
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.newLastMonth}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.neverLoggedIn} never logged in
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
                            <Mail className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.pendingInvitations}</div>
                            <p className="text-xs text-muted-foreground">
                                Active invitation links
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

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
                        {invitations?.filter((i) => !i.usedAt)?.length ? (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                {invitations.filter((i) => !i.usedAt).length}
                            </span>
                        ) : null}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-4">
                    {/* Filters and Search */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-1 items-center gap-2">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            {searchTerm && (
                                <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Filter by role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="STAFF">Staff</SelectItem>
                                </SelectContent>
                            </Select>

                            {selectedUsers.size > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                                >
                                    <Trash className="h-4 w-4 mr-2" />
                                    Delete ({selectedUsers.size})
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Users Table */}
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={
                                                    filteredUsers.length > 0 &&
                                                    selectedUsers.size === filteredUsers.length
                                                }
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                                            <div className="flex items-center gap-2">
                                                User
                                                {sortField === 'name' && <ArrowUpDown className="h-4 w-4" />}
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => handleSort('role')}>
                                            <div className="flex items-center gap-2">
                                                Role
                                                {sortField === 'role' && <ArrowUpDown className="h-4 w-4" />}
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                                            <div className="flex items-center gap-2">
                                                Joined
                                                {sortField === 'createdAt' && <ArrowUpDown className="h-4 w-4" />}
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => handleSort('lastLoginAt')}>
                                            <div className="flex items-center gap-2">
                                                Last Login
                                                {sortField === 'lastLoginAt' && <ArrowUpDown className="h-4 w-4" />}
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedUsers.has(user.id)}
                                                    onCheckedChange={() => toggleUserSelection(user.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{user.name || 'No name'}</div>
                                                        <div className="text-sm text-muted-foreground">{user.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'secondary'}>
                                                    {user.role === 'ADMIN' && <Shield className="h-3 w-3 mr-1" />}
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{format(new Date(user.createdAt), 'PP')}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {user.lastLoginAt ? (
                                                    <>
                                                        <div className="text-sm">
                                                            {format(new Date(user.lastLoginAt), 'PP')}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {formatDistanceToNow(new Date(user.lastLoginAt), {
                                                                addSuffix: true,
                                                            })}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Never</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            Edit User
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600 dark:text-red-400"
                                                            onClick={() => handleDeleteUser(user)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete User
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <User className="h-12 w-12 text-muted-foreground mb-4" />
                                                    <h3 className="font-medium mb-1">No Users Found</h3>
                                                    <p className="text-sm text-muted-foreground mb-4">
                                                        {searchTerm || roleFilter !== 'all'
                                                            ? 'No users match your search criteria.'
                                                            : 'Start by inviting team members.'}
                                                    </p>
                                                    {!searchTerm && roleFilter === 'all' && (
                                                        <Button onClick={() => setIsInviteDialogOpen(true)} size="sm">
                                                            <UserPlus className="h-4 w-4 mr-2" />
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

                    {filteredUsers.length > 0 && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div>
                                Showing {filteredUsers.length} of {users?.length || 0} user(s)
                            </div>
                            {selectedUsers.size > 0 && <div>{selectedUsers.size} user(s) selected</div>}
                        </div>
                    )}
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
                            {isLoadingInvitations ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loading message="Loading invitations..." />
                                </div>
                            ) : (
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
                                                    <TableCell className="font-medium">{invitation.email}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={invitation.role === 'ADMIN' ? 'destructive' : 'secondary'}>
                                                            {invitation.role === 'ADMIN' && <Shield className="h-3 w-3 mr-1" />}
                                                            {invitation.role}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">{format(new Date(invitation.createdAt), 'PP')}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">{format(new Date(invitation.expiresAt), 'PP')}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                isActive
                                                                    ? 'default'
                                                                    : isUsed
                                                                    ? 'secondary'
                                                                    : 'destructive'
                                                            }
                                                        >
                                                            {isActive && <Check className="h-3 w-3 mr-1" />}
                                                            {isActive ? 'Active' : isUsed ? 'Used' : 'Expired'}
                                                        </Badge>
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
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
                                                                                <AlertDialogDescription>
                                                                                    This will invalidate the invitation link for {invitation.email}.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction
                                                                                    onClick={() => revokeInvitation.mutate(invitation.id)}
                                                                                    className="bg-red-600 hover:bg-red-700"
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
                                                        <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                                                        <h3 className="font-medium mb-1">No Pending Invitations</h3>
                                                        <p className="text-sm text-muted-foreground mb-4">
                                                            Create an invitation to add new team members.
                                                        </p>
                                                        <Button
                                                            onClick={() => setIsInviteDialogOpen(true)}
                                                            size="sm"
                                                        >
                                                            <UserPlus className="h-4 w-4 mr-2" />
                                                            Invite User
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Dialogs */}
            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>Update user details and permissions.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="User's name" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={editRole} onValueChange={(value) => setEditRole(value as Role)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="STAFF">Staff</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateUser} disabled={updateUser.isPending}>
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

            {/* Bulk Delete Dialog */}
            <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Multiple Users</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedUsers.size} user(s)? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            Delete Users
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Invite User Dialog */}
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite New User</DialogTitle>
                        <DialogDescription>Create an invitation link for a new user to join.</DialogDescription>
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
                                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as Role)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STAFF">Staff</SelectItem>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={!inviteEmail.trim() || createInvitation.isPending}>
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
                                    Copy this invitation link and share it with the user. The link will expire in 7 days.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                <code className="flex-1 text-sm break-all">{newInvitationUrl}</code>
                                <Button size="sm" variant="ghost" onClick={() => handleCopyInvitationLink(newInvitationUrl)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogAction onClick={() => setNewInvitationUrl(null)}>Done</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
