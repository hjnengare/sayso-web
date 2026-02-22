"use client";

import useSWR from "swr";
import Link from "next/link";
import {
  Store,
  FileCheck,
  Database,
  Flag,
  ArrowRight,
  Activity,
} from "lucide-react";

type SectionKey = "pending-businesses" | "claims" | "flagged-reviews" | "seed";

const CARDS: {
  key: SectionKey;
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  accentClass: string;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    key: "pending-businesses",
    href: "/admin/pending-businesses",
    label: "Pending Businesses",
    description: "Review and approve new businesses before they go live on the platform.",
    icon: Store,
    accentClass: "hover:border-amber-300/60",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    key: "claims",
    href: "/admin/claims",
    label: "Business Claims",
    description: "Manage ownership claim requests from business operators.",
    icon: FileCheck,
    accentClass: "hover:border-sage/40",
    iconBg: "bg-sage/10",
    iconColor: "text-sage",
  },
  {
    key: "flagged-reviews",
    href: "/admin/flagged-reviews",
    label: "Flagged Reviews",
    description: "Moderate user-reported reviews for spam, harassment, and inappropriate content.",
    icon: Flag,
    accentClass: "hover:border-red-300/60",
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
  },
  {
    key: "seed",
    href: "/admin/seed",
    label: "Seed Data",
    description: "Upload and batch-insert business data from CSV or Excel sheets.",
    icon: Database,
    accentClass: "hover:border-charcoal/30",
    iconBg: "bg-charcoal/8",
    iconColor: "text-charcoal/70",
  },
];

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null));

export default function AdminDashboardPage() {
  const { data: bizData } = useSWR("/api/admin/businesses/pending", fetcher, { revalidateOnFocus: false });
  const { data: claimsData } = useSWR("/api/admin/claims?status=pending,under_review&limit=100", fetcher, { revalidateOnFocus: false });
  const { data: flagsData } = useSWR("/api/admin/flags?status=pending&limit=1", fetcher, { revalidateOnFocus: false });

  const pendingBusinessCount: number | null = bizData?.businesses ? bizData.businesses.length : null;
  const pendingClaimCount: number | null = claimsData?.claims ? claimsData.claims.length : null;
  const pendingFlagCount: number | null = flagsData?.total != null ? flagsData.total : null;

  const countMap: Record<SectionKey, number | null> = {
    "pending-businesses": pendingBusinessCount,
    claims: pendingClaimCount,
    "flagged-reviews": pendingFlagCount,
    seed: null,
  };

  const totalPending =
    (pendingBusinessCount ?? 0) + (pendingClaimCount ?? 0) + (pendingFlagCount ?? 0);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <Activity className="w-5 h-5 text-navbar-bg" />
          <h1 className="font-urbanist text-2xl font-bold text-charcoal tracking-tight">
            Dashboard
          </h1>
        </div>
        <p className="font-urbanist text-sm text-charcoal/55 ml-7">
          Sayso platform administration
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="rounded-2xl bg-white border border-charcoal/8 shadow-premium px-5 py-4 col-span-2 sm:col-span-1">
          <p className="font-urbanist text-xs font-semibold text-charcoal/45 uppercase tracking-widest mb-1">
            Awaiting Review
          </p>
          <p className="font-urbanist text-3xl font-bold text-charcoal tabular-nums">
            {pendingBusinessCount == null && pendingClaimCount == null && pendingFlagCount == null ? (
              <span className="text-charcoal/25 text-xl animate-pulse">—</span>
            ) : (
              totalPending
            )}
          </p>
          <p className="font-urbanist text-xs text-charcoal/45 mt-1">Total pending items</p>
        </div>

        <div className="rounded-2xl bg-white border border-charcoal/8 shadow-premium px-5 py-4">
          <p className="font-urbanist text-xs font-semibold text-charcoal/45 uppercase tracking-widest mb-1">
            Businesses
          </p>
          <p className="font-urbanist text-3xl font-bold text-amber-600 tabular-nums">
            {pendingBusinessCount == null ? (
              <span className="text-charcoal/25 text-xl animate-pulse">—</span>
            ) : (
              pendingBusinessCount
            )}
          </p>
          <p className="font-urbanist text-xs text-charcoal/45 mt-1">Pending approval</p>
        </div>

        <div className="rounded-2xl bg-white border border-charcoal/8 shadow-premium px-5 py-4">
          <p className="font-urbanist text-xs font-semibold text-charcoal/45 uppercase tracking-widest mb-1">
            Claims
          </p>
          <p className="font-urbanist text-3xl font-bold text-sage tabular-nums">
            {pendingClaimCount == null ? (
              <span className="text-charcoal/25 text-xl animate-pulse">—</span>
            ) : (
              pendingClaimCount
            )}
          </p>
          <p className="font-urbanist text-xs text-charcoal/45 mt-1">Pending review</p>
        </div>

        <div className="rounded-2xl bg-white border border-charcoal/8 shadow-premium px-5 py-4">
          <p className="font-urbanist text-xs font-semibold text-charcoal/45 uppercase tracking-widest mb-1">
            Flags
          </p>
          <p className="font-urbanist text-3xl font-bold text-red-500 tabular-nums">
            {pendingFlagCount == null ? (
              <span className="text-charcoal/25 text-xl animate-pulse">—</span>
            ) : (
              pendingFlagCount
            )}
          </p>
          <p className="font-urbanist text-xs text-charcoal/45 mt-1">Flagged reviews</p>
        </div>
      </div>

      {/* Section cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const count = countMap[card.key];
          const hasAlert = count != null && count > 0;

          return (
            <Link
              key={card.key}
              href={card.href}
              className={`group relative flex flex-col gap-4 p-5 rounded-2xl bg-white border border-charcoal/10 shadow-premium transition-all duration-200 hover:shadow-premiumHover ${card.accentClass}`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                {hasAlert && (
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-amber-100 text-amber-800 text-xs font-bold font-urbanist">
                    {count}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="font-urbanist text-base font-semibold text-charcoal mb-1 group-hover:text-navbar-bg transition-colors">
                  {card.label}
                </h2>
                <p className="font-urbanist text-sm text-charcoal/55 leading-relaxed">
                  {card.description}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-charcoal/40 group-hover:text-navbar-bg transition-colors font-urbanist">
                <span>Open</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
