import {Extension, MarkdownToken} from '@changerawr/markdown';

/**
 * Table Extension for Changerawr Markdown
 *
 * Supports GFM-style tables:
 *
 * | Header 1 | Header 2 |
 * |----------|----------|
 * | Cell 1   | Cell 2   |
 * | Cell 3   | Cell 4   |
 *
 * Also supports alignment:
 * | Left | Center | Right |
 * |:-----|:------:|------:|
 * | L    | C      | R     |
 */

const tableExtension: Extension = {
    name: 'table',
    parseRules: [
        {
            name: 'table',
            // Matches GFM-style tables: header row, separator row, then data rows
            // Pattern must capture the full table including newlines
            pattern: /\|[^\n]+\n\|[\s\-:|]+\n(\|[^\n]+\n?)*/,
            render: (match): MarkdownToken => {
                const fullTable = match[0];
                const lines = fullTable.trim().split('\n');

                // First line is headers
                const headerRow = lines[0];
                // Lines 2+ are data rows
                const bodyRowsText = lines.slice(2).join('\n');

                // Parse header row
                const headers = headerRow
                    .split('|')
                    .map(h => h.trim())
                    .filter(h => h.length > 0);

                // Parse alignment from separator row
                const separatorLine = fullTable.split('\n')[1];
                const alignments = separatorLine
                    .split('|')
                    .map(sep => sep.trim())
                    .filter(sep => sep.length > 0)
                    .map(sep => {
                        if (sep.startsWith(':') && sep.endsWith(':')) return 'center';
                        if (sep.endsWith(':')) return 'right';
                        if (sep.startsWith(':')) return 'left';
                        return 'left';
                    });

                // Parse body rows
                const rows = bodyRowsText
                    .split('\n')
                    .filter(row => row.trim().length > 0)
                    .map(row =>
                        row
                            .split('|')
                            .map(cell => cell.trim())
                            .filter(cell => cell.length > 0)
                    );

                return {
                    type: 'table',
                    content: fullTable,
                    raw: fullTable,
                    attributes: {
                        headers: headers.join('||'),
                        alignments: alignments.join('||'),
                        rowCount: rows.length,
                        columnCount: headers.length,
                        bodyRows: JSON.stringify(rows)
                    }
                };
            }
        }
    ],
    renderRules: [
        {
            type: 'table',
            render: (token): string => {
                const headers = (token.attributes?.headers as string)?.split('||') || [];
                const alignments = (token.attributes?.alignments as string)?.split('||') || [];
                const bodyRowsJson = token.attributes?.bodyRows as string;
                const bodyRows = bodyRowsJson ? JSON.parse(bodyRowsJson) : [];

                // Build table HTML with Tailwind styling
                let html = '<div class="overflow-x-auto my-4"><table class="border-collapse border border-gray-300 dark:border-gray-700">';

                // Header row
                html += '<thead class="bg-gray-100 dark:bg-gray-800">';
                html += '<tr>';
                headers.forEach((header, idx) => {
                    const align = alignments[idx] || 'left';
                    const textAlign =
                        align === 'center' ? 'text-center' :
                            align === 'right' ? 'text-right' :
                                'text-left';
                    html += `<th class="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold ${textAlign}">${header}</th>`;
                });
                html += '</tr>';
                html += '</thead>';

                // Body rows
                html += '<tbody>';
                bodyRows.forEach((row: string[], rowIdx: number) => {
                    html += '<tr class="' + (rowIdx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50') + '">';
                    row.forEach((cell, cellIdx) => {
                        const align = alignments[cellIdx] || 'left';
                        const textAlign =
                            align === 'center' ? 'text-center' :
                                align === 'right' ? 'text-right' :
                                    'text-left';
                        html += `<td class="border border-gray-300 dark:border-gray-700 px-4 py-2 ${textAlign}">${cell}</td>`;
                    });
                    html += '</tr>';
                });
                html += '</tbody>';

                html += '</table></div>';
                return html;
            }
        }
    ]
};

export {tableExtension};