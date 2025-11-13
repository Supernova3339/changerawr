'use client';

import { useState } from 'react';
import { Widget } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Code2, Pencil, Trash2, Copy, Check } from 'lucide-react';
import 'dotenv/config';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface WidgetListProps {
    projectId: string;
    initialWidgets: Widget[];
    project: { id: string; name: string; isPublic: boolean };
}

export default function WidgetList({ projectId, initialWidgets, project }: WidgetListProps) {
    const router = useRouter();
    const [widgets, setWidgets] = useState(initialWidgets);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCreateWidget = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch(`/api/integrations/widget/${projectId}/${projectId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.get('name'),
                    variant: formData.get('variant'),
                }),
            });

            if (!res.ok) throw new Error('Failed to create widget');

            const { widget } = await res.json();
            setWidgets([widget, ...widgets]);
            setIsCreateOpen(false);
            toast({ title: 'Success', description: 'Widget created successfully' });
            router.refresh();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to create widget', variant: 'destructive' });
        }
    };

    const handleDeleteWidget = async (widgetId: string) => {
        if (!confirm('Are you sure you want to delete this widget?')) return;

        try {
            const res = await fetch(`/api/integrations/widget/${projectId}/${widgetId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to delete widget');

            setWidgets(widgets.filter((w) => w.id !== widgetId));
            toast({ title: 'Success', description: 'Widget deleted' });
            router.refresh();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete widget', variant: 'destructive' });
        }
    };

    const copyEmbedCode = (widgetId: string) => {
        const code = `<script src="${window.location.origin}/api/integrations/widget/${projectId}/${widgetId}" async></script>`;
        navigator.clipboard.writeText(code);
        setCopiedId(widgetId);
        toast({ title: 'Success', description: 'Embed code copied!' });
        setTimeout(() => setCopiedId(null), 2000);
    };

    const variantColors = {
        classic: 'blue',
        floating: 'green',
        modal: 'purple',
        announcement: 'orange',
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Widgets</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage changelog widgets for {project.name}
                    </p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Widget
                </Button>
            </div>

            {!project.isPublic && (
                <Card className="border-yellow-500/50 bg-yellow-500/5">
                    <CardContent className="pt-6">
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">
                            ⚠️ This project is private. Widgets will not be publicly accessible until you make the project public.
                        </p>
                    </CardContent>
                </Card>
            )}

            {widgets.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Code2 className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No widgets yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Create your first widget to embed your changelog
                        </p>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Widget
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {widgets.map((widget) => (
                        <Card key={widget.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle>{widget.name}</CardTitle>
                                            <Badge
                                                variant="outline"
                                                className={`bg-${variantColors[widget.variant as keyof typeof variantColors]}-500/10`}
                                            >
                                                {widget.variant}
                                            </Badge>
                                            {!widget.isActive && (
                                                <Badge variant="secondary">Inactive</Badge>
                                            )}
                                        </div>
                                        <CardDescription>
                                            Created {new Date(widget.createdAt).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/dashboard/projects/${projectId}/integrations/widget/${widget.id}`)}
                                        >
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteWidget(widget.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Embed Code</Label>
                                    <div className="flex gap-2">
                                        <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono overflow-x-auto">
                                            {`<script src="${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/widget/${projectId}/${widget.id}" async></script>`}
                                        </code>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => copyEmbedCode(widget.id)}
                                        >
                                            {copiedId === widget.id ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Widget</DialogTitle>
                        <DialogDescription>
                            Choose a widget variant and give it a name
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateWidget} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Widget Name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Homepage Widget"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="variant">Variant</Label>
                            <Select name="variant" defaultValue="classic" required>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="classic">Classic - Traditional inline widget</SelectItem>
                                    <SelectItem value="floating">Floating - Button with badge in corner</SelectItem>
                                    <SelectItem value="modal">Modal - Full-screen popup</SelectItem>
                                    <SelectItem value="announcement">Announcement - Top/bottom bar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Create Widget</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
