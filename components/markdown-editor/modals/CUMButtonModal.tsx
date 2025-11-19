'use client';

import React, {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Switch} from '@/components/ui/switch';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {
    Link,
    Eye,
    EyeOff,
    RotateCcw,
    Sparkles,
    MousePointer,
    ExternalLink
} from 'lucide-react';
import {renderMarkdown} from '@/lib/services/core/markdown/useCustomExtensions';
import {CUMModalProps, CUMButtonConfig} from '@/components/markdown-editor/types/cum-extensions';

export const CUMButtonModal: React.FC<CUMModalProps> = ({
                                                            isOpen,
                                                            onClose,
                                                            onInsert,
                                                        }) => {
    const [config, setConfig] = useState<CUMButtonConfig>({
        text: 'Click Me',
        url: 'https://example.com',
        style: 'primary',
        size: 'md',
        target: '_blank',
        disabled: false,
    });

    const [showPreview, setShowPreview] = useState(true);

    const handleInsert = () => {
        const options = [];
        if (config.style !== 'primary') options.push(config.style);
        if (config.size !== 'md') options.push(config.size);
        if (config.disabled) options.push('disabled');
        if (config.target !== '_blank') options.push('self');

        const optionsString = options.length > 0 ? `{${options.join(',')}}` : '';
        const markdown = `[button:${config.text}](${config.url})${optionsString}`;

        onInsert(markdown);
        onClose();
    };

    const handleReset = () => {
        setConfig({
            text: 'Click Me',
            url: 'https://example.com',
            style: 'primary',
            size: 'md',
            target: '_blank',
            disabled: false,
        });
    };

    const generateMarkdown = () => {
        const options = [];
        if (config.style !== 'primary') options.push(config.style);
        if (config.size !== 'md') options.push(config.size);
        if (config.disabled) options.push('disabled');
        if (config.target !== '_blank') options.push('self');

        const optionsString = options.length > 0 ? `{${options.join(',')}}` : '';
        return `[button:${config.text}](${config.url})${optionsString}`;
    };

    const getStyleColor = (style: string) => {
        const colors: Record<string, string> = {
            default: 'bg-slate-100 text-slate-800',
            primary: 'bg-blue-100 text-blue-800',
            secondary: 'bg-gray-100 text-gray-800',
            success: 'bg-green-100 text-green-800',
            danger: 'bg-red-100 text-red-800',
            outline: 'bg-purple-100 text-purple-800',
            ghost: 'bg-orange-100 text-orange-800'
        };
        return colors[style] || colors.primary;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <MousePointer className="h-5 w-5 text-blue-600 dark:text-blue-400"/>
                        </div>
                        <div>
                            <div className="text-xl font-semibold">Create Interactive Button</div>
                            <div className="text-sm text-muted-foreground font-normal">
                                Design a clickable button with custom styling and behavior
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 py-4">
                    {/* Configuration Panel */}
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-blue-500"/>
                                <Label className="text-sm font-medium">Content & Destination</Label>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor="button-text" className="text-xs text-muted-foreground">
                                        Button Text
                                    </Label>
                                    <Input
                                        id="button-text"
                                        value={config.text}
                                        onChange={(e) => setConfig(prev => ({...prev, text: e.target.value}))}
                                        placeholder="Enter button text..."
                                        className="h-9"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="button-url" className="text-xs text-muted-foreground">
                                        URL Destination
                                    </Label>
                                    <Input
                                        id="button-url"
                                        type="url"
                                        value={config.url}
                                        onChange={(e) => setConfig(prev => ({...prev, url: e.target.value}))}
                                        placeholder="https://example.com"
                                        className="h-9"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator/>

                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Appearance</Label>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Style</Label>
                                    <Select
                                        value={config.style}
                                        onValueChange={(value) =>
                                            setConfig(prev => ({...prev, style: value as CUMButtonConfig['style']}))
                                        }
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">Default</SelectItem>
                                            <SelectItem value="primary">Primary</SelectItem>
                                            <SelectItem value="secondary">Secondary</SelectItem>
                                            <SelectItem value="success">Success</SelectItem>
                                            <SelectItem value="danger">Danger</SelectItem>
                                            <SelectItem value="outline">Outline</SelectItem>
                                            <SelectItem value="ghost">Ghost</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-xs text-muted-foreground">Size</Label>
                                    <Select
                                        value={config.size}
                                        onValueChange={(value) =>
                                            setConfig(prev => ({...prev, size: value as CUMButtonConfig['size']}))
                                        }
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sm">Small</SelectItem>
                                            <SelectItem value="md">Medium</SelectItem>
                                            <SelectItem value="lg">Large</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <Separator/>

                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Behavior</Label>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ExternalLink className="h-3 w-3 text-muted-foreground"/>
                                        <Label htmlFor="new-tab" className="text-xs">Open in new tab</Label>
                                    </div>
                                    <Switch
                                        id="new-tab"
                                        checked={config.target === '_blank'}
                                        onCheckedChange={(checked) =>
                                            setConfig(prev => ({...prev, target: checked ? '_blank' : '_self'}))
                                        }
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full border border-muted-foreground/30"/>
                                        <Label htmlFor="disabled" className="text-xs">Disabled state</Label>
                                    </div>
                                    <Switch
                                        id="disabled"
                                        checked={config.disabled}
                                        onCheckedChange={(checked) =>
                                            setConfig(prev => ({...prev, disabled: checked}))
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview Panel */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-green-500"/>
                                <Label className="text-sm font-medium">Live Preview</Label>
                                <Badge variant="secondary" className={getStyleColor(config.style)}>
                                    {config.style}
                                </Badge>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPreview(!showPreview)}
                            >
                                {showPreview ? <EyeOff className="h-3 w-3"/> : <Eye className="h-3 w-3"/>}
                            </Button>
                        </div>

                        <Card className="border-2 border-dashed">
                            <CardContent className="p-6">
                                {showPreview ? (
                                    <div className="space-y-4">
                                        <div className="text-xs text-muted-foreground text-center">
                                            Button Preview
                                        </div>
                                        <div
                                            className="flex justify-center"
                                            dangerouslySetInnerHTML={{
                                                __html: renderMarkdown(generateMarkdown())
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="text-xs text-muted-foreground">
                                            Generated Markdown
                                        </div>
                                        <div className="p-3 bg-muted rounded-md font-mono text-xs break-all">
                                            {generateMarkdown()}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1">
                                <Link className="h-3 w-3"/>
                                <span>Target: {config.target === '_blank' ? 'New tab' : 'Same tab'}</span>
                            </div>
                            <div>Size: {config.size?.toUpperCase() || 'MD'}</div>
                            {config.disabled && (
                                <div className="text-amber-600 dark:text-amber-400">
                                    ⚠️ Button will be disabled
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-between">
                    <Button
                        variant="ghost"
                        onClick={handleReset}
                        className="flex items-center gap-2"
                    >
                        <RotateCcw className="h-3 w-3"/>
                        Reset
                    </Button>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleInsert}
                            className="flex items-center gap-2"
                        >
                            <MousePointer className="h-3 w-3"/>
                            Insert Button
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};