import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings,
    TestTube,
    CheckCircle,
    XCircle,
    Loader2,
    Eye,
    EyeOff,
    Save,
    Trash2,
    Link,
    RefreshCw,
    ExternalLink
} from 'lucide-react';
import {SiGithub} from '@icons-pack/react-simple-icons';
import { appInfo } from '@/lib/app-info';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface GitHubIntegration {
    enabled: boolean;
    repositoryUrl: string;
    defaultBranch: string;
    autoGenerate: boolean;
    includeBreakingChanges: boolean;
    includeFixes: boolean;
    includeFeatures: boolean;
    includeChores: boolean;
    customCommitTypes: string[];
    lastSyncAt: string | null;
    lastCommitSha: string | null;
    hasAccessToken: boolean;
}

interface RepositoryInfo {
    name: string;
    fullName: string;
    description: string;
    private: boolean;
    defaultBranch: string;
    language: string;
    stargazersCount: number;
    forksCount: number;
}

interface TestResult {
    success: boolean;
    repository?: RepositoryInfo;
    user?: {
        login: string;
        id: number;
        avatarUrl: string;
    };
    error?: string;
}

// Default settings for when no integration exists
const DEFAULT_SETTINGS: GitHubIntegration = {
    enabled: false,
    repositoryUrl: '',
    defaultBranch: 'main',
    autoGenerate: false,
    includeBreakingChanges: true,
    includeFixes: true,
    includeFeatures: true,
    includeChores: false,
    customCommitTypes: ['docs', 'style', 'refactor', 'perf'],
    lastSyncAt: null,
    lastCommitSha: null,
    hasAccessToken: false
};

