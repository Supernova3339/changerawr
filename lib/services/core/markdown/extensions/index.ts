/**
 * Custom Markdown Extensions for Changerawr
 *
 * This module exports all custom extensions that enhance the base markdown engine.
 */

import { Extension } from '@changerawr/markdown';
import { tableExtension } from './table/table';
import { subtextExtension } from './subtext/subtext';

/**
 * Array of all custom extensions
 * Extensions are registered in order, with feature extensions taking priority
 */
export const customExtensions: Extension[] = [
  tableExtension,
  subtextExtension
];

/**
 * Get a specific extension by name
 */
export function getExtension(name: string): Extension | undefined {
  return customExtensions.find(ext => ext.name === name);
}

/**
 * Get all extension names
 */
export function getExtensionNames(): string[] {
  return customExtensions.map(ext => ext.name);
}

/**
 * Export individual extensions for selective use
 */
export { tableExtension } from './table/table';
export { subtextExtension } from './subtext/subtext';