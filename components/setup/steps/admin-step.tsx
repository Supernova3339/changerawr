'use client';

import React, {useState, useEffect} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {SetupStep} from '@/components/setup/setup-step';
import {Label} from '@/components/ui/label';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {useSetup} from '@/components/setup/setup-context';
import {toast} from '@/hooks/use-toast';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {
    Shield,
    Eye,
    EyeOff,
    User,
    Mail,
    Lock,
    AlertCircle,
    Key
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {cn} from '@/lib/utils';

interface AdminStepProps {
    onNext: () => void;
    onBack: () => void;
}

const adminSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type AdminFormValues = z.infer<typeof adminSchema>;

export function AdminStep({onNext, onBack}: AdminStepProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const {markStepCompleted, isStepCompleted} = useSetup();
    const isCompleted = isStepCompleted('admin');

    const {
        register,
        handleSubmit,
        watch,
        formState: {errors, isValid}
    } = useForm<AdminFormValues>({
        resolver: zodResolver(adminSchema),
        mode: 'onChange'
    });

    const password = watch('password', '');

    // Calculate password strength (same logic as registration)
    useEffect(() => {
        if (!password) {
            setPasswordStrength(0);
            return;
        }

        let strength = 0;

        // Length check
        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;

        // Character variety
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;

        // Normalize to a scale of 0-3
        setPasswordStrength(Math.min(3, Math.floor(strength / 2)));
    }, [password]);

    const onSubmit = async (data: AdminFormValues) => {
        if (isCompleted) {
            onNext();
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/setup/admin', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create admin account');
            }

            markStepCompleted('admin');
            toast({
                title: 'Success',
                description: 'Admin account created successfully',
            });
            onNext();
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to create admin account',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get strength label and color (same as registration)
    const getStrengthLabel = () => {
        if (!password) return '';
        const labels = ['Weak', 'Fair', 'Good', 'Strong'];
        return labels[passwordStrength];
    };

    const getStrengthColor = () => {
        if (!password) return 'bg-muted';
        const colors = ['bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
        return colors[passwordStrength];
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <SetupStep
            title="Create Admin Account"
            description="Set up your administrator account to manage the system"
            icon={<Shield className="h-10 w-10 text-primary"/>}
            onNext={isCompleted ? onNext : undefined}
            onBack={onBack}
            isLoading={isSubmitting}
            isComplete={isCompleted}
            hideFooter={!isCompleted}
        >
            <form id="adminForm" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Name Field */}
                <motion.div
                    className="space-y-2"
                    initial={{x: -10, opacity: 0}}
                    animate={{x: 0, opacity: 1}}
                    transition={{duration: 0.3}}
                >
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative group">
                        <User
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200"/>
                        <Input
                            id="name"
                            {...register('name')}
                            type="text"
                            placeholder="John Doe"
                            autoComplete="name"
                            className={cn(
                                "h-12 pl-10 transition-all duration-200",
                                errors.name ? 'border-destructive focus-visible:ring-destructive/20' : 'focus-visible:ring-primary/20'
                            )}
                            autoFocus
                            startIcon={<User/>}
                        />
                    </div>
                    <AnimatePresence>
                        {errors.name && (
                            <motion.p
                                className="text-sm text-destructive flex items-center gap-1 mt-1"
                                initial={{opacity: 0, height: 0, y: -10}}
                                animate={{opacity: 1, height: 'auto', y: 0}}
                                exit={{opacity: 0, height: 0, y: -10}}
                            >
                                <span className="inline-block">⚠️</span>
                                {errors.name.message}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Email Field */}
                <motion.div
                    className="space-y-2"
                    initial={{x: -10, opacity: 0}}
                    animate={{x: 0, opacity: 1}}
                    transition={{duration: 0.3, delay: 0.1}}
                >
                    <Label htmlFor="email">Email</Label>
                    <div className="relative group">
                        <Mail
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200"/>
                        <Input
                            id="email"
                            {...register('email')}
                            type="email"
                            placeholder="admin@company.com"
                            autoComplete="email"
                            className={cn(
                                "h-12 pl-10 transition-all duration-200",
                                errors.email ? 'border-destructive focus-visible:ring-destructive/20' : 'focus-visible:ring-primary/20'
                            )}
                            startIcon={<Mail/>}
                        />
                    </div>
                    <AnimatePresence>
                        {errors.email && (
                            <motion.p
                                className="text-sm text-destructive flex items-center gap-1 mt-1"
                                initial={{opacity: 0, height: 0, y: -10}}
                                animate={{opacity: 1, height: 'auto', y: 0}}
                                exit={{opacity: 0, height: 0, y: -10}}
                            >
                                <span className="inline-block">⚠️</span>
                                {errors.email.message}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Password Field */}
                <motion.div
                    className="space-y-2"
                    initial={{x: -10, opacity: 0}}
                    animate={{x: 0, opacity: 1}}
                    transition={{duration: 0.3, delay: 0.2}}
                >
                    <div className="flex justify-between items-center">
                        <Label htmlFor="password">Password</Label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <AlertCircle className="h-4 w-4 text-muted-foreground"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">Password should be at least 8 characters. Strong passwords
                                        include uppercase letters, numbers, and symbols.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <div className="relative group">
                        <Lock
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200"/>
                        <Input
                            id="password"
                            {...register('password')}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className={cn(
                                "h-12 pl-10 pr-10 transition-all duration-200",
                                errors.password ? 'border-destructive focus-visible:ring-destructive/20' : 'focus-visible:ring-primary/20'
                            )}
                            startIcon={<Key/>}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={togglePasswordVisibility}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground"/>
                            ) : (
                                <Eye className="h-4 w-4 text-muted-foreground"/>
                            )}
                        </Button>
                    </div>

                    {/* Password strength indicator */}
                    {password && (
                        <motion.div
                            className="pt-1"
                            initial={{opacity: 0, height: 0}}
                            animate={{opacity: 1, height: 'auto'}}
                            transition={{duration: 0.2}}
                        >
                            <div className="flex justify-between items-center text-xs mb-1">
                                <span>Password strength:</span>
                                <span className={cn(
                                    passwordStrength === 0 ? "text-destructive" :
                                        passwordStrength === 1 ? "text-orange-500" :
                                            passwordStrength === 2 ? "text-yellow-500" :
                                                "text-green-500"
                                )}>
                                    {getStrengthLabel()}
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                                <motion.div
                                    className={cn("h-full transition-all duration-300 ease-out", getStrengthColor())}
                                    initial={{width: 0}}
                                    animate={{width: `${(passwordStrength + 1) * 25}%`}}
                                    transition={{duration: 0.3}}
                                />
                            </div>
                        </motion.div>
                    )}

                    <AnimatePresence>
                        {errors.password && (
                            <motion.p
                                className="text-sm text-destructive flex items-center gap-1 mt-1"
                                initial={{opacity: 0, height: 0, y: -10}}
                                animate={{opacity: 1, height: 'auto', y: 0}}
                                exit={{opacity: 0, height: 0, y: -10}}
                            >
                                <span className="inline-block">⚠️</span>
                                {errors.password.message}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Confirm Password Field */}
                <motion.div
                    className="space-y-2"
                    initial={{x: -10, opacity: 0}}
                    animate={{x: 0, opacity: 1}}
                    transition={{duration: 0.3, delay: 0.3}}
                >
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                        <Lock
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                        <Input
                            id="confirmPassword"
                            {...register('confirmPassword')}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className={cn(
                                "h-12 pl-10 transition-all duration-200",
                                errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive/20' : 'focus-visible:ring-primary/20'
                            )}
                            startIcon={<Key/>}
                        />
                    </div>
                    <AnimatePresence>
                        {errors.confirmPassword && (
                            <motion.p
                                className="text-sm text-destructive flex items-center gap-1 mt-1"
                                initial={{opacity: 0, height: 0, y: -10}}
                                animate={{opacity: 1, height: 'auto', y: 0}}
                                exit={{opacity: 0, height: 0, y: -10}}
                            >
                                <span className="inline-block">⚠️</span>
                                {errors.confirmPassword.message}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </motion.div>

                {!isCompleted && (
                    <motion.div
                        className="pt-4"
                        initial={{y: 10, opacity: 0}}
                        animate={{y: 0, opacity: 1}}
                        transition={{duration: 0.3, delay: 0.4}}
                    >
                        <Button
                            type="submit"
                            className={cn(
                                "w-full h-12 relative overflow-hidden transition-all duration-300",
                                isValid ? 'bg-primary hover:bg-primary/90' : 'bg-primary/70'
                            )}
                            disabled={isSubmitting || !isValid}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <motion.div
                                        animate={{rotate: 360}}
                                        transition={{duration: 1, repeat: Infinity, ease: "linear"}}
                                        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                                    />
                                    Creating account...
                                </span>
                            ) : (
                                <>
                                    <Shield className="mr-2 h-4 w-4"/>
                                    Create Admin Account
                                </>
                            )}

                            {/* Shine effect for valid form */}
                            {isValid && !isSubmitting && (
                                <span
                                    className="absolute right-0 top-0 h-full w-12 -skew-x-12 overflow-hidden flex justify-center items-center">
                                    <motion.div
                                        className="bg-white/20 h-8 w-8 rounded-full"
                                        initial={{x: -100}}
                                        animate={{x: 150}}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 2,
                                            ease: "easeInOut",
                                            repeatDelay: 1
                                        }}
                                    />
                                </span>
                            )}
                        </Button>
                    </motion.div>
                )}
            </form>
        </SetupStep>
    );
}