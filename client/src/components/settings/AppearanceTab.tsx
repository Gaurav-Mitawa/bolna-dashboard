import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";
import { useState } from "react";

const accentColors = [
  { id: "orange", label: "Orange", className: "bg-orange-500" },
  { id: "blue", label: "Blue", className: "bg-blue-500" },
  { id: "green", label: "Green", className: "bg-green-500" },
  { id: "purple", label: "Purple", className: "bg-purple-500" },
  { id: "pink", label: "Pink", className: "bg-pink-500" },
];

export function AppearanceTab() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [accent, setAccent] = useState("orange");
  const [compact, setCompact] = useState(false);

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
        <p className="text-sm text-gray-500">
          Personalize how SeniorVoice looks and feels for your workspace.
        </p>
      </div>

      {/* Theme selection */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-gray-900">Theme</Label>
        <div className="flex gap-3">
          {[
            { id: "light" as const, label: "Light" },
            { id: "dark" as const, label: "Dark" },
          ].map((opt) => {
            const selected = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`flex-1 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${selected ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white"
                  }`}
              >
                <span className="font-medium text-gray-900">{opt.label}</span>
                {selected && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent colors */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-gray-900">Accent color</Label>
        <div className="flex gap-3">
          {accentColors.map((color) => {
            const selected = accent === color.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => setAccent(color.id)}
                className={`h-12 w-12 rounded-xl flex items-center justify-center border-2 ${selected ? "border-orange-500" : "border-transparent"
                  }`}
              >
                <span
                  className={`h-8 w-8 rounded-lg ${color.className} flex items-center justify-center`}
                >
                  {selected && <Check className="h-4 w-4 text-white" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact mode */}
      <div className="space-y-2 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold text-gray-900">Compact mode</Label>
            <p className="text-sm text-gray-500">
              Reduce padding and spacing for more information on screen.
            </p>
          </div>
          <Switch
            checked={compact}
            onCheckedChange={setCompact}
            className="data-[state=checked]:bg-orange-500"
          />
        </div>
      </div>

      <div>
        <Button className="mt-2 bg-orange-500 hover:bg-orange-600 text-white">
          Save Appearance
        </Button>
      </div>
    </Card>
  );
}


