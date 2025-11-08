import {JobRunnerService} from '@/lib/services/jobs/job-runner.service';
import {TelemetryService} from '@/lib/services/telemetry/service';
import {ensureSystemUser} from '@/lib/services/core/system-user/service';
import {spawn, exec} from 'child_process';
import path from 'path';
import {promisify} from 'util';

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
    const serverPath = path.join(process.cwd(), 'scripts', 'ftb', 'server.js');

    console.log('\n🚨 LAUNCHING FAILURE TO BOOT ERROR SERVER 🚨');
    console.log('Terminating Next.js server to free port 3000...\n');

    setTimeout(() => {
        const guide = spawn('node', [serverPath, ...missing], {
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

        await ensureSystemUser();

        await TelemetryService.initialize();
        console.log('✓ Telemetry service initialized');

        JobRunnerService.start(60000);
        console.log('✓ Job runner started');

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