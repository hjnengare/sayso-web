"use client";

import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

export function RoleSwitcher() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Check if user has multiple roles
  const userRole = user?.profile?.role;
  const hasMultipleRoles = userRole === 'both';
  const currentRole = user?.profile?.account_role;
  
  if (!hasMultipleRoles || !user) return null;

  const handleSwitchRole = async (newRole: 'user' | 'business_owner') => {
    if (currentRole === newRole) {
      setIsOpen(false);
      return;
    }

    try {
      // Call API to switch role
      const response = await fetch('/api/user/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole })
      });

      if (response.ok) {
        // Reload to apply new role
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to switch role:', error);
    }
  };

  const roleLabel = currentRole === 'business_owner' ? 'Business' : 'Personal';
  const otherRole = currentRole === 'business_owner' ? 'user' : 'business_owner';
  const otherLabel = otherRole === 'business_owner' ? 'Business' : 'Personal';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 border ${
          isOpen
            ? 'bg-navbar-bg text-white border-white/20'
            : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border-white/10'
        }`}
        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
      >
        {roleLabel}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-charcoal/95 backdrop-blur-md border border-white/10 rounded-xl shadow-lg z-50">
          <div className="p-3 space-y-2">
            <div className="text-xs font-semibold text-white/60 uppercase tracking-wider px-2 py-1">
              Switch to:
            </div>
            <button
              onClick={() => handleSwitchRole(otherRole as any)}
              className="w-full px-3 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors duration-200 text-left"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              {otherLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

