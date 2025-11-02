'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
    Eye,
    EyeOff,
    RotateCcw,
    Plus,
    Trash2,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Grid3x3,
    CheckCircle,
} from 'lucide-react';
import { renderMarkdown } from '@/lib/services/core/markdown/useCustomExtensions';
import { CUMModalProps, CUMTableConfig } from '@/components/markdown-editor/types/cum-extensions';

export const CUMTableModal: React.FC<CUMModalProps> = ({
    isOpen,
    onClose,
    onInsert,
}) => {
    const [config, setConfig] = useState<CUMTableConfig>({
        rows: 3,
        columns: 3,
        hasHeader: true,
        alignments: ['left', 'left', 'left'],
        data: [
            ['Header 1', 'Header 2', 'Header 3'],
            ['Cell 1', 'Cell 2', 'Cell 3'],
            ['Cell 4', 'Cell 5', 'Cell 6'],
        ],
    });

    const [showPreview, setShowPreview] = useState(true);

    // Update table dimensions
    const updateDimensions = (newRows: number, newCols: number) => {
        const oldData = config.data;
        const newData: string[][] = [];

        // Keep existing data where it fits
        for (let i = 0; i < newRows; i++) {
            newData[i] = [];
            for (let j = 0; j < newCols; j++) {
                newData[i][j] = oldData[i]?.[j] || `Cell ${i * newCols + j + 1}`;
            }
        }

        // Update alignments to match new column count
        const newAlignments = Array(newCols)
            .fill(null)
            .map((_, i) => config.alignments[i] || 'left');

        setConfig({
            ...config,
            rows: newRows,
            columns: newCols,
            data: newData,
            alignments: newAlignments,
        });
    };

    // Update cell content
    const updateCell = (row: number, col: number, value: string) => {
        const newData = config.data.map((r, i) =>
            i === row ? r.map((c, j) => (j === col ? value : c)) : r
        );
        setConfig({ ...config, data: newData });
    };

    // Update column alignment
    const updateAlignment = (col: number, align: 'left' | 'center' | 'right') => {
        const newAlignments = [...config.alignments];
        newAlignments[col] = align;
        setConfig({ ...config, alignments: newAlignments });
    };

    // Generate markdown table
    const generateMarkdown = (): string => {
        let markdown = '';

        // Header row
        markdown += '| ' + config.data[0].join(' | ') + ' |\n';

        // Separator row
        const separators = config.alignments.map(align => {
            if (align === 'center') return ':-----:';
            if (align === 'right') return '-----:';
            return ':-----';
        });
        markdown += '| ' + separators.join(' | ') + ' |\n';

        // Data rows
        for (let i = 1; i < config.data.length; i++) {
            markdown += '| ' + config.data[i].join(' | ') + ' |\n';
        }

        return markdown;
    };

    const handleInsert = () => {
        onInsert(generateMarkdown());
        onClose();
    };

    const handleReset = () => {
        setConfig({
            rows: 3,
            columns: 3,
            hasHeader: true,
            alignments: ['left', 'left', 'left'],
            data: [
                ['Header 1', 'Header 2', 'Header 3'],
                ['Cell 1', 'Cell 2', 'Cell 3'],
                ['Cell 4', 'Cell 5', 'Cell 6'],
            ],
        });
    };

    const getAlignmentIcon = (align: string) => {
        if (align === 'center') return <AlignCenter className="h-3 w-3" />;
        if (align === 'right') return <AlignRight className="h-3 w-3" />;
        return <AlignLeft className="h-3 w-3" />;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
                <DialogHeader className="space-y-3 flex-shrink-0">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <Grid3x3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-xl font-semibold">Create Table</div>
                            <div className="text-sm text-muted-foreground font-normal">
                                Build a structured table with custom alignment and content
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 overflow-y-auto flex-1 pr-4">
                    {/* Dimensions Control */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="rows" className="text-xs font-medium">
                                    Rows
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Input
                                        id="rows"
                                        type="number"
                                        min={2}
                                        max={20}
                                        value={config.rows}
                                        onChange={(e) => updateDimensions(parseInt(e.target.value) || config.rows, config.columns)}
                                        className="h-8 text-sm"
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">of 20</span>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="columns" className="text-xs font-medium">
                                    Columns
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Input
                                        id="columns"
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={config.columns}
                                        onChange={(e) => updateDimensions(config.rows, parseInt(e.target.value) || config.columns)}
                                        className="h-8 text-sm"
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">of 10</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Editor */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Table Content</Label>
                        <div className="border rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto bg-muted/20">
                            <table className="w-full border-collapse text-sm">
                                <tbody>
                                    {config.data.map((row, rowIdx) => (
                                        <tr key={rowIdx} className={rowIdx === 0 ? 'bg-muted' : ''}>
                                            {row.map((cell, colIdx) => (
                                                <td key={`${rowIdx}-${colIdx}`} className="border p-1">
                                                    <Input
                                                        value={cell}
                                                        onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                                                        placeholder={`Row ${rowIdx + 1}, Col ${colIdx + 1}`}
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Column Alignment Control */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Column Alignment</Label>
                        <div className="grid grid-cols-auto gap-2">
                            {config.alignments.map((align, idx) => (
                                <div key={idx} className="flex items-center gap-1 p-2 bg-muted rounded-md">
                                    <span className="text-xs text-muted-foreground flex-1">Col {idx + 1}</span>
                                    <div className="flex gap-1">
                                        <Button
                                            variant={align === 'left' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => updateAlignment(idx, 'left')}
                                            className="h-7 w-7 p-0"
                                        >
                                            <AlignLeft className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant={align === 'center' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => updateAlignment(idx, 'center')}
                                            className="h-7 w-7 p-0"
                                        >
                                            <AlignCenter className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant={align === 'right' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => updateAlignment(idx, 'right')}
                                            className="h-7 w-7 p-0"
                                        >
                                            <AlignRight className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-green-500" />
                                <Label className="text-sm font-medium">Live Preview</Label>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPreview(!showPreview)}
                            >
                                {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                        </div>

                        {showPreview && (
                            <Card className="border-2 border-dashed">
                                <CardContent className="p-4">
                                    <div className="overflow-x-auto">
                                        <div
                                            className="inline-block"
                                            dangerouslySetInnerHTML={{
                                                __html: renderMarkdown(generateMarkdown()),
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Markdown Preview */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Generated Markdown</Label>
                        <div className="p-3 bg-muted rounded-md font-mono text-xs break-all max-h-[150px] overflow-y-auto whitespace-pre-wrap">
                            {generateMarkdown()}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                            <p className="font-semibold">Column alignment:</p>
                            <p>Left-aligned (default) • Center-aligned • Right-aligned</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-between">
                    <Button
                        variant="ghost"
                        onClick={handleReset}
                        className="flex items-center gap-2"
                    >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                    </Button>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleInsert}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-3 w-3" />
                            Insert Table
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
