/**
 * Schedule Campaign Dialog Component
 * Allows users to schedule a campaign for a specific date and time
 */
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ScheduleCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (scheduledAt: string) => void;
  campaignName: string;
  isLoading?: boolean;
}

export function ScheduleCampaignDialog({
  open,
  onOpenChange,
  onSchedule,
  campaignName,
  isLoading = false,
}: ScheduleCampaignDialogProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDate(undefined);
      setTime("");
    }
  }, [open]);

  const handleSchedule = () => {
    if (!date || !time) return;

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledDateTime = new Date(date);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    // Bolna requires scheduled time to be at least 2 minutes in the future
    const minTime = new Date(Date.now() + 3 * 60 * 1000); // 3 min buffer
    if (scheduledDateTime < minTime) {
      alert("Scheduled time must be at least 3 minutes in the future.");
      return;
    }

    // Convert to ISO 8601 format — use +00:00 instead of Z (Bolna's Python backend requires it)
    const isoString = scheduledDateTime.toISOString().replace("Z", "+00:00");
    onSchedule(isoString);
  };

  const isFormValid = date && time;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Campaign</DialogTitle>
          <DialogDescription>
            Choose when to schedule &quot;{campaignName}&quot; for calling.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date: Date) => {
                    // Disable past dates
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Time</label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                min={date && date.toDateString() === new Date().toDateString() ? format(new Date(), "HH:mm") : undefined}
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Campaign will start at the scheduled time in your local timezone.
            </p>
          </div>

          {/* Selected datetime preview */}
          {isFormValid && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">Scheduled for:</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(`${format(date!, "yyyy-MM-dd")}T${time}`), "PPP 'at' h:mm a")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? "Scheduling..." : "Schedule Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
