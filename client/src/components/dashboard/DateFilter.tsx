/**
 * Date Filter Component for Dashboard
 * Supports preset ranges (24h, 7d, 30d) and custom date selection
 */

import * as React from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DateRangeOption = "24h" | "7d" | "30d" | "custom";

export interface DateRangeFilter {
  start: Date;
  end: Date;
  label: string;
  option: DateRangeOption;
}

interface DateFilterProps {
  value: DateRangeFilter;
  onChange: (range: DateRangeFilter) => void;
  className?: string;
}

const PRESETS = [
  { label: "Last 24 Hours", value: "24h" as DateRangeOption, days: 1 },
  { label: "Last 7 Days", value: "7d" as DateRangeOption, days: 7 },
  { label: "Last 30 Days", value: "30d" as DateRangeOption, days: 30 },
];

export function getDefaultDateRange(): DateRangeFilter {
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(end, 7));
  return {
    start,
    end,
    label: "Last 7 Days",
    option: "7d",
  };
}

export function DateFilter({ value, onChange, className }: DateFilterProps) {
  const [isCustomOpen, setIsCustomOpen] = React.useState(false);
  const [customRange, setCustomRange] = React.useState<DateRange | undefined>({
    from: value.start,
    to: value.end,
  });

  const handlePresetSelect = (preset: (typeof PRESETS)[0]) => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(end, preset.days));
    onChange({
      start,
      end,
      label: preset.label,
      option: preset.value,
    });
  };

  const handleCustomApply = () => {
    if (customRange?.from && customRange?.to) {
      onChange({
        start: startOfDay(customRange.from),
        end: endOfDay(customRange.to),
        label: `${format(customRange.from, "MMM d")} - ${format(
          customRange.to,
          "MMM d"
        )}`,
        option: "custom",
      });
      setIsCustomOpen(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value.label}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-2 space-y-2">
            {/* Preset Options */}
            <div className="space-y-1">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-sm",
                    value.option === preset.value && "bg-accent"
                  )}
                  onClick={() => handlePresetSelect(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="h-px bg-border" />

            {/* Custom Range Option */}
            <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-sm",
                    value.option === "custom" && "bg-accent"
                  )}
                >
                  Custom Range
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="space-y-3">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customRange?.from}
                    selected={customRange}
                    onSelect={setCustomRange}
                    numberOfMonths={2}
                    disabled={(date) => date > new Date()}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCustomOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCustomApply}
                      disabled={!customRange?.from || !customRange?.to}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateFilter;
