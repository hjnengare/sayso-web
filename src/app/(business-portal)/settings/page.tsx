"use client";

import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { LogOut, Trash2, UserRound, Mail, ShieldAlert } from "lucide-react";

const FONT_STACK = "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const ICON_CHIP_CLASS =
  "inline-flex items-center justify-center rounded-full bg-off-white/80 text-charcoal/85 transition-colors duration-200 hover:bg-off-white/90";
const SMALL_ICON_CHIP_CLASS = `${ICON_CHIP_CLASS} h-6 w-6`;

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
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
        <div className="space-y-5">
          {/* Account Summary */}
          <section className="relative bg-white border border-charcoal/10 rounded-[16px] shadow-sm p-5 sm:p-6">
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-charcoal/5 to-transparent rounded-full blur-xl pointer-events-none" />
            <div className="relative flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-charcoal/10 flex items-center justify-center text-charcoal font-bold text-base shadow-sm" style={{ fontFamily: FONT_STACK }}>
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-charcoal/55 uppercase tracking-wide mb-2" style={{ fontFamily: FONT_STACK }}>
                  Account Profile
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-charcoal">
                    <span className={SMALL_ICON_CHIP_CLASS}>
                      <UserRound className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm sm:text-base font-semibold truncate" style={{ fontFamily: FONT_STACK }}>{username}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-charcoal/75">
                    <span className={SMALL_ICON_CHIP_CLASS}>
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm truncate" style={{ fontFamily: FONT_STACK }}>{user?.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Session Actions */}
          <section className="bg-white border border-charcoal/10 rounded-[16px] shadow-sm p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-charcoal mb-4" style={{ fontFamily: FONT_STACK }}>
              Session
            </h2>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-charcoal/5 hover:bg-charcoal/10 border border-charcoal/15 hover:border-charcoal/25 rounded-[12px] text-charcoal font-semibold transition-all duration-200 text-sm"
              style={{ fontFamily: FONT_STACK }}
            >
              <span className={SMALL_ICON_CHIP_CLASS}>
                <LogOut className="w-3.5 h-3.5" />
              </span>
              Log Out
            </button>
          </section>

          {/* Danger Zone */}
          <section className="bg-white border border-coral/30 rounded-[16px] shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className={SMALL_ICON_CHIP_CLASS}>
                <ShieldAlert className="w-4 h-4" />
              </span>
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
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white hover:bg-coral/5 border border-coral/40 hover:border-coral/55 rounded-[12px] text-coral font-semibold transition-all duration-200 text-sm"
                style={{ fontFamily: FONT_STACK }}
              >
                <span className={SMALL_ICON_CHIP_CLASS}>
                  <Trash2 className="w-3.5 h-3.5" />
                </span>
                Delete Account
              </button>
            ) : (
              <div className="bg-white border border-coral/35 rounded-[12px] shadow-sm p-4 sm:p-5 space-y-4">
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
 
