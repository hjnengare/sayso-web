"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

export default function TestAuthPage() {
  const { user, login, register, logout, isLoading, error } = useAuth();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');

  const handleLogin = async () => {
    const success = await login(email, password);
    if (success) {
      console.log('Login successful!');
    }
  };

  const handleRegister = async () => {
    const success = await register(email, password, email.split('@')[0] || 'user');
    if (success) {
      console.log('Registration successful!');
    }
  };

  const handleLogout = async () => {
    await logout();
    console.log('Logged out!');
  };

  return (
    <div className="min-h-[100dvh] bg-off-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-lg font-bold mb-6">Auth Test Page</h1>
        
        {/* Current User Status */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="font-semibold mb-2">Current User:</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : user ? (
            <div>
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Created:</strong> {user.created_at}</p>
              {user.profile && (
                <div className="mt-2">
                  <p><strong>Onboarding Step:</strong> {user.profile.onboarding_step}</p>
                  <p><strong>Complete:</strong> {user.profile.onboarding_complete ? 'Yes' : 'No'}</p>
                </div>
              )}
            </div>
          ) : (
            <p>Not logged in</p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Test Forms */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Login
            </button>
            
            <button
              onClick={handleRegister}
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
            >
              Register
            </button>
            
            {user && (
              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
              >
                Logout
              </button>
            )}
          </div>
        </div>

        {/* Environment Check */}
        <div className="mt-8 p-4 bg-yellow-100 rounded-lg">
          <h3 className="font-semibold mb-2">Environment Check:</h3>
          <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
          <p><strong>Supabase Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
        </div>
      </div>
    </div>
  );
}
