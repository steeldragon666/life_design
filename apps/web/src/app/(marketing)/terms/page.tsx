import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// ---------------------------------------------------------------------------
// SEO metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Terms of Service | Opt In',
  description:
    'Terms and conditions for using Opt In — subscriptions, cancellations, data ownership, and acceptable use.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-12 mb-4 text-xl font-bold tracking-tight text-white scroll-mt-8"
    >
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 text-base font-semibold text-stone-200">
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TermsPage() {
  const lastUpdated = '13 March 2026';

  return (
    <main className="relative min-h-screen bg-stone-900 text-white overflow-hidden">

      {/* Atmospheric blobs */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-sage-600/8 blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[400px] rounded-full bg-violet-700/6 blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">

        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-stone-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>

        {/* Header */}
        <header className="mb-10 border-b border-white/10 pb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sage-500">
            Legal
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-stone-500">
            Last updated: {lastUpdated}
          </p>
          <p className="mt-4 text-stone-400 leading-relaxed">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Opt In
            (&ldquo;Service&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;). By creating an account or using the Service
            you agree to these Terms. Please read them carefully.
          </p>
          {/* LEGAL REVIEW NEEDED */}
          {/* Insert registered company legal name and jurisdiction */}
        </header>

        {/* Table of contents */}
        <nav aria-label="Terms of service contents" className="mb-10 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Contents</p>
          <ol className="space-y-1.5 text-sm text-sage-500">
            {[
              ['eligibility', '1. Eligibility'],
              ['subscriptions', '2. Subscription Plans & Pricing'],
              ['trial', '3. Free Trial'],
              ['billing', '4. Billing & Payment'],
              ['cancellation', '5. Cancellation Policy'],
              ['data-ownership', '6. Data Ownership'],
              ['acceptable-use', '7. Acceptable Use'],
              ['intellectual-property', '8. Intellectual Property'],
              ['disclaimers', '9. Disclaimers & Liability Limitations'],
              ['indemnification', '10. Indemnification'],
              ['termination', '11. Termination'],
              ['governing-law', '12. Governing Law'],
              ['changes', '13. Changes to These Terms'],
              ['contact', '14. Contact'],
            ].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="transition-colors hover:text-sage-400">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ---------------------------------------------------------------- */}
        {/* 1. Eligibility                                                   */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="eligibility">1. Eligibility</SectionHeading>

        <p className="text-stone-400 leading-relaxed">
          You must be at least 16 years old (or the age of digital consent in your
          jurisdiction, whichever is higher) to use Opt In. By using the Service
          you represent that you meet this requirement. We reserve the right to
          terminate accounts where we have reason to believe this requirement is not met.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* 2. Subscription plans                                            */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="subscriptions">2. Subscription Plans &amp; Pricing</SectionHeading>

        <p className="text-stone-400 leading-relaxed mb-4">
          Opt In is offered on the following plans. All prices are in USD and
          exclusive of any applicable taxes.
        </p>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="py-3 pl-5 pr-4 text-left font-semibold text-stone-300">Plan</th>
                <th className="px-4 py-3 text-left font-semibold text-stone-300">Price</th>
                <th className="py-3 pl-4 pr-5 text-left font-semibold text-stone-300">Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                ['Monthly', '$9.99', 'Billed monthly, renews automatically'],
                ['Annual', '$99.00', 'Billed annually (~$8.25/mo), renews automatically'],
                ['Lifetime', '$249.00', 'One-time payment, no recurring charges'],
              ].map(([plan, price, billing]) => (
                <tr key={plan} className="hover:bg-white/[0.02]">
                  <td className="py-3 pl-5 pr-4 font-medium text-white">{plan}</td>
                  <td className="px-4 py-3 text-stone-300">{price}</td>
                  <td className="py-3 pl-4 pr-5 text-stone-400">{billing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-stone-400">
          We reserve the right to change pricing with at least 30 days&apos; notice to
          existing subscribers. Price changes do not apply until your next renewal date.
        </p>

        {/* LEGAL REVIEW NEEDED */}
        {/* Confirm GST / VAT treatment for Australian and international customers */}

        {/* ---------------------------------------------------------------- */}
        {/* 3. Free trial                                                    */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="trial">3. Free Trial</SectionHeading>

        <p className="text-stone-400 leading-relaxed">
          New users receive a <strong className="text-white">7-day free trial</strong> with
          full access to all features on the plan selected at sign-up. At the end of the
          trial, your chosen plan begins automatically and your payment method will be
          charged.
        </p>
        <ul className="mt-4 list-disc pl-5 space-y-1 text-sm text-stone-400">
          <li>We send a reminder email 24 hours before your trial ends</li>
          <li>You can cancel any time before the trial ends without being charged</li>
          <li>Each email address is eligible for one free trial only</li>
          <li>We reserve the right to suspend trial access in cases of suspected abuse</li>
        </ul>

        {/* ---------------------------------------------------------------- */}
        {/* 4. Billing                                                       */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="billing">4. Billing &amp; Payment</SectionHeading>

        <SubHeading>Payment processing</SubHeading>
        <p className="text-sm text-stone-400 leading-relaxed">
          All payments are processed by Stripe, Inc. By subscribing you agree to
          Stripe&apos;s{' '}
          <a
            href="https://stripe.com/legal/ssa"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sage-500 hover:underline"
          >
            Services Agreement
          </a>. We accept major credit/debit cards, Apple Pay, and Google Pay.
        </p>

        <SubHeading>Failed payments</SubHeading>
        <p className="text-sm text-stone-400 leading-relaxed">
          If a payment fails, we will retry up to 3 times over 7 days. If payment
          remains unsuccessful, access to paid features will be suspended until
          payment is resolved. Your data is retained for 90 days after suspension.
        </p>

        <SubHeading>Refunds</SubHeading>
        <p className="text-sm text-stone-400 leading-relaxed">
          Monthly subscriptions are non-refundable once charged. Annual subscribers
          may request a pro-rated refund within 30 days of their annual renewal by
          contacting support. Lifetime purchases are non-refundable.
          Nothing in this clause affects your statutory rights under applicable consumer law.
        </p>

        {/* LEGAL REVIEW NEEDED */}
        {/* Verify Australian Consumer Law (ACL) compliance — automatic renewal and refund obligations */}

        {/* ---------------------------------------------------------------- */}
        {/* 5. Cancellation                                                  */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="cancellation">5. Cancellation Policy</SectionHeading>

        <p className="text-stone-400 leading-relaxed">
          You may cancel your subscription at any time from
          Settings &rsaquo; Account &rsaquo; Subscription.
        </p>
        <ul className="mt-4 list-disc pl-5 space-y-2 text-sm text-stone-400">
          <li>
            <strong className="text-white">Monthly plan.</strong> Access continues until the end of the current
            billing period. No further charges will be made.
          </li>
          <li>
            <strong className="text-white">Annual plan.</strong> Access continues until the end of the annual
            period. A pro-rated refund is available within 30 days of the annual
            renewal date.
          </li>
          <li>
            <strong className="text-white">Lifetime plan.</strong> No cancellation required; access is permanent.
          </li>
        </ul>

        <p className="mt-4 text-sm text-stone-400">
          Cancellation does not delete your data. To delete your account and data,
          use Settings &rsaquo; Account &rsaquo; Delete Account.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* 6. Data ownership                                                */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="data-ownership">6. Data Ownership</SectionHeading>

        <p className="text-stone-400 leading-relaxed">
          <strong className="text-white">You own your data.</strong> All check-ins, health metrics, journal entries,
          and other personal data you create in Opt In remain yours. We do not
          claim any ownership rights over your data.
        </p>
        <ul className="mt-4 list-disc pl-5 space-y-2 text-sm text-stone-400">
          <li>
            You grant Opt In a limited, non-exclusive, revocable licence to
            process your data for the sole purpose of providing the Service to you.
          </li>
          <li>
            You may export all your data at any time in JSON or CSV format.
          </li>
          <li>
            Upon account deletion, all personally identifiable data is deleted within
            30 days (see our Privacy Policy for details).
          </li>
          <li>
            Anonymised, differentially private aggregate data derived from your data
            may be retained for research and service improvement.
          </li>
        </ul>

        {/* ---------------------------------------------------------------- */}
        {/* 7. Acceptable use                                                */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="acceptable-use">7. Acceptable Use</SectionHeading>

        <p className="text-stone-400 leading-relaxed mb-3">
          You agree not to use Opt In to:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-stone-400">
          <li>Violate any applicable law or regulation</li>
          <li>Infringe the intellectual property rights of others</li>
          <li>Transmit malware, spam, or other malicious content</li>
          <li>Attempt to reverse-engineer, decompile, or circumvent security measures</li>
          <li>Scrape, harvest, or systematically extract data from the Service</li>
          <li>Create multiple accounts to abuse the free trial</li>
          <li>
            Share your account credentials with others (each account is for a single user)
          </li>
          <li>
            Impersonate any person or entity, or misrepresent your affiliation with any person
          </li>
        </ul>

        <p className="mt-4 text-sm text-stone-400">
          Violation of this section may result in immediate account suspension or termination
          without refund.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* 8. Intellectual property                                         */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="intellectual-property">8. Intellectual Property</SectionHeading>

        <p className="text-stone-400 leading-relaxed">
          The Opt In application, website, algorithms, branding, and content
          (excluding user-generated data) are owned by or licensed to Opt In and
          protected by applicable intellectual property laws. You may not reproduce,
          distribute, or create derivative works without our express written permission.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* 9. Disclaimers & liability                                       */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="disclaimers">9. Disclaimers &amp; Liability Limitations</SectionHeading>

        {/* LEGAL REVIEW NEEDED */}
        {/* Review limitation of liability cap and disclaimer language for AU jurisdiction */}

        <SubHeading>Not medical or financial advice</SubHeading>
        <p className="text-sm text-stone-400 leading-relaxed">
          Opt In provides data analysis, pattern recognition, and AI-generated
          insights for informational and personal development purposes only.
          Nothing in the Service constitutes medical, psychological, financial,
          legal, or professional advice. Always consult a qualified professional
          before making decisions affecting your health or finances.
        </p>

        <SubHeading>Accuracy of insights</SubHeading>
        <p className="text-sm text-stone-400 leading-relaxed">
          Statistical correlations and AI insights are probabilistic in nature.
          We present confidence intervals and p-values to indicate reliability, but
          all insights should be treated as informational starting points, not
          definitive conclusions. We do not warrant that insights will be accurate
          or applicable to your individual circumstances.
        </p>

        <SubHeading>Limitation of liability</SubHeading>
        <p className="text-sm text-stone-400 leading-relaxed">
          To the maximum extent permitted by applicable law, Opt In shall not
          be liable for any indirect, incidental, special, consequential, or punitive
          damages, or loss of profits, data, or goodwill. Our total cumulative
          liability to you for claims arising under these Terms shall not exceed the
          greater of (a) the total fees paid by you in the 12 months preceding the
          claim or (b) USD $100.
        </p>

        <p className="mt-3 text-sm text-stone-500">
          Some jurisdictions do not allow the exclusion of certain warranties or
          limitation of liability. In such cases, our liability is limited to the
          minimum extent permitted by law.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* 10. Indemnification                                              */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="indemnification">10. Indemnification</SectionHeading>

        <p className="text-stone-400 leading-relaxed">
          You agree to indemnify and hold harmless Opt In and its officers,
          employees, and agents from any claims, damages, losses, and expenses
          (including reasonable legal fees) arising from your use of the Service
          in breach of these Terms, or from your violation of any law or the rights
          of a third party.
        </p>

        {/* LEGAL REVIEW NEEDED */}
        {/* Confirm enforceability of indemnification clause under Australian law */}

        {/* ---------------------------------------------------------------- */}
        {/* 11. Termination                                                  */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="termination">11. Termination</SectionHeading>

        <p className="text-stone-400 leading-relaxed">
          We may suspend or terminate your account immediately if you breach these
          Terms, engage in fraudulent activity, or if we are required to do so by law.
          Upon termination, your right to access the Service ceases. We will make
          your data available for export for 30 days post-termination, after which
          it will be deleted.
        </p>

        <p className="mt-3 text-sm text-stone-400">
          You may terminate your account at any time via Settings &rsaquo;
          Account &rsaquo; Delete Account.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* 12. Governing law                                                */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="governing-law">12. Governing Law</SectionHeading>

        {/* LEGAL REVIEW NEEDED */}
        {/* Confirm jurisdiction — insert state (e.g. "New South Wales, Australia") */}

        <p className="text-stone-400 leading-relaxed">
          These Terms are governed by the laws of [Jurisdiction — to be confirmed].
          Any disputes will be subject to the exclusive jurisdiction of the courts of
          that jurisdiction, except where prohibited by applicable consumer protection laws.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* 13. Changes to terms                                             */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="changes">13. Changes to These Terms</SectionHeading>

        <p className="text-stone-400 leading-relaxed">
          We may update these Terms from time to time. We will notify you of material
          changes by email and by posting a prominent notice in the app at least 30 days
          before the changes take effect. Continued use of the Service after the
          effective date constitutes your acceptance of the revised Terms.
          If you do not agree to the revised Terms, you must stop using the Service.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* 14. Contact                                                      */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="contact">14. Contact</SectionHeading>

        {/* LEGAL REVIEW NEEDED */}
        {/* Insert registered company name, ABN, and registered address */}

        <address className="not-italic text-sm text-stone-400 space-y-1">
          <p className="font-semibold text-white">Opt In</p>
          <p>[Registered company name and address — to be completed]</p>
          <p>
            Email:{' '}
            <a href="mailto:legal@lifedesign.app" className="text-sage-500 hover:underline">
              legal@lifedesign.app
            </a>
          </p>
        </address>

        {/* Bottom nav */}
        <div className="mt-16 border-t border-white/10 pt-8 flex flex-wrap gap-4 text-xs text-stone-600">
          <Link href="/privacy" className="hover:text-stone-400 transition-colors">Privacy Policy</Link>
          <Link href="/pricing" className="hover:text-stone-400 transition-colors">Pricing</Link>
          <Link href="/" className="hover:text-stone-400 transition-colors">Home</Link>
        </div>

      </div>
    </main>
  );
}
