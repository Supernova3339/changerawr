'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Settings,
    Activity,
    BookOpen,
    Shield,
    ExternalLink,
    Clock,
    GitBranch,
    Users,
    Star,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import {SiGithub} from '@icons-pack/react-simple-icons';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Import our integration components
import GitHubIntegrationSettings from '@/components/github/GitHubIntegrationSettings';
import GitHubGenerateDialog from '@/components/github/GitHubGenerateDialog';

interface Project {
    id: string;
    name: string;
    isPublic: boolean;
    createdAt: string;
}

interface GitHubIntegration {
    enabled: boolean;
    repositoryUrl: string;
    defaultBranch: string;
    lastSyncAt: string | null;
    lastCommitSha: string | null;
    hasAccessToken: boolean;
    includeBreakingChanges: boolean;
    includeFixes: boolean;
    includeFeatures: boolean;
    includeChores: boolean;
    customCommitTypes: string[];
}

interface RepositoryStats {
    name: string;
    fullName: string;
    description: string;
    private: boolean;
    defaultBranch: string;
    language: string;
    stargazersCount: number;
    forksCount: number;
    openIssuesCount: number;
    pushedAt: string;
}

export default function GitHubIntegrationPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;

    // State
    const [project, setProject] = useState<Project | null>(null);
    const [integration, setIntegration] = useState<GitHubIntegration | null>(null);
    const [repoStats, setRepoStats] = useState<RepositoryStats | null>(null);
    const [isLoadingProject, setIsLoadingProject] = useState(true);
    const [isLoadingIntegration, setIsLoadingIntegration] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load project data
    useEffect(() => {
        loadProject();
        loadIntegration();
    }, [projectId]);

    // Load repository stats when integration is available
    useEffect(() => {
        if (integration?.enabled && integration.hasAccessToken) {
            loadRepositoryStats();
        }
    }, [integration]);

    const loadProject = async () => {
        try {
            setIsLoadingProject(true);
            const response = await fetch(`/api/projects/${projectId}`);
            if (!response.ok) throw new Error('Failed to load project');

            const data = await response.json();
            setProject(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load project');
        } finally {
            setIsLoadingProject(false);
        }
    };

    const loadIntegration = async () => {
        try {
            setIsLoadingIntegration(true);
            const response = await fetch(`/api/projects/${projectId}/integrations/github`);
            if (!response.ok) throw new Error('Failed to load integration');

            const data = await response.json();
            setIntegration(data);
        } catch (err) {
            console.error('Failed to load integration:', err);
            // Don't set error for integration - it might not exist yet
        } finally {
            setIsLoadingIntegration(false);
        }
    };

    const loadRepositoryStats = async () => {
        if (!integration?.repositoryUrl || !integration.hasAccessToken) return;

        try {
            setIsLoadingStats(true);
            const response = await fetch(`/api/projects/${projectId}/integrations/github/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repositoryUrl: integration.repositoryUrl,
                    accessToken: 'existing' // Signal to use existing token
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.repository) {
                    setRepoStats(data.repository);
                }
            }
        } catch (err) {
            console.error('Failed to load repository stats:', err);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const handleChangelogGenerated = (content: string, version?: string) => {
        // Redirect to changelog creation with pre-filled content
        const searchParams = new URLSearchParams({
            content,
            ...(version && { version })
        });
        router.push(`/dashboard/projects/${projectId}/changelog/new?${searchParams}`);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const getRepositoryOwnerAndName = (url: string) => {
        try {
            const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            return match ? { owner: match[1], name: match[2] } : null;
        } catch {
            return null;
        }
    };

    if (isLoadingProject) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Alert variant="destructive">
                    <AlertDescription>
                        {error || 'Project not found'}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const repoInfo = integration?.repositoryUrl ? getRepositoryOwnerAndName(integration.repositoryUrl) : null;
    const isConfigured = integration?.enabled && integration.hasAccessToken;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Breadcrumb Navigation */}
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/dashboard/projects">Projects</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href={`/dashboard/projects/${projectId}`}>
                            {project.name}
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href={`/dashboard/projects/${projectId}/settings`}>
                            Settings
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>GitHub</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <SiGithub className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">GitHub Integration</h1>
                            <p className="text-muted-foreground">
                                Project: {project.name}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isConfigured && (
                        <GitHubGenerateDialog
                            projectId={projectId}
                            onGenerated={handleChangelogGenerated}
                        />
                    )}
                    <Badge variant={isConfigured ? "default" : "secondary"}>
                        {isConfigured ? "Configured" : "Not Configured"}
                    </Badge>
                </div>
            </div>

            {/* Status Overview */}
            {isConfigured ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Connected</p>
                                    <p className="text-xs text-muted-foreground">
                                        {repoInfo ? `${repoInfo.owner}/${repoInfo.name}` : 'Repository linked'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Last Sync</p>
                                    <p className="text-xs text-muted-foreground">
                                        {integration.lastSyncAt
                                            ? formatDate(integration.lastSyncAt)
                                            : 'Never'
                                        }
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                    <GitBranch className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Default Branch</p>
                                    <p className="text-xs text-muted-foreground">
                                        {integration.defaultBranch}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Alert variant="warning">
                    <AlertDescription>
                        GitHub integration is not configured. Set up your repository connection below to start generating changelog content from commits.
                    </AlertDescription>
                </Alert>
            )}

            {/* Repository Stats */}
            {isConfigured && repoStats && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <SiGithub className="h-5 w-5" />
                            Repository Information
                            <Button variant="ghost" size="icon" className="ml-auto">
                                <ExternalLink
                                    className="h-4 w-4"
                                    onClick={() => window.open(integration.repositoryUrl, '_blank')}
                                />
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Repository</p>
                                <p className="text-2xl font-bold">{repoStats.fullName}</p>
                                {repoStats.description && (
                                    <p className="text-sm text-muted-foreground">{repoStats.description}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm font-medium flex items-center gap-1">
                                    <Star className="h-3 w-3" />
                                    Stars
                                </p>
                                <p className="text-2xl font-bold">{repoStats.stargazersCount.toLocaleString()}</p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm font-medium flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    Forks
                                </p>
                                <p className="text-2xl font-bold">{repoStats.forksCount.toLocaleString()}</p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm font-medium">Language</p>
                                <p className="text-2xl font-bold">{repoStats.language || 'N/A'}</p>
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Badge variant={repoStats.private ? "secondary" : "outline"}>
                                    {repoStats.private ? "Private" : "Public"}
                                </Badge>
                                {repoStats.openIssuesCount > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                        {repoStats.openIssuesCount} open issues
                                    </span>
                                )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                                Last push: {formatDate(repoStats.pushedAt)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="settings" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="settings" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Configuration
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="gap-2">
                        <Activity className="h-4 w-4" />
                        Activity
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-2">
                        <Shield className="h-4 w-4" />
                        Security
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Repository Configuration</CardTitle>
                            <CardDescription>
                                Configure your GitHub repository connection and content generation preferences
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingIntegration ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <GitHubIntegrationSettings
                                    projectId={projectId}
                                    projectName={project.name}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>
                                View recent changelog generations and sync history
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {integration?.lastSyncAt ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <p className="font-medium">Last Sync</p>
                                            <p className="text-sm text-muted-foreground">
                                                Synced repository data from {integration.defaultBranch} branch
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">{formatDate(integration.lastSyncAt)}</p>
                                            {integration.lastCommitSha && (
                                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                                    {integration.lastCommitSha.substring(0, 7)}
                                                </code>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="font-medium mb-2">No Activity Yet</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Generate your first changelog to see activity history here.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security Information</CardTitle>
                            <CardDescription>
                                Security features and access token management
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-medium mb-3">Security Features</h4>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            Access tokens encrypted at rest
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            No webhooks or external callbacks
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            Minimal GitHub permissions required
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            Project-level token isolation
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            Comprehensive audit logging
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-medium mb-3">Required Permissions</h4>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-blue-500" />
                                            <span className="font-mono">repo</span> (for private repos)
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-blue-500" />
                                            <span className="font-mono">public_repo</span> (for public repos)
                                        </li>
                                    </ul>
                                    <p className="text-xs text-muted-foreground mt-3">
                                        These permissions allow reading repository information, commits, tags, and releases.
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h4 className="font-medium mb-2">Access Token Status</h4>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium">
                                            {integration?.hasAccessToken ? 'Token Configured' : 'No Token'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {integration?.hasAccessToken
                                                ? 'A valid access token is stored and encrypted'
                                                : 'Configure an access token to enable the integration'
                                            }
                                        </p>
                                    </div>
                                    <Badge variant={integration?.hasAccessToken ? "default" : "secondary"}>
                                        {integration?.hasAccessToken ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}