/**
 * Text formatting and manipulation utilities
 *//**
 * Truncate text to a maximum length with ellipsis.
 * More reliable than CSS truncate for consistent server-side and client-side rendering.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 60)
 * @returns Truncated text with ellipsis if needed
 *
 * @example
 * truncateText("This is a very long title that needs to be shortened", 20)
 * // Returns: "This is a very long..."
 */
export function truncateText(text: string, maxLength: number = 60): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength).trim() + '...'
}