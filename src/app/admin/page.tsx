"use client";

import Link from "next/link";
import { FileCheck, Database, Store } from "lucide-react";

const FONT = "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const SECTIONS = [
  {
    href: "/admin/pending-businesses",
    label: "Pending Businesses",
    description: "Approve new businesses before they go live",
    icon: Store,
    color: "sage" as const,
  },
  {
    href: "/admin/claims",
    label: "Business Claims",
    description: "Review and manage business ownership claims",
    icon: FileCheck,
    color: "sage" as const,
  },
  {
    href: "/admin/seed",
    label: "Seed Data",
    description: "Seed businesses and test data into the database",
    icon: Database,
    color: "charcoal" as const,
  },
];

const colorMap = {
  sage: {
    bg: "bg-sage/10",
    border: "border-sage/20",
    icon: "text-sage",
    hover: "hover:border-sage/40",
  },
  charcoal: {
    bg: "bg-charcoal/5",
    border: "border-charcoal/15",
    icon: "text-charcoal/70",
    hover: "hover:border-charcoal/30",
  },
};

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1
          className="text-xl font-bold text-charcoal"
          style={{ fontFamily: FONT }}
        >
          Admin Dashboard
        </h1>
        <p
          className="text-sm text-charcoal/60 mt-1"
          style={{ fontFamily: FONT }}
        >
          Manage the Sayso platform
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => {
          const c = colorMap[section.color];
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`group flex items-start gap-4 p-5 rounded-[12px] border ${c.border} ${c.hover} bg-white transition-all duration-200 hover:shadow-sm`}
            >
              <div
                className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}
              >
                <section.icon className={`w-5 h-5 ${c.icon}`} />
              </div>
              <div>
                <h2
                  className="text-base font-semibold text-charcoal group-hover:text-sage transition-colors"
                  style={{ fontFamily: FONT }}
                >
                  {section.label}
                </h2>
                <p
                  className="text-sm text-charcoal/60 mt-0.5"
                  style={{ fontFamily: FONT }}
                >
                  {section.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
