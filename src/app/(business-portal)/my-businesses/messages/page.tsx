'use client';

import { Loader2 } from 'lucide-react';
import MessagingWorkspace from '@/app/components/Messaging/MessagingWorkspace';
import { useAuth } from '@/app/contexts/AuthContext';
import { useOwnerBusinessesList } from '@/app/hooks/useOwnerBusinessesList';
import { useSearchParams } from 'next/navigation';

export default function BusinessMessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const { businesses, isLoading: businessesLoading } = useOwnerBusinessesList(
    user?.id || null
  );

  if (authLoading || businessesLoading) {
    return (
      <div className="flex h-full min-h-[60dvh] items-center justify-center bg-page-bg">
        <div className="inline-flex items-center gap-2 text-sm text-charcoal/60" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading inbox...
        </div>
      </div>
    );
  }

  const businessOptions = businesses.map((business: any) => ({
    id: business.id,
    name: business.name,
    image_url: business.image_url || null,
  }));

  const initialConversationId = searchParams?.get('conversation') || null;
  const initialBusinessId = searchParams?.get('business_id') || null;
  const startUserId = searchParams?.get('user_id') || null;

  return (
    <MessagingWorkspace
      role="business"
      title="Inbox"
      subtitle="All customer conversations"
      viewportClassName="h-[calc(100dvh-3.5rem)] lg:h-[100dvh]"
      businessOptions={businessOptions}
      initialBusinessId={initialBusinessId}
      initialConversationId={initialConversationId}
      startBusinessId={initialBusinessId}
      startUserId={startUserId}
    />
  );
}
