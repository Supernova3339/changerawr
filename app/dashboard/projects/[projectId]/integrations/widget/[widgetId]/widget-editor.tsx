'use client';

import {useState, useEffect, useRef} from 'react';
import {Widget, Project} from '@prisma/client';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {ArrowLeft, Copy, Check, RefreshCw} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {toast} from '@/hooks/use-toast';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Light as SyntaxHighlighter} from 'react-syntax-highlighter';
import {atomOneDark, atomOneLight} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {useTheme} from 'next-themes';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';

import 'dotenv/config';

// Register languages
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('xml', xml);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('go', go);

// Custom language definitions
SyntaxHighlighter.registerLanguage('vue', () => ({
    contains: [
        {
            className: 'tag',
            begin: '<template',
            end: '>',
            starts: {
                end: '</template>',
                returnEnd: true,
                subLanguage: 'xml'
            }
        },
        {
            className: 'tag',
            begin: '<script',
            end: '>',
            starts: {
                end: '</script>',
                returnEnd: true,
                subLanguage: 'javascript'
            }
        }
    ]
}));

SyntaxHighlighter.registerLanguage('svelte', () => ({
    contains: [
        {
            className: 'tag',
            begin: '<script',
            end: '>',
            starts: {
                end: '</script>',
                returnEnd: true,
                subLanguage: 'javascript'
            }
        },
        {
            className: 'template',
            begin: '{',
            end: '}',
            subLanguage: 'javascript'
        },
        {
            className: 'tag',
            begin: '<[A-Za-z]',
            end: '>',
            contains: [
                {
                    className: 'attr',
                    begin: ' [A-Za-z]+=',
                    end: /(?=\s|$)/,
                    contains: [
                        {
                            className: 'string',
                            begin: '"',
                            end: '"'
                        }
                    ]
                }
            ]
        }
    ]
}));

interface WidgetEditorProps {
    widget: Widget & { project: { name: string; isPublic: boolean } };
    projectId: string;
}

