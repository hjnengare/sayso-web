import { createEventOrSpecial } from "@/app/lib/events/createEventSpecial";

type MockSupabaseConfig = {
  businesses?: Array<Record<string, unknown>>;
  businessOwners?: Array<Record<string, unknown>>;
  profiles?: Array<Record<string, unknown>>;
  recentCreations?: number;
  insertError?: { message: string } | null;
};

function createFilterQuery(rows: Array<Record<string, unknown>>) {
  const filters: Array<{ column: string; value: unknown }> = [];
  const query: any = {
    eq: jest.fn((column: string, value: unknown) => {
      filters.push({ column, value });
      return query;
    }),
    maybeSingle: jest.fn(async () => {
      const match =
        rows.find((row) =>
          filters.every((filter) => row[filter.column] === filter.value),
        ) ?? null;
      return { data: match, error: null };
    }),
  };
  return query;
}

function createCountQuery(count: number) {
  const query: any = {
    eq: jest.fn(() => query),
    gte: jest.fn(async () => ({ count, error: null })),
  };
  return query;
}

function createSupabaseMock(config: MockSupabaseConfig = {}) {
  const insertedRows: Array<Record<string, unknown>> = [];
  const businesses = config.businesses ?? [];
  const businessOwners = config.businessOwners ?? [];
  const profiles = config.profiles ?? [];
  const recentCreations = config.recentCreations ?? 0;
  const insertError = config.insertError ?? null;

  const from = jest.fn((table: string) => {
    if (table === "businesses") {
      return {
        select: jest.fn(() => createFilterQuery(businesses)),
      };
    }

    if (table === "business_owners") {
      return {
        select: jest.fn(() => createFilterQuery(businessOwners)),
      };
    }

    if (table === "profiles") {
      return {
        select: jest.fn(() => createFilterQuery(profiles)),
      };
    }

    if (table === "events_and_specials") {
      return {
        select: jest.fn((_: string, options?: { count?: string; head?: boolean }) => {
          if (options?.count === "exact" && options?.head === true) {
            return createCountQuery(recentCreations);
          }
          return createFilterQuery(insertedRows);
        }),
        insert: jest.fn((payload: Array<Record<string, unknown>>) => {
          const row = {
            id: "event-special-1",
            ...payload[0],
          };
          if (!insertError) {
            insertedRows.push(row);
          }
          return {
            select: jest.fn(() => ({
              single: jest.fn(async () => ({
                data: insertError ? null : row,
                error: insertError,
              })),
            })),
          };
        }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    from,
    insertedRows,
  };
}

describe("createEventOrSpecial smoke flows", () => {
  const userId = "user-123";
  const businessId = "business-1";

  it("creates a community event with website CTA", async () => {
    const supabase = createSupabaseMock();

    const result = await createEventOrSpecial({
      supabase,
      userId,
      body: {
        type: "event",
        title: "Friday Networking Session",
        startDate: "2026-03-20T18:00:00.000Z",
        location: "Cape Town",
        ctaSource: "website",
        ctaUrl: "https://example.com/book",
        ctaLabel: "Book now",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe("event");
      expect(result.data.business_id).toBeNull();
      expect(result.data.is_community_event).toBe(true);
      expect(result.data.booking_url).toBe("https://example.com/book");
      expect(result.data.booking_contact).toBe("Book now");
      expect(result.data.cta_source).toBe("website");
    }
  });

  it("creates a community event with WhatsApp CTA", async () => {
    const supabase = createSupabaseMock();

    const result = await createEventOrSpecial({
      supabase,
      userId,
      body: {
        type: "event",
        title: "Community Jazz Night",
        startDate: "2026-04-12T19:30:00.000Z",
        location: "Johannesburg",
        ctaSource: "whatsapp",
        whatsappNumber: "27721234567",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe("event");
      expect(result.data.cta_source).toBe("whatsapp");
      expect(result.data.whatsapp_number).toBe("27721234567");
      expect(result.data.is_community_event).toBe(true);
    }
  });

  it("creates a special with website CTA for a verified business owner", async () => {
    const supabase = createSupabaseMock({
      businesses: [{ id: businessId, owner_id: userId }],
      profiles: [{ user_id: userId, role: "business_owner", account_role: "business_owner" }],
    });

    const result = await createEventOrSpecial({
      supabase,
      userId,
      body: {
        type: "special",
        businessId,
        title: "2-for-1 Brunch",
        startDate: "2026-03-15T08:00:00.000Z",
        endDate: "2026-03-30T17:00:00.000Z",
        location: "Pretoria",
        ctaSource: "website",
        ctaUrl: "https://example.com/specials/brunch",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe("special");
      expect(result.data.business_id).toBe(businessId);
      expect(result.data.is_community_event).toBe(false);
      expect(result.data.cta_source).toBe("website");
      expect(result.data.booking_url).toBe("https://example.com/specials/brunch");
    }
  });

  it("creates a special with WhatsApp CTA for a verified business owner", async () => {
    const supabase = createSupabaseMock({
      businesses: [{ id: businessId, owner_id: userId }],
      profiles: [{ user_id: userId, role: "business_owner", account_role: "business_owner" }],
    });

    const result = await createEventOrSpecial({
      supabase,
      userId,
      body: {
        type: "special",
        businessId,
        title: "Happy Hour Special",
        startDate: "2026-05-01T16:00:00.000Z",
        location: "Durban",
        ctaSource: "whatsapp",
        whatsappNumber: "27 72 999 0000",
        whatsappPrefillTemplate: "Hi, I want {title}. Link: {public_url}",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe("special");
      expect(result.data.business_id).toBe(businessId);
      expect(result.data.cta_source).toBe("whatsapp");
      expect(result.data.whatsapp_number).toBe("27729990000");
      expect(result.data.whatsapp_prefill_template).toBe("Hi, I want {title}. Link: {public_url}");
    }
  });
});
