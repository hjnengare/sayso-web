"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div
      className="min-h-dvh bg-off-white font-urbanist"
      style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm text-charcoal/60 hover:text-charcoal transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal mb-2">Privacy Policy</h1>
        <p className="text-sm text-charcoal/60 mb-8">Last updated: 28 January 2026</p>

        <div className="prose prose-charcoal max-w-none space-y-6 text-base text-charcoal/80 leading-relaxed">
          <p>
            Sayso respects your privacy and is committed to protecting personal information in
            accordance with the Protection of Personal Information Act, 4 of 2013 (POPIA) and other
            applicable South African laws.
          </p>
          <p>This Privacy Policy applies to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Visitors to the Sayso website</li>
            <li>Individuals who create user accounts</li>
            <li>Businesses that claim or manage business profiles on Sayso</li>
          </ul>
          <p>
            We recommend reading this policy carefully to understand how we collect, use, store, and
            protect your information.
          </p>

          <h2 className="text-lg sm:text-xl font-bold text-charcoal pt-4">1. About Sayso</h2>
          <p>
            Sayso is a South African business discovery and review platform. During certain stages
            of development, Sayso may display business listings sourced from publicly available
            information. Businesses may claim their profiles to manage and personalise their
            listings.
          </p>

          <h2 className="text-lg sm:text-xl font-bold text-charcoal pt-4">2. Information We Collect</h2>

          <h3 className="text-base sm:text-lg font-semibold text-charcoal">2.1 Information from Website Visitors</h3>
          <p>
            When you visit the Sayso website, we may automatically collect limited technical
            information, including:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>IP address</li>
            <li>Browser type and version</li>
            <li>Device information</li>
            <li>Pages visited and interaction data</li>
          </ul>
          <p>This information is used for security, analytics, and to improve our website.</p>

          <h3 className="text-base sm:text-lg font-semibold text-charcoal">2.2 Information from Users</h3>
          <p>When you create an account, we may collect:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Name or display name</li>
            <li>Email address</li>
            <li>Account login credentials</li>
            <li>Reviews, ratings, comments, or other content you choose to submit</li>
            <li>Photos or videos you upload to the platform</li>
          </ul>
          <p>
            Any photos or videos uploaded by users may be publicly visible on business profiles or
            review pages. Providing this information will be voluntary, but required to access
            certain features.
          </p>

          <h3 className="text-base sm:text-lg font-semibold text-charcoal">2.3 Information from Businesses</h3>
          <p>
            If you claim, create, or manage a business profile on Sayso, we may collect:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Business name</li>
            <li>Business contact details (such as email address or phone number)</li>
            <li>Business address and location</li>
            <li>Business category and description</li>
            <li>Photos or videos you upload</li>
            <li>Verification-related or ownership information (where applicable)</li>
          </ul>
          <p>
            This information is used solely for operating and maintaining the Sayso platform.
          </p>

          <h3 className="text-base sm:text-lg font-semibold text-charcoal">2.4 Publicly Available Business Information</h3>
          <p>Prior to a business claiming its profile, Sayso may display:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Business name</li>
            <li>Location or address</li>
            <li>Business category</li>
            <li>Short, factual descriptions sourced from publicly available data or third-party APIs</li>
          </ul>
          <p>
            This information does not constitute endorsement by the business and may be updated or
            removed upon request.
          </p>

          <h2 className="text-lg sm:text-xl font-bold text-charcoal pt-4">3. How We Use Information</h2>
          <p>We use personal and business-related information to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Operate and improve the Sayso platform</li>
            <li>Enable business profile creation, claiming, and management</li>
            <li>Display business listings and user-generated content</li>
            <li>Communicate with users and businesses</li>
            <li>Conduct business verification and prevent fraud or misuse</li>
            <li>Respond to enquiries or support requests</li>
            <li>Ensure platform security</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>We do not sell personal information to third parties.</p>

          <h2 className="text-lg sm:text-xl font-bold text-charcoal pt-4">4. Legal Basis for Processing</h2>
          <p>We process personal information on the basis of:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Consent (where required)</li>
            <li>Legitimate business interests</li>
            <li>Performance of a contract or service</li>
            <li>Compliance with legal obligations</li>
          </ul>

          <h2 className="text-lg sm:text-xl font-bold text-charcoal pt-4">5. Sharing of Information</h2>
          <p>We may share information with:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Service providers who assist in operating the platform (such as hosting, analytics,
              or verification services)
            </li>
            <li>Authorities where required by law</li>
          </ul>
          <p>
            User-uploaded reviews, photos, videos, and business profile information may be publicly
            visible on the Sayso platform. All third parties are required to protect information in
            line with applicable data protection laws.
          </p>

          <h2 className="text-lg sm:text-xl font-bold text-charcoal pt-4">6. Cookies and Tracking Technologies</h2>
          <p>Sayso may use cookies or similar technologies to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Improve user experience</li>
            <li>Analyse site usage</li>
            <li>Maintain security</li>
          </ul>
          <p>
            You may disable cookies through your browser settings, although some features may not
            function correctly.
          </p>

          <h2 className="text-lg sm:text-xl font-bold text-charcoal pt-4">7. Data Retention</h2>
          <p>
            We retain personal and business information only for as long as necessary to:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fulfil the purposes outlined in this policy</li>
            <li>Operate the Sayso platform</li>
            <li>Meet legal, accounting, or regulatory requirements</li>
          </ul>
          <p>Verification-related documents, where exceptionally required, are:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Accessible only to authorised administrators</li>
            <li>Used solely for verification purposes</li>
            <li>Deleted within 30 days or once verification is completed, whichever occurs first</li>
          </ul>
          <p>After deletion, we retain only:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Confirmation that a business has been verified</li>
            <li>The verification method used (email, phone, company registration, or manual verification)</li>
            <li>The date of verification</li>
          </ul>
          <p>No verification documents or unnecessary personal information are retained.</p>

          <h2 className="text-lg sm:text-xl font-bold text-charcoal pt-4">8. Your Rights</h2>
          <p>Under POPIA, you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Request access to your personal information</li>
            <li>Request correction or deletion of inaccurate information</li>
            <li>Object to processing in certain circumstances</li>
            <li>Withdraw consent where applicable</li>
          </ul>
          <p>
            Businesses may also request updates or removal of unclaimed listings.
          </p>

          <h2 className="text-lg sm:text-xl font-bold text-charcoal pt-4">9. Security</h2>
          <p>
            We take reasonable technical and organisational measures to protect personal information,
            uploaded content, and verification materials against loss, misuse, unauthorised access,
            or disclosure. Verification documents, where used, are stored securely and access is
            strictly limited to authorised personnel.
          </p>

          <h2 className="text-lg sm:text-xl font-bold text-charcoal pt-4">10. Children&apos;s Information</h2>
          <p>
            Sayso is not intended for use by children under the age of 18. We do not knowingly
            collect personal information from minors.
          </p>

          <h2 className="text-lg sm:text-xl font-bold text-charcoal pt-4">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be posted on this
            page with an updated revision date.
          </p>

          <h2 className="text-lg sm:text-xl font-bold text-charcoal pt-4">12. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or wish to exercise your rights, please
            contact:
          </p>
          <p className="font-semibold">
            Sayso<br />
            Email:{" "}
            <a href="mailto:info@sayso.co.za" className="text-coral hover:underline">
              info@sayso.co.za
            </a>
          </p>
          <p>
            By using the Sayso website, you acknowledge that you have read and understood this
            Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
