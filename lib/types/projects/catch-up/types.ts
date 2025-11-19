export interface CatchUpSummary {
    features: number;
    fixes: number;
    other: number;
}

export interface CatchUpTag {
    id: string;
    name: string;
    color: string | null;
}

export interface CatchUpEntry {
    id: string;
    title: string;
    content: string;
    version: string | null;
    publishedAt: Date | null;
    tags: CatchUpTag[];
}

export interface CatchUpResponse {
    fromDate: string;
    fromVersion: string | null;
    toVersion: string | null;
    totalEntries: number;
    summary: CatchUpSummary;
    entries: CatchUpEntry[];
}

export interface SinceOption {
    label: string;
    value: string;
    type: 'auto' | 'relative' | 'version' | 'date';
    description?: string;
}

export interface CatchUpFilters {
    since: string;
    showEmpty: boolean;
}

// New AI-specific types
export interface AICapabilities {
    enabled: boolean;
    model: string | null;
    features: {
        summaries: boolean;
        insights: boolean;
        recommendations: boolean;
    };
}

export interface UserAIStatus {
    hasAIEnabled: boolean;
    lastChecked: Date;
}