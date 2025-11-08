/**
 * Hook/utility to register custom extensions with the markdown engine
 *
 * Usage:
 * import { renderMarkdown, parseMarkdown } from '@/lib/services/core/markdown/useCustomExtensions';
 *
 * const html = renderMarkdown(markdownContent);
 * const tokens = parseMarkdown(markdownContent);
 */

import { ChangerawrMarkdown, EngineConfig } from '@changerawr/markdown';
import { customExtensions } from './extensions';

// Singleton instance with all custom extensions registered
let engineInstance: ChangerawrMarkdown | null = null;

/**
 * Get or create the singleton markdown engine with all custom extensions
 */
function getMarkdownEngine(): ChangerawrMarkdown {
  if (!engineInstance) {
    engineInstance = new ChangerawrMarkdown();

    // Register all custom extensions (feature extensions have priority)
    customExtensions.forEach(extension => {
      const result = engineInstance!.registerExtension(extension);
      if (!result.success) {
        console.warn(`Failed to register extension '${extension.name}':`, result.error);
      }
    });
  }

  return engineInstance;
}

/**
 * Render markdown with all custom extensions
 * This is the main function to use for rendering markdown throughout the app
 *
 * Note: The engine automatically caches rendered HTML internally using LRU caching.
 * No need for manual memoization - the engine handles it!
 */
export function renderMarkdown(markdown: string): string {
  const engine = getMarkdownEngine();
  return engine.toHtml(markdown);
}

/**
 * Render markdown with performance metrics
 * Returns both HTML and detailed performance data
 */
export function renderMarkdownWithMetrics(markdown: string): { html: string; metrics: { parseTime: number; renderTime: number; totalTime: number; cacheHit: boolean } } {
  const engine = getMarkdownEngine();
  return engine.toHtmlWithMetrics(markdown);
}

/**
 * Render markdown with streaming for large documents
 * Provides progress callbacks for UI updates
 */
export async function renderMarkdownStreamed(
  markdown: string,
  options?: {
    chunkSize?: number;
    onProgress?: (progress: { html: string; progress: number }) => void;
  }
): Promise<string> {
  const engine = getMarkdownEngine();
  return engine.toHtmlStreamed(markdown, {
    chunkSize: options?.chunkSize || 50,
    onChunk: options?.onProgress
  });
}

/**
 * Get cache statistics from the engine
 */
export function getCacheStats() {
  const engine = getMarkdownEngine();
  return engine.getCacheStats();
}

/**
 * Clear all caches in the engine
 */
export function clearCaches() {
  const engine = getMarkdownEngine();
  engine.clearCaches();
}

/**
 * Parse markdown with all custom extensions into tokens
 */
export function parseMarkdown(markdown: string) {
  const engine = getMarkdownEngine();
  return engine.parse(markdown);
}

/**
 * Create a fresh engine instance (useful for testing)
 */
export function createEngineWithExtensions(config?: EngineConfig): ChangerawrMarkdown {
  const engine = new ChangerawrMarkdown(config);

  // Register all custom extensions
  customExtensions.forEach(extension => {
    const result = engine.registerExtension(extension);
    if (!result.success) {
      console.warn(`Failed to register extension '${extension.name}':`, result.error);
    }
  });

  return engine;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetEngineInstance(): void {
  engineInstance = null;
}