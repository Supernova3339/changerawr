// /lib/hooks/useBookmarks.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookmarkService, type BookmarkedItem } from '@/lib/services/bookmarks/bookmark.service';

interface UseBookmarksOptions {
    projectId?: string;
    entryId?: string;
}

interface UseBookmarksReturn {
    // State
    bookmarks: BookmarkedItem[];
    isBookmarked: boolean;
    isLoading: boolean;

    // Actions
    toggleBookmark: (entryId: string, title: string, projectId: string) => Promise<boolean>;
    addBookmark: (entryId: string, title: string, projectId: string) => Promise<boolean>;
    removeBookmark: (entryId: string, projectId: string) => Promise<boolean>;
    updateBookmarkTitle: (entryId: string, newTitle: string, projectId: string) => Promise<boolean>;

    // Utilities
    getBookmarkCount: (projectId: string) => number;
    searchBookmarks: (query: string, projectId?: string) => BookmarkedItem[];
    refreshBookmarks: () => void;
}

export function useBookmarks(options: UseBookmarksOptions = {}): UseBookmarksReturn {
    const { projectId, entryId } = options;

    const [bookmarks, setBookmarks] = useState<BookmarkedItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load bookmarks from localStorage
    const loadBookmarks = useCallback(() => {
        try {
            setIsLoading(true);

            if (projectId) {
                const projectBookmarks = BookmarkService.getProjectBookmarks(projectId);
                setBookmarks(projectBookmarks);
            } else {
                // Load all bookmarks if no specific project
                const allBookmarks = BookmarkService.getAllBookmarks();
                const flattenedBookmarks: BookmarkedItem[] = [];
                Object.values(allBookmarks).forEach(projectBookmarks => {
                    flattenedBookmarks.push(...projectBookmarks);
                });
                setBookmarks(flattenedBookmarks);
            }
        } catch (error) {
            console.error('Failed to load bookmarks:', error);
            setBookmarks([]);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    // Load bookmarks on mount and when projectId changes
    useEffect(() => {
        loadBookmarks();
    }, [loadBookmarks]);

    // Listen for storage changes from other tabs/windows
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key?.startsWith('bookmarked-') || event.key === 'changerawr-global-bookmarks') {
                loadBookmarks();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [loadBookmarks]);

    // Check if current entry is bookmarked
    const isBookmarked = useMemo(() => {
        if (!entryId || !projectId) return false;
        return BookmarkService.isBookmarked(entryId, projectId);
    }, [entryId, projectId, bookmarks]);

    // Bookmark actions
    const toggleBookmark = useCallback(async (entryId: string, title: string, projectId: string): Promise<boolean> => {
        try {
            const success = BookmarkService.toggleBookmark(entryId, title, projectId);
            if (success) {
                loadBookmarks(); // Refresh local state
            }
            return success;
        } catch (error) {
            console.error('Failed to toggle bookmark:', error);
            return false;
        }
    }, [loadBookmarks]);

    const addBookmark = useCallback(async (entryId: string, title: string, projectId: string): Promise<boolean> => {
        try {
            const success = BookmarkService.addBookmark(entryId, title, projectId);
            if (success) {
                loadBookmarks(); // Refresh local state
            }
            return success;
        } catch (error) {
            console.error('Failed to add bookmark:', error);
            return false;
        }
    }, [loadBookmarks]);

    const removeBookmark = useCallback(async (entryId: string, projectId: string): Promise<boolean> => {
        try {
            const success = BookmarkService.removeBookmark(entryId, projectId);
            if (success) {
                loadBookmarks(); // Refresh local state
            }
            return success;
        } catch (error) {
            console.error('Failed to remove bookmark:', error);
            return false;
        }
    }, [loadBookmarks]);

    const updateBookmarkTitle = useCallback(async (entryId: string, newTitle: string, projectId: string): Promise<boolean> => {
        try {
            const success = BookmarkService.updateBookmarkTitle(entryId, newTitle, projectId);
            if (success) {
                loadBookmarks(); // Refresh local state
            }
            return success;
        } catch (error) {
            console.error('Failed to update bookmark title:', error);
            return false;
        }
    }, [loadBookmarks]);

    // Utility functions
    const getBookmarkCount = useCallback((projectId: string): number => {
        return BookmarkService.getProjectBookmarkCount(projectId);
    }, []);

    const searchBookmarks = useCallback((query: string, searchProjectId?: string): BookmarkedItem[] => {
        return BookmarkService.searchBookmarks(query, searchProjectId);
    }, []);

    const refreshBookmarks = useCallback(() => {
        loadBookmarks();
    }, [loadBookmarks]);

    return {
        // State
        bookmarks,
        isBookmarked,
        isLoading,

        // Actions
        toggleBookmark,
        addBookmark,
        removeBookmark,
        updateBookmarkTitle,

        // Utilities
        getBookmarkCount,
        searchBookmarks,
        refreshBookmarks,
    };
}

// Hook for global bookmark management
export function useGlobalBookmarks(): UseBookmarksReturn {
    return useBookmarks(); // No projectId means all bookmarks
}

// Hook specifically for checking if an entry is bookmarked
export function useIsBookmarked(entryId: string, projectId: string): boolean {
    const [isBookmarked, setIsBookmarked] = useState(false);

    useEffect(() => {
        if (!entryId || !projectId) {
            setIsBookmarked(false);
            return;
        }

        const checkBookmarkStatus = () => {
            const bookmarked = BookmarkService.isBookmarked(entryId, projectId);
            setIsBookmarked(bookmarked);
        };

        checkBookmarkStatus();

        // Listen for storage changes
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key?.startsWith('bookmarked-') || event.key === 'changerawr-global-bookmarks') {
                checkBookmarkStatus();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [entryId, projectId]);

    return isBookmarked;
}