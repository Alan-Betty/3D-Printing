import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

function Spinner({ className, size = "default", ...props }) {
  const sizeMap = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    default: "h-4 w-4",
    lg: "h-6 w-6",
    xl: "h-8 w-8",
  }

  return (
    <Loader2
      className={cn("animate-spin text-primary", sizeMap[size] || sizeMap.default, className)}
      {...props}
    />
  )
}

export { Spinner }
