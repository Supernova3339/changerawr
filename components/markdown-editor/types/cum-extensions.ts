export interface CUMButtonConfig {
    text: string;
    url: string;
    style: 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    disabled?: boolean;
    target?: '_blank' | '_self';
}

export interface CUMAlertConfig {
    type: 'info' | 'warning' | 'error' | 'success' | 'tip';
    title?: string;
    content: string;
    dismissible?: boolean;
    icon?: string;
}

export interface CUMEmbedConfig {
    provider: 'youtube' | 'codepen' | 'figma' | 'twitter' | 'github' | 'generic';
    url: string;
    options?: {
        width?: string;
        height?: string;
        autoplay?: boolean;
        theme?: 'light' | 'dark';
        showControls?: boolean;
    };
}

export interface CUMTableConfig {
    rows: number;
    columns: number;
    hasHeader: boolean;
    alignments: ('left' | 'center' | 'right')[];
    data: string[][];
}

export interface CUMModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (markdown: string) => void;
}

export type CUMExtensionType = 'button' | 'alert' | 'embed' | 'table';