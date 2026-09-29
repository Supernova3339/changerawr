// lib/services/github/client.ts

export interface GitHubConfig {
    accessToken: string;
    repositoryUrl: string;
    defaultBranch?: string;
}

export interface GitHubCommitAuthor {
    name: string;
    email: string;
    date: string;
}

export interface GitHubCommitData {
    message: string;
    author: GitHubCommitAuthor;
    committer: GitHubCommitAuthor;
}

export interface GitHubCommitStats {
    additions: number;
    deletions: number;
    total: number;
}

export interface GitHubFile {
    filename: string;
    status: 'added' | 'modified' | 'removed' | 'renamed';
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    blob_url: string;
    raw_url: string;
    contents_url: string;
    previous_filename?: string;
}

export interface GitHubCommitResponse {
    sha: string;
    commit: GitHubCommitData;
    html_url: string;
    stats?: GitHubCommitStats;
    files?: GitHubFile[];
    repository?: {
        html_url: string;
    };
}

export interface GitHubCommit {
    sha: string;
    commit: GitHubCommitData;
    html_url: string;
    stats?: GitHubCommitStats;
    files?: GitHubFile[];
    // Flattened properties for easier access
    message: string;
    author: GitHubCommitAuthor;
    url: string;
}

export interface GitHubTag {
    name: string;
    commit: {
        sha: string;
        url: string;
    };
    zipball_url: string;
    tarball_url: string;
}

export interface GitHubReleaseAuthor {
    login: string;
    avatar_url: string;
}

export interface GitHubRelease {
    id: number;
    tag_name: string;
    name: string;
    body: string;
    draft: boolean;
    prerelease: boolean;
    created_at: string;
    published_at: string;
    author: GitHubReleaseAuthor;
}

export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    description: string;
    private: boolean;
    default_branch: string;
    language: string;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    created_at: string;
    updated_at: string;
    pushed_at: string;
}

export interface GitHubComparisonResponse {
    commits: GitHubCommitResponse[];
    total_commits: number;
}

export interface GitHubUser {
    login: string;
    id: number;
    avatar_url: string;
}

export interface GitHubErrorResponse {
    message?: string;
    documentation_url?: string;
    errors?: Array<{
        resource: string;
        field: string;
        code: string;
    }>;
}

export class GitHubError extends Error {
    statusCode: number;
    response?: GitHubErrorResponse;

    constructor(message: string, statusCode: number, response?: GitHubErrorResponse) {
        super(message);
        this.name = 'GitHubError';
        this.statusCode = statusCode;
        this.response = response;
    }
}

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Resolve the REST API base URL for a repository URL.
 * github.com repositories use api.github.com; any other host is treated as a
 * Gitea/Forgejo instance, whose API lives at <instance>/api/v1.
 */
export function resolveApiBaseUrl(repositoryUrl: string): string {
    let url: URL;
    try {
        url = new URL(repositoryUrl);
    } catch {
        // owner/repo shorthand or git@github.com:owner/repo
        return GITHUB_API_URL;
    }

    if (url.hostname === 'github.com') {
        return GITHUB_API_URL;
    }

    // Keep any sub-path the instance is served under (e.g. https://example.com/git/owner/repo)
    const segments = url.pathname.split('/').filter(Boolean);
    const prefix = segments.slice(0, -2).join('/');
    return `${url.origin}${prefix ? `/${prefix}` : ''}/api/v1`;
}

export class GitHubClient {
    private accessToken: string;
    private baseUrl: string;
    private isGitHub: boolean;

    constructor(config: GitHubConfig) {
        this.accessToken = config.accessToken;
        this.baseUrl = resolveApiBaseUrl(config.repositoryUrl);
        this.isGitHub = this.baseUrl === GITHUB_API_URL;
    }

    /**
     * Gitea/Forgejo take the page size as `limit` instead of `per_page`
     */
    private get pageSizeParam(): string {
        return this.isGitHub ? 'per_page' : 'limit';
    }

    private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        // Use Bearer auth for all tokens since it works universally
        const authHeader = `Bearer ${this.accessToken}`;

