import {JobRunnerService} from '@/lib/services/jobs/job-runner.service';
import {TelemetryService} from '@/lib/services/telemetry/service';
import {ensureSystemUser} from '@/lib/services/core/system-user/service';
import {setupDailySslRenewal} from '@/lib/custom-domains/ssl/setup-renewal-job';
import {initializeExtensions} from '@/lib/services/extensions/initialization.service';
import {UserManagementCleanupService} from '@/lib/services/maintenance/user-management-cleanup.service';
import {spawn, exec} from 'child_process';
import path from 'path';
import {promisify} from 'util';
import {promises as fs} from 'fs';

const execAsync = promisify(exec);

let servicesStarted = false;

interface EnvironmentValidationError extends Error {
    name: 'EnvironmentValidationError';
    missingVariables: string[];
}

function createEnvironmentError(missingVars: string[]): EnvironmentValidationError {
    const error = new Error(
        `FTB (Failure to Boot): Missing required environment variables: ${missingVars.join(', ')}`
    ) as EnvironmentValidationError;
    error.name = 'EnvironmentValidationError';
    error.missingVariables = missingVars;
    return error;
}

function checkRequirements(): void {
    const required = [
        'NEXT_PUBLIC_APP_URL',
        'DATABASE_URL',
        'JWT_ACCESS_SECRET',
        'ANALYTICS_SALT',
        'GITHUB_ENCRYPTION_KEY'
        // 'ENCRYPTION_KEY' - we do not need this actually.
    ];

    const missing: string[] = [];

    for (const v of required) {
        if (!process.env[v]) {
            missing.push(v);
        }
    }

    if (missing.length > 0) {
        throw createEnvironmentError(missing);
    }

    // Validate JWT_ACCESS_SECRET is not a known weak default
    const knownWeakSecrets = [
        'your-access-secret-key',
        'your_jwt_secret_key_here_change_me',
        'your_secure_jwt_secret_here',
        'changeme',
        'secret',
        'jwt_secret'
    ];

    const jwtSecret = process.env.JWT_ACCESS_SECRET || '';

    if (knownWeakSecrets.includes(jwtSecret.toLowerCase())) {
        console.error('🚨 CRITICAL SECURITY ERROR 🚨');
        console.error('JWT_ACCESS_SECRET is set to a known weak/default value!');
        console.error('This allows attackers to forge authentication tokens.');
        console.error('');
        console.error('Generate a secure secret with:');
        console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        console.error('');
        throw new Error('JWT_ACCESS_SECRET must not be a default/placeholder value');
    }

    // Require minimum entropy (at least 32 characters)
    if (jwtSecret.length < 32) {
        console.error('🚨 CRITICAL SECURITY ERROR 🚨');
        console.error('JWT_ACCESS_SECRET is too short (minimum 32 characters required)');
        console.error('');
        console.error('Generate a secure secret with:');
        console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        console.error('');
        throw new Error('JWT_ACCESS_SECRET must be at least 32 characters long');
    }
}

/**
 * Setup user management maintenance to run daily at 2 AM
 * Cleans up expired invitations and performs other user-related maintenance
 */
function setupUserManagementMaintenance(): void {
    const runMaintenanceJob = async () => {
        try {
            console.log('Running scheduled user management maintenance...');
            const results = await UserManagementCleanupService.runMaintenance();
            console.log('User management maintenance completed:', results);
        } catch (error) {
            console.error('Error running user management maintenance:', error);
        }
    };

    // Calculate time until next 2 AM
    const getTimeUntilNextRun = () => {
        const now = new Date();
        const next = new Date();
        next.setHours(2, 0, 0, 0);

        // If 2 AM has already passed today, schedule for tomorrow
        if (now.getHours() >= 2) {
            next.setDate(next.getDate() + 1);
        }

        return next.getTime() - now.getTime();
    };

    // Schedule first run
    const initialDelay = getTimeUntilNextRun();
    setTimeout(() => {
        runMaintenanceJob();

        // After first run, schedule to run every 24 hours
        setInterval(runMaintenanceJob, 24 * 60 * 60 * 1000);
    }, initialDelay);

    console.log(`User management maintenance will first run in ${Math.round(initialDelay / 1000 / 60)} minutes`);
}

