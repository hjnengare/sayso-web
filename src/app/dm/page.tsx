'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import MessagingWorkspace from '@/app/components/Messaging/MessagingWorkspace';
import { useAuth } from '@/app/contexts/AuthContext';
import { useOwnerBusinessesList } from '@/app/hooks/useOwnerBusinessesList';

export default function DMPage() {
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const role = useMemo(() => {
    const profileRole = user?.profile?.account_role || user?.profile?.role;
    return profileRole === 'business_owner' ? 'business' : 'user';
  }, [user?.profile?.account_role, user?.profile?.role]);

  const { businesses, isLoading: businessesLoading } = useOwnerBusinessesList(
    role === 'business' && user?.id ? user.id : null
  );

  const initialConversationId = searchParams?.get('conversation') || null;
  const startBusinessId =
    searchParams?.get('business_id') ||
    searchParams?.get('businessId') ||
    null;
  const startUserId = searchParams?.get('user_id') || null;

  if (authLoading || (role === 'business' && businessesLoading)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-off-white pt-16 sm:pt-20">
        <div className="inline-flex items-center gap-2 text-sm text-charcoal/60" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading messages...
        </div>
      </div>
    );
  }

  const businessOptions = role === 'business'
    ? businesses.map((business: any) => ({
        id: business.id,
        name: business.name,
        image_url: business.image_url || null,
      }))
    : undefined;

  return (
    <MessagingWorkspace
      role={role}
      title={role === 'business' ? 'Inbox' : 'Messages'}
      subtitle={
        role === 'business'
          ? 'Manage customer conversations'
          : 'Message businesses directly'
      }
      topPaddingClassName="pt-16 sm:pt-20"
      viewportClassName="h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-5rem)]"
      businessOptions={businessOptions}
      initialBusinessId={startBusinessId}
      initialConversationId={initialConversationId}
      startBusinessId={startBusinessId}
      startUserId={startUserId}
    />
  );
}
