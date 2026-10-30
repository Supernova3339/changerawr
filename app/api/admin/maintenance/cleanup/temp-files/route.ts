import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import fs from 'fs/promises'
import path from 'path'

/**
 * POST /api/admin/maintenance/cleanup/temp-files
 * Removes temporary files older than 24 hours
 */
export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser()
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const tempDir = path.join(process.cwd(), 'tmp')

        // Ensure temp directory exists
        try {
            await fs.mkdir(tempDir, { recursive: true })
        } catch (error) {
            // Directory might already exist
        }

        let deletedCount = 0
        let deletedSize = 0
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago

        try {
            const files = await fs.readdir(tempDir)

            for (const file of files) {
                const filePath = path.join(tempDir, file)
                const stats = await fs.stat(filePath)

                // Only delete files, not directories
                if (stats.isFile() && stats.mtimeMs < cutoffTime) {
                    deletedSize += stats.size
                    await fs.unlink(filePath)
                    deletedCount++
                }
            }
        } catch (error) {
            console.error('[cleanup/temp-files] Error:', error)
        }

        const deletedSizeMB = (deletedSize / (1024 * 1024)).toFixed(2)

        return NextResponse.json({
            success: true,
            deletedCount,
            deletedSizeMB,
        })
    } catch (error) {
        console.error('[cleanup/temp-files] Error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Cleanup failed',
            },
            { status: 500 }
        )
    }
}
