import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'

export function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col',
        month: 'space-y-4',
        month_caption: 'relative flex items-center justify-center pt-1',
        caption_label: 'text-sm font-medium',
        nav: 'flex items-center gap-1',
        button_previous:
          'absolute left-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background p-0 text-foreground hover:bg-accent hover:text-accent-foreground',
        button_next:
          'absolute right-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background p-0 text-foreground hover:bg-accent hover:text-accent-foreground',
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday: 'w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground',
        week: 'mt-2 flex w-full',
        day: 'relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20',
        day_button:
          'inline-flex h-9 w-9 items-center justify-center rounded-md p-0 font-normal hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
        today: '[&>button]:bg-accent [&>button]:text-accent-foreground',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  )
}
