/**
 * Factory for creating test user data
 */

export interface UserFactoryOptions {
  id?: string;
  email?: string;
  display_name?: string;
  username?: string;
  avatar_url?: string | null;
  verified?: boolean;
  interests?: string[];
  subcategories?: string[];
  dealbreakers?: string[];
  latitude?: number | null;
  longitude?: number | null;
}

export function createUser(options: UserFactoryOptions = {}) {
  const id = options.id || `user-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();

  return {
    id,
    email: options.email || `test-${id}@example.com`,
    display_name: options.display_name || `Test User ${id}`,
    username: options.username || `testuser${id}`,
    avatar_url: options.avatar_url || `https://example.com/avatars/${id}.jpg`,
    verified: options.verified ?? true,
    created_at: timestamp,
    updated_at: timestamp,
    // User preferences
    interests: options.interests || [],
    subcategories: options.subcategories || [],
    dealbreakers: options.dealbreakers || [],
    latitude: options.latitude ?? null,
    longitude: options.longitude ?? null,
  };
}

export function createAuthenticatedUser(options: UserFactoryOptions = {}) {
  const user = createUser(options);
  return {
    ...user,
    authenticated: true,
    session: {
      access_token: `mock-token-${user.id}`,
      refresh_token: `mock-refresh-${user.id}`,
      expires_at: Date.now() + 3600000, // 1 hour from now
    },
  };
}

export function createBusinessOwner(options: UserFactoryOptions & { businessIds?: string[] } = {}) {
  const user = createAuthenticatedUser(options);
  return {
    ...user,
    isBusinessOwner: true,
    businessIds: options.businessIds || [`business-${user.id}`],
  };
}

/**
 * Create a user with preferences for testing personalization
 */
export function createUserWithPreferences(preferences: {
  interestIds: string[];
  subcategoryIds: string[];
  dealbreakerIds?: string[];
  location?: { latitude: number; longitude: number };
}) {
  return createUser({
    interests: preferences.interestIds,
    subcategories: preferences.subcategoryIds,
    dealbreakers: preferences.dealbreakerIds || [],
    latitude: preferences.location?.latitude ?? null,
    longitude: preferences.location?.longitude ?? null,
  });
}

