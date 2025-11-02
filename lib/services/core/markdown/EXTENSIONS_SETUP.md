# Custom Markdown Extensions - Setup Complete ✅

## Summary

Successfully created and integrated two custom markdown extensions for the Changerawr markdown engine:

1. **Table Extension** - GFM-style markdown tables with alignment support
2. **Subtext Extension** - Discord-style subtext using `-# text` syntax

## Architecture

### File Structure

```
lib/services/core/markdown/
├── extensions/
│   ├── index.ts                    # Central registry of all extensions
│   ├── table/
│   │   └── table.ts               # Table extension definition
│   └── subtext/
│       └── subtext.ts             # Subtext extension definition
├── useCustomExtensions.ts          # Singleton engine with extensions
├── EXTENSIONS.md                   # User-facing documentation
└── EXTENSIONS_SETUP.md            # This file
```

### Extension System Flow

```
renderMarkdown(markdown)
    ↓
getMarkdownEngine() (singleton)
    ↓
ChangerawrMarkdown instance
    ├─ registerExtension(tableExtension)
    ├─ registerExtension(subtextExtension)
    └─ (extensions cached and reused)
    ↓
toHtml(markdown) with all extensions enabled
```

## Implementation Details

### Singleton Engine Instance

The `useCustomExtensions.ts` module creates a single reusable engine instance with all custom extensions pre-registered:

```typescript
// First call: Creates engine and registers extensions
renderMarkdown(content1);

// Subsequent calls: Reuse existing instance
renderMarkdown(content2);
renderMarkdown(content3);
```

**Benefits:**
- Efficient: Extension registration happens once
- Consistent: Same engine instance used throughout app
- Testable: Can reset with `resetEngineInstance()`

### Extension Priority

Custom extensions are registered with feature extension priority, meaning they're matched before default markdown rules. This ensures:

- Tables are recognized before falling back to paragraph parsing
- Subtext `-# text` patterns are caught before being treated as regular text/lists

### Integration Points

All markdown rendering components now use the custom extension system:

1. **RenderMarkdown.tsx** - Display component
2. **MarkdownPreview.tsx** - Preview component
3. **MarkdownEditor.tsx** - Full editor with preview
4. **CUMButtonModal.tsx** - Button preview modal

## Extension Specifications

### Table Extension

**Name:** `table`

**Pattern:** Matches GFM-style tables
```
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

**Features:**
- Column alignment (left, center, right)
- Dark mode support
- Alternating row colors
- Responsive overflow scrolling
- Tailwind CSS styling

**Render Output:** HTML `<table>` with semantic markup

---

### Subtext Extension

**Name:** `subtext`

**Pattern:** Matches `-# text` format
```
-# This is smaller, muted text for secondary information
```

**Features:**
- Discord-style syntax
- Small gray text (text-sm)
- Dark mode support (gray-400 in dark mode)
- Block-level rendering with proper spacing

**Render Output:** HTML `<p>` with small text styling

---

## Usage Examples

### Basic Usage

```typescript
import { renderMarkdown } from '@/lib/services/core/markdown/useCustomExtensions';

const markdown = `
# Features

| Feature | Status |
|---------|--------|
| Tables | ✅ |
| Subtext | ✅ |

-# Last updated November 2, 2025
`;

const html = renderMarkdown(markdown);
// Returns HTML with table and subtext rendered
```

### In React Components

```typescript
import { renderMarkdown } from '@/lib/services/core/markdown/useCustomExtensions';

export function ChangelogEntry({ content }: { content: string }) {
  const html = renderMarkdown(content);

  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### Parsing Only

```typescript
import { parseMarkdown } from '@/lib/services/core/markdown/useCustomExtensions';

