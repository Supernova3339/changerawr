import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Setup - Changerawr',
    description: 'Initial system setup for Changerawr',
};

export default function SetupLayout({
                                        children,
                                    }: {
    children: React.ReactNode;
}) {
    // No wrapper styling here — page.tsx owns its own background
    // (SetupBackground) and each step manages its own width, from the
    // full-bleed theme picker to the standard card steps.
    return <>{children}</>;
}