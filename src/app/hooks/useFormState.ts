"use client";

import { useState, useCallback } from "react";

export type FormState = "idle" | "submitting" | "success" | "error";

export interface UseFormStateReturn {
  /** Current form state */
  state: FormState;
  /** Error message if state is error */
  error: string | null;
  /** Success message if state is success */
  success: string | null;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  /** Whether form is in success state */
  isSuccess: boolean;
  /** Whether form has an error */
  hasError: boolean;
  /** Set form to submitting state */
  setSubmitting: (message?: string) => void;
  /** Set form to success state */
  setSuccess: (message: string) => void;
  /** Set form to error state */
  setError: (message: string) => void;
  /** Reset form to idle state */
  reset: () => void;
  /** Execute async form submission with automatic state management */
  submit: <T>(
    submitFn: () => Promise<T>,
    options?: {
      successMessage?: string;
      onSuccess?: (result: T) => void | Promise<void>;
      onError?: (error: any) => void;
      errorMessage?: string;
    }
  ) => Promise<T | null>;
}

/**
 * Hook for managing form submission states
 * Provides clear states: idle, submitting, success, error
 * Includes helper methods for common form operations
 */
export function useFormState(): UseFormStateReturn {
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const setSubmitting = useCallback((message?: string) => {
    setState("submitting");
    setError(null);
    setSuccess(null);
  }, []);

  const setSuccessState = useCallback((message: string) => {
    setState("success");
    setSuccess(message);
    setError(null);
  }, []);

  const setErrorState = useCallback((message: string) => {
    setState("error");
    setError(message);
    setSuccess(null);
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setSuccess(null);
  }, []);

  const submit = useCallback(
    async <T,>(
      submitFn: () => Promise<T>,
      options?: {
        successMessage?: string;
        onSuccess?: (result: T) => void | Promise<void>;
        onError?: (error: any) => void;
        errorMessage?: string;
      }
    ): Promise<T | null> => {
      setSubmitting();
      
      try {
        const result = await submitFn();
        
        if (options?.successMessage) {
          setSuccessState(options.successMessage);
        } else {
          setState("idle");
        }
        
        if (options?.onSuccess) {
          await options.onSuccess(result);
        }
        
        return result;
      } catch (err: any) {
        let errorMessage = options?.errorMessage || "An error occurred. Please try again.";
        
        // Map common errors to user-friendly messages
        if (err?.message) {
          if (err.message.includes("network") || err.message.includes("fetch")) {
            errorMessage = "Unable to connect to our servers. Please check your internet connection and try again.";
          } else if (err.message.includes("timeout")) {
            errorMessage = "The request took too long. Please try again.";
          } else if (err.message.includes("Unauthorized") || err.message.includes("401")) {
            errorMessage = "You need to be logged in to perform this action. Please sign in and try again.";
          } else if (err.message.includes("Forbidden") || err.message.includes("403")) {
            errorMessage = "You don't have permission to perform this action.";
          } else if (err.message.includes("Not Found") || err.message.includes("404")) {
            errorMessage = "The requested resource was not found. Please check your input and try again.";
          } else if (err.message.includes("Validation") || err.message.includes("required")) {
            errorMessage = err.message; // Use validation error as-is
          } else {
            // Use error message if it's user-friendly, otherwise use default
            errorMessage = err.message.length < 100 ? err.message : errorMessage;
          }
        }
        
        setErrorState(errorMessage);
        
        if (options?.onError) {
          options.onError(err);
        }
        
        return null;
      }
    },
    [setSubmitting, setSuccessState, setErrorState]
  );

  return {
    state,
    error,
    success,
    isSubmitting: state === "submitting",
    isSuccess: state === "success",
    hasError: state === "error",
    setSubmitting,
    setSuccess: setSuccessState,
    setError: setErrorState,
    reset,
    submit,
  };
}

