"use client";

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, Trash2, UserRound, Mail, ShieldAlert } from "lucide-react";

const FONT_STACK = "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
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

  const username = user?.profile?.username || user?.profile?.display_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <p className="inline-flex items-center px-3 py-1 rounded-full border border-sage/25 bg-white/70 text-charcoal/70 text-xs font-semibold tracking-wide uppercase" style={{ fontFamily: FONT_STACK }}>
            Business Account
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mt-3 mb-2" style={{ fontFamily: FONT_STACK }}>
            Settings
          </h1>
          <p className="text-charcoal/70 text-sm sm:text-base" style={{ fontFamily: FONT_STACK }}>
            Manage your account and security preferences
          </p>
        </div>

        <div className="space-y-5">
          {/* Account Summary */}
          <section className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[16px] shadow-lg p-5 sm:p-6">
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-xl pointer-events-none" />
            <div className="relative flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-white/90 border border-white/70 flex items-center justify-center text-charcoal font-bold text-base shadow-sm" style={{ fontFamily: FONT_STACK }}>
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-charcoal/55 uppercase tracking-wide mb-2" style={{ fontFamily: FONT_STACK }}>
                  Account Profile
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-charcoal">
                    <UserRound className="w-4 h-4 text-charcoal/60" />
                    <span className="text-sm sm:text-base font-semibold truncate" style={{ fontFamily: FONT_STACK }}>{username}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-charcoal/75">
                    <Mail className="w-4 h-4 text-charcoal/60" />
                    <span className="text-sm truncate" style={{ fontFamily: FONT_STACK }}>{user?.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Session Actions */}
          <section className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[16px] shadow-lg p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-charcoal mb-4" style={{ fontFamily: FONT_STACK }}>
              Session
            </h2>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white/85 hover:bg-white border border-white/70 hover:border-white rounded-[12px] text-charcoal font-semibold transition-all duration-200 text-sm shadow-sm hover:shadow-md"
              style={{ fontFamily: FONT_STACK }}
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </section>

          {/* Danger Zone */}
          <section className="bg-gradient-to-br from-coral/10 via-coral/5 to-white/90 backdrop-blur-xl border border-coral/30 rounded-[16px] shadow-lg p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <ShieldAlert className="w-5 h-5 text-coral" />
              <h2 className="text-base sm:text-lg font-semibold text-charcoal" style={{ fontFamily: FONT_STACK }}>
                Danger Zone
              </h2>
            </div>

            <p className="text-sm text-charcoal/75 mb-4" style={{ fontFamily: FONT_STACK }}>
              Deleting your account permanently removes your profile, businesses, and activity data.
            </p>

            {!isDeleteConfirmOpen ? (
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white/90 hover:bg-white border border-coral/40 hover:border-coral/55 rounded-[12px] text-coral font-semibold transition-all duration-200 text-sm shadow-sm hover:shadow-md"
                style={{ fontFamily: FONT_STACK }}
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            ) : (
              <div className="bg-white/85 border border-coral/35 rounded-[12px] shadow-sm p-4 sm:p-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-charcoal mb-2" style={{ fontFamily: FONT_STACK }}>Delete Account</h3>
                  <p className="text-sm text-charcoal/75 mb-3" style={{ fontFamily: FONT_STACK }}>
                    This action cannot be undone. All your data, including your businesses, will be permanently deleted.
                  </p>
                  {deleteError && (
                    <p className="text-sm text-coral mb-3" style={{ fontFamily: FONT_STACK }}>{deleteError}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    disabled={isDeletingAccount}
                    className="flex-1 px-4 py-2.5 bg-charcoal/10 hover:bg-charcoal/20 text-charcoal font-medium rounded-lg text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: FONT_STACK }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className="flex-1 px-4 py-2.5 bg-coral hover:bg-coral/90 text-white font-medium rounded-lg text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: FONT_STACK }}
                  >
                    {isDeletingAccount ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
    </div>
  );
}
 
