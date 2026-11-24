import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent shadow-sm hover:bg-muted hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-muted/80 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        cyan: "bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/40 hover:bg-[#00f0ff]/25 shadow-[0_0_12px_rgba(0,240,255,0.2)]",
        teal: "bg-[#2dd4bf]/15 text-[#2dd4bf] border border-[#2dd4bf]/40 hover:bg-[#2dd4bf]/25",
        accent: "bg-[#ff5e1e] text-white hover:bg-[#ff783b] shadow-[0_0_16px_rgba(255,94,30,0.35)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        xs: "h-7 rounded px-2 text-xs",
        lg: "h-10 rounded-md px-8 text-base",
        icon: "h-8 w-8",
        iconSm: "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
