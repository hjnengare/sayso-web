"use client";

import { getBrowserSupabase } from './supabase/client';

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  lockedUntil?: Date;
  message?: string;
}

export class RateLimiter {
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
  private static readonly ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Check if a user is allowed to attempt an auth operation
   * @param identifier - Email or IP address
   * @param attemptType - Type of auth attempt (login, register, password_reset)
   */
  static async checkRateLimit(
    identifier: string,
    attemptType: 'login' | 'register' | 'password_reset'
  ): Promise<RateLimitResult> {
    const supabase = getBrowserSupabase();

    try {
      // Get current rate limit record
      const { data: rateLimitRecord, error: fetchError } = await supabase
        .from('auth_rate_limits')
        .select('*')
        .eq('identifier', identifier.toLowerCase())
        .eq('attempt_type', attemptType)
        .maybeSingle();

      if (fetchError) {
        // Extract error details with fallbacks
        let errorMessage = fetchError.message || '';
        const stringError = String(fetchError);
        // Only use String(fetchError) if it's not the generic object string
        if (!errorMessage && stringError && stringError !== '[object Object]') {
          errorMessage = stringError;
        }
        errorMessage = errorMessage || 'Unknown error';
        
        const errorCode = fetchError.code || (fetchError as any)?.code || 'unknown';
        const errorDetails = fetchError.details || (fetchError as any)?.details || null;
        const errorHint = fetchError.hint || (fetchError as any)?.hint || null;
        
        // Check if error is completely empty/unstructured
        const isEmptyError = 
          (errorMessage === 'Unknown error' || errorMessage === '[object Object]' || !errorMessage) &&
          (errorCode === 'unknown' || !errorCode) &&
          !errorDetails &&
          !errorHint &&
          (!fetchError || Object.keys(fetchError).length === 0);
        
        // Check if it's a table/permission error
        const isTableError = errorCode === '42P01' || // relation does not exist
                            errorCode === '42501' || // insufficient privilege
                            (errorMessage && (
                              errorMessage.toLowerCase().includes('relation') ||
                              errorMessage.toLowerCase().includes('does not exist') ||
                              errorMessage.toLowerCase().includes('permission denied')
                            ));
        
        if (isTableError) {
          // Build error info for table errors
          const errorInfo: Record<string, any> = {
            message: errorMessage,
            code: errorCode,
          };
          if (errorDetails) errorInfo.details = errorDetails;
          if (errorHint) errorInfo.hint = errorHint;
          console.warn('Rate limit table not accessible, rate limiting disabled:', errorInfo);
        } else if (isEmptyError) {
          // If error is completely empty/unstructured, silently allow (no logging)
          // This prevents console spam from empty error objects
        } else {
          // Build error details object only if we have meaningful data
          const errorInfo: Record<string, any> = {
            message: errorMessage,
            code: errorCode,
          };
          if (errorDetails) errorInfo.details = errorDetails;
          if (errorHint) errorInfo.hint = errorHint;
          console.warn('Rate limit check encountered an error, allowing attempt:', errorInfo);
        }
        
        // Allow the attempt on error to avoid blocking legitimate users
        return { allowed: true };
      }

      const now = new Date();

      // If no record exists, create one and allow
      if (!rateLimitRecord) {
        await this.recordAttempt(identifier, attemptType, 1);
        return {
          allowed: true,
          remainingAttempts: this.MAX_ATTEMPTS - 1
        };
      }

      // Check if account is currently locked
      if (rateLimitRecord.locked_until) {
        const lockedUntil = new Date(rateLimitRecord.locked_until);
        if (now < lockedUntil) {
          const minutesRemaining = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
          return {
            allowed: false,
            lockedUntil,
            message: `⏰ Too many failed attempts. Please try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`
          };
        } else {
          // Lock expired, reset attempts
          await this.resetAttempts(identifier, attemptType);
          return {
            allowed: true,
            remainingAttempts: this.MAX_ATTEMPTS - 1
          };
        }
      }

      // Check if we're within the attempt window
      const lastAttempt = new Date(rateLimitRecord.last_attempt);
      const timeSinceLastAttempt = now.getTime() - lastAttempt.getTime();

      // If last attempt was more than ATTEMPT_WINDOW ago, reset counter
      if (timeSinceLastAttempt > this.ATTEMPT_WINDOW) {
        await this.resetAttempts(identifier, attemptType);
        return {
          allowed: true,
          remainingAttempts: this.MAX_ATTEMPTS - 1
        };
      }

      // Check if max attempts exceeded
      if (rateLimitRecord.attempts >= this.MAX_ATTEMPTS) {
        const lockedUntil = new Date(now.getTime() + this.LOCKOUT_DURATION);
        await this.lockAccount(identifier, attemptType, lockedUntil);
        return {
          allowed: false,
          lockedUntil,
          message: '⏰ Too many failed attempts. Your account has been temporarily locked for 15 minutes.'
        };
      }

      // Increment attempts and allow
      const newAttempts = rateLimitRecord.attempts + 1;
      await this.recordAttempt(identifier, attemptType, newAttempts);

      return {
        allowed: true,
        remainingAttempts: this.MAX_ATTEMPTS - newAttempts
      };
    } catch (error) {
      // Better error logging for unexpected errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      // Build error info object
      const errorInfo: Record<string, any> = {
        message: errorMessage || 'Unknown error',
      };
      
      if (errorStack) errorInfo.stack = errorStack;
      if (error && typeof error === 'object') {
        // Include any additional error properties
        if ('code' in error) errorInfo.code = (error as any).code;
        if ('details' in error) errorInfo.details = (error as any).details;
        if ('hint' in error) errorInfo.hint = (error as any).hint;
      }
      
      // Only log if we have meaningful information
      if (errorMessage && errorMessage !== 'Unknown error') {
        console.warn('Rate limiting error (allowing attempt):', errorInfo);
      } else {
        console.warn('Rate limiting encountered an error, allowing attempt to proceed:', error);
      }
      
      // Allow the attempt on error to avoid blocking legitimate users
      return { allowed: true };
    }
  }

