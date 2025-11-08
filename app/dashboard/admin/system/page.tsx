'use client'

import {useQuery, useMutation} from '@tanstack/react-query'
import {useAuth} from '@/context/auth'
import {useToast} from '@/hooks/use-toast'
import {motion} from 'framer-motion'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {Switch} from '@/components/ui/switch'
import {Separator} from '@/components/ui/separator'
import {
    AlertTriangle,
    Check,
    Loader2,
    Settings,
    Mail,
    Bell,
    BarChart4,
    Activity,
    Shield,
    CheckCircle,
    XCircle,
    Key
} from 'lucide-react'
import {zodResolver} from '@hookform/resolvers/zod'
import {useForm} from 'react-hook-form'
import * as z from 'zod'
import Link from "next/link"
import {appInfo} from "@/lib/app-info";
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group'
import {Badge} from '@/components/ui/badge'

// Define the system configuration schema
const systemConfigSchema = z.object({
    defaultInvitationExpiry: z.number().min(1).max(30),
    requireApprovalForChangelogs: z.boolean(),
    maxChangelogEntriesPerProject: z.number().min(10).max(1000),
    enableAnalytics: z.boolean(),
    enableNotifications: z.boolean(),
    allowTelemetry: z.enum(['prompt', 'enabled', 'disabled']),
    adminOnlyApiKeyCreation: z.boolean(),
})

type SystemConfig = z.infer<typeof systemConfigSchema>

