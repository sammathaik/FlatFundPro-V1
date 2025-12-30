import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader, Play } from 'lucide-react';

export default function DiagnosticTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function runDiagnostic() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-env-vars`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Gupshup API Key Diagnostic
        </h2>
        <p className="text-gray-600 mb-6">
          This diagnostic tool will check if the GUPSHUP_API_KEY environment variable
          is properly configured in Supabase Edge Functions.
        </p>

        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Running Diagnostic...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Run Diagnostic Test
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-red-900 mb-2">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Overall Status */}
          <div className={`border-2 rounded-lg p-6 ${
            result.diagnostics?.gupshupConfigured
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {result.diagnostics?.gupshupConfigured ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className={`text-lg font-bold mb-2 ${
                  result.diagnostics?.gupshupConfigured ? 'text-green-900' : 'text-red-900'
                }`}>
                  {result.diagnostics?.gupshupConfigured
                    ? 'Gupshup API Key is Configured ✓'
                    : 'Gupshup API Key NOT Found ✗'}
                </h3>
                {!result.diagnostics?.gupshupConfigured && (
                  <div className="text-red-700 space-y-2">
                    <p className="font-semibold">Action Required:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to Supabase Dashboard → Project Settings → Edge Functions</li>
                      <li>Click "Manage secrets"</li>
                      <li>Add a new secret:
                        <ul className="list-disc list-inside ml-6 mt-1">
                          <li>Name: <code className="bg-red-100 px-1 py-0.5 rounded">GUPSHUP_API_KEY</code></li>
                          <li>Value: Your Gupshup API key from https://www.gupshup.io/developer/home</li>
                        </ul>
                      </li>
                      <li>Save the secret</li>
                      <li>Wait 60 seconds</li>
                      <li>Run this diagnostic again</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gupshup Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Gupshup API Key Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Exists:</span>
                <span className={`ml-2 font-semibold ${
                  result.gupshupDetails?.exists ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.gupshupDetails?.exists ? 'YES' : 'NO'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Length:</span>
                <span className="ml-2 font-mono font-semibold text-gray-900">
                  {result.gupshupDetails?.length || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-600">First 4 chars:</span>
                <span className="ml-2 font-mono font-semibold text-gray-900">
                  {result.gupshupDetails?.firstChars || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Last 4 chars:</span>
                <span className="ml-2 font-mono font-semibold text-gray-900">
                  {result.gupshupDetails?.lastChars || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Has spaces:</span>
                <span className={`ml-2 font-semibold ${
                  result.gupshupDetails?.hasSpaces ? 'text-red-600' : 'text-green-600'
                }`}>
                  {result.gupshupDetails?.hasSpaces ? 'YES (BAD)' : 'NO'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Has quotes:</span>
                <span className={`ml-2 font-semibold ${
                  result.gupshupDetails?.hasQuotes ? 'text-red-600' : 'text-green-600'
                }`}>
                  {result.gupshupDetails?.hasQuotes ? 'YES (BAD)' : 'NO'}
                </span>
              </div>
            </div>

            {(result.gupshupDetails?.hasSpaces || result.gupshupDetails?.hasQuotes) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Your API key contains spaces or quotes. This will cause issues.
                  Please remove the secret and add it again with a clean API key (no spaces, no quotes).
                </p>
              </div>
            )}
          </div>

          {/* Environment Variables */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Environment Variables</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(result.envVars || {}).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="font-mono text-gray-700">{key}</span>
                  <span className={`font-mono text-xs px-2 py-1 rounded ${
                    value && value !== 'undefined' && value !== 'NOT SET'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {value || 'NOT SET'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Available Environment Keys */}
          {result.availableEnvKeys && Array.isArray(result.availableEnvKeys) && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                All Available Environment Variables ({result.availableEnvKeys.length})
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                {result.availableEnvKeys.map((key: string) => (
                  <div key={key} className="font-mono text-xs py-1 border-b border-gray-100">
                    {key}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Response */}
          <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <summary className="cursor-pointer font-semibold text-gray-900 mb-2">
              Raw Diagnostic Response (for debugging)
            </summary>
            <pre className="text-xs bg-white p-4 rounded border border-gray-200 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
