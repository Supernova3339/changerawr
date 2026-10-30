import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execAsync = promisify(exec)

/**
 * POST /api/admin/maintenance/database/backup
 * Creates a database backup
 */
export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser()
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const backupDir = path.join(process.cwd(), 'backups')

        // Ensure backup directory exists
        await fs.mkdir(backupDir, { recursive: true })

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
        const backupFile = path.join(backupDir, `db-backup-${timestamp}.sql`)

        // Get database URL from environment
        const databaseUrl = process.env.DATABASE_URL
        if (!databaseUrl) {
            throw new Error('DATABASE_URL not configured')
        }

        // Parse connection string
        const url = new URL(databaseUrl)

        // Build pg_dump command
        const pgDumpCommand = `PGPASSWORD="${url.password}" pg_dump -h ${url.hostname} -p ${url.port || 5432} -U ${url.username} -d ${url.pathname.slice(1)} -f "${backupFile}"`

        // Execute backup
        const { stdout, stderr } = await execAsync(pgDumpCommand)

        // Get file size
        const stats = await fs.stat(backupFile)
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2)

        // Compress the backup
        const compressedFile = `${backupFile}.gz`
        await execAsync(`gzip "${backupFile}"`)

        const compressedStats = await fs.stat(compressedFile)
        const compressedSizeMB = (compressedStats.size / (1024 * 1024)).toFixed(2)

        return NextResponse.json({
            success: true,
            backupFile: path.basename(compressedFile),
            originalSize: fileSizeMB,
            compressedSize: compressedSizeMB,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('[database/backup] Error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Backup failed',
            },
            { status: 500 }
        )
    }
}
