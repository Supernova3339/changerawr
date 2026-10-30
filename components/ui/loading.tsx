/**
 * Global Loading Component
 * Standardized loading screen used throughout the application
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export interface LoadingStep {
    id: string;
    label: string;
    status: 'pending' | 'loading' | 'complete' | 'error';
    description?: string;
}

interface LoadingProps {
    /**
     * Loading message to display
     * @default "Loading..."
     */
    message?: string;

    /**
     * Size variant
     * @default "default"
     */
    size?: 'sm' | 'default' | 'lg' | 'xl';

    /**
     * Whether to show fullscreen overlay
     * @default false
     */
    fullscreen?: boolean;

    /**
     * Whether to show the loading message
     * @default true
     */
    showMessage?: boolean;

    /**
     * Additional CSS classes
     */
    className?: string;

    /**
     * Spinner color variant
     * @default "primary"
     */
    variant?: 'primary' | 'muted' | 'white';

    /**
     * Loading steps to show progress
     */
    steps?: LoadingStep[];

    /**
     * Progress percentage (0-100)
     */
    progress?: number;

    /**
     * Show progress bar
     * @default false (true if progress is provided)
     */
    showProgress?: boolean;
}

const sizeConfig = {
    sm: {
        spinner: 'h-4 w-4',
        text: 'text-sm',
    },
    default: {
        spinner: 'h-8 w-8',
        text: 'text-base',
    },
    lg: {
        spinner: 'h-12 w-12',
        text: 'text-lg',
    },
    xl: {
        spinner: 'h-16 w-16',
        text: 'text-xl',
    },
};

const variantConfig = {
    primary: 'text-primary',
    muted: 'text-muted-foreground',
    white: 'text-white',
};

export function Loading({
    message = 'Loading...',
    size = 'default',
    fullscreen = false,
    showMessage = true,
    className,
    variant = 'primary',
    steps,
    progress,
    showProgress = progress !== undefined,
}: LoadingProps) {
    const config = sizeConfig[size];
    const hasSteps = steps && steps.length > 0;

    // Calculate progress from steps if not provided
    const calculatedProgress =
        progress ??
        (hasSteps
            ? Math.round(
                  (steps.filter((s) => s.status === 'complete').length / steps.length) * 100
              )
            : undefined);

    const currentStep = hasSteps
        ? steps.find((s) => s.status === 'loading') || steps[steps.length - 1]
        : null;

    const content = (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={cn(
                'flex flex-col items-center justify-center gap-4',
                fullscreen ? 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50' : '',
                className
            )}
        >
            {/* Main spinner and message */}
            <div className="flex flex-col items-center gap-3">
                <Loader2
                    className={cn('animate-spin', config.spinner, variantConfig[variant])}
                />
                {showMessage && (
                    <p
                        className={cn(
                            'font-medium text-center',
                            config.text,
                            variantConfig[variant]
                        )}
                    >
                        {currentStep?.label || message}
                    </p>
                )}
                {currentStep?.description && (
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                        {currentStep.description}
                    </p>
                )}
            </div>

            {/* Progress bar */}
            {showProgress && calculatedProgress !== undefined && (
                <div className="w-full max-w-md space-y-2">
                    <Progress value={calculatedProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                        {calculatedProgress}% complete
                    </p>
                </div>
            )}

            {/* Steps list */}
            {hasSteps && (
                <div className="w-full max-w-md space-y-2 mt-2">
                    <AnimatePresence mode="popLayout">
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                className={cn(
                                    'flex items-center gap-3 p-2 rounded-md transition-colors',
                                    step.status === 'loading' &&
                                        'bg-primary/10 border border-primary/20',
                                    step.status === 'complete' && 'opacity-60',
                                    step.status === 'error' && 'bg-destructive/10'
                                )}
                            >
                                {/* Status icon */}
                                <div className="flex-shrink-0">
                                    {step.status === 'complete' && (
                                        <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                    )}
                                    {step.status === 'loading' && (
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    )}
                                    {step.status === 'pending' && (
                                        <div className="h-5 w-5 rounded-full border-2 border-muted" />
                                    )}
                                    {step.status === 'error' && (
                                        <div className="h-5 w-5 rounded-full bg-destructive flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">!</span>
                                        </div>
                                    )}
                                </div>

                                {/* Step label */}
                                <div className="flex-1 min-w-0">
                                    <p
                                        className={cn(
                                            'text-sm font-medium truncate',
                                            step.status === 'loading' && 'text-primary',
                                            step.status === 'complete' && 'text-muted-foreground',
                                            step.status === 'error' && 'text-destructive'
                                        )}
                                    >
                                        {step.label}
                                    </p>
                                    {step.description && (
                                        <p className="text-xs text-muted-foreground truncate">
                                            {step.description}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );

    return content;
}

/**
 * Loading skeleton for page content
 */
export function LoadingPage({ message }: { message?: string }) {
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loading size="lg" message={message} />
        </div>
    );
}

/**
 * Inline loading spinner (small, no text)
 */
export function LoadingSpinner({ className }: { className?: string }) {
    return (
        <Loader2 className={cn('h-4 w-4 animate-spin text-muted-foreground', className)} />
    );
}

/**
 * Loading skeleton rows for tables/lists
 */
export function LoadingRows({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="h-12 bg-muted/50 animate-pulse rounded-md"
                />
            ))}
        </div>
    );
}

/**
 * Loading card skeleton
 */
export function LoadingCard() {
    return (
        <div className="border rounded-lg p-6 space-y-4">
            <div className="h-6 bg-muted/50 animate-pulse rounded w-1/3" />
            <div className="h-4 bg-muted/50 animate-pulse rounded w-full" />
            <div className="h-4 bg-muted/50 animate-pulse rounded w-2/3" />
        </div>
    );
}
