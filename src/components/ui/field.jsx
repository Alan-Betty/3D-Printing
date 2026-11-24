import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const Field = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-1.5 text-left", className)} {...props} />
))
Field.displayName = "Field"

const FieldGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-4", className)} {...props} />
))
FieldGroup.displayName = "FieldGroup"

const FieldLabel = React.forwardRef(({ className, required, children, ...props }, ref) => (
  <Label ref={ref} className={cn("text-xs font-medium text-slate-300 flex items-center justify-between", className)} {...props}>
    <span>
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </span>
  </Label>
))
FieldLabel.displayName = "FieldLabel"

const FieldDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-[11px] text-slate-500 leading-normal", className)} {...props} />
))
FieldDescription.displayName = "FieldDescription"

const FieldError = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-[11px] font-medium text-destructive", className)} {...props} />
))
FieldError.displayName = "FieldError"

export { Field, FieldGroup, FieldLabel, FieldDescription, FieldError }
