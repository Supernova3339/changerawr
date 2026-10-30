import {
    GitHubClient,
    GitHubCommit,
    parseConventionalCommit,
    shouldIncludeCommit
} from './client';
import { createHalesisClient } from '@/lib/utils/ai/halesis';

export interface FileChange {
    filename: string;
    status: 'added' | 'modified' | 'removed' | 'renamed';
    additions: number;
    deletions: number;
    patch?: string;
}

export interface CommitData {
    sha: string;
    message: string;
    author: string;
    date: string;
    files: FileChange[];
    url: string;
}

export interface ChangelogEntry {
    category: 'Features' | 'Bug Fixes' | 'Breaking Changes' | 'Documentation' | 'Refactoring' | 'Performance' | 'Other';
    description: string;
    files: string[];
    commit: string;
    impact?: string;
    technicalDetails?: string;
}

export interface ChangelogGenerationOptions {
    includeBreakingChanges: boolean;
    includeFixes: boolean;
    includeFeatures: boolean;
    includeChores: boolean;
    customCommitTypes: string[];
    useAI: boolean;
    aiApiKey?: string;
    aiModel?: string;
    groupByType: boolean;
    includeCommitLinks: boolean;
    repositoryUrl: string;
    includeCodeAnalysis: boolean;
    maxCommitsToAnalyze?: number;
}

export interface GeneratedChangelog {
    content: string;
    version?: string;
    commits: CommitData[];
    entries: ChangelogEntry[];
    metadata: {
        totalCommits: number;
        analyzedCommits: number;
        aiGenerated: boolean;
        hasCodeAnalysis: boolean;
        model?: string;
        generatedAt: string;
    };
}

/**
 * Safe text cleaning that avoids JSON parsing issues
 */
