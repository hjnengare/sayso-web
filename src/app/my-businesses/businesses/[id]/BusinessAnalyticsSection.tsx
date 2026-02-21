"use client";

import {
  LineChart,
  BarChart,
  AreaChart,
} from "@tremor/react";
import { BarChart3, Eye, Star, MessageSquare, ThumbsUp, Calendar } from "lucide-react";
import { useReducedMotion } from "../../../utils/useReducedMotion";
import { useBusinessAnalytics } from "../../../hooks/useBusinessAnalytics";
import type { AnalyticsData } from "../../../hooks/useBusinessAnalytics";

export type { AnalyticsData };

/** Chart stroke/fill use theme token navbar-bg */
const CHART_COLOR = "#722F37";

const chartAnimationDuration = 280;

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Ensure charts always render axes even with no data */
const EMPTY_VIEWS = [{ date: "No data", views: 0 }];
const EMPTY_REVIEWS = [{ date: "No data", count: 0 }];
const EMPTY_RATINGS = [{ date: "No data", avgRating: 0 }];

function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[12px] bg-charcoal/5 ${className || ""}`}
      style={{ minHeight: 200 }}
    />
  );
}

export function BusinessAnalyticsSection({ businessId }: { businessId: string }) {
  const { data, loading, error } = useBusinessAnalytics(businessId);
  const reducedMotion = useReducedMotion();

  if (loading) {
    return (
      <section
        className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-lg p-6 sm:p-8 space-y-6"
        aria-label="Stats & Analytics"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-navbar-bg/15">
            <BarChart3 className="w-5 h-5 text-navbar-bg" />
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
        className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-lg p-6 sm:p-8"
        aria-label="Stats & Analytics"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-navbar-bg/15">
            <BarChart3 className="w-5 h-5 text-navbar-bg" />
          </span>
          <h3 className="text-base font-semibold text-charcoal">Stats & Analytics</h3>
        </div>
        <p className="text-sm text-charcoal/85">{error}</p>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const viewsData = data.viewsOverTime.length > 0
    ? data.viewsOverTime.map((d) => ({ ...d, date: formatShortDate(d.date) }))
    : EMPTY_VIEWS;

  const reviewsData = data.reviewsOverTime.length > 0
    ? data.reviewsOverTime.map((d) => ({ ...d, date: formatShortDate(d.date) }))
    : EMPTY_REVIEWS;

  const ratingData = data.ratingTrend.length > 0
    ? data.ratingTrend.map((d) => ({ date: formatShortDate(d.date), avgRating: d.avgRating ?? 0 }))
    : EMPTY_RATINGS;

  return (
    <section
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-lg p-6 sm:p-8 space-y-6"
      aria-label="Stats & Analytics"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-navbar-bg/15">
          <BarChart3 className="w-5 h-5 text-navbar-bg" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-charcoal">Stats & Analytics</h3>
          <p className="text-sm text-charcoal/85">Last 30 days · key metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profile Views */}
        <div className="bg-white/60 border border-white/80 rounded-[12px] p-4 shadow-sm min-h-[220px]">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-navbar-bg" />
            <span className="text-sm font-semibold text-charcoal">Profile Views</span>
          </div>
          <LineChart
            className="h-44"
            data={viewsData}
            index="date"
            categories={["views"]}
            colors={[CHART_COLOR]}
            showLegend={false}
            showAnimation={!reducedMotion}
            animationDuration={chartAnimationDuration}
            allowDecimals={false}
            yAxisWidth={32}
            noDataText="No views yet"
          />
        </div>

        {/* Reviews Over Time */}
        <div className="bg-white/60 border border-white/80 rounded-[12px] p-4 shadow-sm min-h-[220px]">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-navbar-bg" />
            <span className="text-sm font-semibold text-charcoal">Reviews Over Time</span>
          </div>
          <BarChart
            className="h-44"
            data={reviewsData}
            index="date"
            categories={["count"]}
            colors={[CHART_COLOR]}
            showLegend={false}
            showAnimation={!reducedMotion}
            animationDuration={chartAnimationDuration}
            allowDecimals={false}
            yAxisWidth={32}
            noDataText="No reviews yet"
          />
        </div>

        {/* Average Rating Trend */}
        <div className="bg-white/60 border border-white/80 rounded-[12px] p-4 shadow-sm min-h-[220px]">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-navbar-bg" />
            <span className="text-sm font-semibold text-charcoal">Average Rating Trend</span>
          </div>
          <AreaChart
            className="h-44"
            data={ratingData}
            index="date"
            categories={["avgRating"]}
            colors={[CHART_COLOR]}
            showLegend={false}
            showAnimation={!reducedMotion}
            animationDuration={chartAnimationDuration}
            minValue={0}
            maxValue={5}
            valueFormatter={(v: number) => v.toFixed(1)}
            yAxisWidth={32}
            noDataText="No ratings yet"
          />
        </div>

        {/* Helpful votes + Events & Specials */}
        <div className="flex flex-col gap-4">
          <div className="bg-white/60 border border-white/80 rounded-[12px] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ThumbsUp className="w-4 h-4 text-navbar-bg" />
              <span className="text-sm font-semibold text-charcoal">Helpful Votes</span>
            </div>
            <p className="text-2xl font-bold text-charcoal">{data.totalHelpfulVotes}</p>
            <p className="text-xs text-charcoal/85">On your reviews</p>
          </div>
          <div className="bg-white/60 border border-white/80 rounded-[12px] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-navbar-bg" />
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
