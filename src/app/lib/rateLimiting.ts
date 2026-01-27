"use client";

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  lockedUntil?: Date;
  message?: string;
}

export class RateLimiter {
  /**
   * Check if a user is allowed to attempt an auth operation
   * @param identifier - Email or IP address
   * @param attemptType - Type of auth attempt (login, register, password_reset)
   */
  static async checkRateLimit(
    identifier: string,
    attemptType: 'login' | 'register' | 'password_reset'
  ): Promise<RateLimitResult> {
    try {
      const response = await fetch('/api/auth/rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.toLowerCase(),
          attemptType
        })
      });

      const data = await response.json().catch(() => null);

      if (response.status === 429) {
        return {
          allowed: false,
          lockedUntil: data?.lockedUntil ? new Date(data.lockedUntil) : undefined,
          message: data?.message || 'Too many attempts. Please try again later.'
        };
      }

      if (!response.ok) {
        return { allowed: true };
      }

      return {
        allowed: !data?.locked,
        remainingAttempts: data?.attemptsRemaining,
        lockedUntil: data?.lockedUntil ? new Date(data.lockedUntil) : undefined,
        message: data?.message
      };
    } catch {
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
    try {
      await fetch('/api/auth/rate-limit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.toLowerCase(),
          attemptType
        })
      });
    } catch {
      // Ignore failures to avoid blocking auth flows.
    }
  }

  /**
   * Record a failed auth attempt
   */
  static async recordFailure(
    _identifier: string,
    _attemptType: 'login' | 'register' | 'password_reset'
  ): Promise<void> {
    // checkRateLimit already increments the counter on the server.
  }

  /**
   * Manually unlock an account (for admin use)
   */
  static async unlockAccount(
    identifier: string,
    attemptType: 'login' | 'register' | 'password_reset'
  ): Promise<void> {
    await this.recordSuccess(identifier, attemptType);
  }
}
