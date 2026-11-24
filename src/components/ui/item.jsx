import * as React from "react"
import { cn } from "@/lib/utils"

const Item = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-start gap-3 rounded-lg border border-slate-800/80 bg-[#0d131f] p-3 text-xs transition-colors hover:border-slate-700",
      className
    )}
    {...props}
  />
))
Item.displayName = "Item"

const ItemMedia = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 border border-slate-800 text-slate-300", className)}
    {...props}
  />
))
ItemMedia.displayName = "ItemMedia"

const ItemContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("min-w-0 flex-1 space-y-0.5", className)} {...props} />
))
ItemContent.displayName = "ItemContent"

const ItemTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("font-medium text-white truncate", className)} {...props} />
))
ItemTitle.displayName = "ItemTitle"

const ItemDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-slate-400 text-[11px] leading-relaxed", className)} {...props} />
))
ItemDescription.displayName = "ItemDescription"

const ItemActions = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex shrink-0 items-center gap-1.5", className)} {...props} />
))
ItemActions.displayName = "ItemActions"

export { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions }
