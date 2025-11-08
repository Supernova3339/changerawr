"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

interface ThemeToggleProps {
    projectId: string
}

/**
 * Per-project theme toggle for public changelog pages.
 * Overrides the global theme provider to use project-specific storage.
 * Key format: `changelog-theme-${projectId}`
 */
export function ThemeToggle({ projectId }: ThemeToggleProps) {
    const { theme: globalTheme, setTheme: setGlobalTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    const storageKey = `changelog-theme-${projectId}`

    // Override global theme with per-project theme on mount and when projectId changes
    React.useEffect(() => {
        const stored = localStorage.getItem(storageKey) as "light" | "dark" | null
        const projectTheme = stored || "light"

        // Only set if different from current theme to avoid loops
        if (projectTheme !== globalTheme) {
            setGlobalTheme(projectTheme)
        }

        setMounted(true)
    }, [projectId, storageKey])

    // When global theme changes, save to project-specific storage
    React.useEffect(() => {
        if (!mounted || !globalTheme) return

        localStorage.setItem(storageKey, globalTheme)
        // Also update the global storage to keep next-themes from interfering
        localStorage.setItem("theme", globalTheme)
    }, [globalTheme, storageKey, mounted])

    const toggleTheme = () => {
        const newTheme = resolvedTheme === "dark" ? "light" : "dark"
        setGlobalTheme(newTheme)
    }

    if (!mounted) {
        return (
            <button
                className="fixed bottom-6 right-6 p-3 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 shadow-lg transition-all hover:shadow-xl"
                aria-label="Toggle theme"
            >
                <Sun className="h-5 w-5 text-muted-foreground" />
            </button>
        )
    }

    const isDark = resolvedTheme === "dark"

    return (
        <button
            onClick={toggleTheme}
            className="fixed bottom-6 right-6 p-3 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
            aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
            title={`Switch to ${isDark ? "light" : "dark"} theme`}
        >
            {isDark ? (
                <Sun className="h-5 w-5 text-foreground" />
            ) : (
                <Moon className="h-5 w-5 text-foreground" />
            )}
        </button>
    )
}
