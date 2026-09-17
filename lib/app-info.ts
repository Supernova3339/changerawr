/**
 * Application information and metadata
 * This is a central place to manage version information and other app details.
 */

export const appInfo = {
    name: 'Changerawr',
    version: '1.0.7.4',
    status: 'Stable',
    environment: process.env.NODE_ENV || 'development',
    license: 'CNC OSL',
    releaseDate: '2025-06-15', // this is when Changerawr 1.0.0 first released

    framework: 'Next.js App Router',
    database: 'PostgreSQL with Prisma ORM',
    cumEngine: '2.0.1', // package version of @changerawr/markdown

    // Repository and documentation links
    repository: 'https://github.com/supernova3339/changerawr',
    author: 'supernova3339',
    sponsors_url: 'https://github.com/sponsors/Supernova3339',
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