export default function GitHubIntegrationSettings({ projectId, projectName }: { projectId: string; projectName: string }) {
    // State management
    const [settings, setSettings] = useState<GitHubIntegration>(DEFAULT_SETTINGS);
    const [accessToken, setAccessToken] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Load current settings
    useEffect(() => {
        loadSettings();
    }, [projectId]);

    const loadSettings = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(`/api/projects/${projectId}/integrations/github`);

            if (response.status === 404) {
                // No integration configured yet - use defaults
                setSettings(DEFAULT_SETTINGS);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to load GitHub integration settings');
            }

            const data = await response.json();

            // Handle case where response is null (no integration)
            if (!data) {
                setSettings(DEFAULT_SETTINGS);
                return;
            }

            // Merge with defaults to ensure all fields are present
            setSettings({
                ...DEFAULT_SETTINGS,
                ...data
            });
        } catch (err) {
            console.error('Error loading GitHub settings:', err);
            setError(err instanceof Error ? err.message : 'Failed to load settings');
            // Set defaults on error too
            setSettings(DEFAULT_SETTINGS);
        } finally {
            setIsLoading(false);
        }
    };

    // Test GitHub connection
    const testConnection = async () => {
        if (!settings.repositoryUrl || !accessToken) {
            setError('Repository URL and access token are required');
            return;
        }

        try {
            setIsTesting(true);
            setTestResult(null);
            setError(null);

            const response = await fetch(`/api/projects/${projectId}/integrations/github/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repositoryUrl: settings.repositoryUrl,
                    accessToken
                })
            });

            const result = await response.json();
            setTestResult(result);

            if (result.success && result.repository) {
                // Update default branch from repository
                setSettings(prev => ({
                    ...prev,
                    defaultBranch: result.repository!.defaultBranch
                }));
            }

        } catch (err) {
            console.error('Test connection error:', err);
            setTestResult({
                success: false,
                error: err instanceof Error ? err.message : 'Test failed'
            });
        } finally {
            setIsTesting(false);
        }
    };

    // Save settings
    const saveSettings = async () => {
        if (!settings.repositoryUrl.trim()) {
            setError('Repository URL is required');
            return;
        }

        if (!accessToken.trim() && !settings.hasAccessToken) {
            setError('Access token is required');
            return;
        }

        try {
            setIsSaving(true);
            setError(null);

            const payload = {
                ...settings,
                ...(accessToken.trim() && { accessToken: accessToken.trim() }) // Only include if provided
            };

            console.log('Saving GitHub integration with payload:', {
                ...payload,
                accessToken: payload.accessToken ? '[REDACTED]' : undefined
            });

            const response = await fetch(`/api/projects/${projectId}/integrations/github`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Save failed:', errorData);
                throw new Error(errorData.error || errorData.details || 'Failed to save settings');
            }

            const updatedSettings = await response.json();
            setSettings({
                ...DEFAULT_SETTINGS,
                ...updatedSettings
            });
            setAccessToken(''); // Clear the input
            setSuccess('GitHub integration configured successfully!');

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            console.error('Save settings error:', err);
            setError(err instanceof Error ? err.message : 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    // Delete integration
    const deleteIntegration = async () => {
        try {
            setIsDeleting(true);
            setError(null);

            const response = await fetch(`/api/projects/${projectId}/integrations/github`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete integration');
            }

            // Reset to default state
            setSettings(DEFAULT_SETTINGS);
            setAccessToken('');
            setTestResult(null);
            setSuccess('GitHub integration removed successfully!');

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            console.error('Delete integration error:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete integration');
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle settings changes safely
    const updateSettings = (updates: Partial<GitHubIntegration>) => {
        setSettings(prev => ({
            ...prev,
            ...updates
        }));
    };

    // Generate GitHub token creation URL with pre-filled parameters
    const getGitHubTokenUrl = (): string => {
        const description = `${appInfo.name} GitHub Integration: Project ${projectName}`;
        const scopes = 'repo';
        const encodedDescription = encodeURIComponent(description);
        return `https://github.com/settings/tokens/new?description=${encodedDescription}&scopes=${scopes}`;
    };

    const openGitHubTokenCreation = () => {
        window.open(getGitHubTokenUrl(), '_blank');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <SiGithub className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold">GitHub Integration</h2>
                    <p className="text-sm text-muted-foreground">
                        Generate changelog content from your GitHub repository commits
                    </p>
                </div>
            </div>

            {/* Alerts */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </motion.div>
                )}

                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    </motion.div>
                )}
            </AnimatePresence>

            <Tabs defaultValue="setup" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="setup">Setup & Configuration</TabsTrigger>
                    <TabsTrigger value="preferences">Content Preferences</TabsTrigger>
                </TabsList>

                <TabsContent value="setup" className="space-y-6">
                    {/* Repository Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Link className="h-4 w-4" />
                                Repository Configuration
                            </CardTitle>
                            <CardDescription>
                                Connect your GitHub repository to generate changelog content from commits
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Repository URL */}
                            <div className="space-y-2">
                                <Label htmlFor="repositoryUrl">Repository URL</Label>
                                <Input
                                    id="repositoryUrl"
                                    placeholder="https://github.com/username/repository"
                                    value={settings.repositoryUrl || ''}
                                    onChange={(e) => updateSettings({ repositoryUrl: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Enter the full GitHub repository URL (e.g., https://github.com/owner/repo)
                                </p>
                            </div>

                            {/* Access Token */}
                            <div className="space-y-2">
                                <Label htmlFor="accessToken">Personal Access Token</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            id="accessToken"
                                            type={showToken ? "text" : "password"}
                                            placeholder={settings.hasAccessToken ? "••••••••••••••••" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
                                            value={accessToken}
                                            onChange={(e) => setAccessToken(e.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-full px-3"
                                            onClick={() => setShowToken(!showToken)}
                                        >
                                            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    onClick={openGitHubTokenCreation}
                                                    title="Create a new GitHub personal access token with pre-filled parameters"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Create Token on GitHub</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    onClick={testConnection}
                                                    disabled={isTesting || !settings.repositoryUrl || !accessToken}
                                                >
                                                    {isTesting ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <TestTube className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Test Connection</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Generate a Personal Access Token in GitHub Settings → Developer settings → Personal access tokens.
                                    Requires &apos;repo&apos; scope for private repositories or &apos;public_repo&apos; for public ones.
                                </p>
                                {settings.hasAccessToken && !accessToken && (
                                    <p className="text-xs text-green-600">
                                        ✓ Access token is configured. Leave empty to keep existing token.
                                    </p>
                                )}
                            </div>

                            {/* Test Results */}
                            <AnimatePresence>
                                {testResult && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        <Card className={testResult.success
                                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                                            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                                        }>
                                            <CardContent className="p-4">
                                                {testResult.success ? (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                                            <CheckCircle className="h-4 w-4" />
                                                            <span className="font-medium">Connection successful!</span>
                                                        </div>
                                                        {testResult.repository && (
                                                            <div className="space-y-2 text-sm">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <span className="font-medium">Repository:</span> {testResult.repository.fullName}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Default Branch:</span> {testResult.repository.defaultBranch}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Language:</span> {testResult.repository.language || 'Not specified'}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Visibility:</span> {testResult.repository.private ? 'Private' : 'Public'}
                                                                    </div>
                                                                </div>
                                                                {testResult.repository.description && (
                                                                    <p className="text-muted-foreground">{testResult.repository.description}</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                                        <XCircle className="h-4 w-4" />
                                                        <span>{testResult.error || 'Connection failed'}</span>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Default Branch */}
                            <div className="space-y-2">
                                <Label htmlFor="defaultBranch">Default Branch</Label>
                                <Input
                                    id="defaultBranch"
                                    placeholder="main"
                                    value={settings.defaultBranch || 'main'}
                                    onChange={(e) => updateSettings({ defaultBranch: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    The default branch to use for commit analysis (usually &apos;main&apos; or &apos;master&apos;)
                                </p>
                            </div>

                            {/* Enable Integration */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                    <Label htmlFor="enabled">Enable GitHub Integration</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Allow this project to generate changelog content from GitHub commits
                                    </p>
                                </div>
                                <Switch
                                    id="enabled"
                                    checked={settings.enabled}
                                    onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Status */}
                    {settings.hasAccessToken && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-4 w-4" />
                                    Integration Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Status</span>
                                        <Badge variant={settings.enabled ? "default" : "secondary"}>
                                            {settings.enabled ? "Enabled" : "Disabled"}
                                        </Badge>
                                    </div>
                                    {settings.lastSyncAt && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Last Sync</span>
                                            <span className="text-sm text-muted-foreground">
                                                {new Date(settings.lastSyncAt).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    {settings.lastCommitSha && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Last Commit</span>
                                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                                {settings.lastCommitSha.substring(0, 7)}
                                            </code>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="preferences" className="space-y-6">
                    {/* Content Generation Preferences */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Content Generation Preferences</CardTitle>
                            <CardDescription>
                                Configure which types of commits to include when generating changelog content
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Commit Type Toggles */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <Label>Breaking Changes</Label>
                                        <p className="text-xs text-muted-foreground">Include breaking changes</p>
                                    </div>
                                    <Switch
                                        checked={settings.includeBreakingChanges}
                                        onCheckedChange={(checked) => updateSettings({ includeBreakingChanges: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <Label>Features</Label>
                                        <p className="text-xs text-muted-foreground">feat: new features</p>
                                    </div>
                                    <Switch
                                        checked={settings.includeFeatures}
                                        onCheckedChange={(checked) => updateSettings({ includeFeatures: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <Label>Bug Fixes</Label>
                                        <p className="text-xs text-muted-foreground">fix: bug fixes</p>
                                    </div>
                                    <Switch
                                        checked={settings.includeFixes}
                                        onCheckedChange={(checked) => updateSettings({ includeFixes: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <Label>Maintenance</Label>
                                        <p className="text-xs text-muted-foreground">chore: maintenance tasks</p>
                                    </div>
                                    <Switch
                                        checked={settings.includeChores}
                                        onCheckedChange={(checked) => updateSettings({ includeChores: checked })}
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Custom Commit Types */}
                            <div className="space-y-3">
                                <Label>Additional Commit Types</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci'].map((type) => (
                                        <Badge
                                            key={type}
                                            variant={settings.customCommitTypes.includes(type) ? "default" : "outline"}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                const newCustomTypes = settings.customCommitTypes.includes(type)
                                                    ? settings.customCommitTypes.filter(t => t !== type)
                                                    : [...settings.customCommitTypes, type];
                                                updateSettings({ customCommitTypes: newCustomTypes });
                                            }}
                                        >
                                            {type}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Click to toggle inclusion of these conventional commit types
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
                <div>
                    {settings.hasAccessToken && (
                        <Button
                            variant="destructive"
                            onClick={deleteIntegration}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Remove Integration
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={loadSettings}
                        disabled={isLoading}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>

                    <Button
                        onClick={saveSettings}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Settings
                    </Button>
                </div>
            </div>
        </div>
    );
}