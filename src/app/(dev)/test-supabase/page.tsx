"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabase } from '../../lib/supabase/client';

export default function TestSupabasePage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [envVars, setEnvVars] = useState<{
    url: string;
    anonKey: string;
    urlValue: string;
    anonKeyValue: string;
  }>({
    url: '',
    anonKey: '',
    urlValue: '',
    anonKeyValue: ''
  });

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Check environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        setEnvVars({
          url: supabaseUrl ? '✅ Set' : '❌ Missing',
          anonKey: supabaseAnonKey ? '✅ Set' : '❌ Missing',
          urlValue: supabaseUrl || 'Not set',
          anonKeyValue: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Not set'
        });

        if (!supabaseUrl || !supabaseAnonKey) {
          setConnectionStatus('❌ Environment variables not set');
          return;
        }

        // Test Supabase connection
        const supabase = getBrowserSupabase();
        const { error } = await supabase.auth.getSession();
        
        if (error) {
          setConnectionStatus(`❌ Connection error: ${error.message}`);
        } else {
          setConnectionStatus('✅ Supabase connection successful!');
        }
      } catch (error) {
        setConnectionStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-off-white p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-lg font-bold mb-6">Supabase Connection Test</h1>
        
        {/* Connection Status */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="font-semibold mb-2">Connection Status:</h2>
          <p className="text-lg">{connectionStatus}</p>
        </div>

        {/* Environment Variables */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="font-semibold mb-2">Environment Variables:</h2>
          <div className="space-y-2">
            <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {envVars.url}</p>
            <p><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {envVars.anonKey}</p>
            {envVars.urlValue && (
              <p><strong>URL Value:</strong> {envVars.urlValue}</p>
            )}
            {envVars.anonKeyValue && (
              <p><strong>Anon Key (first 20 chars):</strong> {envVars.anonKeyValue}</p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold mb-2">Setup Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Make sure your <code>.env</code> file contains:</li>
            <li><code>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</code></li>
            <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here</code></li>
            <li>Restart your development server after updating .env</li>
            <li>Check your Supabase project dashboard for the correct values</li>
          </ol>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 space-x-4">
          <Link 
            href="/test-auth" 
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Authentication
          </Link>
          <Link 
            href="/login" 
            className="inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Go to Login
          </Link>
          <Link 
            href="/register" 
            className="inline-block px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Go to Register
          </Link>
        </div>
      </div>
    </div>
  );
}