/**
 * Ensure extensionLoader.ts exists, generate if missing
 * This fixes the instrumentation error on fresh installs
 */
async function ensureExtensionLoader(): Promise<void> {
    try {
        const loaderPath = path.join(process.cwd(), 'lib', 'services', 'core', 'markdown', 'extensionLoader.ts');

        // Check if loader file exists
        try {
            await fs.access(loaderPath);
            // File exists, we're good
            return;
        } catch {
            // File doesn't exist, generate it
            console.log('⚠️  extensionLoader.ts not found, generating...');

            // Create empty loader file with no extensions
            const emptyLoaderContent = `/**
 * Extension Loader - Auto-generated imports
 *
 * This file is AUTO-GENERATED by scripts/generate-extension-imports.js
 * DO NOT EDIT MANUALLY - your changes will be overwritten
 *
 * To add extensions:
 * 1. Install via the UI or manually add to /extensions/
 * 2. Run: npm run extensions:generate
 * 3. Restart the dev server
 */

import { Extension } from '@changerawr/markdown';
import { builtInExtensions, ExtensionMetadata, ExtensionWithMetadata } from './extensions';

/**
 * Extension loaders with error handling
 * Each loader wraps the import in try-catch to handle missing extensions
 */
// No installed extensions yet

/**
 * Cache for all extensions
 */
let discoveredExtensionsCache: ExtensionWithMetadata[] | null = null;
let isLoadingExtensions = false;

/**
 * Get all available extensions (built-in + optional)
 * Dynamically loads installed extensions with error handling
 */
export async function discoverExtensions(): Promise<ExtensionWithMetadata[]> {
  // Prevent concurrent loading
  if (isLoadingExtensions) {
    while (isLoadingExtensions) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return discoveredExtensionsCache || [...builtInExtensions];
  }

  isLoadingExtensions = true;

  try {
    // Load all optional extensions with error handling
    const loadPromises = [

    ];

    const loadedExtensions = await Promise.all(loadPromises);
    const validExtensions = loadedExtensions.filter(ext => ext !== null);

    const all = [...builtInExtensions, ...validExtensions];

    // Log discovered extensions (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('\\n=== Markdown Extensions Loaded ===');
      all.forEach(ext => {
        console.log(
          \`\${ext.metadata.isBuiltIn ? '🔧' : '⚡'} \${ext.metadata.displayName} v\${ext.metadata.version} \${
            ext.metadata.isBuiltIn ? '(built-in)' : '(optional)'
          }\`
        );
      });
      console.log('==================================\\n');
    }

    return all;
  } finally {
    isLoadingExtensions = false;
  }
}

/**
 * Get all available extensions (cached)
 * Call this to get the list of extensions for the admin UI
 */
export async function getAvailableExtensions(): Promise<ExtensionWithMetadata[]> {
  if (!discoveredExtensionsCache) {
    discoveredExtensionsCache = await discoverExtensions();
  }
  return discoveredExtensionsCache;
}

/**
 * Clear cache and re-discover extensions
 * Call this when a new extension file is added
 */
export function clearExtensionCache(): void {
  discoveredExtensionsCache = null;
}

/**
 * Get extension by name
 */
export async function getExtension(name: string): Promise<ExtensionWithMetadata | undefined> {
  const extensions = await getAvailableExtensions();
  return extensions.find(e => e.metadata.name === name);
}

/**
 * Get extensions by category
 */
export async function getExtensionsByCategory(category: string): Promise<ExtensionWithMetadata[]> {
  const extensions = await getAvailableExtensions();
  return extensions.filter(e => e.metadata.category === category);
}
`;

            await fs.writeFile(loaderPath, emptyLoaderContent, 'utf-8');
            console.log('✓ Generated empty extensionLoader.ts');
        }
    } catch (error) {
        console.error('Warning: Could not ensure extensionLoader.ts:', error);
        // Don't fail startup, just warn
    }
}