        console.log('Making GitHub API request:', {
            url,
            authType: authHeader.split(' ')[0],
            tokenPrefix: this.accessToken.substring(0, 8) + '...'
        });

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Changerawr/1.0',
                'X-GitHub-Api-Version': '2022-11-28',
                ...options.headers,
            },
        });

        if (!response.ok) {
            let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;
            let errorBody: GitHubErrorResponse | undefined;

            try {
                const errorText = await response.text();
                errorBody = JSON.parse(errorText) as GitHubErrorResponse;
                errorMessage = errorBody.message ?? errorMessage;
            } catch {
                // If we can't parse JSON, use the default message
                errorMessage = errorMessage;
            }

            throw new GitHubError(errorMessage, response.status, errorBody);
        }

        return response.json() as Promise<T>;
    }

    /**
     * Extract owner and repo from repository URL
     */
    private parseRepositoryUrl(repositoryUrl: string): { owner: string; repo: string } {
        // Handle various GitHub URL formats
        const patterns = [
            /^https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/,
            /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
            /^([^\/]+)\/([^\/]+)$/, // Just owner/repo format
            // Self-hosted Gitea/Forgejo, optionally served under a sub-path
            /^https?:\/\/(?!(?:www\.)?github\.com\/)[^\/]+\/(?:[^\/]+\/)*([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/,
        ];

        for (const pattern of patterns) {
            const match = repositoryUrl.match(pattern);
            if (match) {
                return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
            }
        }

        throw new Error(`Invalid GitHub repository URL: ${repositoryUrl}`);
    }

    /**
     * Normalize GitHub commit to our format
     */
    private normalizeCommit(commit: GitHubCommitResponse): GitHubCommit {
        const { owner, repo } = this.parseRepositoryUrl(
            commit.repository?.html_url ?? 'unknown/unknown'
        );

        return {
            ...commit,
            message: commit.commit?.message ?? '',
            author: commit.commit?.author ?? {
                name: 'Unknown',
                email: '',
                date: new Date().toISOString()
            },
            url: commit.html_url ?? `https://github.com/${owner}/${repo}/commit/${commit.sha}`
        };
    }

    /**
     * Test the connection and validate the repository access
     */
    async testConnection(repositoryUrl: string): Promise<GitHubRepository> {
        const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);

        try {
            const repository = await this.makeRequest<GitHubRepository>(`/repos/${owner}/${repo}`);
            return repository;
        } catch (error) {
            if (error instanceof GitHubError) {
                if (error.statusCode === 404) {
                    throw new GitHubError('Repository not found or access denied', 404);
                } else if (error.statusCode === 401) {
                    throw new GitHubError('Invalid access token', 401);
                } else if (error.statusCode === 403) {
                    throw new GitHubError('Access forbidden - check token permissions', 403);
                }
            }
            throw error;
        }
    }

    /**
     * Get commits from the repository
     */
    async getCommits(
        repositoryUrl: string,
        options: {
            since?: string;
            until?: string;
            sha?: string;
            path?: string;
            per_page?: number;
            page?: number;
        } = {}
    ): Promise<GitHubCommit[]> {
        const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);

        const queryParams = new URLSearchParams();
        if (options.since) queryParams.append('since', options.since);
        if (options.until) queryParams.append('until', options.until);
        if (options.sha) queryParams.append('sha', options.sha);
        if (options.path) queryParams.append('path', options.path);
        queryParams.append(this.pageSizeParam, (options.per_page ?? 30).toString());
        if (options.page) queryParams.append('page', options.page.toString());
        if (!this.isGitHub) {
            // Gitea/Forgejo compute these per commit by default; getCommit() fetches details when needed
            queryParams.append('stat', 'false');
            queryParams.append('verification', 'false');
            queryParams.append('files', 'false');
        }

        const endpoint = `/repos/${owner}/${repo}/commits${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

        const commits = await this.makeRequest<GitHubCommitResponse[]>(endpoint);

        // Normalize the commits to ensure consistent structure
        return commits.map(commit => this.normalizeCommit(commit));
    }

    /**
     * Get commits with detailed file information
     */
    async getCommitsWithFiles(
        repositoryUrl: string,
        options: {
            since?: string;
            until?: string;
            sha?: string;
            path?: string;
            per_page?: number;
            page?: number;
        } = {}
    ): Promise<GitHubCommit[]> {
        // First get the basic commits
        const commits = await this.getCommits(repositoryUrl, options);

        // Then fetch detailed info for each commit (with files)
        const detailedCommits: GitHubCommit[] = [];

        for (const commit of commits) {
            try {
                const detailedCommit = await this.getCommit(repositoryUrl, commit.sha);
                detailedCommits.push(detailedCommit);

                // Rate limiting - be nice to GitHub API
                await this.delay(100);
            } catch (error) {
                console.warn(`Failed to get detailed info for commit ${commit.sha}:`, error);
                // Use the basic commit info as fallback
                detailedCommits.push(commit);
            }
        }

        return detailedCommits;
    }

    /**
     * Get commits between two references (tags, commits, branches)
     */
    async getCommitsBetween(
        repositoryUrl: string,
        base: string,
        head: string
    ): Promise<GitHubCommit[]> {
        const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);

        const comparison = await this.makeRequest<GitHubComparisonResponse>(
            `/repos/${owner}/${repo}/compare/${base}...${head}`
        );

        // Normalize the commits
        return comparison.commits.map(commit => this.normalizeCommit(commit));
    }

    /**
     * Get commits between two references with detailed file information
     */
    async getCommitsBetweenWithFiles(
        repositoryUrl: string,
        base: string,
        head: string
    ): Promise<GitHubCommit[]> {
        // First get the basic commits
        const commits = await this.getCommitsBetween(repositoryUrl, base, head);

        // Then fetch detailed info for each commit (with files)
        const detailedCommits: GitHubCommit[] = [];

        for (const commit of commits) {
            try {
                const detailedCommit = await this.getCommit(repositoryUrl, commit.sha);
                detailedCommits.push(detailedCommit);

                // Rate limiting - be nice to GitHub API
                await this.delay(100);
            } catch (error) {
                console.warn(`Failed to get detailed info for commit ${commit.sha}:`, error);
                // Use the basic commit info as fallback
                detailedCommits.push(commit);
            }
        }

        return detailedCommits;
    }

    /**
     * Get repository tags
     */
    async getTags(
        repositoryUrl: string,
        options: { per_page?: number; page?: number } = {}
    ): Promise<GitHubTag[]> {
        const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);

        const queryParams = new URLSearchParams();
        if (options.per_page) queryParams.append(this.pageSizeParam, options.per_page.toString());
        if (options.page) queryParams.append('page', options.page.toString());

        const endpoint = `/repos/${owner}/${repo}/tags${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

        return this.makeRequest<GitHubTag[]>(endpoint);
    }

    /**
     * Get repository releases
     */
    async getReleases(
        repositoryUrl: string,
        options: { per_page?: number; page?: number } = {}
    ): Promise<GitHubRelease[]> {
        const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);

        const queryParams = new URLSearchParams();
        if (options.per_page) queryParams.append(this.pageSizeParam, options.per_page.toString());
        if (options.page) queryParams.append('page', options.page.toString());

        const endpoint = `/repos/${owner}/${repo}/releases${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

        return this.makeRequest<GitHubRelease[]>(endpoint);
    }

    /**
     * Get the latest release
     */
    async getLatestRelease(repositoryUrl: string): Promise<GitHubRelease> {
        const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
        return this.makeRequest<GitHubRelease>(`/repos/${owner}/${repo}/releases/latest`);
    }

    /**
     * Get detailed commit information including stats and file changes
     */
    async getCommit(repositoryUrl: string, sha: string): Promise<GitHubCommit> {
        const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
        // Gitea/Forgejo serve a single commit under /git/commits
        const commitPath = this.isGitHub ? 'commits' : 'git/commits';
        const commit = await this.makeRequest<GitHubCommitResponse>(`/repos/${owner}/${repo}/${commitPath}/${sha}`);
        return this.normalizeCommit(commit);
    }

    /**
     * Get repository information
     */
    async getRepository(repositoryUrl: string): Promise<GitHubRepository> {
        const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
        return this.makeRequest<GitHubRepository>(`/repos/${owner}/${repo}`);
    }

    /**
     * Get authenticated user information (for testing token validity)
     */
    async getUser(): Promise<GitHubUser> {
        return this.makeRequest<GitHubUser>('/user');
    }

    /**
     * Get file content from repository
     */
    async getFileContent(
        repositoryUrl: string,
        path: string,
        ref?: string
    ): Promise<string> {
        const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);

        const queryParams = new URLSearchParams();
        if (ref) queryParams.append('ref', ref);

        const endpoint = `/repos/${owner}/${repo}/contents/${path}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

        interface GitHubContent {
            content: string;
            encoding: string;
            type: string;
        }

        const response = await this.makeRequest<GitHubContent>(endpoint);

        if (response.type !== 'file') {
            throw new Error(`Path ${path} is not a file`);
        }

        if (response.encoding === 'base64') {
            return Buffer.from(response.content, 'base64').toString('utf-8');
        }

        return response.content;
    }

    /**
     * Utility delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Factory function to create GitHub client from config
 */
