'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Loader2 } from 'lucide-react';
import MessagingWorkspace from '@/app/components/Messaging/MessagingWorkspace';
import { useAuth } from '@/app/contexts/AuthContext';
import { useOwnerBusinessesList } from '@/app/hooks/useOwnerBusinessesList';

export default function DMPage() {
  const router = useRouter();
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, router, user]);

  if (authLoading || !user || (role === 'business' && businessesLoading)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-off-white">
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
    <div className="min-h-[100dvh] bg-off-white">
      <div className="mx-auto w-full max-w-[2000px] px-2 relative pb-1">
        <nav className="pb-1" aria-label="Breadcrumb">
          <ol
            className="flex items-center gap-2 text-sm sm:text-base"
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
          >
            <li>
              <Link
                href="/home"
                className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium"
              >
                Home
              </Link>
            </li>
            <li className="flex items-center">
              <ChevronRight className="w-4 h-4 text-charcoal/60" aria-hidden />
            </li>
            <li>
              <span className="text-charcoal font-semibold" aria-current="page">
                Messages
              </span>
            </li>
          </ol>
        </nav>
      </div>
      <MessagingWorkspace
        role={role}
        title={role === 'business' ? 'Inbox' : 'Messages'}
        subtitle={
          role === 'business'
            ? 'Manage customer conversations'
            : 'Message businesses directly'
        }
        viewportClassName="h-[calc(100dvh-6rem)] sm:h-[calc(100dvh-7rem)]"
        businessOptions={businessOptions}
        initialBusinessId={startBusinessId}
        initialConversationId={initialConversationId}
        startBusinessId={startBusinessId}
        startUserId={startUserId}
      />
    </div>
  );
}
