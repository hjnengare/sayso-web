"use client";
import React, { useEffect, useRef } from "react";
import "../globals.css";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Star,
  MessageSquare,
  Trophy,
  Sparkles,
  Users,
  Compass,
  Heart,
  ArrowRight,
  BadgeCheck,
  Camera,
  ThumbsUp,
  Repeat,
  Crown,
  Medal,
  Flame,
  Globe,
} from "lucide-react";

// ─── Intersection Observer reveal ───────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "none";
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: 0,
        transform: "translateY(28px)",
        transition: `opacity 0.65s cubic-bezier(.4,0,.2,1) ${delay}s, transform 0.65s cubic-bezier(.4,0,.2,1) ${delay}s`,
        willChange: "opacity, transform",
      }}
      className={className}
    >
      {children}
    </div>
  );
}

// ─── Badge showcase data ─────────────────────────────────────────────────────
const SHOWCASE_BADGES = [
  { icon: Star,         label: "First Voice",       desc: "Leave your first review",                color: "from-amber-400/30 via-yellow-300/20 to-orange-300/20", border: "border-amber-300/50",   text: "text-amber-300"   },
  { icon: Flame,        label: "On Fire",            desc: "7-day review streak",                    color: "from-orange-400/30 via-red-300/20 to-amber-300/15",   border: "border-orange-300/50",  text: "text-orange-300"  },
  { icon: Trophy,       label: "Top Reviewer",       desc: "50+ helpful votes received",             color: "from-amber-400/30 via-yellow-300/20 to-orange-300/20", border: "border-amber-300/50",   text: "text-amber-300"   },
  { icon: Compass,      label: "Neighbourhood Pro",  desc: "Reviews in 5+ businesses in one suburb", color: "from-sky-400/25 via-blue-400/15 to-cyan-300/20",       border: "border-sky-300/50",     text: "text-sky-300"     },
  { icon: Globe,        label: "City Explorer",      desc: "Review 10+ distinct categories",         color: "from-sky-400/25 via-blue-400/15 to-cyan-300/20",       border: "border-sky-300/50",     text: "text-sky-300"     },
  { icon: Crown,        label: "Local Legend",       desc: "First to review a new business",         color: "from-violet-400/25 via-purple-400/15 to-fuchsia-300/20", border: "border-violet-300/50", text: "text-violet-300" },
  { icon: ThumbsUp,     label: "Community Pillar",   desc: "100+ helpful votes on your reviews",     color: "from-emerald-400/25 via-teal-300/15 to-green-300/20", border: "border-emerald-300/50", text: "text-emerald-300" },
  { icon: Camera,       label: "Shutterbug",         desc: "Attach photos to 10+ reviews",           color: "from-violet-400/25 via-purple-400/15 to-fuchsia-300/20", border: "border-violet-300/50", text: "text-violet-300" },
  { icon: Repeat,       label: "Loyal Reviewer",     desc: "Review the same business 3+ times",      color: "from-emerald-400/25 via-teal-300/15 to-green-300/20", border: "border-emerald-300/50", text: "text-emerald-300" },
  { icon: Medal,        label: "Hidden Gem Finder",  desc: "Review 5 businesses with <5 reviews",    color: "from-coral/20 via-sage/12 to-coral/10",               border: "border-coral/30",       text: "text-coral"       },
];

// ─── Step card ───────────────────────────────────────────────────────────────
function StepCard({
  step,
  icon: Icon,
  title,
  body,
}: {
  step: string;
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="relative flex flex-col gap-4 bg-white/8 rounded-[16px] p-6 border border-white/10 overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-2xl pointer-events-none" />
      <span className="text-xs font-bold text-white/30 tracking-widest uppercase">{step}</span>
      <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-sage/25 to-coral/15">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed flex-1">{body}</p>
    </div>
  );
}

