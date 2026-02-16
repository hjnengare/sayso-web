"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3, Eye, Star, MessageSquare, ThumbsUp, Calendar } from "lucide-react";
import { useReducedMotion } from "../../../utils/useReducedMotion";

export type AnalyticsData = {
  viewsOverTime: { date: string; views: number }[];
  reviewsOverTime: { date: string; count: number }[];
  ratingTrend: { date: string; avgRating: number | null }[];
  totalHelpfulVotes: number;
  eventsCount: number;
  specialsCount: number;
  totalViews: number;
  totalReviews: number;
};

const chartAnimationDuration = 280;

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[12px] bg-charcoal/5 ${className || ""}`}
      style={{ minHeight: 200 }}
    />
  );
}

const chartTickStyle = { fontSize: 11, fill: "#374151", fontWeight: 500 };

function EmptyChartMessage() {
  return (
    <div className="flex items-center justify-center min-h-[180px] text-charcoal/85 text-sm font-medium">
      No data in this period
    </div>
  );
}

export function BusinessAnalyticsSection({ businessId }: { businessId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0 : chartAnimationDuration;

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      try {
        const res = await fetch(`/api/businesses/${businessId}/analytics?days=30`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Failed to load analytics");
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load analytics");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAnalytics();
    return () => { cancelled = true; };
  }, [businessId]);

  if (loading) {
    return (
      <section
        className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg p-6 sm:p-8 space-y-6"
        aria-label="Stats & Analytics"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
            <BarChart3 className="w-5 h-5 text-sage" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-charcoal">Stats & Analytics</h3>
            <p className="text-sm text-charcoal/85">Loading performance data…</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg p-6 sm:p-8"
        aria-label="Stats & Analytics"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
            <BarChart3 className="w-5 h-5 text-sage" />
          </span>
          <h3 className="text-base font-semibold text-charcoal">Stats & Analytics</h3>
        </div>
        <p className="text-sm text-charcoal/85">{error}</p>
      </section>
    );
  }

  const hasAnyData =
    data &&
    (data.totalViews > 0 ||
      data.totalReviews > 0 ||
      data.totalHelpfulVotes > 0 ||
      data.eventsCount > 0 ||
      data.specialsCount > 0);

  if (!data || !hasAnyData) {
    return (
      <section
        className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg p-6 sm:p-8"
        aria-label="Stats & Analytics"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
            <BarChart3 className="w-5 h-5 text-sage" />
          </span>
          <h3 className="text-base font-semibold text-charcoal">Stats & Analytics</h3>
        </div>
        <p className="text-sm text-charcoal/85">No performance data yet.</p>
      </section>
    );
  }

  const hasViews = data.viewsOverTime.some((d) => d.views > 0);
  const hasReviews = data.reviewsOverTime.some((d) => d.count > 0);
  const hasRating = data.ratingTrend.some((d) => d.avgRating != null && d.avgRating > 0);

  return (
    <section
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg p-6 sm:p-8 space-y-6"
      aria-label="Stats & Analytics"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
          <BarChart3 className="w-5 h-5 text-sage" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-charcoal">Stats & Analytics</h3>
          <p className="text-sm text-charcoal/85">Last 30 days · key metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Total Views over time */}
        <div className="bg-white/60 border border-white/80 rounded-[12px] p-4 shadow-sm min-h-[220px]">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-sage" />
            <span className="text-sm font-semibold text-charcoal">Profile Views</span>
          </div>
          {hasViews ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={data.viewsOverTime}
                margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={chartTickStyle}
                />
                <YAxis
                  allowDecimals={false}
                  tick={chartTickStyle}
                />
                <Tooltip
                  labelFormatter={formatShortDate}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.12)",
                    fontFamily: "Urbanist, system-ui, sans-serif",
                    color: "#1f2937",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="var(--sage, #87a878)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={!reducedMotion}
                  animationDuration={duration}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartMessage />
          )}
        </div>

        {/* Reviews over time */}
        <div className="bg-white/60 border border-white/80 rounded-[12px] p-4 shadow-sm min-h-[220px]">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-coral" />
            <span className="text-sm font-semibold text-charcoal">Reviews Over Time</span>
          </div>
          {hasReviews ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={data.reviewsOverTime}
                margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={chartTickStyle}
                />
                <YAxis
                  allowDecimals={false}
                  tick={chartTickStyle}
                />
                <Tooltip
                  labelFormatter={formatShortDate}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.12)",
                    fontFamily: "Urbanist, system-ui, sans-serif",
                    color: "#1f2937",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--coral, #e07a5f)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!reducedMotion}
                  animationDuration={duration}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartMessage />
          )}
        </div>

        {/* Average Rating trend */}
        <div className="bg-white/60 border border-white/80 rounded-[12px] p-4 shadow-sm min-h-[220px]">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-coral" />
            <span className="text-sm font-semibold text-charcoal">Average Rating Trend</span>
          </div>
          {hasRating ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={data.ratingTrend.map((d) => ({
                  ...d,
                  avgRating: d.avgRating ?? 0,
                }))}
                margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={chartTickStyle}
                />
                <YAxis
                  domain={[0, 5]}
                  tick={chartTickStyle}
                />
                <Tooltip
                  labelFormatter={formatShortDate}
                  formatter={(value: number) => [value?.toFixed(1) ?? "—", "Avg rating"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.12)",
                    fontFamily: "Urbanist, system-ui, sans-serif",
                    color: "#1f2937",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avgRating"
                  stroke="var(--coral, #e07a5f)"
                  fill="var(--coral, #e07a5f)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  isAnimationActive={!reducedMotion}
                  animationDuration={duration}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartMessage />
          )}
        </div>

        {/* Helpful votes + Events & Specials */}
        <div className="flex flex-col gap-4">
          <div className="bg-white/60 border border-white/80 rounded-[12px] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ThumbsUp className="w-4 h-4 text-sage" />
              <span className="text-sm font-semibold text-charcoal">Helpful Votes</span>
            </div>
            <p className="text-2xl font-bold text-charcoal">{data.totalHelpfulVotes}</p>
            <p className="text-xs text-charcoal/85">On your reviews</p>
          </div>
          <div className="bg-white/60 border border-white/80 rounded-[12px] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-sage" />
              <span className="text-sm font-semibold text-charcoal">Events & Specials</span>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-xl font-bold text-charcoal">{data.eventsCount}</p>
                <p className="text-xs text-charcoal/85">Events</p>
              </div>
              <div>
                <p className="text-xl font-bold text-charcoal">{data.specialsCount}</p>
                <p className="text-xs text-charcoal/85">Specials</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
