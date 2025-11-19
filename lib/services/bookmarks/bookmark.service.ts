// /lib/services/bookmarks/bookmark.service.ts

interface BookmarkedItem {
    id: string;
    title: string;
    projectId: string;
    bookmarkedAt: string;
}

interface BookmarkStorage {
    items: BookmarkedItem[];
    lastUpdated: string;
}

export class BookmarkService {
    private static readonly STORAGE_PREFIX = 'bookmarked-';
    private static readonly GLOBAL_BOOKMARKS_KEY = 'changerawr-global-bookmarks';

    /**
     * Get all bookmarks for a specific project
     */
    static getProjectBookmarks(projectId: string): BookmarkedItem[] {
        try {
            if (typeof window === 'undefined') return [];

            const stored = localStorage.getItem(`${this.STORAGE_PREFIX}${projectId}`);
            if (!stored) return [];

            const parsed = JSON.parse(stored) as BookmarkedItem[];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Failed to load project bookmarks:', error);
            return [];
        }
    }

    /**
     * Get all bookmarks across all projects
     */
    static getAllBookmarks(): Record<string, BookmarkedItem[]> {
        try {
            if (typeof window === 'undefined') return {};

            const stored = localStorage.getItem(this.GLOBAL_BOOKMARKS_KEY);
            if (!stored) {
                // Migrate from old storage format if needed
                return this.migrateOldBookmarks();
            }

            const parsed = JSON.parse(stored) as BookmarkStorage;

            // Group by project ID
            const grouped: Record<string, BookmarkedItem[]> = {};
            parsed.items.forEach(item => {
                if (!grouped[item.projectId]) {
                    grouped[item.projectId] = [];
                }
                grouped[item.projectId].push(item);
            });

            return grouped;
        } catch (error) {
            console.error('Failed to load all bookmarks:', error);
            return {};
        }
    }

    /**
     * Check if a changelog entry is bookmarked
     */
    static isBookmarked(entryId: string, projectId: string): boolean {
        const bookmarks = this.getProjectBookmarks(projectId);
        return bookmarks.some(bookmark => bookmark.id === entryId);
    }

    /**
     * Add a bookmark
     */
    static addBookmark(entryId: string, title: string, projectId: string): boolean {
        try {
            if (this.isBookmarked(entryId, projectId)) {
                return false; // Already bookmarked
            }

            const newBookmark: BookmarkedItem = {
                id: entryId,
                title,
                projectId,
                bookmarkedAt: new Date().toISOString()
            };

            // Update project-specific storage
            const projectBookmarks = this.getProjectBookmarks(projectId);
            projectBookmarks.push(newBookmark);
            localStorage.setItem(
                `${this.STORAGE_PREFIX}${projectId}`,
                JSON.stringify(projectBookmarks)
            );

            // Update global storage
            this.updateGlobalBookmarks();

            return true;
        } catch (error) {
            console.error('Failed to add bookmark:', error);
            return false;
        }
    }

    /**
     * Remove a bookmark
     */
    static removeBookmark(entryId: string, projectId: string): boolean {
        try {
            const projectBookmarks = this.getProjectBookmarks(projectId);
            const filtered = projectBookmarks.filter(bookmark => bookmark.id !== entryId);

            if (filtered.length === projectBookmarks.length) {
                return false; // Bookmark didn't exist
            }

            localStorage.setItem(
                `${this.STORAGE_PREFIX}${projectId}`,
                JSON.stringify(filtered)
            );

            // Update global storage
            this.updateGlobalBookmarks();

            return true;
        } catch (error) {
            console.error('Failed to remove bookmark:', error);
            return false;
        }
    }

    /**
     * Toggle a bookmark (add if not exists, remove if exists)
     */
    static toggleBookmark(entryId: string, title: string, projectId: string): boolean {
        const isCurrentlyBookmarked = this.isBookmarked(entryId, projectId);

        if (isCurrentlyBookmarked) {
            return this.removeBookmark(entryId, projectId);
        } else {
            return this.addBookmark(entryId, title, projectId);
        }
    }

    /**
     * Update bookmark title (in case the entry title changes)
     */
    static updateBookmarkTitle(entryId: string, newTitle: string, projectId: string): boolean {
        try {
            const projectBookmarks = this.getProjectBookmarks(projectId);
            const bookmarkIndex = projectBookmarks.findIndex(bookmark => bookmark.id === entryId);

            if (bookmarkIndex === -1) {
                return false; // Bookmark doesn't exist
            }

            projectBookmarks[bookmarkIndex].title = newTitle;
            localStorage.setItem(
                `${this.STORAGE_PREFIX}${projectId}`,
                JSON.stringify(projectBookmarks)
            );

            // Update global storage
            this.updateGlobalBookmarks();

            return true;
        } catch (error) {
            console.error('Failed to update bookmark title:', error);
            return false;
        }
    }

