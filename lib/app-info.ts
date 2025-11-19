/**
 * Application information and metadata
 * This is a central place to manage version information and other app details.
 */

export const appInfo = {
    name: 'Changerawr',
    version: '1.0.5',
    status: 'Stable',
    environment: process.env.NODE_ENV || 'development',
    license: 'Sponsorware',
    releaseDate: '2025-06-15', // this is when Changerawr 1.0.0 first released

    framework: 'Next.js App Router',
    database: 'PostgreSQL with Prisma ORM',
    cumEngine: '1.1.7', // package version of @changerawr/markdown

    // Repository and documentation links
    repository: 'https://github.com/supernova3339/changerawr',
    documentation: '/api-docs',
};

/**
 * Get the application version with status
 */
export function getVersionString(): string {
    return `${appInfo.version}${appInfo.status ? ` (${appInfo.status})` : ''}`;
}

/**
 * Get the copyright year range
 */
export function getCopyrightYears(): string {
    const startYear = 2025; // Founding year
    const currentYear = new Date().getFullYear();
    return startYear === currentYear ? `${startYear}` : `${startYear}-${currentYear}`;
}
