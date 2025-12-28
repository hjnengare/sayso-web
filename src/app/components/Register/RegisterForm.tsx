"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { usePrefersReducedMotion } from "../../utils/hooks/usePrefersReducedMotion";
import FormField from "./FormField";
import PasswordStrength from "./PasswordStrength";
import ConsentCheckbox from "./ConsentCheckbox";
import SubmitButton from "./SubmitButton";
import ProgressIndicator from "./ProgressIndicator";
import ErrorMessage from "./ErrorMessage";

interface RegisterFormProps {
  onSuccess: () => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const prefersReduced = usePrefersReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [consent, setConsent] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: "",
    checks: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false
    }
  });

  const [mounted, setMounted] = useState(false);

  const { register, isLoading: authLoading, error: authError } = useAuth();
  const isLoading = true; 
  const { showToast } = useToast();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Validation functions
  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Hydration-safe disabled state
  const isFormDisabled = mounted ? (submitting || isLoading) : false;
  const isSubmitDisabled = mounted ? (submitting || isLoading || !consent || passwordStrength.score < 3 || !username || !email || !password || !validateUsername(username) || !validateEmail(email)) : true;

  const containerRef = useRef(null);

  // Offline detection
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const validatePassword = (password: string) => {
    if (password.length < 8) return "🔐 Password must be at least 8 characters long";
    if (!/(?=.*[a-z])/.test(password)) return "🔐 Password must contain at least one lowercase letter";
    if (!/(?=.*[A-Z])/.test(password)) return "🔐 Password must contain at least one uppercase letter";
    if (!/(?=.*\d)/.test(password)) return "🔐 Password must contain at least one number";
    return null;
  };

  const checkPasswordStrength = (password: string) => {
    // Early return for empty password
    if (password.length === 0) {
      return {
        score: 0,
        feedback: "",
        checks: {
          length: false,
          uppercase: false,
          lowercase: false,
          number: false
        },
        color: ""
      };
    }

    const checks = {
      length: password.length >= 8,
      uppercase: /(?=.*[A-Z])/.test(password),
      lowercase: /(?=.*[a-z])/.test(password),
      number: /(?=.*\d)/.test(password)
    };

    // Additional security checks
    const emailName = email.split('@')[0].toLowerCase();
    const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    const hasCommonWord = commonPasswords.some(common => password.toLowerCase().includes(common));
    const usesEmailName = emailName.length > 2 && password.toLowerCase().includes(emailName);

    let score = Object.values(checks).filter(Boolean).length;
    let feedback = "";
    let color = "";

    // Penalize common patterns
    if (hasCommonWord) {
      score = Math.max(0, score - 1);
      feedback = "Avoid common passwords";
      color = "text-error-500";
    } else if (usesEmailName) {
      score = Math.max(0, score - 1);
      feedback = "Don't use your email name";
      color = "text-orange-500";
    } else if (score === 4) {
      feedback = "Strong - Perfect! 🎉";
      color = "text-blue-500";
    } else if (score === 3) {
      feedback = "Good - Almost there";
      color = "text-yellow-500";
    } else if (score === 2) {
      feedback = "Fair - Getting better";
      color = "text-orange-500";
    } else if (score === 1) {
      feedback = "Weak - Add more requirements";
      color = "text-error-500";
    } else {
      feedback = "Very weak - Add more requirements";
      color = "text-error-500";
    }

    return { score, feedback, checks, color };
  };

  const getUsernameError = () => {
    if (!usernameTouched) return "";
    if (!username) return "Username is required";
    if (username.length < 3) return "Username must be at least 3 characters";
    if (username.length > 20) return "Username must be less than 20 characters";
    if (!validateUsername(username)) return "Username can only contain letters, numbers, and underscores";
    return "";
  };

  const getEmailError = () => {
    if (!emailTouched) return "";
    if (!email) return "Email is required";
    if (!validateEmail(email)) return "Please enter a valid email address";
    return "";
  };

  const getPasswordError = () => {
    if (!passwordTouched) return "";
    if (!password) return "Password is required";
    const validation = validatePassword(password);
    return validation;
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (!usernameTouched) setUsernameTouched(true);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError("");
    if (!emailTouched) setEmailTouched(true);

    if (value.length > 0 && !validateEmail(value)) {
      setEmailError("📧 Please enter a valid email address");
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (!passwordTouched) setPasswordTouched(true);
    const strength = checkPasswordStrength(value);
    setPasswordStrength(strength);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (submitting || isLoading) return;

    setError("");
    setSubmitting(true);

    try {
      // Enhanced validation
      if (!username?.trim() || !email?.trim() || !password?.trim()) {
        setError("Please fill in all fields");
        showToast("Please fill in all fields", 'sage', 3000);
        setSubmitting(false);
        return;
      }

      if (!validateUsername(username.trim())) {
        setError("Please enter a valid username");
        showToast("Please enter a valid username", 'sage', 3000);
        setSubmitting(false);
        return;
      }

      if (!validateEmail(email.trim())) {
        setError("Please enter a valid email address");
        showToast("Please enter a valid email address", 'sage', 3000);
        setSubmitting(false);
        return;
      }

      // Check consent
      if (!consent) {
        setError("Please accept the Terms and Privacy Policy");
        showToast("Please accept the Terms and Privacy Policy", 'sage', 3000);
        setSubmitting(false);
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        showToast(passwordError, 'sage', 4000);
        setSubmitting(false);
        return;
      }

      // Check password strength
      const strength = checkPasswordStrength(password);
      if (strength.score < 3) {
        setError("Please create a stronger password");
        showToast("Please create a stronger password", 'sage', 3000);
        setSubmitting(false);
        return;
      }

      // Check offline status
      if (!isOnline) {
        setError("You're offline. Please check your connection and try again.");
        showToast("You're offline. Please check your connection and try again.", 'sage', 4000);
        setSubmitting(false);
        return;
      }

      // Attempt registration
      const success = await register(email.trim().toLowerCase(), password, username.trim());

      if (success) {
        // Clear form
        setUsername("");
        setEmail("");
        setPassword("");
        setPasswordStrength({
          score: 0,
          feedback: "",
          checks: {
            length: false,
            uppercase: false,
            lowercase: false,
            number: false
          }
        });

        // Show success toast with celebration
        showToast("🎉 Welcome to sayso! Your account has been created successfully!", 'success', 4000);

        // Navigate to interests page after short delay
        setTimeout(() => {
          showToast("Let's personalize your experience! 🌟", 'info', 2000);
          onSuccess();
        }, 1500);
      } else {
        // Handle registration failure
        if (authError) {
          if (authError.includes('fetch') || authError.includes('network')) {
            setError('Connection error. Please check your internet connection and try again.');
            showToast('Connection error. Please check your internet connection and try again.', 'sage', 4000);
          } else if (
            authError.toLowerCase().includes('already in use') ||
            authError.toLowerCase().includes('already registered') ||
            authError.toLowerCase().includes('already exists') ||
            authError.toLowerCase().includes('email already') ||
            authError.toLowerCase().includes('already taken')
          ) {
            setError('This email address is already in use. Please try logging in instead or use a different email.');
            showToast('This email address is already in use. Please try logging in instead or use a different email.', 'sage', 4000);
          } else {
            setError(authError);
            showToast(authError, 'sage', 4000);
          }
        } else {
          setError("Registration failed. Please try again.");
          showToast("Registration failed. Please try again.", 'sage', 4000);
        }
      }
    } catch (error: unknown) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      showToast(errorMessage, 'sage', 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
      <ErrorMessage error={error} isOffline={!isOnline} />

      {/* Username Field */}
      <FormField
          type="text"
          placeholder="Choose a username"
          value={username}
        onChange={handleUsernameChange}
          onBlur={() => setUsernameTouched(true)}
        error={getUsernameError()}
        isValid={!getUsernameError()}
        touched={usernameTouched}
          disabled={isFormDisabled}
        />

      {/* Email Field */}
      <FormField
          type="email"
          placeholder="you@example.com"
          value={email}
        onChange={handleEmailChange}
          onBlur={() => setEmailTouched(true)}
        error={getEmailError()}
        isValid={!getEmailError()}
        touched={emailTouched}
          disabled={isFormDisabled}
        />

      {/* Password Field */}
      <FormField
        type="password"
          placeholder="Create a strong password"
          value={password}
        onChange={handlePasswordChange}
          onBlur={() => setPasswordTouched(true)}
        error={getPasswordError()}
        isValid={passwordStrength.score >= 3}
        touched={passwordTouched}
          disabled={isFormDisabled}
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword(!showPassword)}
      />
      <PasswordStrength password={password} strength={passwordStrength} />

      {/* Consent Checkbox */}
      <ConsentCheckbox checked={consent} onChange={setConsent} />

      {/* Submit Button */}
      <SubmitButton
        disabled={isSubmitDisabled}
        isSubmitting={isFormDisabled}
        onSubmit={handleSubmit}
      />

      {/* Progress Indicator */}
      <ProgressIndicator
        username={{ value: username, isValid: !getUsernameError(), error: getUsernameError() }}
        email={{ value: email, isValid: !getEmailError(), error: getEmailError() }}
        password={{ strength: passwordStrength.score }}
        consent={consent}
      />
    </form>
  );
}
