'use client'

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { API_PERMISSIONS, PERMISSION_GROUPS } from '@/lib/api/permissions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface PermissionsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedPermissions: string[];
    onSave: (permissions: string[]) => void;
}

export function PermissionsModal({
    open,
    onOpenChange,
    selectedPermissions,
    onSave,
}: PermissionsModalProps) {
    const [permissions, setPermissions] = useState<string[]>(selectedPermissions);

    // Sync local state when modal opens or selectedPermissions changes
    React.useEffect(() => {
        if (open) {
            setPermissions(selectedPermissions);
        }
    }, [open, selectedPermissions]);

    const handleToggle = (permission: string) => {
        setPermissions(prev =>
            prev.includes(permission)
                ? prev.filter(p => p !== permission)
                : [...prev, permission]
        );
    };

    const handleSelectGroup = (group: string[]) => {
        setPermissions(group);
    };

    const handleSave = () => {
        onSave(permissions);
        onOpenChange(false);
    };

    const permissionCategories = {
        'Changelog Operations': [
            { key: 'CHANGELOG_READ', label: 'Read Entries', description: 'Fetch changelog entries and metadata' },
            { key: 'CHANGELOG_WRITE', label: 'Write Entries', description: 'Create and update changelog entries' },
            { key: 'CHANGELOG_PUBLISH', label: 'Publish Entries', description: 'Publish or unpublish entries' },
            { key: 'CHANGELOG_DELETE', label: 'Delete Entries', description: 'Delete changelog entries' },
        ],
        'Project Management': [
            { key: 'PROJECT_READ', label: 'Read Project', description: 'Read project settings and configuration' },
            { key: 'PROJECT_WRITE', label: 'Write Project', description: 'Modify project settings' },
        ],
        'Analytics': [
            { key: 'ANALYTICS_READ', label: 'Read Analytics', description: 'Access analytics data and metrics' },
        ],
        'Subscribers': [
            { key: 'SUBSCRIBERS_READ', label: 'Read Subscribers', description: 'List and view subscribers' },
            { key: 'SUBSCRIBERS_WRITE', label: 'Write Subscribers', description: 'Add, update, or remove subscribers' },
        ],
        'Email': [
            { key: 'EMAIL_SEND', label: 'Send Emails', description: 'Trigger email notifications for entries' },
        ],
        'GitHub Integration': [
            { key: 'GITHUB_READ', label: 'Read GitHub', description: 'Read GitHub integration settings' },
            { key: 'GITHUB_WRITE', label: 'Write GitHub', description: 'Modify GitHub integration and generate entries' },
        ],
        'Tags': [
            { key: 'TAGS_READ', label: 'Read Tags', description: 'List and view tags' },
            { key: 'TAGS_WRITE', label: 'Write Tags', description: 'Create, update, or delete tags' },
        ],
        'Webhooks': [
            { key: 'WEBHOOKS_READ', label: 'Read Webhooks', description: 'List webhook configurations (future)' },
            { key: 'WEBHOOKS_WRITE', label: 'Write Webhooks', description: 'Create, update, or delete webhooks (future)' },
        ],
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Configure Permissions</DialogTitle>
                    <DialogDescription>
                        Select which API operations this key can perform.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Quick Select Groups */}
                    <div>
                        <Label className="text-sm font-medium mb-2 block">Quick Select</Label>
                        <div className="flex gap-2 flex-wrap">
                            <Badge
                                variant="outline"
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                onClick={() => handleSelectGroup([...PERMISSION_GROUPS.READ_ONLY])}
                            >
                                Read Only
                            </Badge>
                            <Badge
                                variant="outline"
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                onClick={() => handleSelectGroup([...PERMISSION_GROUPS.CHANGELOG_MANAGER])}
                            >
                                Changelog Manager
                            </Badge>
                            <Badge
                                variant="outline"
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                onClick={() => handleSelectGroup([...PERMISSION_GROUPS.FULL_ACCESS])}
                            >
                                Full Access
                            </Badge>
                            <Badge
                                variant="outline"
                                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => setPermissions([])}
                            >
                                Clear All
                            </Badge>
                        </div>
                    </div>

                    <Separator />

                    {/* Permission Categories */}
                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-6">
                            {Object.entries(permissionCategories).map(([category, perms]) => (
                                <div key={category}>
                                    <h4 className="text-sm font-semibold mb-3">{category}</h4>
                                    <div className="space-y-3 ml-2">
                                        {perms.map(perm => {
                                            const permValue = API_PERMISSIONS[perm.key as keyof typeof API_PERMISSIONS];
                                            return (
                                                <div key={perm.key} className="flex items-start space-x-3">
                                                    <Checkbox
                                                        id={perm.key}
                                                        checked={permissions.includes(permValue)}
                                                        onCheckedChange={() => handleToggle(permValue)}
                                                    />
                                                    <div className="flex-1">
                                                        <Label
                                                            htmlFor={perm.key}
                                                            className="text-sm font-medium cursor-pointer"
                                                        >
                                                            {perm.label}
                                                        </Label>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {perm.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <div className="flex items-center justify-between w-full">
                        <span className="text-sm text-muted-foreground">
                            {permissions.length} permission{permissions.length !== 1 ? 's' : ''} selected
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave}>
                                Save Permissions
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
