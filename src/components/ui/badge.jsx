import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground border-border",
        express:
          "border-[#ff5e1e]/40 bg-[#ff5e1e]/15 text-[#ff783b] shadow-[0_0_8px_rgba(255,94,30,0.2)]",
        cyan: "border-[#00f0ff]/40 bg-[#00f0ff]/15 text-[#00f0ff]",
        emerald: "border-[#10b981]/40 bg-[#10b981]/15 text-[#34d399]",
        amber: "border-[#f59e0b]/40 bg-[#f59e0b]/15 text-[#fbbf24]",
        muted: "border-border/60 bg-muted/40 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
