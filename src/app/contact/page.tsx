"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MapPin, ArrowRight, Send, ChevronRight, Clock, CheckCircle2, Building2 } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import Footer from "../components/Footer/Footer";

const FONT = "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const CONTACT_REASONS = [
  { value: "general", label: "General enquiry" },
  { value: "business", label: "Business listing / claim" },
  { value: "partnership", label: "Partnership or press" },
  { value: "bug", label: "Bug or technical issue" },
  { value: "feedback", label: "Feedback or suggestion" },
  { value: "other", label: "Something else" },
];

const MESSAGE_MAX = 1000;

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email",
    value: "info@sayso.com",
    href: "mailto:info@sayso.com",
  },
  {
    icon: MapPin,
    label: "Based in",
    value: "Cape Town, South Africa",
    href: null,
  },
  {
    icon: Clock,
    label: "Response time",
    value: "Within 24–48 hours",
    href: null,
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", reason: "general", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [touched, setTouched] = useState({ name: false, email: false, message: false });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "message" && value.length > MESSAGE_MAX) return;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (status !== "idle") setStatus("idle");
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, message: true });
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;

    setStatus("loading");

    const subject = encodeURIComponent(
      `[${CONTACT_REASONS.find((r) => r.value === form.reason)?.label ?? form.reason}] – ${form.name}`
    );
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nReason: ${
        CONTACT_REASONS.find((r) => r.value === form.reason)?.label ?? form.reason
      }\n\n${form.message}`
    );
    window.location.href = `mailto:info@sayso.com?subject=${subject}&body=${body}`;

    setTimeout(() => {
      setStatus("success");
      setForm({ name: "", email: "", reason: "general", message: "" });
      setTouched({ name: false, email: false, message: false });
    }, 400);
  };

  const isNameInvalid = touched.name && !form.name.trim();
  const isEmailInvalid = touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const isMessageInvalid = touched.message && !form.message.trim();
  const canSubmit = form.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && form.message.trim();

  return (
    <div className="min-h-dvh bg-off-white" style={{ fontFamily: FONT }}>

      {/* Breadcrumb */}
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-6 pb-0">
        <nav className="flex items-center gap-2 text-sm text-charcoal/45" aria-label="Breadcrumb">
          <Link href="/home" className="hover:text-charcoal transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-charcoal/80">Contact</span>
        </nav>
      </div>

      {/* Page heading */}
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-8 pb-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal leading-tight tracking-tight mb-1">
          Contact us
        </h1>
        <p className="text-sm sm:text-base text-charcoal/55 max-w-lg leading-relaxed">
          Whether it's a question, partnership idea, or feedback — drop us a line and we'll get back to you promptly.
        </p>
      </div>

      {/* Body */}
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-10 lg:gap-14">

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            {/* Contact cards */}
            <div>
              <h2 className="text-[11px] font-bold tracking-[0.14em] uppercase text-charcoal/40 mb-4">Contact details</h2>
              <ul className="flex flex-col gap-3">
                {CONTACT_INFO.map(({ icon: Icon, label, value, href }) => (
                  <li key={label} className="flex items-start gap-3 p-3.5 rounded-[12px] bg-white border border-charcoal/8 shadow-sm">
                    <div className="mt-0.5 w-9 h-9 rounded-[10px] bg-sage/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-sage" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-charcoal/40 uppercase tracking-wider mb-0.5">{label}</p>
                      {href ? (
                        <Link href={href} className="text-sm font-semibold text-charcoal hover:text-sage transition-colors">
                          {value}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold text-charcoal">{value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Business CTA */}
            <div className="rounded-[14px] bg-navbar-bg/[0.04] border border-navbar-bg/12 p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <Building2 className="w-4.5 h-4.5 text-navbar-bg/70 flex-shrink-0" />
                <p className="text-sm font-bold text-charcoal">List your business</p>
              </div>
              <p className="text-sm text-charcoal/60 leading-relaxed mb-4">
                Want to appear on Sayso and reach customers in your area?
              </p>
              <Link
                href="/claim-business"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-navbar-bg hover:text-navbar-bg/80 transition-colors"
              >
                Claim your listing <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </aside>

          {/* Form */}
          <div>
            <h2 className="text-[11px] font-bold tracking-[0.14em] uppercase text-charcoal/40 mb-6">Send a message</h2>

            <AnimatePresence mode="wait">
              {status === "success" ? (
                <m.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-[16px] border border-sage/25 bg-sage/6 px-6 py-14 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-sage/15 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-sage" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-extrabold text-charcoal mb-2">Message sent!</h3>
                  <p className="text-sm text-charcoal/60 max-w-xs mx-auto mb-7 leading-relaxed">
                    Your email client should have opened with your message pre-filled. We'll get back to you within 24–48 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStatus("idle")}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-navbar-bg text-white text-sm font-semibold hover:bg-navbar-bg/90 transition-colors shadow-sm"
                  >
                    Send another message
                  </button>
                </m.div>
              ) : (
                <m.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-5"
                  noValidate
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="contact-name" className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider">
                        Full name <span className="text-coral normal-case tracking-normal">*</span>
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        value={form.name}
                        onChange={handleChange}
                        onBlur={() => handleBlur("name")}
                        placeholder="Your name"
                        className={`w-full rounded-full border bg-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:ring-2 transition ${
                          isNameInvalid
                            ? "border-coral/50 focus:ring-coral/20 focus:border-coral/50"
                            : "border-charcoal/12 focus:ring-sage/25 focus:border-sage/40"
                        }`}
                      />
                      {isNameInvalid && (
                        <p className="text-xs text-coral font-medium">Please enter your name.</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="contact-email" className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider">
                        Email address <span className="text-coral normal-case tracking-normal">*</span>
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        onBlur={() => handleBlur("email")}
                        placeholder="you@example.com"
                        className={`w-full rounded-full border bg-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:ring-2 transition ${
                          isEmailInvalid
                            ? "border-coral/50 focus:ring-coral/20 focus:border-coral/50"
                            : "border-charcoal/12 focus:ring-sage/25 focus:border-sage/40"
                        }`}
                      />
                      {isEmailInvalid && (
                        <p className="text-xs text-coral font-medium">Please enter a valid email address.</p>
                      )}
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-reason" className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider">
                      How can we help?
                    </label>
                    <select
                      id="contact-reason"
                      name="reason"
                      value={form.reason}
                      onChange={handleChange}
                      className="w-full rounded-full border border-charcoal/12 bg-white px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/25 focus:border-sage/40 transition"
                    >
                      {CONTACT_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Message */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="contact-message" className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider">
                        Message <span className="text-coral normal-case tracking-normal">*</span>
                      </label>
                      <span className={`text-xs tabular-nums ${form.message.length > MESSAGE_MAX * 0.9 ? "text-coral" : "text-charcoal/35"}`}>
                        {form.message.length}/{MESSAGE_MAX}
                      </span>
                    </div>
                    <textarea
                      id="contact-message"
                      name="message"
                      required
                      rows={6}
                      value={form.message}
                      onChange={handleChange}
                      onBlur={() => handleBlur("message")}
                      placeholder="Tell us what's on your mind…"
                      className={`w-full rounded-[10px] border bg-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:ring-2 transition resize-none ${
                        isMessageInvalid
                          ? "border-coral/50 focus:ring-coral/20 focus:border-coral/50"
                          : "border-charcoal/12 focus:ring-sage/25 focus:border-sage/40"
                      }`}
                    />
                    {isMessageInvalid && (
                      <p className="text-xs text-coral font-medium">Please enter a message.</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-4 flex-wrap">
                    <button
                      type="submit"
                      disabled={status === "loading" || !canSubmit}
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-navbar-bg text-white text-sm font-semibold hover:bg-navbar-bg/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                      {status === "loading" ? (
                        <>Opening email client…</>
                      ) : (
                        <>Send message <Send className="w-4 h-4" /></>
                      )}
                    </button>
                    <p className="text-xs text-charcoal/40 leading-relaxed">
                      Clicking send will open your email client with your message pre-filled.
                    </p>
                  </div>
                </m.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
