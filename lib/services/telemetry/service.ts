import {db} from '@/lib/db';
import {TelemetryState} from '@prisma/client';
import {TelemetryConfig, TelemetryData, TelemetryResponse, TelemetryStats} from '@/lib/types/telemetry';
import {appInfo, getVersionString} from '@/lib/app-info';

export class TelemetryService {
    private static readonly TELEMETRY_URL = 'https://dl.supers0ft.us/changerawr/telemetry';
    private static readonly REGISTER_URL = 'https://dl.supers0ft.us/changerawr/telemetry/register';
    private static readonly DEACTIVATE_URL = 'https://dl.supers0ft.us/changerawr/telemetry/deactivate';
    private static readonly STATS_URL = 'https://dl.supers0ft.us/changerawr/telemetry/stats';
    private static readonly SEND_TELEMETRY_URL = 'https://dl.supers0ft.us/changerawr/telemetry/send';
    private static readonly DEFAULT_CONFIG_ID = 1;

    /**
     * Check if telemetry logging is enabled
     */
    private static shouldLog(): boolean {
        return process.env.SHOW_TELEMETRY_LOGS === 'true';
    }

    /**
     * Log message if telemetry logging is enabled
     */
    private static log(...args: unknown[]): void {
        if (this.shouldLog()) {
            console.log(...args);
        }
    }

    /**
     * Log error (always shown)
     */
    private static logError(...args: unknown[]): void {
        console.error(...args);
    }

    /**
     * Log warning (always shown)
     */
    private static logWarn(...args: unknown[]): void {
        console.warn(...args);
    }

    /**
     * Get telemetry configuration
     */
    static async getTelemetryConfig(): Promise<TelemetryConfig> {
        const config = await db.systemConfig.findFirst({
            where: {id: this.DEFAULT_CONFIG_ID}
        });

        if (!config) {
            const newConfig = await db.systemConfig.create({
                data: {
                    id: this.DEFAULT_CONFIG_ID,
                    allowTelemetry: TelemetryState.PROMPT,
                }
            });

            return {
                allowTelemetry: this.mapTelemetryState(newConfig.allowTelemetry),
                instanceId: newConfig.telemetryInstanceId || undefined,
            };
        }

        return {
            allowTelemetry: this.mapTelemetryState(config.allowTelemetry),
            instanceId: config.telemetryInstanceId || undefined,
        };
    }

    /**
     * Reactivate an existing instance
     */
    static async reactivateInstance(instanceId: string): Promise<void> {
        this.log('Reactivating existing instance:', instanceId);

        const reactivationData: TelemetryData = {
            instanceId,
            version: getVersionString(),
            status: appInfo.status,
            environment: appInfo.environment,
            timestamp: new Date().toISOString(),
        };

        try {
            await this.sendTelemetry(reactivationData);
            this.log('Instance reactivated successfully:', instanceId);
        } catch (error) {
            this.logError('Failed to reactivate instance:', error);
            throw error;
        }
    }

    /**
     * Update telemetry configuration
     */
    static async updateTelemetryConfig(config: TelemetryConfig): Promise<void> {
        const currentConfig = await this.getTelemetryConfig();

        await db.systemConfig.upsert({
            where: { id: this.DEFAULT_CONFIG_ID },
            create: {
                id: this.DEFAULT_CONFIG_ID,
                allowTelemetry: this.mapToDbTelemetryState(config.allowTelemetry),
                telemetryInstanceId: config.instanceId,
            },
            update: {
                allowTelemetry: this.mapToDbTelemetryState(config.allowTelemetry),
                telemetryInstanceId: config.instanceId,
            }
        });

        // Handle job scheduling and reactivation based on telemetry state
        if (config.allowTelemetry === 'enabled') {
            // If we have an instance ID and we're going from disabled to enabled, reactivate
            if (config.instanceId && currentConfig.allowTelemetry === 'disabled') {
                this.log('Reactivating previously disabled instance');
                try {
                    await this.reactivateInstance(config.instanceId);
                } catch (error) {
                    this.logWarn('Failed to reactivate instance, but continuing with scheduling:', error);
                }
            }

            await this.scheduleTelemetryJob();
        } else {
            await this.cancelTelemetryJobs();
        }
    }

