'use client';

import React from 'react';
import { Avatar, AvatarSize } from '@/components/atoms/Avatar';
import { Text } from '@/components/atoms/Text';
import { Badge, BadgeVariant } from '@/components/atoms/Badge';

export interface UserCardProps {
  avatarUrl?: string | null;
  name: string;
  username?: string;
  bio?: string;
  badge?: {
    label: string;
    variant?: BadgeVariant;
  };
  avatarSize?: AvatarSize;
  onClick?: () => void;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({
  avatarUrl,
  name,
  username,
  bio,
  badge,
  avatarSize = 'md',
  onClick,
  className = '',
}) => {
  const isClickable = !!onClick;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`
        flex items-start gap-3
        ${isClickable ? 'cursor-pointer hover:bg-light-gray/50 rounded-[20px] p-3 -m-3 transition-colors' : ''}
        ${className}
      `}
    >
      <Avatar
        src={avatarUrl}
        alt={name}
        size={avatarSize}
        fallback={name}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Text variant="label" color="primary" className="truncate">
            {name}
          </Text>
          {badge && (
            <Badge variant={badge.variant} size="sm">
              {badge.label}
            </Badge>
          )}
        </div>

        {username && (
          <Text variant="body-sm" color="secondary" className="mb-1">
            @{username}
          </Text>
        )}

        {bio && (
          <Text variant="body-sm" color="secondary" className="line-clamp-2">
            {bio}
          </Text>
        )}
      </div>
    </div>
  );
};
