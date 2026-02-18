/**
 * NewAgent Page - "Magic Input" Interface
 * Centered, minimalist interface for agent creation
 * Matches Figma design with gradient orange button
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sparkles, Globe, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authFetchJson } from "@/lib/api";

/**
 * Loading step interface for the animated checklist
 */
interface LoadingStep {
  id: string;
  text: string;
  completed: boolean;
}

export default function NewAgentPage() {
  const [agentDescription, setAgentDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([]);

  /**
   * Handle agent generation
   * Simulates the generation process with animated checklist
   */
  const handleGenerate = async () => {
    if (!agentDescription.trim()) return;

    setIsGenerating(true);
    
    // Initialize loading steps
    const steps: LoadingStep[] = [
      { id: "1", text: "🕷️ Scraping Site...", completed: false },
      { id: "2", text: "🎨 Extracting Brand...", completed: false },
      { id: "3", text: "🧠 Building Logic...", completed: false },
    ];
    
    setLoadingSteps(steps);

    // Simulate step completion with delays
    setTimeout(() => {
      setLoadingSteps(prev => prev.map((s, i) => i === 0 ? { ...s, completed: true } : s));
    }, 1000);

    setTimeout(() => {
      setLoadingSteps(prev => prev.map((s, i) => i === 1 ? { ...s, completed: true } : s));
    }, 2000);

    setTimeout(() => {
      setLoadingSteps(prev => prev.map((s, i) => i === 2 ? { ...s, completed: true } : s));
    }, 3000);

    // Simulate API call
    try {
      // Use authFetch for agent generation
      const data = await authFetchJson<{ agent_id: string }>("/api/agents/generate", {
        method: "POST",
        body: JSON.stringify({
          prompt: agentDescription,
          url: websiteUrl || undefined,
        }),
      });
      
      // Reset form and redirect to agent builder
      setTimeout(() => {
        setIsGenerating(false);
        setLoadingSteps([]);
        setAgentDescription("");
        setWebsiteUrl("");
        // Navigate to agent builder with the new agent ID
        window.location.href = `/agent-builder?agentId=${data.agent_id}`;
      }, 4000);
    } catch (error) {
      console.error("Error generating agent:", error);
      setIsGenerating(false);
      setLoadingSteps([]);
      alert("Failed to generate agent. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-8 bg-white shadow-lg border border-gray-200 rounded-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Create Your AI Agent
            </h1>
            <p className="text-sm text-gray-600">
              Describe what you want your agent to do, and we'll build it for you
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Agent Description Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your agent
              </label>
              <Input
                type="text"
                value={agentDescription}
                onChange={(e) => setAgentDescription(e.target.value)}
                placeholder="e.g., Booking bot for Glow MedSpa"
                className="w-full h-12 text-base"
                disabled={isGenerating}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
            </div>

            {/* Website URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL <span className="text-gray-400 font-normal">(for knowledge base)</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full h-12 pl-10 text-base"
                  disabled={isGenerating}
                />
              </div>
            </div>

            {/* Generate Button - Gradient Orange */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !agentDescription.trim()}
              className="w-full h-12 bg-gradient-to-r from-[#F15E04] to-[#FF955F] hover:from-[#D14A03] hover:to-[#F15E04] text-white font-semibold text-base rounded-lg shadow-md transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Agent
                </>
              )}
            </Button>

            {/* Loading State - Animated Checklist */}
            <AnimatePresence>
              {isGenerating && loadingSteps.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-4 space-y-3 border-t border-gray-200"
                >
                  {loadingSteps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                      )}
                      <span
                        className={
                          step.completed
                            ? "text-gray-600 line-through"
                            : "text-gray-900"
                        }
                      >
                        {step.text}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