export function createGitHubClient(config: GitHubConfig): GitHubClient {
    return new GitHubClient(config);
}

/**
 * Analyze commit message using conventional commits
 */
export interface ConventionalCommit {
    type: string;
    scope?: string;
    description: string;
    body?: string;
    footer?: string;
    breaking: boolean;
    raw: string;
}

export function parseConventionalCommit(message: string | undefined): ConventionalCommit | undefined {
    // Handle undefined/null messages
    if (!message || typeof message !== 'string') {
        return undefined;
    }

    // Try strict conventional commit format first
    const conventionalCommitRegex = /^(\w+)(\(([^)]+)\))?(!)?:\s*(.+)$/;
    const match = message.match(conventionalCommitRegex);

    if (match) {
        const [, type, , scope, breaking, description] = match;
        const lines = message.split('\n');
        const body = lines.slice(1).join('\n').trim();

        return {
            type: type.toLowerCase(),
            scope,
            description,
            body: body || undefined,
            breaking: !!breaking || message.includes('BREAKING CHANGE'),
            raw: message,
        };
    }

    // If no strict match, try to infer type from message content
    const messageLower = message.toLowerCase();

    // Look for common patterns
    if (messageLower.startsWith('fix') || messageLower.includes('bug') || messageLower.includes('hotfix')) {
        return {
            type: 'fix',
            description: message.split('\n')[0],
            breaking: message.includes('BREAKING CHANGE'),
            raw: message,
        };
    }

    if (messageLower.startsWith('feat') || messageLower.startsWith('add') || messageLower.startsWith('implement')) {
        return {
            type: 'feat',
            description: message.split('\n')[0],
            breaking: message.includes('BREAKING CHANGE'),
            raw: message,
        };
    }

    if (messageLower.startsWith('chore') || messageLower.startsWith('update') || messageLower.startsWith('bump')) {
        return {
            type: 'chore',
            description: message.split('\n')[0],
            breaking: message.includes('BREAKING CHANGE'),
            raw: message,
        };
    }

    if (messageLower.startsWith('docs') || messageLower.includes('documentation') || messageLower.includes('readme')) {
        return {
            type: 'docs',
            description: message.split('\n')[0],
            breaking: false,
            raw: message,
        };
    }

    if (messageLower.startsWith('style') || messageLower.includes('formatting')) {
        return {
            type: 'style',
            description: message.split('\n')[0],
            breaking: false,
            raw: message,
        };
    }

    if (messageLower.startsWith('refactor') || messageLower.includes('reorganize')) {
        return {
            type: 'refactor',
            description: message.split('\n')[0],
            breaking: message.includes('BREAKING CHANGE'),
            raw: message,
        };
    }

    if (messageLower.startsWith('test') || messageLower.includes('testing')) {
        return {
            type: 'test',
            description: message.split('\n')[0],
            breaking: false,
            raw: message,
        };
    }

    return undefined;
}