export default function SystemConfigPage() {
    const {user} = useAuth()
    const {toast} = useToast()

    // Fetch current system configuration
    const {data: config, isLoading, refetch} = useQuery<SystemConfig>({
        queryKey: ['system-config'],
        queryFn: async () => {
            const response = await fetch('/api/admin/config')
            if (!response.ok) throw new Error('Failed to fetch system configuration')
            return response.json()
        },
    })

    const form = useForm<SystemConfig>({
        resolver: zodResolver(systemConfigSchema),
        defaultValues: {
            defaultInvitationExpiry: 7,
            requireApprovalForChangelogs: true,
            maxChangelogEntriesPerProject: 100,
            enableAnalytics: true,
            enableNotifications: true,
            allowTelemetry: 'prompt',
        },
        values: config,
    })

    // Update system configuration
    const updateConfig = useMutation({
        mutationFn: async (data: SystemConfig) => {
            const response = await fetch('/api/admin/config', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data),
            })
            if (!response.ok) throw new Error('Failed to update system configuration')
            return response.json()
        },
        onSuccess: () => {
            toast({
                title: 'Configuration Updated',
                description: 'System configuration has been successfully updated.',
            })
            refetch()
        },
        onError: (error) => {
            toast({
                title: 'Update Failed',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    if (!user || user.role !== 'ADMIN') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5"/>
                            Access Denied
                        </CardTitle>
                        <CardDescription>
                            You do not have permission to access system configuration.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    const cardVariants = {
        hidden: {opacity: 0, y: 20},
        visible: {opacity: 1, y: 0}
    }

    const getTelemetryDescription = (value: string) => {
        switch (value) {
            case 'enabled':
                return 'Anonymous usage data is being collected to help improve Changerawr'
            case 'disabled':
                return 'No usage data is being collected'
            case 'prompt':
            default:
                return 'Users will be prompted to choose their telemetry preference'
        }
    }

    const currentTelemetryValue = form.watch('allowTelemetry')

    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            className="container max-w-5xl p-6"
        >
            <Card className="shadow-md">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Settings className="h-6 w-6 text-primary"/>
                            <CardTitle>System Configuration</CardTitle>
                        </div>
                    </div>
                    <CardDescription>
                        Manage global system settings and defaults
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin"/>
                        </div>
                    ) : (
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="grid grid-cols-4 mb-6">
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="features">Features</TabsTrigger>
                                <TabsTrigger value="privacy">Privacy</TabsTrigger>
                                <TabsTrigger value="integrations">Integrations</TabsTrigger>
                            </TabsList>

                            <Form {...form}>
                                <form onSubmit={form.handleSubmit((data) => updateConfig.mutate(data))}>
                                    <TabsContent value="general" className="space-y-6">
                                        <div className="grid gap-6">
                                            <FormField
                                                control={form.control}
                                                name="defaultInvitationExpiry"
                                                render={({field}) => (
                                                    <FormItem>
                                                        <FormLabel>Default Invitation Expiry (days)</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                {...field}
                                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                                            />
                                                        </FormControl>
                                                        <FormDescription>
                                                            Number of days before invitation links expire
                                                        </FormDescription>
                                                        <FormMessage/>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="maxChangelogEntriesPerProject"
                                                render={({field}) => (
                                                    <FormItem>
                                                        <FormLabel>Max Changelog Entries per Project</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                {...field}
                                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                                            />
                                                        </FormControl>
                                                        <FormDescription>
                                                            Maximum number of changelog entries allowed per project
                                                        </FormDescription>
                                                        <FormMessage/>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="features" className="space-y-6">
                                        <motion.div
                                            variants={cardVariants}
                                            initial="hidden"
                                            animate="visible"
                                            transition={{staggerChildren: 0.1}}
                                            className="space-y-4"
                                        >
                                            <FormField
                                                control={form.control}
                                                name="requireApprovalForChangelogs"
                                                render={({field}) => (
                                                    <motion.div variants={cardVariants}>
                                                        <FormItem
                                                            className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                            <div className="space-y-0.5">
                                                                <FormLabel className="text-base">
                                                                    Require Approval for Changelogs
                                                                </FormLabel>
                                                                <FormDescription>
                                                                    Require admin approval before publishing changelog
                                                                    entries
                                                                </FormDescription>
                                                            </div>
                                                            <FormControl>
                                                                <Switch
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    </motion.div>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="enableAnalytics"
                                                render={({field}) => (
                                                    <motion.div variants={cardVariants}>
                                                        <FormItem
                                                            className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                            <div className="flex gap-2">
                                                                <BarChart4
                                                                    className="h-5 w-5 text-muted-foreground mt-0.5"/>
                                                                <div className="space-y-0.5">
                                                                    <FormLabel className="text-base">
                                                                        Enable Analytics
                                                                    </FormLabel>
                                                                    <FormDescription>
                                                                        Collect and display analytics for changelog
                                                                        entries
                                                                    </FormDescription>
                                                                </div>
                                                            </div>
                                                            <FormControl>
                                                                <Switch
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    </motion.div>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="enableNotifications"
                                                render={({field}) => (
                                                    <motion.div variants={cardVariants}>
                                                        <FormItem
                                                            className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                            <div className="flex gap-2">
                                                                <Bell className="h-5 w-5 text-muted-foreground mt-0.5"/>
                                                                <div className="space-y-0.5">
                                                                    <FormLabel className="text-base">
                                                                        Enable Notifications
                                                                    </FormLabel>
                                                                    <FormDescription>
                                                                        Send notifications for internal actions ( e.g.
                                                                        approvals )
                                                                    </FormDescription>
                                                                </div>
                                                            </div>
                                                            <FormControl>
                                                                <Switch
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    </motion.div>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="adminOnlyApiKeyCreation"
                                                render={({field}) => (
                                                    <motion.div variants={cardVariants}>
                                                        <FormItem
                                                            className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                            <div className="flex gap-2">
                                                                <Key className="h-5 w-5 text-muted-foreground mt-0.5"/>
                                                                <div className="space-y-0.5">
                                                                    <FormLabel className="text-base">
                                                                        Admin-Only API Key Creation
                                                                    </FormLabel>
                                                                    <FormDescription>
                                                                        Restrict API key creation to administrators only
                                                                    </FormDescription>
                                                                </div>
                                                            </div>
                                                            <FormControl>
                                                                <Switch
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    </motion.div>
                                                )}
                                            />
                                        </motion.div>
                                    </TabsContent>

                                    <TabsContent value="privacy" className="space-y-6">
                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="allowTelemetry"
                                                render={({field}) => (
                                                    <Card className="border-2">
                                                        <CardHeader>
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                                    <Activity className="h-5 w-5 text-primary"/>
                                                                </div>
                                                                <div>
                                                                    <CardTitle className="text-lg">Telemetry
                                                                        Settings</CardTitle>
                                                                    <CardDescription>
                                                                        Configure how usage data is collected from your
                                                                        Changerawr instance
                                                                    </CardDescription>
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="space-y-6">
                                                            <FormItem>
                                                                <FormLabel className="text-base font-semibold">Telemetry
                                                                    Mode</FormLabel>
                                                                <FormControl>
                                                                    <RadioGroup
                                                                        value={field.value}
                                                                        onValueChange={field.onChange}
                                                                        className="space-y-4"
                                                                    >
                                                                        {/* Prompt option - only show in development */}
                                                                        {process.env.NODE_ENV === 'development' && (
                                                                            <div className="relative">
                                                                                <div
                                                                                    className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                                                    <RadioGroupItem value="prompt"
                                                                                                    id="telemetry-prompt"
                                                                                                    className="mt-1"/>
                                                                                    <div className="flex-1 space-y-2">
                                                                                        <div
                                                                                            className="flex items-center gap-2">
                                                                                            <label
                                                                                                htmlFor="telemetry-prompt"
                                                                                                className="text-sm font-medium cursor-pointer">
                                                                                                Prompt users
                                                                                            </label>
                                                                                            <Badge variant="secondary"
                                                                                                   className="text-xs">
                                                                                                Development Only
                                                                                            </Badge>
                                                                                        </div>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                            Show a modal asking users to
                                                                                            choose whether to enable
                                                                                            telemetry
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Always enabled option */}
                                                                        <div className="relative">
                                                                            <div
                                                                                className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                                                <RadioGroupItem value="enabled"
                                                                                                id="telemetry-enabled"
                                                                                                className="mt-1"/>
                                                                                <div className="flex-1 space-y-2">
                                                                                    <div
                                                                                        className="flex items-center gap-2">
                                                                                        <CheckCircle
                                                                                            className="w-4 h-4 text-green-600"/>
                                                                                        <label
                                                                                            htmlFor="telemetry-enabled"
                                                                                            className="text-sm font-medium cursor-pointer">
                                                                                            Always enabled
                                                                                        </label>
                                                                                        <Badge variant="default"
                                                                                               className="text-xs">
                                                                                            Recommended
                                                                                        </Badge>
                                                                                    </div>
                                                                                    <p className="text-xs text-muted-foreground">
                                                                                        Automatically collect anonymous
                                                                                        usage data to help improve the
                                                                                        product
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Always disabled option */}
                                                                        <div className="relative">
                                                                            <div
                                                                                className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                                                <RadioGroupItem value="disabled"
                                                                                                id="telemetry-disabled"
                                                                                                className="mt-1"/>
                                                                                <div className="flex-1 space-y-2">
                                                                                    <div
                                                                                        className="flex items-center gap-2">
                                                                                        <XCircle
                                                                                            className="w-4 h-4 text-red-600"/>
                                                                                        <label
                                                                                            htmlFor="telemetry-disabled"
                                                                                            className="text-sm font-medium cursor-pointer">
                                                                                            Always disabled
                                                                                        </label>
                                                                                    </div>
                                                                                    <p className="text-xs text-muted-foreground">
                                                                                        Completely disable telemetry
                                                                                        data collection
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </RadioGroup>
                                                                </FormControl>
                                                                <FormDescription className="mt-4">
                                                                    {getTelemetryDescription(currentTelemetryValue)}
                                                                </FormDescription>
                                                                <FormMessage/>
                                                            </FormItem>

                                                            {/* Information cards */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {/* What we collect */}
                                                                <Card
                                                                    className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                                                                    <CardContent className="pt-4">
                                                                        <div className="flex items-start gap-3">
                                                                            <CheckCircle
                                                                                className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"/>
                                                                            <div className="space-y-3">
                                                                                <h4 className="font-medium text-green-900 dark:text-green-100">
                                                                                    What we collect
                                                                                </h4>
                                                                                <div className="space-y-2">
                                                                                    <Badge variant="outline"
                                                                                           className="text-xs bg-green-100 border-green-300 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-200">
                                                                                        Version: {appInfo.version}
                                                                                    </Badge>
                                                                                    <Badge variant="outline"
                                                                                           className="text-xs bg-green-100 border-green-300 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-200">
                                                                                        Environment: {appInfo.environment}
                                                                                    </Badge>
                                                                                    <Badge variant="outline"
                                                                                           className="text-xs bg-green-100 border-green-300 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-200">
                                                                                        Anonymous instance ID
                                                                                    </Badge>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>

                                                                {/* What we don't collect */}
                                                                <Card
                                                                    className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
                                                                    <CardContent className="pt-4">
                                                                        <div className="flex items-start gap-3">
                                                                            <XCircle
                                                                                className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"/>
                                                                            <div className="space-y-3">
                                                                                <h4 className="font-medium text-red-900 dark:text-red-100">
                                                                                    What we don&apos;t collect
                                                                                </h4>
                                                                                <div
                                                                                    className="space-y-1 text-xs text-red-700 dark:text-red-300">
                                                                                    <div>• Personal data or user
                                                                                        information
                                                                                    </div>
                                                                                    <div>• Application logs or sensitive
                                                                                        data
                                                                                    </div>
                                                                                    <div>• Project content or
                                                                                        configurations
                                                                                    </div>
                                                                                    <div>• IP addresses or tracking
                                                                                        data
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            </div>

                                                            {/* Privacy notice */}
                                                            <div
                                                                className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
                                                                <Shield
                                                                    className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0"/>
                                                                <div className="space-y-2">
                                                                    <h4 className="text-sm font-medium">Privacy &
                                                                        Security</h4>
                                                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                                                        All telemetry data is anonymized, encrypted in
                                                                        transit, and used solely for product
                                                                        improvement.
                                                                        We follow GDPR guidelines and never sell or
                                                                        share your data with third parties.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                            />
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="integrations" className="space-y-6">
                                        <motion.div
                                            variants={cardVariants}
                                            initial="hidden"
                                            animate="visible"
                                            className="flex flex-row items-center justify-between rounded-lg border p-4"
                                        >
                                            <div className="flex gap-2">
                                                <Mail className="h-5 w-5 text-muted-foreground mt-0.5"/>
                                                <div className="space-y-1">
                                                    <h3 className="text-base font-medium">System Email</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Configure SMTP settings for internal system usage.
                                                    </p>
                                                </div>
                                            </div>
                                            <Button asChild variant="outline" size="sm">
                                                <Link href="/dashboard/admin/system/email">
                                                    Configure
                                                </Link>
                                            </Button>
                                        </motion.div>
                                    </TabsContent>

                                    <Separator className="my-6"/>

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={updateConfig.isPending}
                                            className="px-8"
                                        >
                                            {updateConfig.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="mr-2 h-4 w-4"/>
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </Tabs>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}