// src/components/ui/time-picker.tsx
import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  disabled?: boolean;
}

// Erstellt ein Array von Zahlen (z.B. für Stunden oder Minuten)
const createTimeOptions = (max: number, step: number = 1): string[] => {
  return Array.from({ length: Math.ceil(max / step) }, (_, i) =>
    (i * step).toString().padStart(2, '0')
  );
};

const hours = createTimeOptions(24);
const minutes = createTimeOptions(60, 5); // 5-Minuten-Schritte

export function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const [hour, minute] = value.split(':');

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${minute}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${hour}:${newMinute}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={hour} onValueChange={handleHourChange} disabled={disabled}>
        <SelectTrigger className="bg-background text-foreground border-border w-[80px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card text-foreground border-border max-h-60">
          {hours.map(h => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-foreground font-bold">:</span>
      <Select value={minute} onValueChange={handleMinuteChange} disabled={disabled}>
        <SelectTrigger className="bg-background text-foreground border-border w-[80px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card text-foreground border-border max-h-60">
          {minutes.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}