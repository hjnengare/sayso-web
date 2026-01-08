"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Upload, Camera } from "react-feather";
import Image from "next/image";
import { authStyles } from "../Auth/Shared/authStyles";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { username: string; displayName: string; avatarFile: File | null }) => Promise<void>;
  currentUsername: string;
  currentDisplayName: string | null;
  currentAvatarUrl: string | null;
  saving?: boolean;
  error?: string | null;
}

export function EditProfileModal({
  isOpen,
  onClose,
  onSave,
  currentUsername,
  currentDisplayName,
  currentAvatarUrl,
  saving = false,
  error: externalError = null,
}: EditProfileModalProps) {
  const [username, setUsername] = useState(currentUsername || "");
  const [displayName, setDisplayName] = useState(currentDisplayName || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentAvatarUrl);
  const [error, setError] = useState<string | null>(externalError);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local state when props change
  useEffect(() => {
    if (isOpen) {
      setUsername(currentUsername || "");
      setDisplayName(currentDisplayName || "");
      setAvatarPreview(currentAvatarUrl);
      setAvatarFile(null);
      setError(null);
      setImgError(false);
    }
  }, [isOpen, currentUsername, currentDisplayName, currentAvatarUrl]);

  // Update error when external error changes
  useEffect(() => {
    setError(externalError);
  }, [externalError]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError("Image file is too large. Maximum size is 5MB.");
      return;
    }

    setError(null);
    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Note: We pass null explicitly to indicate removal
    // The parent component will handle clearing the avatar_url in the database
  };

  const handleSave = async () => {
    // Validate username
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    // Username validation: alphanumeric, underscore, hyphen, 3-20 chars
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username.trim())) {
      setError("Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens");
      return;
    }

    setError(null);
    await onSave({
      username: username.trim(),
      displayName: displayName.trim() || null,
      avatarFile,
    });
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authStyles }} />
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[9998]"
              onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{
                  duration: 0.4,
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
                className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md shadow-md max-w-lg w-full max-h-[90vh] overflow-y-auto relative px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Close button */}
              <button
                onClick={handleClose}
                disabled={saving}
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors duration-200 p-2 hover:bg-white/10 rounded-full z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close edit profile modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="relative z-10">
                {/* Title */}
                <h2
                  className="text-2xl font-bold text-white mb-6"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 700 }}
                >
                  Edit Profile
                </h2>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 bg-orange-50 border border-orange-200 rounded-[20px] p-4 text-center">
                    <p className="text-caption font-semibold text-orange-600" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{error}</p>
                  </div>
                )}

                {/* Avatar Section */}
                <div className="mb-6">
                  <label
                    className="block text-sm font-semibold text-white mb-3"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                  >
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {avatarPreview && !imgError ? (
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-white shadow-lg ring-2 ring-sage/20">
                          <Image
                            src={avatarPreview}
                            alt="Profile preview"
                            fill
                            className="object-cover"
                            onError={() => setImgError(true)}
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center bg-navbar-bg/90 rounded-full border-4 border-white shadow-lg ring-2 ring-sage/20">
                          <User className="text-white/80" size={32} strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-white/20"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload</span>
                      </button>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={saving}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-white/20"
                          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                        >
                          <X className="w-4 h-4" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={saving}
                    />
                  </div>
                  <p className="text-xs text-white/70 mt-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Recommended: Square image, max 5MB
                  </p>
                </div>

                {/* Username Field */}
                <div className="mb-6">
                  <label
                    htmlFor="username"
                    className="block text-sm font-semibold text-white mb-2"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                  >
                    Username <span className="text-coral">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError(null);
                      }}
                      placeholder="Choose a username"
                      disabled={saving}
                      className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-body font-medium text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    />
                  </div>
                  <p className="text-xs text-white/70 mt-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    3-20 characters, letters, numbers, underscores, and hyphens only
                  </p>
                </div>

                {/* Display Name Field */}
                <div className="mb-6">
                  <label
                    htmlFor="displayName"
                    className="block text-sm font-semibold text-white mb-2"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                  >
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name (optional)"
                    disabled={saving}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-body font-medium text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  />
                  <p className="text-xs text-white/70 mt-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    This is how your name appears to others
                  </p>
                </div>

                {/* Buttons */}
                <div className="pt-2 flex justify-center">
                  <div className="w-full flex gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={saving}
                      className="flex-1 px-6 py-3 rounded-full text-sm font-semibold bg-white/10 hover:bg-white/20 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !username.trim()}
                      className="flex-1 px-6 py-3 rounded-full text-sm font-semibold bg-gradient-to-r from-coral to-coral/80 hover:from-coral/90 hover:to-coral text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}