const tokens = parseMarkdown(markdown);
// Returns MarkdownToken[] with table and subtext tokens
```

## Technical Details

### Extension Interface

Both extensions implement the `Extension` interface:

```typescript
interface Extension {
  name: string;                    // Unique identifier
  parseRules: ParseRule[];         // How to recognize patterns
  renderRules: RenderRule[];       // How to render tokens
}
```

### Pattern Matching

- **Table:** Regex matches header row + separator row + data rows
- **Subtext:** Regex matches `-#` followed by text on same line

### Rendering

- **Table:** Generates semantic HTML table with Tailwind classes
- **Subtext:** Generates `<p>` element with gray text classes

## Testing the Extensions

### Manual Testing

Try these in the markdown editor:

```markdown
# Test Tables

| Column 1 | Column 2 | Column 3 |
|:---------|:--------:|----------:|
| Left | Center | Right |
| A | B | C |

-# This is subtext supporting information

Regular paragraph continues here.
```

### Unit Testing

```typescript
import { renderMarkdown, resetEngineInstance } from '@/lib/services/core/markdown/useCustomExtensions';

describe('Extensions', () => {
  beforeEach(() => {
    resetEngineInstance(); // Fresh engine for each test
  });

  it('renders tables', () => {
    const html = renderMarkdown('| A | B |\n|-|-|\n| 1 | 2 |');
    expect(html).toContain('<table>');
  });

  it('renders subtext', () => {
    const html = renderMarkdown('-# Small text');
    expect(html).toContain('text-sm');
  });
});
```

## Performance Considerations

### Memory

- Single singleton instance reduces memory overhead
- Extensions registered once on first use
- Subsequent calls reuse same instance

### Speed

- Pattern matching is O(n) for markdown length
- Regex patterns optimized for early termination
- No unnecessary re-parsing

### Scalability

- Easy to add more extensions to registry
- Each extension isolated and independent
- Extension priority system prevents conflicts

## Troubleshooting

### Extensions Not Rendering

**Problem:** Tables or subtext appear as plain text

**Solution:** Ensure you're importing from the correct module:
```typescript
// ✅ Correct
import { renderMarkdown } from '@/lib/services/core/markdown/useCustomExtensions';

// ❌ Wrong
import { renderMarkdown } from '@changerawr/markdown';
```

### Pattern Not Matching

**Problem:** Table/subtext syntax doesn't parse

**Solution:** Check exact format:
- Tables: Require pipe (`|`) delimiters and separator row
- Subtext: Must start line with `-#` followed by space

### HTML Injection Concerns

**Status:** Safe - DOMPurify sanitization is enabled by default

## Future Enhancements

Possible extensions to add:
- Footnotes
- Task lists with custom styling
- Math/LaTeX support
- Mermaid diagrams
- Callouts (styled alert blocks)
- Strikethrough with custom styling
- Superscript/subscript
- Abbreviations

## Files Modified

1. Created: `lib/services/core/markdown/extensions/table/table.ts`
2. Created: `lib/services/core/markdown/extensions/subtext/subtext.ts`
3. Created: `lib/services/core/markdown/extensions/index.ts`
4. Created: `lib/services/core/markdown/useCustomExtensions.ts`
5. Updated: `components/markdown-editor/RenderMarkdown.tsx`
6. Updated: `components/markdown-editor/MarkdownPreview.tsx`
7. Updated: `components/markdown-editor/MarkdownEditor.tsx`
8. Updated: `components/markdown-editor/modals/CUMButtonModal.tsx`
9. Created: `lib/services/core/markdown/EXTENSIONS.md`
10. Created: `lib/services/core/markdown/EXTENSIONS_SETUP.md` (this file)

## Build Status

✅ **Build Successful** - All changes compile without errors
✅ **Type Safety** - Full TypeScript support
✅ **Integration** - All components using custom extensions
✅ **Documentation** - Complete setup and usage guides

## Next Steps

1. Test extensions in development environment
2. Adjust styling as needed
3. Consider additional extensions
4. Add unit tests for extension patterns
5. Monitor performance in production

---

**Date:** November 2, 2025
**Status:** Complete and Ready for Use
