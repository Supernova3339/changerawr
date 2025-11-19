'use client'

import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { UpdateStatus } from '@/lib/types/easypanel'

/**
 * Small badge indicator that shows when an update is available
 * Only shows for admins who have access to the update API
 * Displays on sidebar About tab
 */
export const UpdateIndicatorBadge: React.FC = () => {
    const [updateAvailable, setUpdateAvailable] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkForUpdates = async () => {
            try {
                const response = await fetch('/api/system/update-status', {
                    cache: 'no-store'
                })

                if (!response.ok) {
                    // If not admin or error, silently fail
                    setLoading(false)
                    return
                }

                const data: UpdateStatus = await response.json()
                setUpdateAvailable(data.available)
            } catch {
                // Silently fail on error
            } finally {
                setLoading(false)
            }
        }

        checkForUpdates()

        // Refresh every hour
        const interval = setInterval(checkForUpdates, 60 * 60 * 1000)

        return () => clearInterval(interval)
    }, [])

    // Only show if update is available
    if (!updateAvailable || loading) {
        return null
    }

    return (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>Update available</span>
        </div>
    )
}