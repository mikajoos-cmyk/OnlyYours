// src/components/ui/calendar.tsx
import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = false, // Behält Ihre Einstellung 'false' bei
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-card text-card-foreground", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-border hover:bg-neutral"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full",

        // --- KORRIGIERTER BEREICH (Ausrichtung) ---
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center", // 'w-9' und 'text-center' hinzugefügt
        // --- ENDE KORREKTUR ---

        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 text-foreground",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-neutral hover:text-secondary",
          "disabled:opacity-50" // 'disabled:line-through' von hier entfernt
        ),
        day_selected:
          "bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground focus:bg-secondary focus:text-secondary-foreground",
        day_today: "bg-neutral text-foreground",
        day_outside: "text-muted-foreground opacity-50",

        // --- KORRIGIERTER BEREICH (Durchstreichen) ---
        day_disabled: "text-muted-foreground opacity-50 line-through", // 'line-through' HIER hinzugefügt
        // --- ENDE KORREKTUR ---

        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }