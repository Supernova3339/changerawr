'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useSetup } from '@/components/setup/setup-context';

interface ThemeStepProps {
    onNext: () => void;
}

const WIPE_TRANSITION = { duration: 0.7, ease: [0.65, 0, 0.35, 1] as const };

export function ThemeStep({ onNext }: ThemeStepProps) {
    const { setTheme } = useTheme();
    const { setSelectedTheme } = useSetup();
    const [choice, setChoice] = useState<'light' | 'dark' | null>(null);

    const choose = (value: 'light' | 'dark') => {
        if (choice) return; // ignore clicks mid-transition
        setChoice(value);
        setSelectedTheme(value);
    };

    // Both panels finish their width animation at the same moment; only the
    // one that actually expanded to 100% should trigger the advance.
    const handleSettled = (side: 'light' | 'dark') => {
        if (choice !== side) return;
        setTheme(side);
        setTimeout(onNext, 200);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
            <motion.button
                type="button"
                aria-label="Choose light theme"
                className="absolute inset-y-0 left-0 flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-200 cursor-pointer"
                style={{ width: '50%' }}
                animate={{ width: choice === null ? '50%' : choice === 'light' ? '100%' : '0%' }}
                transition={WIPE_TRANSITION}
                onAnimationComplete={() => handleSettled('light')}
                onClick={() => choose('light')}
                whileHover={choice === null ? { filter: 'brightness(0.97)' } : undefined}
            >
                <motion.div
                    className="flex flex-col items-center gap-3 text-slate-900"
                    animate={{ opacity: choice === 'dark' ? 0 : 1 }}
                    transition={{ duration: 0.25 }}
                >
                    <Sun className="h-12 w-12" strokeWidth={1.5} />
                    <span className="text-2xl font-semibold tracking-tight">Light</span>
                </motion.div>
            </motion.button>

            <motion.button
                type="button"
                aria-label="Choose dark theme"
                className="absolute inset-y-0 right-0 flex items-center justify-center bg-gradient-to-bl from-slate-950 via-slate-900 to-black cursor-pointer"
                style={{ width: '50%' }}
                animate={{ width: choice === null ? '50%' : choice === 'dark' ? '100%' : '0%' }}
                transition={WIPE_TRANSITION}
                onAnimationComplete={() => handleSettled('dark')}
                onClick={() => choose('dark')}
                whileHover={choice === null ? { filter: 'brightness(1.3)' } : undefined}
            >
                <motion.div
                    className="flex flex-col items-center gap-3 text-white"
                    animate={{ opacity: choice === 'light' ? 0 : 1 }}
                    transition={{ duration: 0.25 }}
                >
                    <Moon className="h-12 w-12" strokeWidth={1.5} />
                    <span className="text-2xl font-semibold tracking-tight">Dark</span>
                </motion.div>
            </motion.button>

            {/* Intro copy on the seam — fades out the instant a side is
                picked so the wipe reads as a clean takeover. */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                animate={{ opacity: choice ? 0 : 1 }}
                transition={{ duration: 0.2 }}
            >
                <p className="text-lg font-medium text-white mix-blend-difference px-4 text-center">
                    Choose the theme you&apos;d like to use
                </p>
            </motion.div>
        </div>
    );
}
