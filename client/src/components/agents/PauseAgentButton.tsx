import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Pause } from "lucide-react";
import { agentApi } from "@/lib/bolnaApi";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface PauseAgentButtonProps {
  agentId: string;
  agentName: string;
  onStopped?: () => void;
}

type ButtonState = "running" | "loading" | "stopped";

export function PauseAgentButton({ agentId, agentName, onStopped }: PauseAgentButtonProps) {
  const [buttonState, setButtonState] = useState<ButtonState>("running");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handlePauseClick = () => {
    setShowConfirmDialog(true);
  };

  const confirmPauseAgent = async () => {
    setShowConfirmDialog(false);
    setButtonState("loading");

    try {
      const response = await agentApi.stopQueuedCalls(agentId);
      
      // Show success toast with count of stopped calls
      const count = (response as any)?.stopped_executions?.length || 0;
      toast.success(`Stopped ${count} queued call(s) successfully.`);
      
      setButtonState("stopped");
      onStopped?.();
    } catch (error) {
      toast.error("Error stopping agent. Please retry.");
      console.error("Error stopping agent:", error);
      setButtonState("running");
    }
  };

  const isDisabled = buttonState === "loading" || buttonState === "stopped";

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`h-9 px-3 ${
          buttonState === "stopped"
            ? "bg-gray-100 text-gray-500"
            : "text-red-600 hover:bg-red-50"
        }`}
        onClick={handlePauseClick}
        disabled={isDisabled}
      >
        {buttonState === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Stopping...
          </>
        ) : buttonState === "stopped" ? (
          <>
            <Pause className="h-4 w-4 mr-2" />
            Stopped
          </>
        ) : (
          <>
            <Pause className="h-4 w-4 mr-2" />
            Pause Agent
          </>
        )}
      </Button>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Stop All Queued Calls"
        description={`This will stop ALL queued calls for agent "${agentName}". This action is irreversible. Continue?`}
        confirmText="Stop Calls"
        cancelText="Cancel"
        onConfirm={confirmPauseAgent}
        variant="destructive"
      />
    </>
  );
}