/**
 * Group commits by type for changelog generation
 */
export function groupCommitsByType(commits: GitHubCommit[]): Record<string, GitHubCommit[]> {
    const groups: Record<string, GitHubCommit[]> = {};

    commits.forEach(commit => {
        // Handle missing commit message
        if (!commit || !commit.message) {
            return;
        }

        const parsed = parseConventionalCommit(commit.message);
        const type = parsed?.type ?? 'other';

        if (!groups[type]) {
            groups[type] = [];
        }
        groups[type].push(commit);
    });

    return groups;
}

export interface CommitFilterSettings {
    includeBreakingChanges: boolean;
    includeFixes: boolean;
    includeFeatures: boolean;
    includeChores: boolean;
    customCommitTypes: string[];
}

/**
 * Check if commit should be included based on settings
 */
export function shouldIncludeCommit(
    commit: GitHubCommit,
    settings: CommitFilterSettings
): boolean {
    // Handle missing commit message
    if (!commit || !commit.message) {
        // console.log('Excluding commit: no message');
        return false;
    }

    const parsed = parseConventionalCommit(commit.message);

    // console.log('Checking commit:', {
    //     message: commit.message.substring(0, 50) + '...',
    //     parsed: parsed ? `${parsed.type}${parsed.scope ? `(${parsed.scope})` : ''}` : 'no-conventional-format',
    //     breaking: parsed?.breaking ?? false
    // });

    // Always include breaking changes if enabled
    if (parsed?.breaking && settings.includeBreakingChanges) {
        // console.log('✓ Including: breaking change');
        return true;
    }

    if (parsed) {
        // Check specific conventional commit types
        switch (parsed.type) {
            case 'feat':
            case 'feature':
                if (settings.includeFeatures) {
                    // console.log('✓ Including: feature');
                    return true;
                }
                break;
            case 'fix':
                if (settings.includeFixes) {
                    // console.log('✓ Including: fix');
                    return true;
                }
                break;
            case 'chore':
                if (settings.includeChores) {
                    // console.log('✓ Including: chore');
                    return true;
                }
                break;
            default:
                // Check custom commit types
                if (settings.customCommitTypes.includes(parsed.type)) {
                    // console.log(`✓ Including: custom type (${parsed.type})`);
                    return true;
                }
                break;
        }

        console.log(`✗ Excluding: ${parsed.type} not in enabled types`);
        return false;
    }

    // No conventional commit format - be more lenient
    // Include if ANY of the basic types are enabled OR if 'other' is in custom types
    const hasBasicTypesEnabled = settings.includeFeatures || settings.includeFixes || settings.includeChores;
    const includesOther = settings.customCommitTypes.includes('other');

    if (hasBasicTypesEnabled || includesOther) {
        // console.log('✓ Including: non-conventional commit (basic types enabled or "other" included)');
        return true;
    }

    // console.log('✗ Excluding: non-conventional commit and no basic types enabled');
    return false;
}