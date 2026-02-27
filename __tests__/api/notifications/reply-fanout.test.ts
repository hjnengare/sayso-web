const mockGetServiceSupabase = jest.fn();

jest.mock('@/app/lib/admin', () => ({
  getServiceSupabase: (...args: any[]) => mockGetServiceSupabase(...args),
}));

import { notifyReplyRecipients } from '@/app/lib/notifications';

type SeedReview = {
  id: string;
  user_id: string;
  business_id: string;
};

type SeedBusiness = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string | null;
};

type SeedNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_id: string | null;
  link: string | null;
  image: string | null;
  image_alt: string | null;
  read: boolean;
};

function createFakeServiceClient(seed: {
  reviews: SeedReview[];
  businesses: SeedBusiness[];
  notifications?: SeedNotification[];
}) {
  const notifications: SeedNotification[] = [...(seed.notifications ?? [])];

  const client = {
    from: jest.fn((table: string) => {
      if (table === 'reviews') {
        const filters: Record<string, unknown> = {};
        const builder: any = {};
        builder.select = jest.fn(() => builder);
        builder.eq = jest.fn((column: string, value: unknown) => {
          filters[column] = value;
          return builder;
        });
        builder.maybeSingle = jest.fn(async () => ({
          data:
            seed.reviews.find((review) =>
              Object.entries(filters).every(([column, value]) => (review as any)[column] === value)
            ) ?? null,
          error: null,
        }));
        return builder;
      }

      if (table === 'businesses') {
        const filters: Record<string, unknown> = {};
        const builder: any = {};
        builder.select = jest.fn(() => builder);
        builder.eq = jest.fn((column: string, value: unknown) => {
          filters[column] = value;
          return builder;
        });
        builder.maybeSingle = jest.fn(async () => ({
          data:
            seed.businesses.find((business) =>
              Object.entries(filters).every(([column, value]) => (business as any)[column] === value)
            ) ?? null,
          error: null,
        }));
        return builder;
      }

      if (table === 'notifications') {
        const filters: Record<string, unknown> = {};
        let insertPayload: Omit<SeedNotification, 'id'> | null = null;

        const builder: any = {};
        builder.select = jest.fn(() => builder);
        builder.eq = jest.fn((column: string, value: unknown) => {
          filters[column] = value;
          return builder;
        });
        builder.limit = jest.fn(() => builder);
        builder.maybeSingle = jest.fn(async () => {
          const existing = notifications.find((notification) =>
            Object.entries(filters).every(([column, value]) => (notification as any)[column] === value)
          );

          return {
            data: existing ? { id: existing.id } : null,
            error: null,
          };
        });
        builder.insert = jest.fn((payload: Omit<SeedNotification, 'id'>) => {
          insertPayload = payload;
          return builder;
        });
        builder.single = jest.fn(async () => {
          if (!insertPayload) {
            return { data: null, error: new Error('Missing insert payload') };
          }

          const id = `notif-${notifications.length + 1}`;
          notifications.push({ id, ...insertPayload });

          return {
            data: { id },
            error: null,
          };
        });

        return builder;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { client, notifications };
}

describe('notifyReplyRecipients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('owner reply notifies review author only', async () => {
    const { client, notifications } = createFakeServiceClient({
      reviews: [{ id: 'review-1', user_id: 'author-1', business_id: 'biz-1' }],
      businesses: [{ id: 'biz-1', owner_id: 'owner-1', name: 'Cafe Uno', slug: 'cafe-uno' }],
    });
    mockGetServiceSupabase.mockReturnValue(client);

    const result = await notifyReplyRecipients({
      reviewId: 'review-1',
      replyId: 'reply-1',
      replierId: 'owner-1',
      replierName: 'Owner Name',
    });

    expect(result.authorNotificationId).toBe('notif-1');
    expect(result.ownerNotificationId).toBeNull();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      user_id: 'author-1',
      type: 'comment_reply',
      entity_id: 'reply:reply-1:author',
      link: '/business/cafe-uno',
    });
  });

  it('third-party reply notifies review author and business owner', async () => {
    const { client, notifications } = createFakeServiceClient({
      reviews: [{ id: 'review-1', user_id: 'author-1', business_id: 'biz-1' }],
      businesses: [{ id: 'biz-1', owner_id: 'owner-1', name: 'Cafe Uno', slug: 'cafe-uno' }],
    });
    mockGetServiceSupabase.mockReturnValue(client);

    const result = await notifyReplyRecipients({
      reviewId: 'review-1',
      replyId: 'reply-1',
      replierId: 'third-party-1',
      replierName: 'Contributor',
    });

    expect(result.authorNotificationId).toBeTruthy();
    expect(result.ownerNotificationId).toBeTruthy();
    expect(notifications).toHaveLength(2);

    expect(notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: 'author-1',
          type: 'comment_reply',
          entity_id: 'reply:reply-1:author',
          link: '/business/cafe-uno',
        }),
        expect.objectContaining({
          user_id: 'owner-1',
          type: 'review',
          entity_id: 'reply:reply-1:owner',
          link: '/my-businesses/businesses/biz-1/reviews',
        }),
      ])
    );
  });

  it('author equals owner sends a single comment_reply notification', async () => {
    const { client, notifications } = createFakeServiceClient({
      reviews: [{ id: 'review-1', user_id: 'owner-author-1', business_id: 'biz-1' }],
      businesses: [{ id: 'biz-1', owner_id: 'owner-author-1', name: 'Cafe Uno', slug: null }],
    });
    mockGetServiceSupabase.mockReturnValue(client);

    const result = await notifyReplyRecipients({
      reviewId: 'review-1',
      replyId: 'reply-1',
      replierId: 'third-party-1',
      replierName: 'Contributor',
    });

    expect(result.authorNotificationId).toBeTruthy();
    expect(result.ownerNotificationId).toBeNull();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      user_id: 'owner-author-1',
      type: 'comment_reply',
      entity_id: 'reply:reply-1:author',
      link: '/business/biz-1',
    });
  });

  it('is idempotent for the same reply id', async () => {
    const { client, notifications } = createFakeServiceClient({
      reviews: [{ id: 'review-1', user_id: 'author-1', business_id: 'biz-1' }],
      businesses: [{ id: 'biz-1', owner_id: 'owner-1', name: 'Cafe Uno', slug: 'cafe-uno' }],
    });
    mockGetServiceSupabase.mockReturnValue(client);

    const first = await notifyReplyRecipients({
      reviewId: 'review-1',
      replyId: 'reply-1',
      replierId: 'third-party-1',
      replierName: 'Contributor',
    });

    const second = await notifyReplyRecipients({
      reviewId: 'review-1',
      replyId: 'reply-1',
      replierId: 'third-party-1',
      replierName: 'Contributor',
    });

    expect(notifications).toHaveLength(2);
    expect(second.authorNotificationId).toBe(first.authorNotificationId);
    expect(second.ownerNotificationId).toBe(first.ownerNotificationId);
  });
});
