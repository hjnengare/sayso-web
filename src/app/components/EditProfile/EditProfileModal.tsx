"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Upload, Camera } from "react-feather";
import Image from "next/image";

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
              className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                disabled={saving}
                className="absolute top-4 right-4 text-charcoal/60 hover:text-charcoal transition-colors duration-200 p-2 hover:bg-charcoal/5 rounded-full z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close edit profile modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="p-6 sm:p-8">
                {/* Title */}
                <h2
                  className="text-2xl font-bold text-charcoal mb-6"
                  style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}
                >
                  Edit Profile
                </h2>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-coral/10 border border-coral/30">
                    <p className="text-sm text-coral">{error}</p>
                  </div>
                )}

                {/* Avatar Section */}
                <div className="mb-6">
                  <label
                    className="block text-sm font-semibold text-charcoal mb-3"
                    style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}
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
                        <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center bg-sage/20 rounded-full border-4 border-white shadow-lg ring-2 ring-sage/20">
                          <User className="text-sage" size={32} strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-sage/10 hover:bg-sage/20 text-sage rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-sage/20"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload</span>
                      </button>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={saving}
                          className="px-4 py-2 bg-charcoal/5 hover:bg-charcoal/10 text-charcoal rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-charcoal/10"
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
                  <p className="text-xs text-charcoal/60 mt-2">
                    Recommended: Square image, max 5MB
                  </p>
                </div>

                {/* Username Field */}
                <div className="mb-6">
                  <label
                    htmlFor="username"
                    className="block text-sm font-semibold text-charcoal mb-2"
                    style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}
                  >
                    Username <span className="text-coral">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40">
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
                      className="w-full pl-12 pr-4 py-3 bg-off-white border border-white/60 rounded-lg text-body font-medium text-charcoal placeholder-charcoal/50 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}
                    />
                  </div>
                  <p className="text-xs text-charcoal/60 mt-2">
                    3-20 characters, letters, numbers, underscores, and hyphens only
                  </p>
                </div>

                {/* Display Name Field */}
                <div className="mb-6">
                  <label
                    htmlFor="displayName"
                    className="block text-sm font-semibold text-charcoal mb-2"
                    style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}
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
                    className="w-full px-4 py-3 bg-off-white border border-white/60 rounded-lg text-body font-medium text-charcoal placeholder-charcoal/50 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}
                  />
                  <p className="text-xs text-charcoal/60 mt-2">
                    This is how your name appears to others
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={saving}
                    className="flex-1 px-6 py-3 rounded-lg text-sm font-semibold bg-charcoal/5 hover:bg-charcoal/10 text-charcoal transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-charcoal/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !username.trim()}
                    className="flex-1 px-6 py-3 rounded-lg text-sm font-semibold bg-sage hover:bg-sage/90 text-white transition-all duration-200 shadow-lg shadow-sage/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

