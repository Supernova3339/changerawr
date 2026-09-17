import {NextResponse} from 'next/server'
import {z} from 'zod'
import {db} from '@/lib/db'
import {isSetupCompleted} from '@/lib/services/core/setup-completion'

/**
 * Schema for validating system settings request body.
 */
const settingsSchema = z.object({
    defaultInvitationExpiry: z.number().min(1).max(30).default(7),
    requireApprovalForChangelogs: z.boolean().default(true),
    maxChangelogEntriesPerProject: z.number().min(10).max(10000).default(100),
    enableAnalytics: z.boolean().default(true),
    enableNotifications: z.boolean().default(true),
    timezone: z.string().min(1).max(100).default('UTC'),
})

/**
 * @method POST
 * @summary Initialize System Settings
 * @description Sets up the initial system configuration. This endpoint can only be called once,
 * before any system settings are configured.
 * @body {
 *   "type": "object",
 *   "required": ["defaultInvitationExpiry", "requireApprovalForChangelogs", "maxChangelogEntriesPerProject", "enableAnalytics", "enableNotifications"],
 *   "properties": {
 *     "defaultInvitationExpiry": {
 *       "type": "integer",
 *       "minimum": 1,
 *       "maximum": 30,
 *       "default": 7,
 *       "description": "Default expiry duration (in days) for invitations"
 *     },
 *     "requireApprovalForChangelogs": {
 *       "type": "boolean",
 *       "default": true,
 *       "description": "Whether changelog entries require approval before publishing"
 *     },
 *     "maxChangelogEntriesPerProject": {
 *       "type": "integer",
 *       "minimum": 10,
 *       "maximum": 1000,
 *       "default": 100,
 *       "description": "Maximum number of changelog entries allowed per project"
 *     },
 *     "enableAnalytics": {
 *       "type": "boolean",
 *       "default": true,
 *       "description": "Whether analytics collection is enabled"
 *     },
 *     "enableNotifications": {
 *       "type": "boolean",
 *       "default": true,
 *       "description": "Whether system notifications are enabled"
 *     }
 *   }
 * }
 * @response 201 {
 *   "type": "object",
 *   "properties": {
 *     "message": {
 *       "type": "string",
 *       "example": "System settings configured successfully"
 *     },
 *     "config": {
 *       "type": "object",
 *       "required": ["id", "defaultInvitationExpiry", "requireApprovalForChangelogs", "maxChangelogEntriesPerProject", "enableAnalytics", "enableNotifications"],
 *       "properties": {
 *         "id": {
 *           "type": "integer",
 *           "example": 1,
 *           "description": "System configuration ID"
 *         },
 *         "defaultInvitationExpiry": {
 *           "type": "integer",
 *           "example": 7,
 *           "description": "Configured invitation expiry in days"
 *         },
 *         "requireApprovalForChangelogs": {
 *           "type": "boolean",
 *           "example": true,
 *           "description": "Whether changelog approval is required"
 *         },
 *         "maxChangelogEntriesPerProject": {
 *           "type": "integer",
 *           "example": 100,
 *           "description": "Maximum changelog entries per project"
 *         },
 *         "enableAnalytics": {
 *           "type": "boolean",
 *           "example": true,
 *           "description": "Analytics status"
 *         },
 *         "enableNotifications": {
 *           "type": "boolean",
 *           "example": true,
 *           "description": "Notifications status"
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Validation failed"
 *     },
 *     "details": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "path": {
 *             "type": "string",
 *             "example": "defaultInvitationExpiry"
 *           },
 *           "message": {
 *             "type": "string",
 *             "example": "Number must be between 1 and 30"
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 500 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "An unexpected error occurred during configuration"
 *     }
 *   }
 * }
 */
export async function POST(request: Request) {
    try {
        // Block access once the wizard has actually been finished
        if (await isSetupCompleted()) {
            return NextResponse.json(
                { error: 'Setup already completed. Use the admin panel to manage system settings.' },
                { status: 403 }
            )
        }

        // Validate request data first
        const body = await request.json()
        const validatedData = settingsSchema.parse(body)

        // Check if settings already exist
        const existingConfig = await db.systemConfig.findFirst()

        let config;
        if (existingConfig) {
            // Update existing settings
            config = await db.systemConfig.update({
                where: {id: existingConfig.id},
                data: {
                    defaultInvitationExpiry: validatedData.defaultInvitationExpiry,
                    requireApprovalForChangelogs: validatedData.requireApprovalForChangelogs,
                    maxChangelogEntriesPerProject: validatedData.maxChangelogEntriesPerProject,
                    enableAnalytics: validatedData.enableAnalytics,
                    enableNotifications: validatedData.enableNotifications,
                    timezone: validatedData.timezone,
                }
            })
        } else {
            // Create new settings
            config = await db.systemConfig.create({
                data: {
                    id: 1,
                    defaultInvitationExpiry: validatedData.defaultInvitationExpiry,
                    requireApprovalForChangelogs: validatedData.requireApprovalForChangelogs,
                    maxChangelogEntriesPerProject: validatedData.maxChangelogEntriesPerProject,
                    enableAnalytics: validatedData.enableAnalytics,
                    enableNotifications: validatedData.enableNotifications,
                    timezone: validatedData.timezone,
                }
            })
        }

        return NextResponse.json({
            message: existingConfig ? 'System settings updated successfully' : 'System settings configured successfully',
            config
        }, {status: existingConfig ? 200 : 201})
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                },
                {status: 400}
            )
        }

        console.error('Settings setup error:', error)
        return NextResponse.json(
            {error: 'An unexpected error occurred during configuration'},
            {status: 500}
        )
    }
}

/**
 * @method GET
 * @summary Method Not Allowed
 * @description This endpoint only accepts POST requests for system configuration
 * @response 405 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Method not allowed"
 *     }
 *   }
 * }
 */
export async function GET() {
    return NextResponse.json(
        {error: 'Method not allowed'},
        {status: 405}
    )
}