export default function WidgetEditor({widget: initialWidget, projectId}: WidgetEditorProps) {
    const router = useRouter();
    const {theme} = useTheme();
    const [widget, setWidget] = useState(initialWidget);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [previewKey, setPreviewKey] = useState(0);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const getEmbedCode = (language: string) => {
        const scriptUrl = `${window.location.origin}/api/integrations/widget/${projectId}/${widget.id}`;

        switch (language) {
            case 'HTML':
                return `<script src="${scriptUrl}" async></script>`;

            case 'React':
                return `import { useEffect } from 'react';

export default function Changelog() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${scriptUrl}';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return <div id="changerawr-changelog" />;
}`;

            case 'Vue':
                return `<template>
  <div id="changerawr-changelog"></div>
</template>

<script>
export default {
  mounted() {
    const script = document.createElement('script');
    script.src = '${scriptUrl}';
    script.async = true;
    document.body.appendChild(script);
  }
}
</script>`;

            case 'Svelte':
                return `<script>
  import { onMount } from 'svelte';

  onMount(() => {
    const script = document.createElement('script');
    script.src = '${scriptUrl}';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  });
</script>

<div id="changerawr-changelog"></div>`;

            case 'Angular':
                return `import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-changelog',
  template: '<div id="changerawr-changelog"></div>'
})
export class ChangelogComponent implements OnInit {
  ngOnInit() {
    const script = document.createElement('script');
    script.src = '${scriptUrl}';
    script.async = true;
    document.body.appendChild(script);
  }
}`;

            case 'Go':
                return `package main

import "html/template"

func ChangelogWidget() template.HTML {
    return template.HTML(\`<script src="${scriptUrl}" async></script>\`)
}`;

            default:
                return '';
        }
    };

    const getLanguageForHighlighter = (lang: string) => {
        switch (lang) {
            case 'HTML':
                return 'xml';
            case 'React':
                return 'javascript';
            case 'Vue':
                return 'vue';
            case 'Svelte':
                return 'svelte';
            case 'Angular':
                return 'typescript';
            case 'Go':
                return 'go';
            default:
                return 'javascript';
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/integrations/widget/${projectId}/${widget.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: widget.name,
                    customCSS: widget.customCSS,
                    isActive: widget.isActive,
                }),
            });

            if (!res.ok) throw new Error('Failed to save');

            toast({title: 'Success', description: 'Widget saved successfully'});
            router.refresh();
        } catch (error) {
            toast({title: 'Error', description: 'Failed to save widget', variant: 'destructive'});
        } finally {
            setSaving(false);
        }
    };

    const copyEmbedCode = () => {
        const code = `<script src="${window.location.origin}/api/integrations/widget/${projectId}/${widget.id}" async></script>`;
        navigator.clipboard.writeText(code);
        setCopied(true);
        toast({title: 'Success', description: 'Embed code copied!'});
        setTimeout(() => setCopied(false), 2000);
    };

    const refreshPreview = () => {
        setPreviewKey(prev => prev + 1);
    };

    const getPreviewHTML = () => {
        const scriptUrl = `${window.location.origin}/api/integrations/widget/${projectId}/${widget.id}`;

        // Different preview layouts based on variant
        const variantSpecificContent = {
            classic: `
                <div style="max-width: 600px; margin: 0 auto;">
                    <h2 style="font-family: system-ui; margin-bottom: 1rem;">Widget Preview</h2>
                    <script src="${scriptUrl}" async></script>
                </div>
            `,
            floating: `
                <div style="height: 400px; position: relative; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div style="padding: 2rem; color: white; font-family: system-ui;">
                        <h2>Your Website Content</h2>
                        <p>The floating widget appears in the corner →</p>
                    </div>
                    <script src="${scriptUrl}" async></script>
                </div>
            `,
            modal: `
                <div style="padding: 2rem; font-family: system-ui; text-align: center;">
                    <h2>Modal Widget Preview</h2>
                    <p style="margin: 1rem 0; color: #666;">Click the button below to open the modal</p>
                    <button id="modal-trigger" style="padding: 0.75rem 1.5rem; background: #0066ff; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: 600;">
                        Open Changelog
                    </button>
                    <script src="${scriptUrl}" data-trigger="modal-trigger" async></script>
                </div>
            `,
            announcement: `
                <div style="padding-top: 4rem; font-family: system-ui;">
                    <div style="max-width: 800px; margin: 0 auto; padding: 2rem;">
                        <h2>Announcement Bar Preview</h2>
                        <p style="color: #666;">The announcement bar appears at the top of the page ↑</p>
                    </div>
                    <script src="${scriptUrl}" async></script>
                </div>
            `
        };

        const content = variantSpecificContent[widget.variant as keyof typeof variantSpecificContent] || variantSpecificContent.classic;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Widget Preview</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: ${theme === 'dark' ? '#0f172a' : '#f8fafc'};
            color: ${theme === 'dark' ? '#e2e8f0' : '#1e293b'};
            min-height: 100vh;
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
    };

    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                doc.write(getPreviewHTML());
                doc.close();
            }
        }
    }, [previewKey, widget.id, widget.variant, theme]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/projects/${projectId}/integrations/widget`)}
                >
                    <ArrowLeft className="w-4 h-4 mr-2"/>
                    Back
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Edit Widget</h1>
                    <p className="text-muted-foreground">{widget.variant} variant</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Widget Settings</CardTitle>
                            <CardDescription>Configure your widget</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Widget Name</Label>
                                <Input
                                    id="name"
                                    value={widget.name}
                                    onChange={(e) => setWidget({...widget, name: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="variant">Variant</Label>
                                <Input id="variant" value={widget.variant} disabled/>
                                <p className="text-xs text-muted-foreground">
                                    Variant cannot be changed after creation
                                </p>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Active</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Inactive widgets won't load on your site
                                    </p>
                                </div>
                                <Switch
                                    checked={widget.isActive}
                                    onCheckedChange={(checked) =>
                                        setWidget({...widget, isActive: checked})
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="customCSS">Custom CSS</Label>
                                <Textarea
                                    id="customCSS"
                                    value={widget.customCSS || ''}
                                    onChange={(e) =>
                                        setWidget({...widget, customCSS: e.target.value || null})
                                    }
                                    placeholder=".changerawr-widget { border-radius: 12px; }"
                                    className="font-mono text-sm"
                                    rows={8}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Add custom CSS to style your widget. Uses CSS custom properties.
                                </p>
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="w-full">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Embed Code</CardTitle>
                            <CardDescription>Add this code to your website</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="HTML" className="w-full">
                                <TabsList className="grid w-full grid-cols-6">
                                    <TabsTrigger value="HTML">HTML</TabsTrigger>
                                    <TabsTrigger value="React">React</TabsTrigger>
                                    <TabsTrigger value="Vue">Vue</TabsTrigger>
                                    <TabsTrigger value="Svelte">Svelte</TabsTrigger>
                                    <TabsTrigger value="Angular">Angular</TabsTrigger>
                                    <TabsTrigger value="Go">Go</TabsTrigger>
                                </TabsList>
                                {['HTML', 'React', 'Vue', 'Svelte', 'Angular', 'Go'].map((lang) => (
                                    <TabsContent key={lang} value={lang} className="space-y-2">
                                        <div className="relative">
                                            <SyntaxHighlighter
                                                language={getLanguageForHighlighter(lang)}
                                                style={theme === 'dark' ? atomOneDark : atomOneLight}
                                                customStyle={{
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.875rem',
                                                    margin: 0,
                                                }}
                                            >
                                                {getEmbedCode(lang)}
                                            </SyntaxHighlighter>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="absolute top-2 right-2"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(getEmbedCode(lang));
                                                    setCopied(true);
                                                    toast({title: 'Success', description: 'Code copied!'});
                                                    setTimeout(() => setCopied(false), 2000);
                                                }}
                                            >
                                                {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                                            </Button>
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>

                            {widget.variant === 'classic' && (
                                <div className="space-y-2 pt-4 border-t mt-4">
                                    <p className="text-sm font-medium">Classic Widget Options</p>
                                    <p className="text-xs text-muted-foreground">
                                        Add data attributes to customize:
                                    </p>
                                    <code className="block px-3 py-2 bg-muted rounded text-xs font-mono">
                                        data-theme="dark"<br/>
                                        data-popup="true"<br/>
                                        data-position="bottom-right"<br/>
                                        data-max-entries="5"
                                    </code>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Preview</CardTitle>
                                    <CardDescription>See how your widget looks</CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={refreshPreview}
                                >
                                    <RefreshCw className="w-4 h-4 mr-2"/>
                                    Refresh
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg overflow-hidden bg-background">
                                <iframe
                                    ref={iframeRef}
                                    key={previewKey}
                                    title="Widget Preview"
                                    className="w-full h-[500px] border-0"
                                    sandbox="allow-scripts allow-same-origin"
                                />
                            </div>
                            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="text-yellow-600 dark:text-yellow-400">ℹ️</span>
                                <p>
                                    This is a live preview of your widget. Changes to custom CSS require saving first,
                                    then refresh the preview.
                                    {!widget.project.isPublic && ' Your project is private, so the widget may not load properly.'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
