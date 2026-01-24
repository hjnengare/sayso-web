/**
 * Validation utility functions for forms
 */

export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): string | null => {
  if (password.length < 6) return "🔐 Password must be at least 6 characters long";
  return null;
};

export interface PasswordStrength {
  score: number;
  feedback: string;
  checks: {
    length: boolean;
  };
  color?: string;
}

export const checkPasswordStrength = (password: string, email: string = ""): PasswordStrength => {
  const checks = {
    length: password.length >= 6
  };

  let score = 0;
  let feedback = "";
  let color = "";

  if (password.length === 0) {
    feedback = "";
    color = "";
  } else if (password.length < 6) {
    score = 1;
    feedback = "Too short";
    color = "text-red-500";
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

export const getUsernameError = (username: string, touched: boolean): string => {
  if (!touched) return "";
  if (!username) return "Username is required";
  if (username.length < 3) return "Username must be at least 3 characters";
  if (username.length > 20) return "Username must be less than 20 characters";
  if (!validateUsername(username)) return "Username can only contain letters, numbers, and underscores";
  return "";
};

export const getEmailError = (email: string, touched: boolean): string => {
  if (!touched) return "";
  if (!email) return "Email is required";
  if (!validateEmail(email)) return "Please enter a valid email address";
  return "";
};

export const getPasswordError = (password: string, touched: boolean): string => {
  if (!touched) return "";
  if (!password) return "Password is required";
  const validationError = validatePassword(password);
  return validationError || "";
};
