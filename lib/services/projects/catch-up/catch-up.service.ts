import {db} from '@/lib/db';
import type {
    CatchUpResponse,
    CatchUpEntry,
    CatchUpSummary
} from '@/lib/types/projects/catch-up/types';

export class CatchUpService {
    /**
     * Get catch-up data for a project since a specified point
     */
    static async getCatchUpData(
        projectId: string,
        userId: string,
        since: string = 'auto'
    ): Promise<CatchUpResponse> {
        console.log('getCatchUpData called with:', {projectId, userId, since});

        // Verify project exists
        const project = await db.project.findUnique({
            where: {id: projectId},
            include: {changelog: true},
        });

        if (!project) {
            throw new Error('Project not found');
        }

        if (!project.changelog) {
            console.log('No changelog found for project');
            return {
                fromDate: new Date().toISOString(),
                fromVersion: null,
                toVersion: null,
                totalEntries: 0,
                summary: {features: 0, fixes: 0, other: 0},
                entries: [],
            };
        }

        // Determine the "since" date
        const fromDate = await this.determineSinceDate(userId, since, project.changelog.id);
        console.log('Determined fromDate:', fromDate);

        // Get entries since that date - Updated query logic
        const entries = await db.changelogEntry.findMany({
            where: {
                changelogId: project.changelog.id,
                OR: [
                    {
                        publishedAt: {
                            gte: fromDate,
                            lte: new Date(), // Don't include future scheduled entries
                        },
                    },
                    {
                        // Include unpublished entries created after the fromDate
                        publishedAt: null,
                        createdAt: {
                            gte: fromDate,
                        },
                    },
                ],
            },
            include: {
                tags: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
            orderBy: [
                {publishedAt: {sort: 'desc', nulls: 'last'}},
                {createdAt: 'desc'},
            ],
        });

        console.log('Found entries:', entries.length);
        console.log('Entry details:', entries.map(e => ({
            id: e.id,
            title: e.title,
            version: e.version,
            publishedAt: e.publishedAt,
            createdAt: e.createdAt,
        })));

        // Find version range
        const {fromVersion, toVersion} = await this.getVersionRange(entries, fromDate, project.changelog.id);
        console.log('Version range:', {fromVersion, toVersion});

        // Categorize entries
        const summary = this.categorizeEntries(entries);
        console.log('Summary:', summary);

        return {
            fromDate: fromDate.toISOString(),
            fromVersion,
            toVersion,
            totalEntries: entries.length,
            summary,
            entries: entries.map(entry => ({
                id: entry.id,
                title: entry.title,
                content: entry.content,
                version: entry.version,
                publishedAt: entry.publishedAt,
                tags: entry.tags,
            })),
        };
    }

    /**
     * Determine the starting date based on the "since" parameter
     */
    private static async determineSinceDate(
        userId: string,
        since: string,
        changelogId: string
    ): Promise<Date> {
        console.log('determineSinceDate called with:', {userId, since, changelogId});

        if (since === 'auto') {
            // Try to use user's last login
            const user = await db.user.findUnique({
                where: {id: userId},
                select: {lastLoginAt: true},
            });

            if (user?.lastLoginAt) {
                console.log('Using user lastLoginAt:', user.lastLoginAt);
                return user.lastLoginAt;
            }

            // Fallback: 7 days ago
            const fallbackDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            console.log('Using 7-day fallback:', fallbackDate);
            return fallbackDate;
        }

        // Handle version format (e.g., "v1.2.0", "1.3.1")
        if (since.match(/^v?\d+\.\d+/)) {
            // Try both with and without 'v' prefix
            const versionVariants = [
                since,
                since.startsWith('v') ? since.substring(1) : `v${since}`,
            ];

            console.log('Looking for version variants:', versionVariants);

            for (const versionVariant of versionVariants) {
                const entry = await db.changelogEntry.findFirst({
                    where: {
                        changelogId,
                        version: versionVariant,
                    },
                    select: {publishedAt: true, createdAt: true, version: true},
                    orderBy: {publishedAt: 'asc'},
                });

                console.log('Version search result for', versionVariant, ':', entry);

                if (entry) {
                    // Use publishedAt if available, otherwise createdAt
                    const dateToUse = entry.publishedAt || entry.createdAt;
                    console.log('Using date from version entry:', dateToUse);
                    return dateToUse;
                }
            }

            // Debug: Let's see what versions exist
            const allVersions = await db.changelogEntry.findMany({
                where: {changelogId},
                select: {version: true, publishedAt: true, createdAt: true},
            });
            console.log('All available versions in changelog:', allVersions);

            // If version not found, fallback to 7 days ago
            const fallbackDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            console.log('Version not found, using 7-day fallback:', fallbackDate);
            return fallbackDate;
        }

        // Handle relative dates (e.g., "7d", "1w", "1m")
        const relativeMatch = since.match(/^(\d+)([dwm])$/);
        if (relativeMatch) {
            const [, amount, unit] = relativeMatch;
            const multipliers = {d: 1, w: 7, m: 30};
            const days = parseInt(amount) * multipliers[unit as keyof typeof multipliers];
            const relativeDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            console.log('Using relative date:', relativeDate);
            return relativeDate;
        }

        // Handle ISO date format
        try {
            const parsedDate = new Date(since);
            if (!isNaN(parsedDate.getTime())) {
                console.log('Using parsed ISO date:', parsedDate);
                return parsedDate;
            }
        } catch {
            // Invalid date format
        }

        // Fallback: 7 days ago
        const fallbackDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        console.log('Using final fallback:', fallbackDate);
        return fallbackDate;
    }

    /**
     * Get the version range for the entries
     */
    private static async getVersionRange(
        entries: CatchUpEntry[],
        fromDate: Date,
        changelogId: string
    ): Promise<{ fromVersion: string | null; toVersion: string | null }> {
        if (entries.length === 0) {
            return {fromVersion: null, toVersion: null};
        }

        // Get the latest version
        const latestEntry = entries.find(entry => entry.version);
        const toVersion = latestEntry?.version || null;

        // Find the version that was current at the fromDate
        const fromVersionEntry = await db.changelogEntry.findFirst({
            where: {
                changelogId,
                publishedAt: {lte: fromDate},
                version: {not: null},
            },
            select: {version: true},
            orderBy: {publishedAt: 'desc'},
        });

        return {
            fromVersion: fromVersionEntry?.version || null,
            toVersion,
        };
    }

    /**
     * Categorize entries by tag types
     */
    private static categorizeEntries(entries: CatchUpEntry[]): CatchUpSummary {
        const summary: CatchUpSummary = {
            features: 0,
            fixes: 0,
            other: 0,
        };

        for (const entry of entries) {
            const tagNames = entry.tags.map(tag => tag.name.toLowerCase());

            if (tagNames.some(name =>
                name.includes('feature') ||
                name.includes('enhancement') ||
                name.includes('new') ||
                name.includes('feat')
            )) {
                summary.features++;
            } else if (tagNames.some(name =>
                name.includes('fix') ||
                name.includes('bug') ||
                name.includes('patch') ||
                name.includes('hotfix')
            )) {
                summary.fixes++;
            } else {
                summary.other++;
            }
        }

        return summary;
    }
}