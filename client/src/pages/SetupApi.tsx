/**
 * SetupApi Page — First-time Bolna API key entry after Google login
 */
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Key, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function SetupApiPage() {
  const { refetchUser } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error("Please enter your Bolna API key");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/setup-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bolnaApiKey: apiKey.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to validate API key");
        return;
      }

      toast.success("Bolna API key configured successfully!");
      await refetchUser();
      // Use the redirect suggested by the backend (which is now /dashboard)
      window.location.href = data.redirect || "/dashboard";
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDeveloperBypass = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bolnaApiKey: "bolna_dev_test" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Developer mode activated!");
      await refetchUser();
      window.location.href = data.redirect || "/dashboard";
    } catch (err: any) {
      toast.error(err.message || "Bypass failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600 text-white mb-4">
            <Key className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Connect Bolna</h1>
          <p className="text-gray-600 mt-2">Enter your Bolna API key to get started</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Bolna API Key</CardTitle>
            <CardDescription>
              Your API key is encrypted and stored securely. It is never shown in plain text.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">API Key</label>
                <Input
                  type="password"
                  placeholder="bn_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono"
                  autoComplete="off"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-blue-800">Where to find your API key:</p>
                <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                  <li>Log in to your Bolna account</li>
                  <li>Go to Developer Settings</li>
                  <li>Copy your API key</li>
                </ol>
                <a
                  href="https://platform.bolna.ai/developers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1"
                >
                  Open Bolna Dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Key is validated against Bolna API before saving
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Encrypted with AES-256 in our database
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700"
                  disabled={loading || !apiKey.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Validating...
                    </>
                  ) : (
                    "Save API Key & Continue"
                  )}
                </Button>

                <div className="relative mt-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-semibold">
                    <span className="bg-white px-2 text-slate-400">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleDeveloperBypass}
                  variant="ghost"
                  className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium"
                  disabled={loading}
                >
                  Skip Setup (Developer Bypass)
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-4">
          <a href="/api/auth/logout" className="text-blue-600 hover:underline">
            Sign out
          </a>
        </p>
      </div>
    </div>
  );
}
