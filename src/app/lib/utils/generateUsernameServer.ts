/**
 * Server-side username generation utility (same logic as client-side)
 * Used in API routes to generate usernames when not set in profile
 */

export function generateUsernameFromEmail(email: string | null | undefined): string {
  if (!email) return 'user';
  
  // Extract part before @ and clean it
  const emailPart = email.split('@')[0];
  // Remove non-alphanumeric characters except underscore, convert to lowercase
  const cleaned = emailPart.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  
  // Ensure minimum length of 3
  if (cleaned.length < 3) {
    return 'user';
  }
  
  // Ensure maximum length of 20
  return cleaned.length > 20 ? cleaned.substring(0, 20) : cleaned;
}

export function generateUsernameFromUserId(userId: string | null | undefined): string {
  if (!userId) return 'user';
  
  // Use first 8 characters of user_id
  const idPart = userId.substring(0, 8);
  return `user_${idPart}`;
}

/**
 * Get display username - tries username, then display_name, then generates from email/user_id
 */
export function getDisplayUsername(
  username: string | null | undefined,
  displayName: string | null | undefined,
  email: string | null | undefined,
  userId: string | null | undefined
): string {
  // Priority: username > display_name > generated from email > generated from user_id
  if (username) return username;
  if (displayName) return displayName;
  if (email) return generateUsernameFromEmail(email);
  if (userId) return generateUsernameFromUserId(userId);
  return 'Anonymous';
}