function cleanText(text: string | undefined | null): string {
    if (!text) return '';

    return text
        // Remove control characters except newlines and tabs
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Replace problematic quotes with safe alternatives
        .replace(/"/g, "'")
        .replace(/"/g, "'")
        .replace(/"/g, "'")
        // Remove other problematic Unicode
        .replace(/[\u2028\u2029]/g, ' ')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        // Trim
        .trim();
}

/**
 * Safe truncation with word boundaries
 */
function safeTruncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    const truncated = text.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.8) {
        return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
}

/**
 * Enhanced service for generating changelog content from GitHub commits with AI code analysis
 */
export class GitHubChangelogGenerator {
    private client: GitHubClient;

    constructor(client: GitHubClient) {
        this.client = client;
    }

    /**
     * Generate changelog from commits between two references with code analysis
     */
    async generateChangelogBetweenRefs(
        repositoryUrl: string,
        fromRef: string,
        toRef: string,
        options: ChangelogGenerationOptions
    ): Promise<GeneratedChangelog> {
        console.log(`Fetching commits between ${fromRef} and ${toRef}`);

        const commits = await this.client.getCommitsBetween(repositoryUrl, fromRef, toRef);
        console.log(`Found ${commits.length} commits between refs`);

        return this.generateChangelogFromCommits(commits, repositoryUrl, options);
    }

    /**
     * Generate changelog from recent commits with code analysis
     */
    async generateChangelogFromRecent(
        repositoryUrl: string,
        daysBack: number,
        options: ChangelogGenerationOptions
    ): Promise<GeneratedChangelog> {
        const since = new Date();
        since.setDate(since.getDate() - daysBack);

        console.log(`Fetching commits since ${since.toISOString()}`);

        const commits = await this.client.getCommits(repositoryUrl, {
            since: since.toISOString(),
            per_page: Math.min(options.maxCommitsToAnalyze ?? 50, 100)
        });

        console.log(`Found ${commits.length} commits in the last ${daysBack} days`);

        return this.generateChangelogFromCommits(commits, repositoryUrl, options);
    }

    /**
     * Generate changelog from a list of commits with optional AI code analysis
     */
    async generateChangelogFromCommits(
        commits: GitHubCommit[],
        repositoryUrl: string,
        options: ChangelogGenerationOptions
    ): Promise<GeneratedChangelog> {
        console.log(`Processing ${commits.length} commits`);

        // Filter commits based on settings
        const filteredCommits = commits.filter(commit =>
            shouldIncludeCommit(commit, options)
        );

        console.log(`${filteredCommits.length} commits passed filtering`);

        if (filteredCommits.length === 0) {
            return {
                content: 'No significant changes found in the selected commits.',
                commits: [],
                entries: [],
                metadata: {
                    totalCommits: commits.length,
                    analyzedCommits: 0,
                    aiGenerated: false,
                    hasCodeAnalysis: false,
                    generatedAt: new Date().toISOString()
                }
            };
        }

        // Convert GitHub commits to our format with safe text cleaning
        const commitData: CommitData[] = filteredCommits.map(commit => ({
            sha: commit.sha,
            message: cleanText(commit.message),
            author: cleanText(commit.author?.name) || 'Unknown',
            date: commit.author?.date ?? new Date().toISOString(),
            files: [], // Will be populated later if code analysis is enabled
            url: commit.url ?? `${repositoryUrl}/commit/${commit.sha}`
        }));

        // Get file changes if code analysis is enabled
        if (options.includeCodeAnalysis && options.useAI && options.aiApiKey) {
            console.log('Fetching file changes for code analysis...');
            await this.enrichCommitsWithFileData(commitData, repositoryUrl);
        }

        // Generate changelog entries
        let entries: ChangelogEntry[];
        if (options.useAI && options.aiApiKey) {
            console.log('Generating changelog entries with AI analysis...');
            entries = await this.generateEntriesWithAI(commitData, options);
        } else {
            console.log('Generating basic changelog entries...');
            entries = this.generateBasicEntries(commitData);
        }

        // Generate markdown content
        const content = this.generateMarkdownContent(entries, options);

        // Try to infer version
        const version = await this.inferVersion(commitData, repositoryUrl);

        return {
            content,
            version,
            commits: commitData,
            entries,
            metadata: {
                totalCommits: commits.length,
                analyzedCommits: commitData.length,
                aiGenerated: options.useAI && !!options.aiApiKey,
                hasCodeAnalysis: options.includeCodeAnalysis && !!options.aiApiKey,
                model: options.aiModel,
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Enrich commit data with file changes
     */
    private async enrichCommitsWithFileData(
        commitData: CommitData[],
        repositoryUrl: string
    ): Promise<void> {
        const maxCommitsToAnalyze = Math.min(commitData.length, 10); // Limit to prevent API abuse

        for (let i = 0; i < maxCommitsToAnalyze; i++) {
            const commit = commitData[i];

            try {
                console.log(`Fetching file data for commit ${commit.sha.substring(0, 7)}...`);

                const detailedCommit = await this.client.getCommit(repositoryUrl, commit.sha);

                if (detailedCommit.files) {
                    commit.files = detailedCommit.files.map(file => ({
                        filename: cleanText(file.filename),
                        status: file.status,
                        additions: file.additions || 0,
                        deletions: file.deletions || 0,
                        patch: file.patch ? safeTruncate(cleanText(file.patch), 500) : undefined
                    }));
                }

                // Rate limiting
                await this.delay(300);

            } catch (error) {
                console.warn(`Failed to fetch file data for commit ${commit.sha}:`, error);
                // Continue with empty files array
            }
        }
    }

    /**
     * Generate changelog entries using AI analysis with safer approach
     */
    private async generateEntriesWithAI(
        commits: CommitData[],
        options: ChangelogGenerationOptions
    ): Promise<ChangelogEntry[]> {
        if (!options.aiApiKey) {
            throw new Error('AI API key is required for AI analysis');
        }

        const aiClient = createHalesisClient({
            apiKey: options.aiApiKey,
            defaultModel: options.aiModel ?? 'copilot-zero'
        });

        const entries: ChangelogEntry[] = [];

        // Process commits one by one to avoid large payloads and parsing issues
        for (const commit of commits) {
            try {
                console.log(`Analyzing commit ${commit.sha.substring(0, 7)} with AI...`);

                const entry = await this.analyzeCommitWithAI(commit, aiClient);
                if (entry) {
                    entries.push(entry);
                }

                // Rate limiting
                await this.delay(1000);

            } catch (error) {
                console.error(`Error analyzing commit ${commit.sha} with AI:`, error);

                // Fallback to basic analysis for this commit
                const fallbackEntry = this.generateBasicEntry(commit);
                entries.push(fallbackEntry);
            }
        }

        return entries;
    }

    /**
     * Analyze a single commit with AI using a safer structured approach
     */
    private async analyzeCommitWithAI(
        commit: CommitData,
        aiClient: ReturnType<typeof createHalesisClient>
    ): Promise<ChangelogEntry | null> {
        // Build a simple, structured prompt without JSON
        const prompt = this.buildStructuredPrompt(commit);

        try {
            const response = await aiClient.generateText(prompt, {
                temperature: 0.3,
                max_tokens: 500
            });

            // Parse the structured response instead of JSON
            return this.parseStructuredResponse(response, commit);

        } catch (error) {
            console.error('AI analysis failed for commit:', error);
            return this.generateBasicEntry(commit);
        }
    }

    /**
     * Build a structured prompt that avoids JSON parsing issues
     */
    private buildStructuredPrompt(commit: CommitData): string {
        let prompt = `Analyze this git commit and provide changelog information:

COMMIT: ${commit.sha}
MESSAGE: ${safeTruncate(commit.message, 200)}
AUTHOR: ${commit.author}
FILES: ${commit.files.length} files changed`;

        if (commit.files.length > 0) {
            prompt += '\n\nFILE CHANGES:';
            commit.files.slice(0, 3).forEach(file => {
                prompt += `\n- ${file.filename} (${file.status}): +${file.additions} -${file.deletions}`;
            });
        }

        prompt += `

Please respond in this exact format:
CATEGORY: [Features|Bug Fixes|Breaking Changes|Documentation|Refactoring|Performance|Other]
DESCRIPTION: [One line description of the change]
IMPACT: [Optional: Why this matters to users]
TECHNICAL: [Optional: Technical implementation notes]

Focus on user-facing impact and be concise.`;

        return prompt;
    }

    /**
     * Parse structured AI response instead of JSON
     */
    private parseStructuredResponse(response: string, commit: CommitData): ChangelogEntry {
        const lines = response.split('\n').map(line => line.trim()).filter(Boolean);

        let category = 'Other';
        let description = safeTruncate(commit.message.split('\n')[0], 100) || 'Code changes';
        let impact: string | undefined;
        let technicalDetails: string | undefined;

        for (const line of lines) {
            if (line.startsWith('CATEGORY:')) {
                const cat = line.replace('CATEGORY:', '').trim();
                if (['Features', 'Bug Fixes', 'Breaking Changes', 'Documentation', 'Refactoring', 'Performance', 'Other'].includes(cat)) {
                    category = cat;
                }
            } else if (line.startsWith('DESCRIPTION:')) {
                const desc = line.replace('DESCRIPTION:', '').trim();
                if (desc) {
                    description = safeTruncate(desc, 150);
                }
            } else if (line.startsWith('IMPACT:')) {
                const imp = line.replace('IMPACT:', '').trim();
                if (imp) {
                    impact = safeTruncate(imp, 200);
                }
            } else if (line.startsWith('TECHNICAL:')) {
                const tech = line.replace('TECHNICAL:', '').trim();
                if (tech) {
                    technicalDetails = safeTruncate(tech, 200);
                }
            }
        }

        return {
            category: category as ChangelogEntry['category'],
            description,
            files: commit.files.map(f => f.filename),
            commit: commit.sha,
            impact,
            technicalDetails
        };
    }

    /**
     * Generate basic changelog entries without AI
     */
    private generateBasicEntries(commits: CommitData[]): ChangelogEntry[] {
        return commits.map(commit => this.generateBasicEntry(commit));
    }

    /**
     * Generate a basic entry for a single commit
     */
    private generateBasicEntry(commit: CommitData): ChangelogEntry {
        return {
            category: this.categorizeCommitMessage(commit.message) as ChangelogEntry['category'],
            description: safeTruncate(commit.message.split('\n')[0], 100) || 'Code changes',
            files: commit.files.map(f => f.filename),
            commit: commit.sha
        };
    }

    /**
     * Categorize commit message using basic rules
     */
    private categorizeCommitMessage(message: string): string {
        const msg = message.toLowerCase();

        if (msg.includes('feat') || msg.includes('add') || msg.includes('implement')) {
            return 'Features';
        }
        if (msg.includes('fix') || msg.includes('bug') || msg.includes('resolve')) {
            return 'Bug Fixes';
        }
        if (msg.includes('break') || msg.includes('!:')) {
            return 'Breaking Changes';
        }
        if (msg.includes('doc') || msg.includes('readme')) {
            return 'Documentation';
        }
        if (msg.includes('refactor') || msg.includes('clean') || msg.includes('reorganiz')) {
            return 'Refactoring';
        }
        if (msg.includes('perf') || msg.includes('optimize') || msg.includes('speed')) {
            return 'Performance';
        }

        return 'Other';
    }

    /**
     * Generate markdown content from entries
     */
    private generateMarkdownContent(entries: ChangelogEntry[], options: ChangelogGenerationOptions): string {
        const now = new Date().toISOString().split('T')[0];
        let content = `# Changelog (${now})\n\n`;

        if (entries.length === 0) {
            return content + 'No significant changes found.\n';
        }

        // Group entries by category
        const groupedEntries = entries.reduce((acc, entry) => {
            if (!acc[entry.category]) {
                acc[entry.category] = [];
            }
            acc[entry.category].push(entry);
            return acc;
        }, {} as Record<string, ChangelogEntry[]>);

        // Order categories by importance
        const categoryOrder = [
            'Breaking Changes',
            'Features',
            'Bug Fixes',
            'Performance',
            'Refactoring',
            'Documentation',
            'Other'
        ];

        categoryOrder.forEach(category => {
            const categoryEntries = groupedEntries[category];
            if (categoryEntries && categoryEntries.length > 0) {
                const emoji = this.getCategoryEmoji(category);
                content += `## ${emoji} ${category}\n\n`;

                categoryEntries.forEach(entry => {
                    content += `- ${entry.description}\n`;

                    if (entry.impact) {
                        content += `  - **Impact**: ${entry.impact}\n`;
                    }

                    if (entry.technicalDetails) {
                        content += `  - **Technical**: ${entry.technicalDetails}\n`;
                    }

                    if (options.includeCommitLinks) {
                        const shortSha = entry.commit.substring(0, 7);
                        const commitUrl = `${options.repositoryUrl}/commit/${entry.commit}`;
                        content += `  - **Commit**: [${shortSha}](${commitUrl})\n`;
                    }

                    content += '\n';
                });
            }
        });

        return content;
    }

    /**
     * Get emoji for category
     */
    private getCategoryEmoji(category: string): string {
        const emojiMap: Record<string, string> = {
            'Breaking Changes': '💥',
            'Features': '🚀',
            'Bug Fixes': '🐛',
            'Performance': '⚡',
            'Refactoring': '♻️',
            'Documentation': '📚',
            'Other': '📝'
        };
        return emojiMap[category] || '📝';
    }

    /**
     * Try to infer version from commits or recent tags
     */
    private async inferVersion(commits: CommitData[], repositoryUrl: string): Promise<string | undefined> {
        try {
            // Check if any commit messages contain version info
            for (const commit of commits) {
                const versionMatch = commit.message.match(/v?(\d+\.\d+\.\d+)/);
                if (versionMatch) {
                    return versionMatch[1];
                }
            }

            // Try to get the latest tag and increment
            const tags = await this.client.getTags(repositoryUrl, { per_page: 10 });

            if (tags.length > 0) {
                // Find the latest semantic version tag
                const versionTags = tags
                    .map(tag => ({
                        name: tag.name,
                        version: tag.name.replace(/^v/, ''),
                        parts: tag.name.replace(/^v/, '').split('.').map(Number)
                    }))
                    .filter(tag =>
                        tag.parts.length === 3 &&
                        tag.parts.every(part => !isNaN(part))
                    )
                    .sort((a, b) => {
                        for (let i = 0; i < 3; i++) {
                            if (a.parts[i] !== b.parts[i]) {
                                return b.parts[i] - a.parts[i];
                            }
                        }
                        return 0;
                    });

                if (versionTags.length > 0) {
                    const latestVersion = versionTags[0];
                    const [major, minor, patch] = latestVersion.parts;

                    // Analyze commits to determine version increment
                    const hasBreaking = commits.some(c =>
                        parseConventionalCommit(c.message)?.breaking ||
                        c.message?.includes('BREAKING')
                    );
                    const hasFeatures = commits.some(c => {
                        const parsed = parseConventionalCommit(c.message);
                        return parsed?.type === 'feat' || parsed?.type === 'feature';
                    });

                    if (hasBreaking) {
                        return `${major + 1}.0.0`;
                    } else if (hasFeatures) {
                        return `${major}.${minor + 1}.0`;
                    } else {
                        return `${major}.${minor}.${patch + 1}`;
                    }
                }
            }

            return undefined;
        } catch (error) {
            console.error('Version inference failed:', error);
            return undefined;
        }
    }

    /**
     * Get available tags for version selection
     */
    async getAvailableTags(repositoryUrl: string): Promise<Array<{ name: string; sha: string }>> {
        try {
            console.log('Fetching tags from repository:', repositoryUrl);
            const tags = await this.client.getTags(repositoryUrl, { per_page: 50 });
            console.log(`Found ${tags.length} tags`);

            return tags.map(tag => ({
                name: tag.name,
                sha: tag.commit.sha
            }));
        } catch (error) {
            console.error('Failed to fetch tags:', error);
            throw error;
        }
    }

    /**
     * Get available releases for version selection
     */
    async getAvailableReleases(repositoryUrl: string): Promise<Array<{ name: string; tagName: string }>> {
        try {
            console.log('Fetching releases from repository:', repositoryUrl);
            const releases = await this.client.getReleases(repositoryUrl, { per_page: 50 });
            console.log(`Found ${releases.length} releases`);

            return releases.map(release => ({
                name: release.name || release.tag_name,
                tagName: release.tag_name
            }));
        } catch (error) {
            console.error('Failed to fetch releases:', error);
            throw error;
        }
    }

    /**
     * Utility delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Factory function to create changelog generator
 */
export function createGitHubChangelogGenerator(client: GitHubClient): GitHubChangelogGenerator {
    return new GitHubChangelogGenerator(client);
}