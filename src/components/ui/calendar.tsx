import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

// Annahme: Diese Hilfsfunktionen sind an anderer Stelle in Ihrem Projekt definiert
// import { cn } from "@/lib/utils"
// import { buttonVariants } from "@/components/ui/button"

// --- Hilfsfunktionen (hier zur Lauffähigkeit eingefügt) ---
// Normalerweise würden Sie diese aus Ihren 'utils' und 'button' Komponenten importieren.
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Minimales Mockup für buttonVariants, damit der Code typsicher ist
// Ersetzen Sie dies durch Ihren tatsächlichen Import
const buttonVariants = (options?: any) => {
  // Simuliert die Rückgabe von Klassen basierend auf Varianten
  if (options?.variant === "outline") {
    return "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground"
  }
  if (options?.variant === "ghost") {
    return "hover:bg-accent hover:text-accent-foreground"
  }
  return "inline-flex items-center justify-center rounded-md text-sm font-medium"
}
// --- Ende der Hilfsfunktionen ---


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

        // --- FIX #1: Ausrichtung der Wochentage ---
        // Stellt sicher, dass die Kopfzeile (Mo, Di, Mi...) die gleiche Breite
        // und Ausrichtung wie die Tageszellen hat.
        head_row: "flex w-full",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center", // 'w-9' und 'text-center' für die Spaltenausrichtung
        // --- ENDE FIX #1 ---

        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 text-foreground", // 'w-9' und 'text-center' müssen übereinstimmen

        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-neutral hover:text-secondary"
        ),
        day_selected:
          "bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground focus:bg-secondary focus:text-secondary-foreground",
        day_today: "bg-neutral text-foreground",
        day_outside: "text-muted-foreground opacity-50",

        // --- FIX #2: Deaktivierte Tage (inkl. Hover-Reset) ---
        // Graut aus, fügt Durchstreichen hinzu und entfernt alle Hover-Effekte,
        // indem die Hover-Stile der 'day'-Klasse überschrieben werden.
        day_disabled:
          "text-muted-foreground opacity-50 line-through " + // Ausgrauen und durchstreichen
          "hover:bg-transparent hover:text-muted-foreground " + // Hover-Effekt entfernen
          "cursor-not-allowed", // Zeigen, dass nicht klickbar
        // --- ENDE FIX #2 ---

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
