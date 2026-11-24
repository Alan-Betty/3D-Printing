import * as React from "react"
import { cn } from "@/lib/utils"

const InputGroup = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("relative flex w-full items-center", className)}
      {...props}
    >
      {children}
    </div>
  )
})
InputGroup.displayName = "InputGroup"

const InputLeftAddon = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center rounded-l-md border border-r-0 border-slate-700 bg-slate-900 px-3 text-xs text-slate-400 select-none h-9 shrink-0",
        className
      )}
      {...props}
    />
  )
})
InputLeftAddon.displayName = "InputLeftAddon"

const InputRightAddon = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center rounded-r-md border border-l-0 border-slate-700 bg-slate-900 px-3 text-xs text-slate-400 select-none h-9 shrink-0",
        className
      )}
      {...props}
    />
  )
})
InputRightAddon.displayName = "InputRightAddon"

const InputLeftElement = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center justify-center",
        className
      )}
      {...props}
    />
  )
})
InputLeftElement.displayName = "InputLeftElement"

const InputRightElement = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center",
        className
      )}
      {...props}
    />
  )
})
InputRightElement.displayName = "InputRightElement"

export {
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  InputLeftElement,
  InputRightElement,
}
