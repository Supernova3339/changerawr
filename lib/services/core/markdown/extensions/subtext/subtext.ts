import { Extension, MarkdownToken } from '@changerawr/markdown';

/**
 * Subtext Extension for Changerawr Markdown
 *
 * Supports Discord-style subtext for smaller, muted secondary information.
 *
 * Syntax: -# text
 *
 * Examples:
 * -# This is smaller muted text
 * Regular paragraph above
 * -# Supporting details below
 */

const subtextExtension: Extension = {
  name: 'subtext',
  parseRules: [
    {
      name: 'subtext-line',
      // Matches -# text (Discord subtext format) - must match at line start
      pattern: /-#\s+([^\n]+)/,
      render: (match): MarkdownToken => {
        return {
          type: 'subtext',
          content: match[1],
          raw: match[0],
          attributes: {
            variant: 'inline'
          }
        };
      }
    }
  ],
  renderRules: [
    {
      type: 'subtext',
      render: (token): string => {
        return `<p class="text-sm text-gray-600 dark:text-gray-400 my-2">${token.content}</p>`;
      }
    }
  ]
};

export { subtextExtension };