    /**
     * Register instance with telemetry server and send initial telemetry
     */
    static async registerInstance(): Promise<string> {
        const registrationData = {
            version: getVersionString(),
            status: appInfo.status,
            environment: appInfo.environment,
            timestamp: new Date().toISOString(),
        };

        this.log('Registering new instance with telemetry server...');
        this.log('Registration data:', registrationData);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(this.REGISTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': `Changerawr/${getVersionString()}`,
                },
                body: JSON.stringify(registrationData),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            this.log('Registration response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                this.logError('Registration HTTP error response:', errorText);
                throw new Error(`Registration HTTP ${response.status}: ${errorText}`);
            }

            const responseText = await response.text();
            this.log('Registration raw response text:', responseText);

            let parsedResponse: TelemetryResponse;
            try {
                parsedResponse = JSON.parse(responseText);
            } catch (parseError) {
                this.logError('Registration JSON parse error:', parseError);
                throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
            }

            if (!parsedResponse.success || !parsedResponse.instanceId) {
                throw new Error(`Registration failed: ${parsedResponse || 'No instance ID returned'}`);
            }

            const instanceId = parsedResponse.instanceId;
            this.log('Instance registered successfully:', instanceId);

            // Send initial telemetry data immediately after registration
            this.log('Sending initial telemetry data...');
            try {
                const initialTelemetryData: TelemetryData = {
                    instanceId,
                    version: getVersionString(),
                    status: appInfo.status,
                    environment: appInfo.environment,
                    timestamp: new Date().toISOString(),
                };

                await this.sendTelemetry(initialTelemetryData);
                this.log('Initial telemetry sent successfully');
            } catch (telemetryError) {
                this.logWarn('Failed to send initial telemetry (registration still successful):', telemetryError);
                // Don't throw here - registration was successful, telemetry can be retried later
            }

            return instanceId;

        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    this.logError('Registration request timed out');
                    throw new Error('Registration request timed out after 30 seconds');
                }
                this.logError('Registration error:', error.message);
                throw error;
            }
            this.logError('Unknown registration error:', error);
            throw new Error('Unknown error occurred during registration');
        }
    }

    /**
     * Send telemetry data to server
     */
    static async sendTelemetry(data: TelemetryData): Promise<TelemetryResponse> {
        this.log('Sending telemetry to:', this.SEND_TELEMETRY_URL);
        this.log('Payload:', JSON.stringify(data, null, 2));

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(this.SEND_TELEMETRY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': `Changerawr/${getVersionString()}`,
                },
                body: JSON.stringify(data),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            this.log('Response status:', response.status);
            this.log('Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                this.logError('HTTP error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                this.logError('Non-JSON response received:', responseText);
                throw new Error(`Expected JSON response, got: ${contentType}. Response: ${responseText}`);
            }

            const responseText = await response.text();
            this.log('Raw response text:', responseText);

            if (!responseText || responseText.trim() === '') {
                throw new Error('Empty response from telemetry server');
            }

            let parsedResponse: TelemetryResponse;
            try {
                parsedResponse = JSON.parse(responseText);
            } catch (parseError) {
                this.logError('JSON parse error:', parseError);
                this.logError('Response text was:', responseText);
                throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
            }

            this.log('Parsed response:', parsedResponse);

            if (!parsedResponse.success) {
                throw new Error(`Server error: ${parsedResponse || 'Unknown error'}`);
            }

            return parsedResponse;

        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    this.logError('Telemetry request timed out');
                    throw new Error('Telemetry request timed out after 30 seconds');
                }
                this.logError('Telemetry send error:', error.message);
                throw error;
            }
            this.logError('Unknown telemetry error:', error);
            throw new Error('Unknown error occurred while sending telemetry');
        }
    }

    /**
     * Send telemetry now (used by job executor)
     */
    static async sendTelemetryNow(): Promise<void> {
        const config = await this.getTelemetryConfig();

        if (config.allowTelemetry !== 'enabled' || !config.instanceId) {
            this.log('Telemetry not enabled or no instance ID, skipping send');
            return;
        }

        const data: TelemetryData = {
            instanceId: config.instanceId,
            version: getVersionString(),
            status: appInfo.status,
            environment: appInfo.environment,
            timestamp: new Date().toISOString(),
        };

        this.log('Sending scheduled telemetry for instance:', config.instanceId);
        await this.sendTelemetry(data);
        this.log('Scheduled telemetry sent successfully');
    }

    /**
     * Deactivate instance
     */
    static async deactivateInstance(instanceId: string): Promise<void> {
        this.log('Deactivating instance:', instanceId);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(this.DEACTIVATE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': `Changerawr/${getVersionString()}`,
                },
                body: JSON.stringify({instanceId}),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const result = await response.json();
                this.log('Instance deactivated successfully:', result);
            } else {
                this.logWarn('Failed to deactivate instance:', response.status, await response.text());
            }
        } catch (error) {
            this.logWarn('Failed to deactivate instance:', error);
            // Don't throw - deactivation failures shouldn't break the app
        }
    }

    /**
     * Get telemetry statistics
     */
    static async getTelemetryStats(): Promise<TelemetryStats> {
        this.log('Fetching telemetry statistics...');

        try {
            const response = await fetch(this.STATS_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': `Changerawr/${getVersionString()}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const stats = await response.json();
            this.log('Retrieved telemetry stats:', stats);
            return stats;
        } catch (error) {
            this.logError('Failed to fetch telemetry stats:', error);
            throw error;
        }
    }

    /**
     * Schedule telemetry job (every hour)
     */
    private static async scheduleTelemetryJob(): Promise<void> {
        // Dynamically import to avoid circular dependencies
        const {ScheduledJobService, ScheduledJobType} = await import('@/lib/services/jobs/scheduled-job.service');

        // Cancel existing jobs first
        await this.cancelTelemetryJobs();

        // Schedule next telemetry send
        const nextRun = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        const jobId = await ScheduledJobService.createJob({
            type: ScheduledJobType.TELEMETRY_SEND,
            entityId: 'telemetry-system', // Use a string that won't conflict with foreign keys
            scheduledAt: nextRun,
            maxRetries: 3,
        });

        this.log(`Scheduled telemetry job ${jobId} for:`, nextRun.toISOString());
    }

    /**
     * Cancel all telemetry jobs
     */
    private static async cancelTelemetryJobs(): Promise<void> {
        // Dynamically import to avoid circular dependencies
        const {ScheduledJobType} = await import('@/lib/services/jobs/scheduled-job.service');

        // Find and cancel pending telemetry jobs
        const pendingJobs = await db.scheduledJob.findMany({
            where: {
                type: ScheduledJobType.TELEMETRY_SEND,
                entityId: 'telemetry-system', // Match the same entityId we use for creation
                status: 'PENDING'
            }
        });

        for (const job of pendingJobs) {
            await db.scheduledJob.update({
                where: {id: job.id},
                data: {status: 'CANCELLED'}
            });
        }

        this.log(`Cancelled ${pendingJobs.length} pending telemetry jobs`);
    }

    /**
     * Initialize telemetry (call on app startup)
     */
    static async initialize(): Promise<void> {
        this.log('Initializing telemetry service...');

        try {
            const config = await this.getTelemetryConfig();
            this.log('Current telemetry config:', config);

            if (config.allowTelemetry === 'enabled') {
                if (config.instanceId) {
                    this.log('Telemetry enabled for instance:', config.instanceId);
                    await this.scheduleTelemetryJob();
                } else {
                    this.log('Telemetry enabled but no instance ID - will prompt for registration');
                }
            } else {
                this.log('Telemetry disabled or in prompt mode');
            }
        } catch (error) {
            this.logError('Failed to initialize telemetry:', error);
            // Don't throw - telemetry failures shouldn't break app startup
        }
    }

    /**
     * Handle app shutdown
     */
    static async shutdown(): Promise<void> {
        this.log('Shutting down telemetry service...');

        try {
            const config = await this.getTelemetryConfig();

            if (config.allowTelemetry === 'enabled' && config.instanceId) {
                this.log('Deactivating instance on shutdown:', config.instanceId);
                await this.deactivateInstance(config.instanceId);
            }
        } catch (error) {
            this.logError('Error during telemetry shutdown:', error);
            // Don't throw - shutdown errors shouldn't prevent app termination
        }
    }

    /**
     * Test telemetry connection (for debugging)
     */
    static async testConnection(): Promise<void> {
        this.log('Testing telemetry connection...');

        try {
            // First test if the server is responding
            const healthResponse = await fetch(this.TELEMETRY_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': `Changerawr/${getVersionString()}`,
                },
            });

            this.log('Health check response:', healthResponse.status);

            if (healthResponse.ok) {
                const healthData = await healthResponse.json();
                this.log('Server health data:', healthData);
            }

            // Then test actual telemetry submission
            const testData: TelemetryData = {
                instanceId: 'test-' + Date.now(),
                version: getVersionString(),
                status: appInfo.status,
                environment: 'test',
                timestamp: new Date().toISOString(),
            };

            this.log('Testing telemetry submission...');
            const result = await this.sendTelemetry(testData);
            this.log('Test submission result:', result);

            // Test deactivation
            if (result.instanceId) {
                this.log('Testing instance deactivation...');
                await this.deactivateInstance(result.instanceId);
            }

            this.log('Telemetry connection test completed successfully');
        } catch (error) {
            this.logError('Telemetry connection test failed:', error);
            throw error;
        }
    }

    /**
     * Map Prisma enum to our type
     */
    private static mapTelemetryState(state: TelemetryState): TelemetryConfig['allowTelemetry'] {
        switch (state) {
            case TelemetryState.PROMPT:
                return 'prompt';
            case TelemetryState.ENABLED:
                return 'enabled';
            case TelemetryState.DISABLED:
                return 'disabled';
            default:
                return 'prompt';
        }
    }

    /**
     * Map our type to Prisma enum
     */
    private static mapToDbTelemetryState(state: TelemetryConfig['allowTelemetry']): TelemetryState {
        switch (state) {
            case 'prompt':
                return TelemetryState.PROMPT;
            case 'enabled':
                return TelemetryState.ENABLED;
            case 'disabled':
                return TelemetryState.DISABLED;
            default:
                return TelemetryState.PROMPT;
        }
    }
}
