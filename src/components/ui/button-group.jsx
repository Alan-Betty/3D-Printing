import * as React from "react"
import { cn } from "@/lib/utils"

const ButtonGroup = React.forwardRef(({ className, orientation = "horizontal", ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="group"
      className={cn(
        "inline-flex items-center",
        orientation === "horizontal"
          ? "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:-ml-[1px] [&>*:not(:last-child)]:rounded-r-none"
          : "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:-mt-[1px] [&>*:not(:last-child)]:rounded-b-none",
        className
      )}
      {...props}
    />
  )
})
ButtonGroup.displayName = "ButtonGroup"

export { ButtonGroup }
