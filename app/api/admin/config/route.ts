import {NextResponse} from 'next/server'
import {validateAuthAndGetUser} from '@/lib/utils/changelog'
import {createAuditLog} from '@/lib/utils/auditLog'
import {db} from '@/lib/db'
import {z} from 'zod'
import {TelemetryService} from '@/lib/services/telemetry/service'
import {TelemetryState} from '@prisma/client'

const systemConfigSchema = z.object({
    defaultInvitationExpiry: z.number().min(1).max(30),
    requireApprovalForChangelogs: z.boolean(),
    maxChangelogEntriesPerProject: z.number().min(10).max(1000),
    enableAnalytics: z.boolean(),
    enableNotifications: z.boolean(),
    allowTelemetry: z.enum(['prompt', 'enabled', 'disabled']),
    adminOnlyApiKeyCreation: z.boolean(),
})

// Helper functions to map telemetry states
function mapTelemetryStateToString(state: TelemetryState): 'prompt' | 'enabled' | 'disabled' {
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

function mapStringToTelemetryState(state: 'prompt' | 'enabled' | 'disabled'): TelemetryState {
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

/**
 * @method GET
 * @description Fetches the system configuration for the authenticated user
 */
export async function GET() {
    try {
        const user = await validateAuthAndGetUser()

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                {error: 'Not authorized'},
                {status: 403}
            )
        }

        const config = await db.systemConfig.findFirst()

        if (!config) {
            // Return default configuration if none exists
            return NextResponse.json({
                defaultInvitationExpiry: 7,
                requireApprovalForChangelogs: true,
                maxChangelogEntriesPerProject: 100,
                enableAnalytics: true,
                enableNotifications: true,
                allowTelemetry: 'prompt',
                adminOnlyApiKeyCreation: false,
            })
        }

        // Map database telemetry state to frontend format
        const mappedConfig = {
            defaultInvitationExpiry: config.defaultInvitationExpiry,
            requireApprovalForChangelogs: config.requireApprovalForChangelogs,
            maxChangelogEntriesPerProject: config.maxChangelogEntriesPerProject,
            enableAnalytics: config.enableAnalytics,
            enableNotifications: config.enableNotifications,
            allowTelemetry: mapTelemetryStateToString(config.allowTelemetry),
            adminOnlyApiKeyCreation: config.adminOnlyApiKeyCreation,
        }

        return NextResponse.json(mappedConfig)
    } catch (error) {
        console.error('Error fetching system configuration:', error)
        return NextResponse.json(
            {error: 'Failed to fetch system configuration'},
            {status: 500}
        )
    }
}

/**
 * @method PATCH
 * @description Updates the system configuration for the authenticated user
 */
