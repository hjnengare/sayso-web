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
    if (password.length < 6) return "🔐 Password must be at least 6 characters long";
    return null;
  };

  const checkPasswordStrength = (password: string) => {
    // Early return for empty password
    if (password.length === 0) {
      return {
        score: 0,
        feedback: "",
        checks: {
          length: false
        },
        color: ""
      };
    }

    const checks = {
      length: password.length >= 6
    };

    let score = 0;
    let feedback = "";
    let color = "";

    if (password.length < 6) {
      score = 1;
      feedback = "Too short";
      color = "text-error-500";
    } else if (password.length < 8) {
      score = 2;
      feedback = "Good";
      color = "text-yellow-500";
    } else if (password.length < 12) {
      score = 3;
      feedback = "Strong";
      color = "text-sage";
    } else {
      score = 4;
      feedback = "Very strong 🎉";
      color = "text-sage";
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
        let userMessage = "Something went wrong during registration. Please try again.";
        if (authError) {
          const err = typeof authError === 'string' ? authError : JSON.stringify(authError);
          // Map known error patterns to friendly messages
          if (err.includes('fetch') || err.includes('network')) {
            userMessage = "Network error — please try again.";
          } else if (
            err.toLowerCase().includes('already in use') ||
            err.toLowerCase().includes('already registered') ||
            err.toLowerCase().includes('already exists') ||
            err.toLowerCase().includes('email already') ||
            err.toLowerCase().includes('already taken')
          ) {
            userMessage = "Email already in use. Please try logging in or use a different email.";
          } else if (err.toLowerCase().includes('password')) {
            userMessage = "Password does not meet requirements.";
          } else if (err.trim() === '' || err === '{}' || err === 'null' || err === 'undefined') {
            userMessage = "Something went wrong during registration. Please try again.";
          } else {
            // Fallback: show a simplified message
            userMessage = err.length < 60 ? err : "Something went wrong during registration. Please try again.";
          }
          // Log full error for debugging
          console.error('Registration error (auth):', authError);
        } else {
          // No error object, fallback
          console.error('Registration error: missing error object');
        }
        setError(userMessage);
        showToast(userMessage, 'sage', 4000);
      }
    } catch (error: unknown) {
      // Always log full error for debugging
      console.error('Registration error (exception):', error);
      let userMessage = "Something went wrong during registration. Please try again.";
      if (error instanceof Error) {
        if (error.message && error.message.length < 60 && error.message.trim() !== '') {
          userMessage = error.message;
        }
      }
      setError(userMessage);
      showToast(userMessage, 'sage', 4000);
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
