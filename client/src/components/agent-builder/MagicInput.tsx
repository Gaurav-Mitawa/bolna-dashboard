/**
 * Magic Input Component
 * Centered input box for agent generation with loading states
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface MagicInputProps {
  onGenerate: (prompt: string, url?: string) => void;
  isGenerating: boolean;
  generationSteps: string[];
}

export function MagicInput({ onGenerate, isGenerating, generationSteps }: MagicInputProps) {
  const [prompt, setPrompt] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt, url || undefined);
      setPrompt("");
      setUrl("");
    }
  };

  return (
    <Card className="p-6 bg-white shadow-2xl min-w-[600px] border-2 border-[#F15E04]">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe your agent...
          </label>
          <Input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A booking agent for a spa that checks calendar availability and sends WhatsApp confirmations"
            className="w-full"
            disabled={isGenerating}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website URL (optional)
          </label>
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full"
            disabled={isGenerating}
          />
        </div>

        <Button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className="w-full bg-gradient-to-r from-[#F15E04] to-[#FF955F] hover:from-[#D14A03] hover:to-[#F15E04] text-white font-semibold py-3"
        >
          {isGenerating ? "Generating..." : "Generate Agent"}
        </Button>

        {/* Loading Steps */}
        {isGenerating && generationSteps.length > 0 && (
          <div className="space-y-2 pt-2">
            {generationSteps.map((step, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-[#F15E04] animate-pulse"></div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        )}
      </form>
    </Card>
  );
}