    /**
     * Clear all bookmarks for a project
     */
    static clearProjectBookmarks(projectId: string): boolean {
        try {
            localStorage.removeItem(`${this.STORAGE_PREFIX}${projectId}`);
            this.updateGlobalBookmarks();
            return true;
        } catch (error) {
            console.error('Failed to clear project bookmarks:', error);
            return false;
        }
    }

    /**
     * Get bookmark count for a project
     */
    static getProjectBookmarkCount(projectId: string): number {
        return this.getProjectBookmarks(projectId).length;
    }

    /**
     * Get recently bookmarked items across all projects
     */
    static getRecentBookmarks(limit: number = 10): BookmarkedItem[] {
        const allBookmarks = this.getAllBookmarks();
        const allItems: BookmarkedItem[] = [];

        Object.values(allBookmarks).forEach(projectBookmarks => {
            allItems.push(...projectBookmarks);
        });

        return allItems
            .sort((a, b) => new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime())
            .slice(0, limit);
    }

    /**
     * Search bookmarks by title
     */
    static searchBookmarks(query: string, projectId?: string): BookmarkedItem[] {
        const searchTerm = query.toLowerCase().trim();
        if (!searchTerm) return [];

        let bookmarks: BookmarkedItem[] = [];

        if (projectId) {
            bookmarks = this.getProjectBookmarks(projectId);
        } else {
            const allBookmarks = this.getAllBookmarks();
            Object.values(allBookmarks).forEach(projectBookmarks => {
                bookmarks.push(...projectBookmarks);
            });
        }

        return bookmarks.filter(bookmark =>
            bookmark.title.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Export bookmarks as JSON
     */
    static exportBookmarks(): string {
        const allBookmarks = this.getAllBookmarks();
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            bookmarks: allBookmarks
        }, null, 2);
    }

    /**
     * Import bookmarks from JSON
     */
    static importBookmarks(jsonData: string): boolean {
        try {
            const parsed = JSON.parse(jsonData);
            if (!parsed.bookmarks || typeof parsed.bookmarks !== 'object') {
                throw new Error('Invalid bookmark data format');
            }

            Object.entries(parsed.bookmarks).forEach(([projectId, bookmarks]) => {
                if (Array.isArray(bookmarks)) {
                    localStorage.setItem(
                        `${this.STORAGE_PREFIX}${projectId}`,
                        JSON.stringify(bookmarks)
                    );
                }
            });

            this.updateGlobalBookmarks();
            return true;
        } catch (error) {
            console.error('Failed to import bookmarks:', error);
            return false;
        }
    }

    /**
     * Update the global bookmarks storage from all project-specific storages
     */
    private static updateGlobalBookmarks(): void {
        try {
            const allItems: BookmarkedItem[] = [];

            // Collect all bookmarks from project-specific storage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.STORAGE_PREFIX) && key !== this.GLOBAL_BOOKMARKS_KEY) {
                    const projectBookmarks = JSON.parse(localStorage.getItem(key) || '[]');
                    if (Array.isArray(projectBookmarks)) {
                        allItems.push(...projectBookmarks);
                    }
                }
            }

            const globalStorage: BookmarkStorage = {
                items: allItems,
                lastUpdated: new Date().toISOString()
            };

            localStorage.setItem(this.GLOBAL_BOOKMARKS_KEY, JSON.stringify(globalStorage));
        } catch (error) {
            console.error('Failed to update global bookmarks:', error);
        }
    }

    /**
     * Migrate from old storage format to new global format
     */
    private static migrateOldBookmarks(): Record<string, BookmarkedItem[]> {
        const grouped: Record<string, BookmarkedItem[]> = {};

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.STORAGE_PREFIX)) {
                    const projectId = key.replace(this.STORAGE_PREFIX, '');
                    const bookmarks = JSON.parse(localStorage.getItem(key) || '[]');

                    if (Array.isArray(bookmarks)) {
                        // Ensure bookmarks have the bookmarkedAt field
                        const migratedBookmarks = bookmarks.map(bookmark => ({
                            ...bookmark,
                            bookmarkedAt: bookmark.bookmarkedAt || new Date().toISOString()
                        }));

                        grouped[projectId] = migratedBookmarks;

                        // Update the project storage with migrated data
                        localStorage.setItem(key, JSON.stringify(migratedBookmarks));
                    }
                }
            }

            // Create global storage
            this.updateGlobalBookmarks();
        } catch (error) {
            console.error('Failed to migrate bookmarks:', error);
        }

        return grouped;
    }
}

export type { BookmarkedItem };