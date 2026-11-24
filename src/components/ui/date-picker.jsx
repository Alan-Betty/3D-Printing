import * as React from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/combobox"
import { cn } from "@/lib/utils"

export function DatePicker({
  date,
  onChange,
  placeholder = "Pick a delivery date",
  presets = [
    { label: "+3d Express", days: 3 },
    { label: "+5d Standard", days: 5 },
    { label: "+7d 1 Week", days: 7 },
    { label: "+14d 2 Weeks", days: 14 },
  ],
  className,
}) {
  const [open, setOpen] = React.useState(false)

  const handlePreset = (days) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    const iso = d.toISOString().split("T")[0]
    onChange(iso)
    setOpen(false)
  }

  const formattedDate = React.useMemo(() => {
    if (!date) return null
    try {
      const parsed = new Date(date)
      if (Number.isNaN(parsed.getTime())) return date
      return parsed.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch {
      return date
    }
  }, [date])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left text-xs font-normal border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-white",
            !date && "text-slate-400",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-cyan" />
          {formattedDate || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 border-slate-700 bg-[#0e1422] space-y-3" align="start">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-primary" /> Quick Production Presets
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {presets.map((p) => (
              <Button
                key={p.days}
                type="button"
                variant="outline"
                size="xs"
                onClick={() => handlePreset(p.days)}
                className="justify-start text-[11px] border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800 pt-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Exact Date Selector
          </div>
          <input
            type="date"
            value={date || ""}
            onChange={(e) => {
              onChange(e.target.value)
              if (e.target.value) setOpen(false)
            }}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {date && (
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
              className="text-[10.5px] text-destructive hover:bg-destructive/10"
            >
              Clear Date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
