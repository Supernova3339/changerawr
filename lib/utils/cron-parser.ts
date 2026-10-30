/**
 * Simple cron expression parser for calculating next run times
 * Supports standard 5-field cron format: minute hour day month weekday
 */

interface CronFields {
    minute: string
    hour: string
    day: string
    month: string
    weekday: string
}

function parseCronField(field: string): number[] {
    const values: number[] = []

    // Handle asterisk (all values)
    if (field === '*') {
        return []
    }

    // Handle step values (*/5)
    if (field.startsWith('*/')) {
        const step = parseInt(field.substring(2))
        return [step]
    }

    // Handle ranges (1-5)
    if (field.includes('-')) {
        const [start, end] = field.split('-').map(Number)
        for (let i = start; i <= end; i++) {
            values.push(i)
        }
        return values
    }

    // Handle lists (1,3,5)
    if (field.includes(',')) {
        return field.split(',').map(Number)
    }

    // Single value
    return [parseInt(field)]
}

export function parseCronExpression(cron: string): CronFields | null {
    const parts = cron.trim().split(/\s+/)

    if (parts.length !== 5) {
        return null
    }

    return {
        minute: parts[0],
        hour: parts[1],
        day: parts[2],
        month: parts[3],
        weekday: parts[4],
    }
}

export function getNextRunTime(cronExpression: string, from: Date = new Date()): Date | null {
    if (cronExpression === 'manual') {
        return null
    }

    const fields = parseCronExpression(cronExpression)
    if (!fields) {
        return null
    }

    const next = new Date(from)
    next.setSeconds(0, 0)

    // Add one minute to start looking from the next minute
    next.setMinutes(next.getMinutes() + 1)

    // Try up to 1000 iterations to find the next run time
    for (let i = 0; i < 1000; i++) {
        const minutes = parseCronField(fields.minute)
        const hours = parseCronField(fields.hour)
        const days = parseCronField(fields.day)
        const months = parseCronField(fields.month)
        const weekdays = parseCronField(fields.weekday)

        const currentMinute = next.getMinutes()
        const currentHour = next.getHours()
        const currentDay = next.getDate()
        const currentMonth = next.getMonth() + 1
        const currentWeekday = next.getDay()

        // Check if current time matches
        const minuteMatch = minutes.length === 0 || minutes.includes(currentMinute)
        const hourMatch = hours.length === 0 || hours.includes(currentHour)
        const dayMatch = days.length === 0 || days.includes(currentDay)
        const monthMatch = months.length === 0 || months.includes(currentMonth)
        const weekdayMatch = weekdays.length === 0 || weekdays.includes(currentWeekday)

        if (minuteMatch && hourMatch && dayMatch && monthMatch && weekdayMatch) {
            return next
        }

        // Increment by one minute and try again
        next.setMinutes(next.getMinutes() + 1)
    }

    return null
}

export function humanizeCron(cron: string): string {
    if (cron === 'manual') return 'Manual only'

    const fields = parseCronExpression(cron)
    if (!fields) return cron

    // Common patterns
    if (cron === '*/5 * * * *') return 'Every 5 minutes'
    if (cron === '*/15 * * * *') return 'Every 15 minutes'
    if (cron === '*/30 * * * *') return 'Every 30 minutes'
    if (cron === '0 * * * *') return 'Every hour'
    if (cron === '0 0 * * *') return 'Daily at midnight'
    if (cron === '0 1 * * *') return 'Daily at 1:00 AM'
    if (cron === '0 2 * * *') return 'Daily at 2:00 AM'
    if (cron === '0 3 * * *') return 'Daily at 3:00 AM'
    if (cron === '0 6 * * *') return 'Daily at 6:00 AM'
    if (cron === '30 3 * * 0') return 'Sundays at 3:30 AM'
    if (cron === '0 3 * * 0') return 'Sundays at 3:00 AM'
    if (cron === '0 4 1 * *') return '1st of month at 4:00 AM'
    if (cron === '0 2 15 * *') return '15th of month at 2:00 AM'
    if (cron === '0 9 * * 1') return 'Mondays at 9:00 AM'

    // Build description
    let description = ''

    // Minute
    if (fields.minute.startsWith('*/')) {
        const step = fields.minute.substring(2)
        description = `Every ${step} minutes`
    } else if (fields.minute !== '*') {
        description = `At minute ${fields.minute}`
    }

    // Hour
    if (fields.hour !== '*' && !fields.hour.startsWith('*/')) {
        const hour = parseInt(fields.hour)
        const period = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
        description += ` at ${displayHour}:00 ${period}`
    }

    // Day
    if (fields.day !== '*') {
        description += ` on day ${fields.day}`
    }

    // Weekday
    if (fields.weekday !== '*') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const day = days[parseInt(fields.weekday)]
        description += ` on ${day}`
    }

    // Month
    if (fields.month !== '*') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const month = months[parseInt(fields.month) - 1]
        description += ` in ${month}`
    }

    return description || cron
}

export function validateCronExpression(cron: string): { valid: boolean; error?: string } {
    if (cron === 'manual') {
        return { valid: true }
    }

    const parts = cron.trim().split(/\s+/)

    if (parts.length !== 5) {
        return {
            valid: false,
            error: 'Cron expression must have exactly 5 fields: minute hour day month weekday',
        }
    }

    // Basic validation
    try {
        const fields = parseCronExpression(cron)
        if (!fields) {
            return { valid: false, error: 'Invalid cron expression format' }
        }

        // Try to get next run time
        const nextRun = getNextRunTime(cron)
        if (!nextRun) {
            return { valid: false, error: 'Could not calculate next run time' }
        }

        return { valid: true }
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Invalid cron expression',
        }
    }
}
