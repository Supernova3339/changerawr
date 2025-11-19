// components/settings/TagManagement.tsx
'use client';

import React, {useState, useCallback, useEffect} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {motion, AnimatePresence} from 'framer-motion';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
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
import {Skeleton} from '@/components/ui/skeleton';
import {
    Edit2,
    Trash2,
    Save,
    AlertCircle,
    Tag as TagIcon,
    Loader2
} from 'lucide-react';
import {ColorPicker, ColoredTag} from '@/components/changelog/editor/TagColorPicker';
import {toast} from '@/hooks/use-toast';

interface Tag {
    id: string;
    name: string;
    color?: string | null;
    _count?: {
        entries: number;
    };
}

interface TagManagementProps {
    projectId: string;
}

interface CreateTagData {
    name: string;
    color?: string | null;
}

interface UpdateTagData {
    tagId: string;
    name?: string;
    color?: string | null;
}

// Animation variants
const containerVariants = {
    hidden: {opacity: 0},
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: {opacity: 0, y: 20},
    visible: {
        opacity: 1,
        y: 0,
        transition: {duration: 0.3}
    }
};

export default function TagManagement({projectId}: TagManagementProps) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
    const [newTagData, setNewTagData] = useState<CreateTagData>({name: '', color: null});
    const [editTagData, setEditTagData] = useState<UpdateTagData>({tagId: '', name: '', color: null});

    const queryClient = useQueryClient();

    // Fetch tags for the project
    const {data: tags, isLoading, error} = useQuery({
        queryKey: ['project-tags', projectId],
        queryFn: async (): Promise<Tag[]> => {
            const response = await fetch(`/api/projects/${projectId}/changelog/tags?includeUsage=true`);
            if (!response.ok) {
                throw new Error('Failed to fetch tags');
            }
            const data = await response.json();
            return data.tags || [];
        }
    });

    // Create tag mutation
    const createTagMutation = useMutation({
        mutationFn: async (data: CreateTagData): Promise<Tag> => {
            const response = await fetch(`/api/projects/${projectId}/changelog/tags`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create tag');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['project-tags', projectId]});
            setIsCreateDialogOpen(false);
            setNewTagData({name: '', color: null});
            toast({
                title: 'Success',
                description: 'Tag created successfully',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    });

    // Update tag mutation
    const updateTagMutation = useMutation({
        mutationFn: async (data: UpdateTagData): Promise<Tag> => {
            const response = await fetch(`/api/projects/${projectId}/changelog/tags`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update tag');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['project-tags', projectId]});
            setEditingTag(null);
            setEditTagData({tagId: '', name: '', color: null});
            toast({
                title: 'Success',
                description: 'Tag updated successfully',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    });

    // Delete tag mutation
    const deleteTagMutation = useMutation({
        mutationFn: async (tagId: string): Promise<void> => {
            const response = await fetch(`/api/projects/${projectId}/changelog/tags/${tagId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete tag');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['project-tags', projectId]});
            setDeletingTag(null);
            toast({
                title: 'Success',
                description: 'Tag deleted successfully',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    });

    // Handlers
    const handleCreateTag = useCallback(() => {
        if (!newTagData.name.trim()) return;
        createTagMutation.mutate(newTagData);
    }, [newTagData, createTagMutation]);

    const handleEditTag = useCallback((tag: Tag) => {
        setEditingTag(tag);
        setEditTagData({
            tagId: tag.id,
            name: tag.name,
            color: tag.color
        });
    }, []);

    const handleUpdateTag = useCallback(() => {
        if (!editTagData.name?.trim()) return;
        updateTagMutation.mutate(editTagData);
    }, [editTagData, updateTagMutation]);

    const handleDeleteTag = useCallback((tag: Tag) => {
        setDeletingTag(tag);
    }, []);

    const confirmDeleteTag = useCallback(() => {
        if (!deletingTag) return;
        deleteTagMutation.mutate(deletingTag.id);
    }, [deletingTag, deleteTagMutation]);

    // Reset form data when dialogs close
    useEffect(() => {
        if (!isCreateDialogOpen) {
            setNewTagData({name: '', color: null});
        }
    }, [isCreateDialogOpen]);

    useEffect(() => {
        if (!editingTag) {
            setEditTagData({tagId: '', name: '', color: null});
        }
    }, [editingTag]);

    if (error) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center h-32 text-destructive">
                        <AlertCircle className="h-6 w-6 mr-2"/>
                        Failed to load tags: {error instanceof Error ? error.message : 'Unknown error'}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <TagIcon className="h-5 w-5"/>
                                Tag Management
                            </CardTitle>
                            <CardDescription>
                                Manage tags for your changelog entries. Tags help organize and categorize
                                your releases.
                            </CardDescription>
                        </div>
                        {/*<Button*/}
                        {/*    onClick={() => setIsCreateDialogOpen(true)}*/}
                        {/*    className="shrink-0"*/}
                        {/*>*/}
                        {/*    <Plus className="h-4 w-4 mr-2"/>*/}
                        {/*    Create Tag*/}
                        {/*</Button>*/}
                    </div>
                </CardHeader>

                <CardContent>
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from({length: 6}).map((_, i) => (
                                <div key={i} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-6 w-24"/>
                                        <div className="flex gap-1">
                                            <Skeleton className="h-8 w-8"/>
                                            <Skeleton className="h-8 w-8"/>
                                        </div>
                                    </div>
                                    <Skeleton className="h-4 w-32"/>
                                    <Skeleton className="h-5 w-16"/>
                                </div>
                            ))}
                        </div>
                    ) : !tags || tags.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <TagIcon className="h-12 w-12 mx-auto mb-4 opacity-50"/>
                            <h3 className="text-lg font-medium mb-2">No tags yet</h3>
                            <p className="mb-4">Create your first tag to help organize your changelog entries.</p>
                        </div>
                    ) : (
                        <motion.div
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <AnimatePresence>
                                {tags.map((tag) => (
                                    <motion.div
                                        key={tag.id}
                                        variants={itemVariants}
                                        layout
                                        className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {tag.color && (
                                                    <div
                                                        className="h-4 w-4 rounded-full border border-gray-300"
                                                        style={{backgroundColor: tag.color}}
                                                    />
                                                )}
                                                <h4 className="font-medium truncate">{tag.name}</h4>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditTag(tag)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Edit2 className="h-4 w-4"/>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteTag(tag)}
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="text-sm text-muted-foreground">
                                            Used
                                            in {tag._count?.entries || 0} entr{tag._count?.entries === 1 ? 'y' : 'ies'}
                                        </div>

                                        <ColoredTag
                                            name={tag.name}
                                            color={tag.color}
                                            size="sm"
                                            className="w-fit"
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </CardContent>
            </Card>

            {/* Create Tag Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Tag</DialogTitle>
                        <DialogDescription>
                            Add a new tag to organize your changelog entries. You can assign a color to make it visually
                            distinct.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="tag-name">Tag Name</Label>
                            <Input
                                id="tag-name"
                                value={newTagData.name}
                                onChange={(e) => setNewTagData(prev => ({...prev, name: e.target.value}))}
                                placeholder="Enter tag name..."
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Tag Color (Optional)</Label>
                            <ColorPicker
                                value={newTagData.color}
                                onChange={(color) => setNewTagData(prev => ({...prev, color}))}
                                placeholder="Choose a color for this tag"
                            />
                        </div>

                        {newTagData.name && (
                            <div className="space-y-2">
                                <Label>Preview</Label>
                                <div>
                                    <ColoredTag
                                        name={newTagData.name}
                                        color={newTagData.color}
                                        size="default"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateDialogOpen(false)}
                            disabled={createTagMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateTag}
                            disabled={!newTagData.name.trim() || createTagMutation.isPending}
                        >
                            {createTagMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                            ) : (
                                <Save className="h-4 w-4 mr-2"/>
                            )}
                            Create Tag
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Tag Dialog */}
            <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Tag</DialogTitle>
                        <DialogDescription>
                            Update the tag name and color. Changes will apply to all existing entries using this tag.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-tag-name">Tag Name</Label>
                            <Input
                                id="edit-tag-name"
                                value={editTagData.name || ''}
                                onChange={(e) => setEditTagData(prev => ({...prev, name: e.target.value}))}
                                placeholder="Enter tag name..."
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTag()}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Tag Color</Label>
                            <ColorPicker
                                value={editTagData.color}
                                onChange={(color) => setEditTagData(prev => ({...prev, color}))}
                                placeholder="Choose a color for this tag"
                            />
                        </div>

                        {editTagData.name && (
                            <div className="space-y-2">
                                <Label>Preview</Label>
                                <div>
                                    <ColoredTag
                                        name={editTagData.name}
                                        color={editTagData.color}
                                        size="default"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingTag(null)}
                            disabled={updateTagMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateTag}
                            disabled={!editTagData.name?.trim() || updateTagMutation.isPending}
                        >
                            {updateTagMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                            ) : (
                                <Save className="h-4 w-4 mr-2"/>
                            )}
                            Update Tag
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingTag} onOpenChange={(open) => !open && setDeletingTag(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the tag &ldquo;{deletingTag?.name}&rdquo;?
                            This will remove it from all {deletingTag?._count?.entries || 0} changelog entries that use
                            it.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteTagMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteTag}
                            disabled={deleteTagMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteTagMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2"/>
                            )}
                            Delete Tag
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}