/**
 * Validate extension directories and regenerate imports if needed
 */
async function validateExtensions(): Promise<void> {
    try {
        const extensionsDir = path.join(process.cwd(), 'extensions');
        const loaderPath = path.join(process.cwd(), 'lib', 'services', 'core', 'markdown', 'extensionLoader.ts');

        // Check if extensions directory exists
        try {
            await fs.access(extensionsDir);
        } catch {
            console.log('⚠️  Extensions directory not found, skipping validation');
            return;
        }

        // Read the extension loader to check for imports
        let loaderContent = '';
        try {
            loaderContent = await fs.readFile(loaderPath, 'utf-8');
        } catch {
            console.log('⚠️  Extension loader not found, skipping validation');
            return;
        }

        // Extract extension paths from imports
        const importRegex = /from ['"]@\/extensions\/([^\/]+)\/([^'"]+)['"]/g;
        const imports = [...loaderContent.matchAll(importRegex)];

        let hasInvalidImports = false;

        // Validate each imported extension
        const invalidExtensions: string[] = [];
        for (const match of imports) {
            const [, author, extensionName] = match;
            const extPath = path.join(extensionsDir, author, extensionName);

            try {
                await fs.access(extPath);
                // Check if index.ts exists
                await fs.access(path.join(extPath, 'index.ts'));
            } catch {
                console.error(`✗ Extension directory missing or invalid: ${author}/${extensionName}`);
                invalidExtensions.push(`${author}/${extensionName}`);
                hasInvalidImports = true;

                // Try to delete the broken extension directory
                try {
                    await fs.rm(extPath, { recursive: true, force: true });
                    console.log(`✓ Removed broken extension directory: ${author}/${extensionName}`);
                } catch (rmErr) {
                    console.warn(`Could not remove ${author}/${extensionName}:`, rmErr);
                }
            }
        }

        // If we have invalid imports, regenerate
        if (hasInvalidImports) {
            console.log('⚠️  Invalid extension imports detected, attempting to regenerate...');
            await regenerateExtensionImports();
        } else {
            console.log('✓ Extension validation passed');
        }
    } catch (error) {
        console.error('Extension validation error:', error);
        // Don't fail the app, just warn
    }
}

/**
 * Ensure the Extension Builder Service (port 3010) is running.
 *
 * `next start` only boots the Next.js server - the builder service is
 * normally started separately (docker-entrypoint.sh, `npm run start:all`,
 * `npm run dev:all`). If nothing else has started it yet, spawn it here so
 * extension install/update features work with a plain `npm start`.
 */
async function ensureExtensionBuilderRunning(): Promise<void> {
    try {
        const response = await fetch('http://localhost:3010/health', {
            signal: AbortSignal.timeout(2000),
        });

        if (response.ok) {
            console.log('✓ Extension Builder Service already running');
            return;
        }
    } catch {
        // Not reachable - fall through and start it ourselves
    }

    console.log('⚠️  Extension Builder Service not detected, starting it...');

    // Spawn via the npm script rather than referencing the .js file path
    // directly - Turbopack's instrumentation tracer statically tries (and
    // fails) to resolve any path-like string passed to spawn/fork.
    const builder = spawn('npm', ['run', 'start:builder'], {
        stdio: 'inherit',
        cwd: process.cwd(),
        detached: true,
    });

    builder.on('error', (err) => {
        console.error('Failed to start Extension Builder Service:', err);
    });

    builder.unref();
}

/**
 * Trigger extension import regeneration via the builder service
 */