// ─── Badge pill ───────────────────────────────────────────────────────────────
function BadgeChip({
  icon: Icon,
  label,
  desc,
  color,
  border,
  text,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
  border: string;
  text: string;
}) {
  return (
    <div
      title={desc}
      className={`group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${color} ${border} border px-3 py-2 shadow-sm cursor-default select-none transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-white/40">
        <Icon className={`w-3.5 h-3.5 ${text}`} />
      </div>
      <span className={`text-xs font-bold ${text} whitespace-nowrap leading-tight`}>{label}</span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg bg-charcoal px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-10">
        {desc}
      </span>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-5 bg-white/8 rounded-[16px] border border-white/10 min-w-[130px] flex-1">
      <span className="text-3xl font-extrabold text-white tracking-tight">{value}</span>
      <span className="text-xs font-semibold text-white/50 text-center leading-snug">{label}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AboutPage() {
  return (
    <main
      className="bg-navbar-bg text-white min-h-screen"
      style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
    >

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sage/10 via-transparent to-coral/8" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.12)_0%,_transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.12)_0%,_transparent_55%)]" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 pt-16 pb-20 text-center">
          <div className="mb-8 flex flex-col items-center gap-2">
            <div className="relative h-14 w-14">
              <Image src="/logos/logo.png" alt="Sayso logo" fill className="object-contain drop-shadow" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">sayso</span>
          </div>

          <Reveal>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-coral/25 bg-coral/8 px-4 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-coral" />
              <span className="text-xs font-bold text-coral tracking-wide uppercase">Hyper-local discovery</span>
            </div>
            <h1 className="mt-2 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Your neighbourhood,<br />
              <span className="text-white/60">in your own words.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/65 max-w-2xl mx-auto leading-relaxed">
              Sayso is where real people talk about the businesses, events, and experiences
              that make their corner of the city worth living in.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-navbar-bg shadow-lg hover:bg-white/90 transition-all hover:scale-[1.03] active:scale-95"
              >
                Get started <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/trending"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-6 py-3 text-sm font-bold text-white hover:border-white/40 transition-all hover:scale-[1.02]"
              >
                Browse trending
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-white/8 bg-white/5 py-8">
        <div className="mx-auto max-w-4xl px-4">
          <Reveal>
            <div className="flex flex-wrap justify-center gap-4">
              <StatPill value="100%"  label="Real reviews from real people" />
              <StatPill value="$0"    label="Paid placements or sponsored results" />
              <StatPill value="24/7"  label="Community-driven updates" />
              <StatPill value="Local" label="One city at a time — deeply local" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Why Sayso ── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-20">
        <Reveal>
          <p className="mb-2 text-xs font-bold text-white/45 tracking-widest uppercase">Why Sayso Exists</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-10 leading-tight">
            Local discovery is broken.<br />We&apos;re fixing it.
          </h2>
        </Reveal>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: BadgeCheck,    title: "No algorithms. No ads.",   body: "Every recommendation on Sayso is shaped by your community — not by who paid the most for placement. If it shows up, someone real vouched for it.", delay: 0.05 },
            { icon: MapPin,        title: "Hyper-local by design.",   body: "We don't try to cover everywhere. We go deep — suburb by suburb, block by block — so you get recommendations that actually mean something for where you live.", delay: 0.12 },
            { icon: MessageSquare, title: "Voice that matters.",       body: "Your review can be the first, the one that saves someone a bad night out, or the nudge that helps a small business finally thrive. That's real impact.", delay: 0.19 },
          ].map(({ icon: Icon, title, body, delay }) => (
            <Reveal key={title} delay={delay}>
              <div className="flex flex-col gap-4 bg-white/8 rounded-[16px] p-6 border border-white/10 h-full">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sage/25 to-coral/15">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-white">{title}</h3>
                <p className="text-sm text-white/60 leading-relaxed flex-1">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Hyper-local section ── */}
      <section className="relative overflow-hidden bg-white/4 border-y border-white/8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(157,171,155,0.08)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-20">
          <div className="grid gap-14 lg:grid-cols-2 items-center">
            <Reveal>
              <p className="mb-2 text-xs font-bold text-white/45 tracking-widest uppercase">Neighbourhood intelligence</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-5 leading-tight">
                The coffee shop two streets over.<br />
                <span className="text-white/55">Not the chain five blocks away.</span>
              </h2>
              <p className="text-base text-white/65 leading-relaxed mb-4">
                Most discovery platforms treat your entire city as one undifferentiated blob.
                Sayso is different. We surface the businesses and experiences that matter
                to your specific pocket of the city — your suburb, your streets, your vibe.
              </p>
              <p className="text-base text-white/65 leading-relaxed">
                Every review is geo-tagged. Every recommendation is distance-aware.
                If you live in Fitzroy, you won&apos;t be drowning in results from Doncaster.
                That&apos;s hyper-local done right.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="relative flex flex-col gap-4">
                {[
                  { name: "The Corner Roast",  cat: "Café · 180m away",  rating: "4.8", reviews: "34 reviews" },
                  { name: "Lola's Wine Bar",   cat: "Bar · 400m away",   rating: "4.6", reviews: "21 reviews" },
                  { name: "Night Owl Books",   cat: "Books · 620m away", rating: "5.0", reviews: "12 reviews" },
                ].map((b, i) => (
                  <div
                    key={b.name}
                    className="flex items-center gap-4 bg-white/8 rounded-[14px] p-4 border border-white/10"
                    style={{ transform: `translateX(${i * 10}px)` }}
                  >
                    <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-sage/25 to-coral/15">
                      <MapPin className="w-4 h-4 text-white/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{b.name}</p>
                      <p className="text-xs text-white/50">{b.cat}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold text-white">{b.rating}</span>
                      <span className="text-xs text-white/40 ml-1">{b.reviews}</span>
                    </div>
                  </div>
                ))}
                <div className="absolute -bottom-3 -right-3 grid h-11 w-11 place-items-center rounded-full bg-white/15 border border-white/20 shadow-lg">
                  <Compass className="w-5 h-5 text-white" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Badges section ── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-20">
        <Reveal>
          <p className="mb-2 text-xs font-bold text-white/45 tracking-widest uppercase">Recognition System</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
            Earn badges. Build your rep.
          </h2>
          <p className="text-base text-white/65 leading-relaxed max-w-2xl mb-12">
            Every review you write, every photo you share, every hidden gem you uncover — it all counts.
            Sayso&apos;s badge system rewards the people who make the community worth coming back to.
            Your badges live on your public profile so locals know exactly who they&apos;re hearing from.
          </p>
        </Reveal>

        {/* Badge group cards */}
        <div className="grid gap-5 sm:grid-cols-2 mb-12">
          {[
            { icon: Trophy,  group: "Milestone",  color: "from-amber-400/20 to-orange-300/15",      border: "border-amber-300/40",   iconColor: "text-amber-300",   desc: "Hit review counts, streak records, and community vote thresholds. The more you contribute, the more milestones you unlock.",                              delay: 0.05 },
            { icon: Compass, group: "Explorer",   color: "from-sky-400/20 to-cyan-300/15",          border: "border-sky-300/40",     iconColor: "text-sky-300",     desc: "Venture beyond your usual haunts. Review different suburbs, discover new categories, and become the local who knows every corner of the city.",         delay: 0.10 },
            { icon: Crown,   group: "Specialist", color: "from-violet-400/20 to-fuchsia-300/15",    border: "border-violet-300/40",  iconColor: "text-violet-300",  desc: "Go deep on what you love. Whether it's coffee, live music, or hidden bookshops — specialists earn recognition for category mastery.",                  delay: 0.15 },
            { icon: Heart,   group: "Community",  color: "from-emerald-400/20 to-teal-300/15",      border: "border-emerald-300/40", iconColor: "text-emerald-300", desc: "The glue of Sayso. Community badges go to people whose reviews others find genuinely helpful, loyal regulars, and those who show up consistently.",  delay: 0.20 },
          ].map(({ icon: Icon, group, color, border, iconColor, desc, delay }) => (
            <Reveal key={group} delay={delay}>
              <div className={`flex flex-col gap-3 rounded-[16px] bg-gradient-to-br ${color} ${border} border p-6 h-full`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                  <span className={`text-sm font-bold ${iconColor}`}>{group}</span>
                </div>
                <p className="text-sm text-white/65 leading-relaxed">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Badge chips */}
        <Reveal delay={0.1}>
          <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-4">A few badges you could earn</p>
          <div className="flex flex-wrap gap-2">
            {SHOWCASE_BADGES.map((b) => (
              <BadgeChip key={b.label} icon={b.icon} label={b.label} desc={b.desc} color={b.color} border={b.border} text={b.text} />
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-white/8 bg-white/4 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <p className="mb-2 text-xs font-bold text-white/45 tracking-widest uppercase">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-10 leading-tight">
              Simple as going out and talking about it.
            </h2>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal delay={0.05}><StepCard step="01" icon={Compass}       title="Discover"     body="Browse trending businesses, events, and specials near you — curated by your community, not an algorithm." /></Reveal>
            <Reveal delay={0.10}><StepCard step="02" icon={Star}          title="Experience"   body="Go to that café, catch that event, try that special. Actually live it." /></Reveal>
            <Reveal delay={0.15}><StepCard step="03" icon={MessageSquare} title="Review"       body="Write an honest review. Add photos. Tag your dealbreakers. Your voice helps the next person decide." /></Reveal>
            <Reveal delay={0.20}><StepCard step="04" icon={Trophy}        title="Earn badges"  body="Get recognised for your contributions. Build a profile that shows the community who you are as a local." /></Reveal>
          </div>
        </div>
      </section>

      {/* ── For businesses ── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <Reveal>
            <p className="mb-2 text-xs font-bold text-white/45 tracking-widest uppercase">For business owners</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-5 leading-tight">
              Grow on trust, not on spend.
            </h2>
            <p className="text-base text-white/65 leading-relaxed mb-6">
              Sayso gives local businesses a direct line to the community that matters most —
              the people who live nearby. Claim your profile, add your events and specials,
              and let genuine reviews do the work that no ad budget can replicate.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Free business profiles with real-time analytics",
                "Post events and specials directly to your local audience",
                "See exactly how your community perceives you",
                "Build lasting reputation — not just momentary visibility",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/65">
                  <BadgeCheck className="w-4 h-4 text-white/60 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/claim-business"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-navbar-bg shadow-lg hover:bg-white/90 transition-all hover:scale-[1.02]"
            >
              Claim your business <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="flex flex-col gap-4">
              {[
                { icon: Users,         label: "Real local audience",  body: "Locals who actually live near your business — not bots, not tourists passing through." },
                { icon: Sparkles,      label: "Events & Specials",    body: "Publish your promotions and events directly to people who are already looking for something to do nearby." },
                { icon: MessageSquare, label: "Live feedback",         body: "See reviews as they come in and understand how your community actually experiences your business." },
              ].map(({ icon: Icon, label, body }) => (
                <div key={label} className="flex gap-4 bg-white/8 rounded-[14px] p-5 border border-white/10">
                  <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-sage/25 to-coral/15">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-1">{label}</p>
                    <p className="text-sm text-white/60 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden border-t border-white/8 bg-white/5 py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.08)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <Reveal>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-white/80" />
              <span className="text-xs font-bold text-white/80 tracking-wide uppercase">Join the community</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
              Your neighbourhood deserves<br />better reviews.
            </h2>
            <p className="text-base text-white/70 mb-8 leading-relaxed max-w-xl mx-auto">
              Sign up free. Start exploring. Earn your first badge.
              Be the voice your local businesses have been waiting for.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-navbar-bg shadow-xl hover:bg-white/95 transition-all hover:scale-[1.03] active:scale-95"
              >
                Create your account <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/home"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/15 transition-all hover:scale-[1.02]"
              >
                Explore first
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </main>
  );
}
