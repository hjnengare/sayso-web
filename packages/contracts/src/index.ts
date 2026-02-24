export interface ApiErrorDto {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  data: T | null;
  error: ApiErrorDto | null;
}

export interface MobileSessionProfileDto {
  id: string;
  role?: 'user' | 'business_owner' | 'admin' | 'both';
  account_role?: 'user' | 'business_owner' | 'admin';
  username?: string;
  display_name?: string;
  avatar_url?: string;
  onboarding_step?: string;
  onboarding_complete?: boolean;
}

export interface MobileSessionUserDto {
  id: string;
  email: string;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  profile?: MobileSessionProfileDto;
}

export interface BusinessListItemDto {
  id: string;
  name: string;
  category_label?: string;
  location?: string;
  rating?: number;
  reviews?: number;
  verified?: boolean;
  image?: string | null;
  href?: string;
}

export interface BusinessSearchResponseDto {
  success: boolean;
  businesses: BusinessListItemDto[];
  count: number;
}

export interface SavedBusinessDto extends BusinessListItemDto {
  savedAt?: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
}

export interface SavedBusinessesResponseDto {
  success: boolean;
  businesses: SavedBusinessDto[];
  count: number;
}

export interface NotificationDto {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  image?: string | null;
  image_alt?: string | null;
  read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface NotificationsResponseDto {
  notifications: NotificationDto[];
  count: number;
  unreadCount?: number;
}

export interface RegisterPushTokenRequestDto {
  expoPushToken: string;
  platform: 'ios' | 'android';
  deviceId?: string;
  appVersion?: string;
}

export interface DeletePushTokenRequestDto {
  expoPushToken?: string;
  deviceId?: string;
}

export interface PushTokenDto {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: 'ios' | 'android';
  device_id?: string | null;
  app_version?: string | null;
  last_seen_at: string;
  disabled_at?: string | null;
}

export interface RegisterPushTokenResponseDto {
  success: boolean;
  token: PushTokenDto;
}

export interface PushDispatchSummaryDto {
  tokens: number;
  notifications: number;
  attempted: number;
  sent: number;
  failed: number;
  invalidTokens: number;
}
