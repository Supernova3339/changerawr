'use client';

import React from 'react';

/**
 * Ambient background for the setup route. A single soft gradient, tuned
 * with explicit colors rather than the `primary` token — that token is a
 * near-black/near-white UI-contrast color in this app (for button text
 * contrast), not a hue, so it inverts oddly between themes and looked like
 * pale smudges in dark mode.
 */
export function SetupBackground() {
    return (
        <div
            className="fixed inset-0 z-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/40
                       dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40"
        />
    );
}
