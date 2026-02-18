/**
 * Login Page
 * Shows connection status and configuration instructions
 */

import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Key } from "lucide-react";

export default function LoginPage() {
  const { isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-gray-600">Connecting to Bolna...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
            <Key className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration Required</h1>
          <p className="text-gray-600 mb-4">
            {error || 'Unable to connect to Bolna API'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">Setup Instructions:</h2>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
            <li>Get your API key from <a href="https://platform.bolna.ai/developers" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.bolna.ai/developers</a></li>
            <li>Open <code className="bg-gray-200 px-1 rounded">client/.env.development</code></li>
            <li>Replace <code className="bg-gray-200 px-1 rounded">your-bolna-api-key-here</code> with your actual API key</li>
            <li>Restart the development server</li>
          </ol>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Example .env file:</strong>
          </p>
          <pre className="text-xs bg-blue-100 p-2 rounded mt-2 overflow-x-auto">
            VITE_BOLNA_API_KEY=bn_xxxxxxxxxxxxxxxx
          </pre>
        </div>
      </div>
    </div>
  );
}
