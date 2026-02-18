/**
 * Create Agent Modal
 * Modal for creating new voice agents
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CreateAgentData } from "@/api/bolnaAgents";
import { Mic, Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { toast } from "sonner";

interface CreateAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateAgentData) => Promise<void>;
}

const languages = [
  { value: "en", label: "English (US)" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
];

const voiceProviders = [
  { value: "elevenlabs", label: "ElevenLabs" },
  { value: "polly", label: "Amazon Polly" },
  { value: "deepgram", label: "Deepgram" },
];

const voices: Record<string, { value: string; label: string }[]> = {
  elevenlabs: [
    { value: "V9LCAAi4tTlqe9JadbCo", label: "Nila (Female - Professional)" },
  ],
  polly: [
    { value: "Matthew", label: "Matthew (Male - Professional)" },
  ],
  deepgram: [
    { value: "Asteria", label: "Asteria (Female - Friendly)" },
  ],
};

export function CreateAgentModal({
  open,
  onOpenChange,
  onCreate,
}: CreateAgentModalProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form data
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [voiceProvider, setVoiceProvider] = useState("elevenlabs");
  const [voiceId, setVoiceId] = useState("V9LCAAi4tTlqe9JadbCo");
  const [systemPrompt, setSystemPrompt] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter an agent name");
      return;
    }
    if (!systemPrompt.trim()) {
      toast.error("Please enter a system prompt");
      return;
    }

    setIsLoading(true);
    try {
      await onCreate({
        name: name.trim(),
        language,
        voice_provider: voiceProvider as "elevenlabs" | "polly" | "deepgram",
        voice_id: voiceId,
        system_prompt: systemPrompt.trim(),
      });
      toast.success("Voice agent created successfully");
      onOpenChange(false);
      // Reset form
      setStep(1);
      setName("");
      setLanguage("en");
      setVoiceProvider("elevenlabs");
      setVoiceId("V9LCAAi4tTlqe9JadbCo");
      setSystemPrompt("");
    } catch (error) {
      console.error("Error creating agent:", error);
      toast.error("Failed to create voice agent");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceProviderChange = (value: string) => {
    setVoiceProvider(value);
    // Set default voice for the provider
    const defaultVoice = voices[value]?.[0]?.value;
    if (defaultVoice) {
      setVoiceId(defaultVoice);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Mic className="h-5 w-5 text-orange-600" />
            </div>
            Create New Voice Agent
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 pt-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${s === step ? "bg-orange-500 text-white" : 
                  s < step ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}
              `}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-0.5 mx-2 ${s < step ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Agent Information</h3>
              <p className="text-sm text-gray-500 mb-4">
                Give your voice agent a name and select the language
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="mb-2 block">
                  Agent Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Customer Support Agent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <Label className="mb-2 block">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!name.trim()}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Voice Configuration */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Voice Configuration</h3>
              <p className="text-sm text-gray-500 mb-4">
                Select the voice provider and voice for your agent
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Voice Provider</Label>
                <Select value={voiceProvider} onValueChange={handleVoiceProviderChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceProviders.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Voice</Label>
                <Select value={voiceId} onValueChange={setVoiceId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voices[voiceProvider]?.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        {voice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: System Prompt */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">System Prompt</h3>
              <p className="text-sm text-gray-500 mb-4">
                Define how your agent should behave and respond
              </p>
            </div>

            <div>
              <Label htmlFor="prompt" className="mb-2 block">
                System Prompt <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="prompt"
                placeholder="You are a helpful customer support agent..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                This prompt will guide your agent&apos;s behavior and responses during calls.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!systemPrompt.trim() || isLoading}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Agent"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