async function regenerateExtensionImports(): Promise<void> {
    try {
        console.log('Calling extension builder service to regenerate imports...');

        const response = await fetch('http://localhost:3010/extensions/generate-imports', {
            method: 'POST',
            signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
            console.log('✓ Extension imports regenerated successfully');
            console.log('⚠️  Please restart the application for changes to take effect');
        } else {
            console.error('✗ Failed to regenerate extensions:', response.status);
        }
    } catch (error: any) {
        console.error('✗ Error regenerating extensions:', error.message);
        console.log('💡 You may need to run: npm run extensions:generate');
    }
}

async function cleanup(): Promise<void> {
    try {
        if (process.platform === 'win32') {
            await execAsync('taskkill /f /im node.exe /fi "WINDOWTITLE eq FTB Error Server*"').catch(() => {});
        } else {
            await execAsync('pkill -f "scripts/ftb/server.js"').catch(() => {});
        }
        console.log('✓ Cleaned up any existing error servers');
    } catch (error) {
        console.log(error);
    }
}

function launchGuide(missing: string[]): void {
    console.log('\n🚨 LAUNCHING FAILURE TO BOOT ERROR SERVER 🚨');
    console.log('Terminating Next.js server to free port 3000...\n');

    setTimeout(() => {
        // Pass a relative path and resolve it via `cwd` instead of
        // path.join(process.cwd(), ...) - Turbopack's build-time tracer treats
        // that pattern as a server-relative import it can't resolve.
        const guide = spawn('node', ['scripts/ftb/server.js', ...missing], {
            stdio: 'inherit',
            cwd: process.cwd(),
            detached: true
        });

        guide.on('error', (err) => {
            console.error('Failed to start error server:', err);
            console.error('Please check that scripts/ftb/server.js exists and is accessible.');
        });

        guide.unref();

        process.exit(1);
    }, 1000);
}

export async function startBackgroundServices(): Promise<void> {
    // Check if services are already started
    if (servicesStarted) {
        return;
    }

    // Prevent multiple simultaneous starts
    servicesStarted = true;

    console.log('Starting background services...');

    try {
        await cleanup();

        const skipCheck = process.env.BUILD_PHASE_SKIP_VALIDATION ||
            process.env.CI_BUILD_MODE ||
            process.env.DOCKER_BUILD === '1';

        if (!skipCheck) {
            checkRequirements();
            console.log('✓ Environment validation passed');
        }

        // Make sure the extension builder service is up before validating
        if (!skipCheck) {
            await ensureExtensionBuilderRunning();
        }

        // Ensure extensionLoader exists before initializing
        await ensureExtensionLoader();

        // Validate extensions before initializing
        await validateExtensions();

        await ensureSystemUser();

        // Initialize markdown extensions
        await initializeExtensions();

        await TelemetryService.initialize();
        console.log('✓ Telemetry service initialized');

        JobRunnerService.start(60000);
        console.log('✓ Job runner started');

        // Setup user management maintenance (runs daily at 2 AM to clean up expired invitations)
        setupUserManagementMaintenance();
        console.log('✓ User management maintenance scheduled');

        // Setup SSL auto-renewal if SSL is enabled
        if (process.env.NEXT_PUBLIC_SSL_ENABLED === 'true') {
            await setupDailySslRenewal();
            console.log('✓ SSL auto-renewal scheduled');
        }

        const handleShutdown = async (signal: string): Promise<void> => {
            console.log(`Received ${signal}, shutting down gracefully...`);

            JobRunnerService.stop();
            console.log('✓ Job runner stopped');

            await TelemetryService.shutdown();
            console.log('✓ Telemetry service shutdown complete');

            process.exit(0);
        };

        process.on('SIGINT', () => handleShutdown('SIGINT'));
        process.on('SIGTERM', () => handleShutdown('SIGTERM'));

        console.log('✓ All background services started successfully');
    } catch (error) {
        // Reset the flag if startup fails
        servicesStarted = false;

        if (error instanceof Error && error.name === 'EnvironmentValidationError') {
            const envError = error as EnvironmentValidationError;

            console.error('🚨 FTB Error:', error.message);
            console.error('Starting error server to guide you through setup...\n');

            launchGuide(envError.missingVariables);

            return;
        } else {
            console.error('Failed to start background services:', error);
            throw error;
        }
    }
}