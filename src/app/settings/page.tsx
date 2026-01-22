"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, Trash2, ChevronRight } from "lucide-react";
import Header from "../components/Header/Header";
import Link from "next/link";

export default function SettingsPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/onboarding");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteError(null);

    try {
      const response = await fetch("/api/user/delete-account", {
        method: "DELETE",
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete account");
      }

      // Account successfully deleted
      setIsDeleteConfirmOpen(false);
      window.location.href = "/onboarding";
    } catch (error: any) {
      console.error("Error deleting account:", error);
      setIsDeletingAccount(false);
      setDeleteError(`Failed to delete account: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-off-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-charcoal/60 text-sm font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const username = user.profile?.username || user.profile?.display_name || user.email?.split("@")[0] || "User";

  return (
    <>
      <Header 
        showSearch={false}
        variant="white"
        backgroundClassName="bg-navbar-bg"
        topPosition="top-0"
        reducedPadding={true}
        whiteText={true}
      />
      <div className="min-h-screen bg-off-white pt-20 sm:pt-24 pb-12 px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="w-full max-w-md mx-auto">
          {/* Breadcrumb Navigation */}
          <nav className="mb-4 sm:mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm sm:text-base">
              <li>
                <Link href="/my-businesses" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  My Businesses
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-4 h-4 text-charcoal/60" />
              </li>
              <li>
                <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Settings
                </span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              Settings
            </h1>
            <p className="text-charcoal/70 text-sm sm:text-base" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              Manage your account
            </p>
          </div>

        {/* Account Section */}
        <div className="space-y-6">
          {/* Username Card */}
          <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-charcoal/60 uppercase tracking-wide mb-1" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Username
                </p>
                <p className="text-lg font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{username}</p>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl hover:from-sage/90 hover:via-sage/90 hover:to-sage/85 border border-white/60 hover:border-white/80 rounded-[20px] text-charcoal font-medium transition-all duration-300 text-sm shadow-lg hover:shadow-xl"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>

          {/* Delete Account Section */}
          <div className="pt-6 border-t border-charcoal/10">
            <p className="text-xs font-medium text-charcoal/60 uppercase tracking-wide mb-4" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              Danger Zone
            </p>

            {!isDeleteConfirmOpen ? (
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl hover:from-coral/20 hover:via-coral/15 hover:to-coral/10 border border-coral/30 hover:border-coral/50 rounded-[20px] text-coral font-medium transition-all duration-300 text-sm shadow-lg hover:shadow-xl"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            ) : (
              <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-coral/30 rounded-[20px] shadow-lg p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Delete Account</h3>
                  <p className="text-sm text-charcoal/70 mb-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    This action cannot be undone. All your data, including your businesses, will be permanently deleted.
                  </p>
                  {deleteError && (
                    <p className="text-sm text-coral mb-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{deleteError}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    disabled={isDeletingAccount}
                    className="flex-1 px-4 py-2.5 bg-charcoal/10 hover:bg-charcoal/20 text-charcoal font-medium rounded-lg text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className="flex-1 px-4 py-2.5 bg-coral hover:bg-coral/90 text-white font-medium rounded-lg text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    {isDeletingAccount ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
