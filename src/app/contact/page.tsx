"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, ChevronRight, CheckCircle2 } from "lucide-react";
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

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Unknown error");
      }

      setStatus("success");
      setForm({ name: "", email: "", reason: "general", message: "" });
      setTouched({ name: false, email: false, message: false });
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const isNameInvalid = touched.name && !form.name.trim();
  const isEmailInvalid = touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const isMessageInvalid = touched.message && !form.message.trim();
  const canSubmit = form.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && form.message.trim();

  return (
    <div className="min-h-dvh bg-navbar-bg" style={{ fontFamily: FONT }}>

      {/* Breadcrumb */}
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-6 pb-0">
        <nav className="flex items-center gap-2 text-sm text-white/50" aria-label="Breadcrumb">
          <Link href="/home" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">Contact</span>
        </nav>
      </div>

      {/* Page heading */}
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-8 pb-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight">
          Contact us
        </h1>
      </div>

      {/* Body */}
      <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 sm:py-12">
        <AnimatePresence mode="wait">
          {status === "success" ? (
            <m.div
              key="success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[16px] border border-white/20 bg-white/10 px-6 py-14 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-extrabold text-white mb-2">Message sent!</h3>
              <p className="text-sm text-white/70 max-w-xs mx-auto mb-7 leading-relaxed">
                We've received your message and sent you a confirmation. We'll get back to you within 24–48 hours.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-navbar-bg text-sm font-semibold hover:bg-white/90 transition-colors shadow-sm"
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
                  <label htmlFor="contact-name" className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Full name <span className="text-white/40 normal-case tracking-normal">*</span>
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
                    className={`w-full rounded-full border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 transition ${
                      isNameInvalid
                        ? "border-white/40 focus:ring-white/20 focus:border-white/60"
                        : "border-white/20 focus:ring-white/20 focus:border-white/40"
                    }`}
                  />
                  {isNameInvalid && (
                    <p className="text-xs text-white/70 font-medium">Please enter your name.</p>
                  )}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-email" className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Email address <span className="text-white/40 normal-case tracking-normal">*</span>
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
                    className={`w-full rounded-full border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 transition ${
                      isEmailInvalid
                        ? "border-white/40 focus:ring-white/20 focus:border-white/60"
                        : "border-white/20 focus:ring-white/20 focus:border-white/40"
                    }`}
                  />
                  {isEmailInvalid && (
                    <p className="text-xs text-white/70 font-medium">Please enter a valid email address.</p>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-reason" className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  How can we help?
                </label>
                <select
                  id="contact-reason"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 transition"
                >
                  {CONTACT_REASONS.map((r) => (
                    <option key={r.value} value={r.value} className="text-charcoal bg-white">{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="contact-message" className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Message <span className="text-white/40 normal-case tracking-normal">*</span>
                  </label>
                  <span className={`text-xs tabular-nums ${form.message.length > MESSAGE_MAX * 0.9 ? "text-white" : "text-white/35"}`}>
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
                  className={`w-full rounded-[10px] border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 transition resize-none ${
                    isMessageInvalid
                      ? "border-white/40 focus:ring-white/20 focus:border-white/60"
                      : "border-white/20 focus:ring-white/20 focus:border-white/40"
                  }`}
                />
                {isMessageInvalid && (
                  <p className="text-xs text-white/70 font-medium">Please enter a message.</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 gap-4 flex-wrap">
                <button
                  type="submit"
                  disabled={status === "loading" || !canSubmit}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white text-navbar-bg text-sm font-semibold hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {status === "loading" ? (
                    <>Sending…</>
                  ) : (
                    <>Send message <Send className="w-4 h-4" /></>
                  )}
                </button>
                {status === "error" && (
                  <p className="text-xs text-white/70 font-medium">
                    Something went wrong. Please try again or email us directly at info@sayso.com.
                  </p>
                )}
              </div>
            </m.form>
          )}
        </AnimatePresence>
      </section>

      <Footer />
    </div>
  );
}