export async function PATCH(request: Request) {
    try {
        const user = await validateAuthAndGetUser()

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                {error: 'Not authorized'},
                {status: 403}
            )
        }

        const body = await request.json()
        const validatedData = systemConfigSchema.parse(body)

        // Get current config to track changes
        const existingConfig = await db.systemConfig.findFirst()
        const isNewConfig = !existingConfig

        // Track what changes are being made
        const changes: Record<string, { from: unknown; to: unknown }> = {};

        if (existingConfig) {
            // Compare each field and track changes
            if (validatedData.defaultInvitationExpiry !== existingConfig.defaultInvitationExpiry) {
                changes.defaultInvitationExpiry = {
                    from: existingConfig.defaultInvitationExpiry,
                    to: validatedData.defaultInvitationExpiry
                }
            }

            if (validatedData.requireApprovalForChangelogs !== existingConfig.requireApprovalForChangelogs) {
                changes.requireApprovalForChangelogs = {
                    from: existingConfig.requireApprovalForChangelogs,
                    to: validatedData.requireApprovalForChangelogs
                }
            }

            if (validatedData.maxChangelogEntriesPerProject !== existingConfig.maxChangelogEntriesPerProject) {
                changes.maxChangelogEntriesPerProject = {
                    from: existingConfig.maxChangelogEntriesPerProject,
                    to: validatedData.maxChangelogEntriesPerProject
                }
            }

            if (validatedData.enableAnalytics !== existingConfig.enableAnalytics) {
                changes.enableAnalytics = {
                    from: existingConfig.enableAnalytics,
                    to: validatedData.enableAnalytics
                }
            }

            if (validatedData.enableNotifications !== existingConfig.enableNotifications) {
                changes.enableNotifications = {
                    from: existingConfig.enableNotifications,
                    to: validatedData.enableNotifications
                }
            }

            const currentTelemetryState = mapTelemetryStateToString(existingConfig.allowTelemetry)
            if (validatedData.allowTelemetry !== currentTelemetryState) {
                changes.allowTelemetry = {
                    from: currentTelemetryState,
                    to: validatedData.allowTelemetry
                }
            }
        }

        // Handle telemetry configuration changes BEFORE updating the database
        if (changes.allowTelemetry) {
            try {
                console.log(`Telemetry state changing from ${changes.allowTelemetry.from} to ${changes.allowTelemetry.to}`)

                const telemetryConfig = await TelemetryService.getTelemetryConfig()

                if (validatedData.allowTelemetry === 'enabled') {
                    if (!telemetryConfig.instanceId) {
                        console.log('Enabling telemetry - registering new instance')
                        // Register instance if enabling telemetry for the first time
                        const instanceId = await TelemetryService.registerInstance()
                        console.log('Telemetry enabled with new instance ID:', instanceId)

                        // Update telemetry config with new instance ID
                        await TelemetryService.updateTelemetryConfig({
                            allowTelemetry: 'enabled',
                            instanceId
                        })
                    } else if (changes.allowTelemetry.from === 'disabled') {
                        console.log('Re-enabling telemetry - reactivating instance:', telemetryConfig.instanceId)
                        // Reactivate existing instance
                        try {
                            await TelemetryService.reactivateInstance(telemetryConfig.instanceId)
                            console.log('Instance reactivated successfully')
                        } catch (reactivationError) {
                            console.warn('Failed to reactivate instance, but continuing:', reactivationError)
                        }

                        // Update telemetry config
                        await TelemetryService.updateTelemetryConfig({
                            allowTelemetry: 'enabled',
                            instanceId: telemetryConfig.instanceId
                        })
                        console.log('Telemetry reactivated for instance:', telemetryConfig.instanceId)
                    } else {
                        console.log('Telemetry already enabled, just updating config')
                        await TelemetryService.updateTelemetryConfig({
                            allowTelemetry: 'enabled',
                            instanceId: telemetryConfig.instanceId
                        })
                    }
                } else if (validatedData.allowTelemetry === 'disabled' && telemetryConfig.instanceId) {
                    console.log('Disabling telemetry - deactivating instance:', telemetryConfig.instanceId)
                    // Deactivate instance if disabling telemetry
                    try {
                        await TelemetryService.deactivateInstance(telemetryConfig.instanceId)
                        console.log('Instance deactivated successfully')
                    } catch (deactivationError) {
                        console.warn('Failed to deactivate instance:', deactivationError)
                    }

                    await TelemetryService.updateTelemetryConfig({
                        allowTelemetry: 'disabled',
                        instanceId: telemetryConfig.instanceId
                    })
                    console.log('Telemetry disabled')
                } else {
                    console.log('Updating telemetry state to:', validatedData.allowTelemetry)
                    // Just update the state for prompt mode
                    await TelemetryService.updateTelemetryConfig({
                        allowTelemetry: validatedData.allowTelemetry,
                        instanceId: telemetryConfig.instanceId
                    })
                }
            } catch (telemetryError) {
                console.error('Failed to update telemetry configuration:', telemetryError)

                // Create audit log for telemetry update failure
                try {
                    await createAuditLog(
                        'TELEMETRY_UPDATE_FAILURE',
                        user.id,
                        user.id,
                        {
                            requestedState: validatedData.allowTelemetry,
                            error: telemetryError instanceof Error ? telemetryError.message : 'Unknown error'
                        }
                    );
                } catch (auditLogError) {
                    console.error('Failed to create telemetry failure audit log:', auditLogError);
                }

                return NextResponse.json(
                    {
                        error: 'Failed to update telemetry configuration',
                        details: telemetryError instanceof Error ? telemetryError.message : 'Unknown error'
                    },
                    {status: 500}
                );
            }
        }

        // Map telemetry state to database enum
        const dbTelemetryState = mapStringToTelemetryState(validatedData.allowTelemetry)

        // Prepare data for database update
        const configData = {
            defaultInvitationExpiry: validatedData.defaultInvitationExpiry,
            requireApprovalForChangelogs: validatedData.requireApprovalForChangelogs,
            maxChangelogEntriesPerProject: validatedData.maxChangelogEntriesPerProject,
            enableAnalytics: validatedData.enableAnalytics,
            enableNotifications: validatedData.enableNotifications,
            allowTelemetry: dbTelemetryState,
            adminOnlyApiKeyCreation: validatedData.adminOnlyApiKeyCreation,
        }

        // Update the system config in database
        const config = await db.systemConfig.upsert({
            where: {id: 1},
            update: configData,
            create: {
                id: 1,
                ...configData,
            },
        })

        // Create appropriate audit log based on operation
        try {
            if (isNewConfig) {
                // This is the initial configuration
                await createAuditLog(
                    'CREATE_SYSTEM_CONFIG',
                    user.id,
                    user.id,
                    {
                        config: {
                            defaultInvitationExpiry: config.defaultInvitationExpiry,
                            requireApprovalForChangelogs: config.requireApprovalForChangelogs,
                            maxChangelogEntriesPerProject: config.maxChangelogEntriesPerProject,
                            enableAnalytics: config.enableAnalytics,
                            enableNotifications: config.enableNotifications,
                            allowTelemetry: mapTelemetryStateToString(config.allowTelemetry),
                        }
                    }
                );
            } else if (Object.keys(changes).length > 0) {
                // This is an update to existing configuration
                await createAuditLog(
                    'UPDATE_SYSTEM_CONFIG',
                    user.id,
                    user.id,
                    {
                        changes,
                        changeCount: Object.keys(changes).length
                    }
                );
            }
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
            // Continue execution even if audit log creation fails
        }

        // Return the updated config with mapped telemetry state
        const responseConfig = {
            defaultInvitationExpiry: config.defaultInvitationExpiry,
            requireApprovalForChangelogs: config.requireApprovalForChangelogs,
            maxChangelogEntriesPerProject: config.maxChangelogEntriesPerProject,
            enableAnalytics: config.enableAnalytics,
            enableNotifications: config.enableNotifications,
            allowTelemetry: mapTelemetryStateToString(config.allowTelemetry),
            adminOnlyApiKeyCreation: config.adminOnlyApiKeyCreation,
        }

        console.log('System configuration updated successfully')
        return NextResponse.json(responseConfig)

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {error: 'Invalid configuration data', details: error.errors},
                {status: 400}
            )
        }

        console.error('Error updating system configuration:', error)
        return NextResponse.json(
            {error: 'Failed to update system configuration'},
            {status: 500}
        )
    }
}