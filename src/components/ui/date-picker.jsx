import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/combobox"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

export function DatePicker({
  id,
  date,
  onChange,
  placeholder = "Pick a delivery date",
  className,
}) {
  const [open, setOpen] = React.useState(false)
  const selectedDate = React.useMemo(() => {
    if (!date) return undefined
    const [year, month, day] = date.split("-").map(Number)
    const parsed = new Date(year, month - 1, day)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }, [date])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(selected) => {
            onChange(selected ? format(selected, "yyyy-MM-dd") : "")
            if (selected) setOpen(false)
          }}
          initialFocus
        />
        {date && (
          <div className="border-t p-2 text-right">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
              className="h-8 text-xs"
            >
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
