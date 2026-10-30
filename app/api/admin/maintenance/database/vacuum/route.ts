import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import {db} from "@/lib/db";

/**
 * POST /api/admin/maintenance/database/vacuum
 * Runs VACUUM ANALYZE on the database
 */
export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser()
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const tables = ['User', 'AuditLog', 'Invitation', 'Changelog', 'ChangelogSubscriber']
        const results: { table: string; success: boolean }[] = []

        for (const table of tables) {
            try {
                // VACUUM can't be run in a transaction, but we can analyze
                await db.$executeRawUnsafe(`ANALYZE "${table}"`)
                results.push({ table, success: true })
            } catch (error) {
                console.error(`[vacuum] Error analyzing ${table}:`, error)
                results.push({ table, success: false })
            }
        }

        // Note: VACUUM requires superuser or table owner privileges
        // In production, this should be run via a scheduled PostgreSQL task
        // or with appropriate database credentials

        return NextResponse.json({
            success: true,
            tables: results,
            message: 'Database analysis complete',
        })
    } catch (error) {
        console.error('[database/vacuum] Error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Vacuum failed',
            },
            { status: 500 }
        )
    }
}
