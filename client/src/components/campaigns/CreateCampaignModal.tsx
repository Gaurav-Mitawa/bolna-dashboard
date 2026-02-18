/**
 * Create Campaign Modal
 * Modal for creating new outbound campaigns
 */
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { agentApi, phoneNumbersApi, BolnaAgent, BolnaPhoneNumber } from "@/lib/bolnaApi";
import { CreateCampaignData, generateCSVFromCustomers, downloadCSVTemplate } from "@/api/bolnaCampaigns";
import { Upload, Download, FileText, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateCampaignData) => Promise<void>;
}

const statusOptions = [
  { value: "fresh", label: "Fresh" },
  { value: "purchased", label: "Purchased" },
  { value: "converted", label: "Converted" },
  { value: "fresh_na", label: "Fresh - NA" },
  { value: "not_interested", label: "Not Interested" },
];

export function CreateCampaignModal({
  open,
  onOpenChange,
  onCreate,
}: CreateCampaignModalProps) {
  const [step, setStep] = useState(1);
  const [agents, setAgents] = useState<BolnaAgent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<BolnaPhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customerCount, setCustomerCount] = useState(0);
  
  // Form data
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["fresh"]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>("");

  // Filter available phone numbers for selected agent
  const availablePhoneNumbers = useMemo(() => {
    if (!selectedAgent) return [];
    return phoneNumbers.filter(phone => 
      phone.agent_id === null || phone.agent_id === selectedAgent
    );
  }, [phoneNumbers, selectedAgent]);

  // Reset phone number when agent changes or set default
  useEffect(() => {
    if (availablePhoneNumbers.length > 0) {
      // Check if current selection is still valid
      const isCurrentValid = availablePhoneNumbers.some(p => p.phone_number === selectedPhoneNumber);
      if (!isCurrentValid) {
        setSelectedPhoneNumber(availablePhoneNumbers[0].phone_number);
      }
    } else {
      setSelectedPhoneNumber("");
    }
  }, [availablePhoneNumbers, selectedPhoneNumber]);

  // Load agents and phone numbers when modal opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setIsLoadingData(true);
    setDataError(null);
    try {
      console.log("Fetching agents and phone numbers...");
      const [agentsData, phoneNumbersData] = await Promise.all([
        agentApi.getAll(),
        phoneNumbersApi.getAll(),
      ]);
      
      console.log("Agents received:", agentsData);
      console.log("Phone numbers received:", phoneNumbersData);
      
      setAgents(agentsData);
      setPhoneNumbers(phoneNumbersData);
      
      // Set defaults
      if (agentsData.length > 0) {
        setSelectedAgent(agentsData[0].id);
      }
      // Phone number will be set by the useEffect below when agent changes
      
      if (agentsData.length === 0) {
        console.warn("No agents found in the API response");
      }
      if (phoneNumbersData.length === 0) {
        console.warn("No phone numbers found in the API response");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load agents and phone numbers";
      setDataError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Calculate customer count when status changes
  useEffect(() => {
    if (step === 1 && selectedStatuses.length > 0) {
      calculateCustomerCount();
    }
  }, [selectedStatuses, step]);

  const calculateCustomerCount = async () => {
    try {
      const csvBlob = await generateCSVFromCustomers(selectedStatuses);
      const text = await csvBlob.text();
      const lines = text.split("\n").filter(line => line.trim());
      setCustomerCount(Math.max(0, lines.length - 1)); // Exclude header
    } catch (error) {
      console.error("Error calculating customer count:", error);
      setCustomerCount(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast.error("Please upload a CSV file");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDownloadTemplate = () => {
    downloadCSVTemplate();
    toast.success("Template downloaded");
  };

  const handleDownloadFromStatus = async () => {
    try {
      const csvBlob = await generateCSVFromCustomers(selectedStatuses);
      const url = window.URL.createObjectURL(csvBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `customers_${selectedStatuses.join("_")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("CSV downloaded with filtered customers");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Failed to generate CSV");
    }
  };

  const handleCreate = async () => {
    if (!selectedFile) {
      toast.error("Please upload a CSV file");
      return;
    }
    if (!selectedAgent) {
      toast.error("Please select an agent");
      return;
    }
    if (!selectedPhoneNumber) {
      toast.error("Please select a phone number");
      return;
    }

    setIsLoading(true);
    try {
      await onCreate({
        agentId: selectedAgent,
        file: selectedFile,
        fromPhoneNumber: selectedPhoneNumber,
        statusTags: selectedStatuses,
      });
      toast.success("Campaign created successfully");
      onOpenChange(false);
      // Reset form
      setStep(1);
      setSelectedFile(null);
      setSelectedStatuses(["fresh"]);
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error("Failed to create campaign");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Create New Campaign
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${s === step ? "bg-orange-500 text-white" : 
                  s < step ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}
              `}>
                {s < step ? "✓" : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-0.5 mx-2 ${s < step ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Target Customers */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Target Customers</h3>
              <p className="text-sm text-gray-500 mb-4">
                Select which customer statuses to include in this campaign
              </p>
            </div>

            <div className="space-y-3">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={option.value}
                    checked={selectedStatuses.includes(option.value)}
                    onCheckedChange={() => toggleStatus(option.value)}
                  />
                  <Label htmlFor={option.value} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{customerCount}</strong> customers match the selected criteria
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleDownloadFromStatus}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <Button onClick={() => setStep(2)} disabled={selectedStatuses.length === 0}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Campaign Settings */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Campaign Settings</h3>
              <p className="text-sm text-gray-500 mb-4">
                Configure the agent and caller ID for this campaign
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
                    <ChevronRight className="h-4 w-4 mr-2" />
                  )}
                  Retry
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Select Agent</Label>
                {isLoadingData ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading agents...
                  </div>
                ) : agents.length === 0 ? (
                  <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    No agents found. Please create an agent first in the AI Agents section.
                  </div>
                ) : (
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
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
                  <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    No available phone numbers for this agent. Please purchase a phone number or assign one to this agent in the Settings section.
                  </div>
                ) : (
                  <Select value={selectedPhoneNumber} onValueChange={setSelectedPhoneNumber}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a phone number" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePhoneNumbers.map((phone) => (
                        <SelectItem key={phone.id} value={phone.phone_number}>
                          {phone.phone_number} {phone.agent_id === selectedAgent ? "(Assigned)" : "(Available)"}
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

        {/* Step 3: Upload CSV */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Upload Contacts</h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a CSV file with phone numbers and optional variables
              </p>
            </div>

            <div 
              className={`
                border-2 border-dashed rounded-lg p-8 text-center
                ${selectedFile ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"}
              `}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="h-10 w-10 mx-auto text-green-600" />
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove file
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-10 w-10 mx-auto text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Drag and drop your CSV file here, or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Button variant="outline" size="sm" asChild>
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        Choose File
                      </label>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Need a template?</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!selectedFile || isLoading}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isLoading ? (
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