  /**
   * Record a successful auth attempt (resets the counter)
   */
  static async recordSuccess(
    identifier: string,
    attemptType: 'login' | 'register' | 'password_reset'
  ): Promise<void> {
    await this.resetAttempts(identifier, attemptType);
  }

  /**
   * Record a failed auth attempt
   */
  static async recordFailure(
    identifier: string,
    attemptType: 'login' | 'register' | 'password_reset'
  ): Promise<void> {
    // checkRateLimit already increments the counter, so we don't need to do anything here
    // This method exists for semantic clarity and future extensibility
  }

  /**
   * Record an attempt in the database
   */
  private static async recordAttempt(
    identifier: string,
    attemptType: string,
    attempts: number
  ): Promise<void> {
    const supabase = getBrowserSupabase();

    const { error } = await supabase
      .from('auth_rate_limits')
      .upsert({
        identifier: identifier.toLowerCase(),
        attempt_type: attemptType,
        attempts,
        last_attempt: new Date().toISOString()
      }, {
        onConflict: 'identifier,attempt_type'
      });

    if (error) {
      console.error('Error recording attempt:', error);
    }
  }

  /**
   * Lock an account temporarily
   */
  private static async lockAccount(
    identifier: string,
    attemptType: string,
    lockedUntil: Date
  ): Promise<void> {
    const supabase = getBrowserSupabase();

    const { error } = await supabase
      .from('auth_rate_limits')
      .update({
        locked_until: lockedUntil.toISOString(),
        last_attempt: new Date().toISOString()
      })
      .eq('identifier', identifier.toLowerCase())
      .eq('attempt_type', attemptType);

    if (error) {
      console.error('Error locking account:', error);
    }
  }

  /**
   * Reset attempts for an identifier
   */
  private static async resetAttempts(
    identifier: string,
    attemptType: string
  ): Promise<void> {
    const supabase = getBrowserSupabase();

    const { error } = await supabase
      .from('auth_rate_limits')
      .delete()
      .eq('identifier', identifier.toLowerCase())
      .eq('attempt_type', attemptType);

    if (error) {
      console.error('Error resetting attempts:', error);
    }
  }

  /**
   * Manually unlock an account (for admin use)
   */
  static async unlockAccount(
    identifier: string,
    attemptType: 'login' | 'register' | 'password_reset'
  ): Promise<void> {
    await this.resetAttempts(identifier, attemptType);
  }
}
