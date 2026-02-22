"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function TermsOfUsePage() {
  const router = useRouter();

  return (
    <div
      className="min-h-dvh bg-navbar-bg font-urbanist relative overflow-hidden"
      style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 relative z-10">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Terms of Use</h1>
        <p className="text-sm text-white/50 mb-8">Last updated: 28 January 2026</p>

        <div className="prose max-w-none space-y-6 text-base text-white/75 leading-relaxed">
          <p>
            Welcome to Sayso! These Terms of Use (&quot;Terms&quot;) govern your access to and use
            of the Sayso website and services (collectively, the &quot;Platform&quot;). By using the
            Platform, you agree to these Terms. If you do not agree, please do not use Sayso.
          </p>

          <h2 className="text-lg sm:text-xl font-bold text-white pt-4">1. Who Can Use Sayso</h2>
          <ol className="list-decimal pl-6 space-y-1">
            <li>Sayso is intended for users 18 years and older.</li>
            <li>
              Individuals under 18 may use the Platform only under the supervision of a parent or
              legal guardian.
            </li>
            <li>
              By creating an account or using Sayso, you confirm that you meet these requirements
              and that all information you provide is accurate and up to date.
            </li>
          </ol>

          <h2 className="text-lg sm:text-xl font-bold text-white pt-4">2. Accounts</h2>

          <h3 className="text-base sm:text-lg font-semibold text-white/90">2.1 User Accounts</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Users may create accounts to submit reviews, ratings, comments, photos, or videos.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You may not share your account with others.</li>
          </ul>

          <h3 className="text-base sm:text-lg font-semibold text-white/90">2.2 Business Accounts</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Businesses may claim or create profiles on Sayso to manage their listings.</li>
            <li>
              Businesses must provide accurate information and, where requested, verification
              documents to confirm ownership.
            </li>
            <li>Providing false information or impersonating another business is prohibited.</li>
          </ul>

          <h2 className="text-lg sm:text-xl font-bold text-white pt-4">3. Your Content</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              By posting reviews, photos, videos, or other content, you grant Sayso a non-exclusive,
              worldwide, royalty-free license to display, distribute, and use your content on the
              Platform.
            </li>
            <li>
              You retain ownership of your content, but you confirm that it does not infringe on
              anyone else&apos;s rights.
            </li>
            <li>
              You may not post content that is:
              <ul className="list-disc pl-6 mt-1 space-y-1">
                <li>Illegal or unlawful</li>
                <li>Defamatory, obscene, or offensive</li>
                <li>Infringing on intellectual property</li>
                <li>Spam, misleading, or promotional</li>
              </ul>
            </li>
          </ul>
          <p>Sayso reserves the right to remove any content that violates these Terms.</p>

          <h2 className="text-lg sm:text-xl font-bold text-white pt-4">4. Business Listings</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Sayso may display business information sourced from publicly available data.</li>
            <li>Businesses can claim their listing and update or manage their profile.</li>
            <li>Sayso is not responsible for the accuracy of unclaimed business listings.</li>
            <li>
              Businesses are solely responsible for the content they upload, including photos,
              descriptions, and responses to reviews.
            </li>
            <li>
              Sayso may verify businesses through email, phone, registration documents, or other
              means. Verification documents are stored securely and deleted once verification is
              complete.
            </li>
          </ul>

          <h2 className="text-lg sm:text-xl font-bold text-white pt-4">5. User Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use Sayso for unlawful purposes</li>
            <li>Harass, intimidate, or harm other users or businesses</li>
            <li>Attempt to access accounts or data you are not authorised to access</li>
            <li>Interfere with the Platform&apos;s functionality or security</li>
            <li>Submit false or misleading information</li>
          </ul>
          <p>Violations may result in suspension or termination of your account.</p>

          <h2 className="text-lg sm:text-xl font-bold text-white pt-4">6. Intellectual Property</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              The Sayso Platform, including logos, graphics, and software, is owned by Sayso and
              protected by copyright and other intellectual property laws.
            </li>
            <li>
              You may not copy, reproduce, or use Sayso&apos;s content for commercial purposes
              without prior written permission.
            </li>
          </ul>

          <h2 className="text-lg sm:text-xl font-bold text-white pt-4">7. Disclaimers and Limitation of Liability</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Sayso provides the Platform &quot;as is&quot; and does not guarantee that it will be
              error-free or uninterrupted.
            </li>
            <li>
              Sayso is not responsible for user-generated content or the accuracy of business
              listings.
            </li>
            <li>
              To the fullest extent permitted by law, Sayso disclaims liability for any damages
              arising from your use of the Platform.
            </li>
          </ul>

          <h2 className="text-lg sm:text-xl font-bold text-white pt-4">8. Termination</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Sayso may suspend or terminate accounts at its discretion, particularly for breaches
              of these Terms.
            </li>
            <li>
              Users and businesses may delete their accounts, but content already posted may remain
              on the Platform if it is publicly visible.
            </li>
          </ul>

          <h2 className="text-lg sm:text-xl font-bold text-white pt-4">9. Privacy</h2>
          <p>
            Your use of Sayso is also governed by our{" "}
            <Link href="/privacy" className="text-white underline underline-offset-2 hover:text-white/80 font-semibold">
              Privacy Policy
            </Link>
            , which explains how we collect, use, and protect your information.
          </p>

          <h2 className="text-lg sm:text-xl font-bold text-white pt-4">10. Changes to Terms</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Sayso may update these Terms from time to time.</li>
            <li>Any changes will be posted on the Platform with a revised date.</li>
            <li>Continued use of Sayso constitutes acceptance of the updated Terms.</li>
          </ul>

          <h2 className="text-lg sm:text-xl font-bold text-white pt-4">11. Governing Law</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              These Terms are governed by the laws of South Africa, without regard to conflict of
              law principles.
            </li>
            <li>Any disputes will be resolved in the competent courts of South Africa.</li>
          </ul>

          <h2 className="text-lg sm:text-xl font-bold text-white pt-4">12. Contact</h2>
          <p>For questions about these Terms or the Platform, contact:</p>
          <p className="font-semibold text-white/90">
            Sayso<br />
            Email:{" "}
            <a href="mailto:info@sayso.co.za" className="text-white underline underline-offset-2 hover:text-white/80">
              info@sayso.co.za
            </a>
          </p>
          <p>
            By using Sayso, you acknowledge that you have read, understood, and agree to these
            Terms of Use.
          </p>
        </div>
      </div>
    </div>
  );
}
