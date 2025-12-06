import React from 'react';

/**
 * Diagnostic page to check environment variables in deployed environment
 * Access this at: /diagnostic or add it temporarily to your main App
 */
export const DiagnosticPage: React.FC = () => {
  const envCheck = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
  };

  // Mask the key for security (show only first/last few characters)
  const maskKey = (key: string | undefined) => {
    if (!key) return 'undefined';
    if (key.length < 20) return '***';
    return `${key.substring(0, 10)}...${key.substring(key.length - 10)}`;
  };

  return (
    <div style={{
      padding: '40px',
      fontFamily: 'monospace',
      backgroundColor: '#1a1a1a',
      color: '#00ff00',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#00ff00' }}>🔍 Environment Diagnostic</h1>

      <div style={{
        backgroundColor: '#000',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h2>Environment Variables Status:</h2>
        <pre style={{ fontSize: '14px', lineHeight: '1.8' }}>
          {JSON.stringify({
            ...envCheck,
            VITE_SUPABASE_URL: envCheck.VITE_SUPABASE_URL || '❌ MISSING',
            VITE_SUPABASE_ANON_KEY: maskKey(envCheck.VITE_SUPABASE_ANON_KEY),
          }, null, 2)}
        </pre>
      </div>

      {!envCheck.hasUrl || !envCheck.hasKey ? (
        <div style={{
          backgroundColor: '#ff0000',
          color: '#fff',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h2>❌ PROBLEM DETECTED</h2>
          <p>Environment variables are NOT configured in bolt.host!</p>
          <p>You need to add them in bolt.host's deployment settings.</p>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#00aa00',
          color: '#fff',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h2>✅ LOOKS GOOD</h2>
          <p>Environment variables are properly configured!</p>
        </div>
      )}

      <div style={{
        backgroundColor: '#333',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px',
        color: '#fff'
      }}>
        <h3>How to fix if variables are missing:</h3>
        <ol style={{ lineHeight: '2' }}>
          <li>Go to your bolt.host project dashboard</li>
          <li>Find Settings → Environment Variables (or Secrets)</li>
          <li>Add these two variables:
            <ul>
              <li><strong>VITE_SUPABASE_URL</strong> = https://rjiesmcmdfoavggkhasn.supabase.co</li>
              <li><strong>VITE_SUPABASE_ANON_KEY</strong> = eyJhbGciOiJI... (your full key)</li>
            </ul>
          </li>
          <li>Save and wait for rebuild (2-3 minutes)</li>
          <li>Refresh this page to verify</li>
        </ol>
      </div>
    </div>
  );
};
