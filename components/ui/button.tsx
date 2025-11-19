import * as React from "react"
import {Slot} from "@radix-ui/react-slot"
import {cva, type VariantProps} from "class-variance-authority"
import {cn} from "@/lib/utils"

const buttonVariants = cva(
    "relative isolate inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: [
                    // Base styling with the optical border
                    "border border-primary/20 bg-primary text-primary-foreground",
                    // Background layer for depth
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius)-1px)] before:bg-primary before:shadow-sm",
                    // Overlay layer for hover effects
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius)-1px)]",
                    // Inner highlight
                    "after:shadow-[inset_0_1px_theme(colors.white/15%)]",
                    // Hover overlay
                    "hover:after:bg-white/10 active:after:bg-white/5",
                    // Dark mode adjustments
                    "dark:border-primary/30 dark:before:hidden dark:after:-inset-px",
                ],
                destructive: [
                    "border border-destructive/20 bg-destructive text-destructive-foreground",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius)-1px)] before:bg-destructive before:shadow-sm",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.white/15%)]",
                    "hover:after:bg-white/10 active:after:bg-white/5",
                    "dark:border-destructive/30 dark:before:hidden dark:after:-inset-px",
                ],
                success: [
                    "border border-success/20 bg-green-500 dark:bg-green-600 text-white",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius)-1px)] before:bg-green-500 dark:before:bg-green-600 before:shadow-sm",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.white/15%)]",
                    "hover:after:bg-white/10 active:after:bg-white/5",
                    "dark:border-green-500/30 dark:before:hidden dark:after:-inset-px",
                ],
                outline: [
                    "border border-border bg-background text-foreground",
                    "hover:bg-accent/50 hover:text-accent-foreground",
                    "active:bg-accent/80",
                    "dark:border-border/50 dark:hover:bg-accent/30",
                ],
                secondary: [
                    "border border-secondary/20 bg-secondary text-secondary-foreground",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius)-1px)] before:bg-secondary before:shadow-sm",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius)-1px)]",
                    "hover:after:bg-foreground/5 active:after:bg-foreground/10",
                    "dark:before:hidden dark:after:-inset-px",
                ],
                ghost: [
                    "border border-transparent text-foreground",
                    "hover:bg-accent/50 hover:text-accent-foreground",
                    "active:bg-accent/80",
                ],
                link: [
                    "border border-transparent text-primary",
                    "underline-offset-4 hover:underline",
                    "after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-current after:transition-all",
                    "hover:after:w-full",
                ],
            },
            size: {
                default: "h-10 px-4 py-2 rounded-lg text-sm",
                sm: "h-8 px-3 py-1.5 rounded-md text-xs",
                lg: "h-12 px-6 py-3 rounded-xl text-base",
                icon: "h-10 w-10 rounded-lg",
                pill: "h-10 px-6 rounded-full text-sm",
            },
            animation: {
                none: "",
                bounce: "active:scale-95",
                scale: "hover:scale-105 active:scale-95",
                slide: "active:translate-y-0.5",
            }
        },
        defaultVariants: {
            variant: "default",
            size: "default",
            animation: "none",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean
    isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({className, variant, size, animation = "none", asChild = false, isLoading, children, ...props}, ref) => {
        // Use the correct component based on asChild prop
        if (asChild) {
            return (
                <Slot
                    ref={ref}
                    className={cn(buttonVariants({variant, size, animation, className}))}
                    {...props}
                >
                    {isLoading ? (
                        <>
                            <span
                                className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"/>
                            <span>Loading...</span>
                        </>
                    ) : (
                        children
                    )}
                </Slot>
            );
        }

        // Add animation classes instead of using framer-motion props directly
        const animationClasses = {
            none: "",
            bounce: "active:translate-y-1 transition-transform",
            scale: "active:scale-95 transition-transform",
            slide: "active:translate-x-1 transition-transform"
        };

        return (
            <button
                ref={ref}
                className={cn(
                    buttonVariants({variant, size, animation, className}),
                    animation && animation !== "none" ? animationClasses[animation] : ""
                )}
                {...props}
            >
                {isLoading ? (
                    <>
                        <span
                            className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"/>
                        <span>Loading...</span>
                    </>
                ) : (
                    children
                )}
            </button>
        );
    }
)
Button.displayName = "Button"

export {Button, buttonVariants}