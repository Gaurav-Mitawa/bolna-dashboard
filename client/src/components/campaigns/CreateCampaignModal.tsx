/**
 * Create Campaign Modal
 * Creates campaigns via backend proxy (per-user Bolna key, CSV from CRM)
 */
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronRight, ChevronLeft, Users } from "lucide-react";
import { toast } from "sonner";

interface Agent {
  agent_id?: string;
  id?: string;
  agent_name: string;
}

interface PhoneNumber {
  phone_number: string;
  agent_id?: string | null;
}

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const statusOptions = [
  { value: "fresh", label: "Fresh" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
  { value: "booked", label: "Booked" },
  { value: "NA", label: "N/A" },
];

export function CreateCampaignModal({
  open,
  onOpenChange,
  onCreated,
}: CreateCampaignModalProps) {
  const [step, setStep] = useState(1);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [campaignName, setCampaignName] = useState("");

  const [selectedStatus, setSelectedStatus] = useState<string>("fresh");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>("");

  const availablePhoneNumbers = useMemo(() => {
    if (!selectedAgent) return phoneNumbers;
    return phoneNumbers.filter(
      (p) => p.agent_id === null || p.agent_id === undefined || p.agent_id === selectedAgent
    );
  }, [phoneNumbers, selectedAgent]);

  useEffect(() => {
    if (open) {
      loadData();
      setStep(1);
      setSelectedStatus("fresh");
      setSelectedAgent("");
      setSelectedPhoneNumber("");
      setCampaignName("");
      setPreviewCount(null);
    }
  }, [open]);

  useEffect(() => {
    if (availablePhoneNumbers.length > 0) {
      const currentValid = availablePhoneNumbers.some(
        (p) => p.phone_number === selectedPhoneNumber
      );
      if (!currentValid) {
        setSelectedPhoneNumber(availablePhoneNumbers[0].phone_number);
      }
    } else {
      setSelectedPhoneNumber("");
    }
  }, [availablePhoneNumbers, selectedPhoneNumber]);

  const loadData = async () => {
    setIsLoadingData(true);
    setDataError(null);
    try {
      const [agentsRes, phonesRes] = await Promise.all([
        fetch("/api/bolna/agents", { credentials: "include" }),
        fetch("/api/bolna/phone-numbers", { credentials: "include" }),
      ]);

      if (!agentsRes.ok) throw new Error("Failed to fetch agents");
      if (!phonesRes.ok) throw new Error("Failed to fetch phone numbers");

      const { agents: agentsData } = await agentsRes.json();
      const { numbers: phonesData } = await phonesRes.json();

      const normalizedAgents: Agent[] = (agentsData || []).map((a: any) => ({
        agent_id: a.agent_id || a.id,
        agent_name: a.agent_name || a.name || "Unnamed Agent",
      }));

      setAgents(normalizedAgents);
      setPhoneNumbers(phonesData || []);

      if (normalizedAgents.length > 0) {
        setSelectedAgent(normalizedAgents[0].agent_id || "");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to load agents and phone numbers";
      setDataError(msg);
      toast.error(msg);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadPreview = async (status: string) => {
    try {
      const res = await fetch(`/api/campaigns/preview?status=${status}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewCount(data.count ?? 0);
      }
    } catch {
      setPreviewCount(null);
    }
  };

  useEffect(() => {
    if (step === 1 && selectedStatus) {
      loadPreview(selectedStatus);
    }
  }, [selectedStatus, step]);

  const handleCreate = async () => {
    if (!selectedAgent) {
      toast.error("Please select an agent");
      return;
    }
    if (!selectedPhoneNumber) {
      toast.error("Please select a phone number");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/campaigns/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName: campaignName || `${selectedStatus} Campaign`,
          agentId: selectedAgent,
          targetStatus: selectedStatus,
          fromPhoneNumber: selectedPhoneNumber,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Create failed" }));
        throw new Error(err.error || "Failed to create campaign");
      }

      toast.success("Campaign created and submitted to Bolna");
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to create campaign");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Campaign</DialogTitle>
          <DialogDescription className="sr-only">
            Follow the steps to select target status, assign an agent, and create a campaign.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${s === step ? "bg-orange-500 text-white" : s < step ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}
              >
                {s < step ? "✓" : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-0.5 mx-2 ${s < step ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Target status */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium mb-1">Target Lead Status</h3>
              <p className="text-sm text-gray-500 mb-4">
                Select which CRM status to target for this campaign
              </p>
            </div>

            <div className="space-y-3">
              {statusOptions.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={opt.value}
                    checked={selectedStatus === opt.value}
                    onCheckedChange={() => setSelectedStatus(opt.value)}
                  />
                  <Label htmlFor={opt.value} className="cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                {previewCount === null ? (
                  "Loading count..."
                ) : (
                  <>
                    <strong>{previewCount}</strong> customer
                    {previewCount !== 1 ? "s" : ""} match the selected status
                  </>
                )}
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedStatus || previewCount === 0}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Agent + phone */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium mb-1">Campaign Settings</h3>
              <p className="text-sm text-gray-500 mb-4">
                Configure the agent and caller ID
              </p>
            </div>

            {dataError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>Error:</strong> {dataError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadData}
                  className="mt-2"
                  disabled={isLoadingData}
                >
                  {isLoadingData ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    "Retry"
                  )}
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Campaign Name (optional)</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder={`${selectedStatus} Campaign`}
                />
              </div>

              <div>
                <Label className="mb-2 block">Select Agent</Label>
                {isLoadingData ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading agents...
                  </div>
                ) : agents.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    No agents found. Please create an agent in your Bolna account first.
                  </p>
                ) : (
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem
                          key={agent.agent_id || agent.id}
                          value={agent.agent_id || agent.id || ""}
                        >
                          {agent.agent_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label className="mb-2 block">From Phone Number</Label>
                {isLoadingData ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading phone numbers...
                  </div>
                ) : availablePhoneNumbers.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    No phone numbers available. Please add a phone number in your Bolna account.
                  </p>
                ) : (
                  <Select value={selectedPhoneNumber} onValueChange={setSelectedPhoneNumber}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a phone number" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePhoneNumbers.map((phone) => (
                        <SelectItem key={phone.phone_number} value={phone.phone_number}>
                          {phone.phone_number}
                          {phone.agent_id === selectedAgent ? " (Assigned)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={isLoadingData || !selectedAgent || !selectedPhoneNumber}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium mb-1">Confirm Campaign</h3>
              <p className="text-sm text-gray-500 mb-4">
                Review your campaign details before launching
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Campaign Name</span>
                <span className="font-medium">{campaignName || `${selectedStatus} Campaign`}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Target Status</span>
                <span className="font-medium capitalize">{selectedStatus.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Contacts</span>
                <span className="font-medium">{previewCount ?? "—"} customers</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Agent</span>
                <span className="font-medium">
                  {agents.find((a) => (a.agent_id || a.id) === selectedAgent)?.agent_name || selectedAgent}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">From Number</span>
                <span className="font-medium">{selectedPhoneNumber}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              The backend will build a CSV from your CRM customers with status{" "}
              <strong>{selectedStatus}</strong> and submit it to Bolna.
            </p>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Campaign"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
