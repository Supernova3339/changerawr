# Custom Markdown Extensions

This directory contains custom extensions for the `@changerawr/markdown` package that add extra markdown syntax support.

## Available Extensions

### 1. Table Extension

Supports GFM-style markdown tables with alignment control.

**Location:** `lib/services/core/markdown/extensions/table/table.ts`

**Syntax:**
```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

**With Alignment:**
```markdown
| Left | Center | Right |
|:-----|:------:|------:|
| L1   | C1     | R1    |
| L2   | C2     | R2    |
```

**Alignment Markers:**
- `:-----` = Left aligned
- `:-----:` = Center aligned
- `-----:` = Right aligned
- `-----` = Default (left)

**Features:**
- Parses headers and column alignment
- Renders with Tailwind CSS styling
- Alternating row colors for readability
- Dark mode support
- Responsive with overflow handling

---

### 2. Subtext Extension

Supports Discord-style subtext for smaller, muted secondary information.

**Location:** `lib/services/core/markdown/extensions/subtext/subtext.ts`

**Syntax:**
```markdown
-# This is smaller muted text for supporting details
```

**Example Usage:**
```markdown
## Main Content

Regular paragraph with important information.

-# This is supporting detail text that appears smaller and more muted
```

**Features:**
- Simple `-# text` syntax (Discord-style)
- Renders as small gray text
- Dark mode support
- Block-level element with proper spacing

---

## Using the Extensions

### Automatic (Recommended)

All markdown rendering throughout the app automatically includes the custom extensions. Just import from our extension module:

```typescript
import { renderMarkdown, parseMarkdown } from '@/lib/services/core/markdown/useCustomExtensions';

// Render markdown with all extensions enabled
const html = renderMarkdown(`
| Name | Age |
|------|-----|
| John | 25  |
| Jane | 30  |

-# Last updated today
`);

// Parse markdown into tokens with all extensions enabled
const tokens = parseMarkdown(markdownContent);
```

**How it works:**
- Singleton engine instance created on first use
- All custom extensions registered automatically
- Reused for subsequent calls (efficient)

### Manual Engine Creation

```typescript
import { createEngineWithExtensions } from '@/lib/services/core/markdown/useCustomExtensions';

const engine = createEngineWithExtensions();
const html = engine.toHtml(markdownContent);
const tokens = engine.parse(markdownContent);
```

### Reset for Testing

```typescript
import { resetEngineInstance } from '@/lib/services/core/markdown/useCustomExtensions';

// Clear singleton instance (useful in tests)
resetEngineInstance();
```

---

## Adding More Extensions

To add a new extension:

1. Create a new directory: `lib/services/core/markdown/extensions/[extensionName]/`
2. Create the extension file: `[extensionName].ts`
3. Export the extension object following the `Extension` interface
4. Add to `lib/services/core/markdown/extensions/index.ts`

### Extension Template

```typescript
import { Extension, MarkdownToken } from '@changerawr/markdown';

const myExtension: Extension = {
  name: 'my-feature',
  parseRules: [
    {
      name: 'my-feature',
      pattern: /pattern-to-match/,
      render: (match): MarkdownToken => ({
        type: 'my-token-type',
        content: match[1],
        raw: match[0],
        attributes: { /* optional */ }
      })
    }
  ],
  renderRules: [
    {
      type: 'my-token-type',
      render: (token): string => {
        return `<custom-element>${token.content}</custom-element>`;
      }
    }
  ]
};

export { myExtension };
```

---

## Implementation Notes

- **Priority:** Extensions are registered before default markdown rules, giving them higher priority
- **Patterns:** Use regex patterns with capturing groups `(...)` to extract content
- **HTML Rendering:** Always use Tailwind CSS classes for consistent styling
- **Dark Mode:** Include `dark:` prefixed classes for dark mode support
- **Type Safety:** All extensions are TypeScript-first for IDE support

---

## Testing Extensions

To test extensions during development:

```typescript
import { renderMarkdownWithExtensions, parseMarkdownWithExtensions } from '@/lib/services/core/markdown/useCustomExtensions';

// Test rendering
const markdown = `
| Header |
|--------|
| Cell   |

-# Subtext
`;

const html = renderMarkdownWithExtensions(markdown);
console.log(html);

// Test parsing
const tokens = parseMarkdownWithExtensions(markdown);
console.log(tokens);
```