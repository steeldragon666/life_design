import type { Metadata } from 'next';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// SEO metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Privacy Policy | Opt In',
  description:
    'How Opt In collects, uses, and protects your personal data — including health, financial, and calendar information.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
};

// ---------------------------------------------------------------------------
// Section heading helpers
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

export default function PrivacyPage() {
  const lastUpdated = '13 March 2026';

  return (
    <main className="relative min-h-screen bg-stone-900 text-white overflow-hidden">

      {/* Atmospheric blobs */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-sage-600/8 blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-violet-700/6 blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">

        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-stone-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back to home
        </Link>

        {/* Header */}
        <header className="mb-10 border-b border-white/10 pb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sage-500">
            Legal
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-stone-500">
            Last updated: {lastUpdated}
          </p>
          <p className="mt-4 text-stone-400 leading-relaxed">
            Your privacy is foundational to what Opt In does. This policy explains
            exactly what data we collect, how we use it, and the rights you have over it.
            We believe in plain language, not legalese — but some sections are marked for
            formal legal review before publication.
          </p>
        </header>

        {/* Table of contents */}
        <nav aria-label="Privacy policy contents" className="mb-10 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Contents</p>
          <ol className="space-y-1.5 text-sm text-sage-500">
            {[
              ['data-collected', '1. Data We Collect'],
              ['data-use', '2. How We Use Your Data'],
              ['third-parties', '3. Third-Party Services'],
              ['apple-health', '4. Apple Health Data'],
              ['retention', '5. Data Retention & Deletion'],
              ['gdpr', '6. GDPR & Your Rights'],
              ['security', '7. Security'],
              ['children', "8. Children's Privacy"],
              ['changes', '9. Changes to This Policy'],
              ['contact', '10. Contact Us'],
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
        {/* 1. Data collected                                                */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="data-collected">1. Data We Collect</SectionHeading>

        <p className="text-stone-400 leading-relaxed">
          We collect only the data necessary to deliver cross-domain life insights.
          You are always in control of which data sources you connect.
        </p>

        <SubHeading>1.1 Account data</SubHeading>
        <ul className="list-disc pl-5 space-y-1 text-sm text-stone-400">
          <li>Email address and hashed password (Supabase Auth)</li>
          <li>Display name and optional profile photo</li>
          <li>Account creation and last-login timestamps</li>
          <li>Subscription tier and billing status</li>
        </ul>

        <SubHeading>1.2 Daily check-in data</SubHeading>
        <ul className="list-disc pl-5 space-y-1 text-sm text-stone-400">
          <li>Mood slider readings (numeric score, 1–10)</li>
          <li>Free-text journal entries (encrypted at rest)</li>
          <li>Voice memos — processed on-device; only derived features (not raw audio) are stored</li>
          <li>Dimension ratings across 8 life areas</li>
        </ul>

        <SubHeading>1.3 Health metrics</SubHeading>
        <ul className="list-disc pl-5 space-y-1 text-sm text-stone-400">
          <li>Apple Health / Google Fit: resting heart rate, HRV, sleep hours, steps, active energy, blood oxygen</li>
          <li>Strava: workout distance, duration, estimated VO2 max, training load</li>
          <li>Diet logs: calorie intake, macros, meal timing (manually entered)</li>
        </ul>

        <SubHeading>1.4 Calendar data</SubHeading>
        <ul className="list-disc pl-5 space-y-1 text-sm text-stone-400">
          <li>Google Calendar: meeting hours, focus block counts, work hours, social events</li>
          <li>
            Event titles and descriptions are{' '}
            <strong className="text-white">not</strong> stored — only derived
            time-allocation features
          </li>
        </ul>

        <SubHeading>1.5 Financial data</SubHeading>
        <ul className="list-disc pl-5 space-y-1 text-sm text-stone-400">
          <li>Manually entered: revenue figures, expense categories, savings rate</li>
          <li>
            We do <strong className="text-white">not</strong> connect to bank accounts
            or read transaction-level data
          </li>
        </ul>

        {/* LEGAL REVIEW NEEDED */}
        {/* Verify data minimisation compliance with GDPR Article 5(1)(c) */}

        {/* ---------------------------------------------------------------- */}
        {/* 2. How we use data                                               */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="data-use">2. How We Use Your Data</SectionHeading>

        <p className="text-stone-400 leading-relaxed">
          Your data is used exclusively to provide the Opt In service to you.
          We will never sell your data to third parties or use it for advertising.
        </p>

        <ul className="mt-4 list-disc pl-5 space-y-2 text-sm text-stone-400">
          <li>
            <strong className="text-white">Pattern analysis.</strong> We compute statistical
            correlations between your life dimensions to surface insights (e.g. &ldquo;your
            sleep is associated with your career output&rdquo;). All insights are hedged with
            confidence intervals and p-values. We never assert causation.
          </li>
          <li>
            <strong className="text-white">AI mentoring.</strong> Your check-in data and feature
            store values are sent to Google Gemini to generate personalised coaching
            responses. Only anonymised, aggregated feature vectors are transmitted — not
            raw journal text unless you explicitly share it in a mentor chat session.
          </li>
          <li>
            <strong className="text-white">Forecasting.</strong> We use historical patterns to
            generate 7-day dimension forecasts. This processing occurs client-side where
            possible using ONNX Runtime Web.
          </li>
          <li>
            <strong className="text-white">Service improvement.</strong> Aggregated, anonymised,
            and differentially private (&#949;=1.0) data may be used to improve our models.
            You can opt out in Settings &rsaquo; Privacy.
          </li>
          <li>
            <strong className="text-white">Notifications.</strong> Check-in reminders and insight
            alerts are delivered via push notifications. You control frequency and content
            in Settings.
          </li>
        </ul>

        {/* ---------------------------------------------------------------- */}
        {/* 3. Third-party services                                          */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="third-parties">3. Third-Party Services</SectionHeading>

        <p className="text-stone-400 leading-relaxed mb-4">
          We work with a small number of trusted providers, each bound by Data Processing
          Agreements (DPAs) consistent with GDPR requirements.
        </p>

        <div className="space-y-4">
          {[
            {
              name: 'Supabase',
              role: 'Database, authentication, and storage',
              detail:
                'All data is stored in Supabase PostgreSQL with AES-256 encryption at rest and TLS 1.3 in transit. Row-level security policies ensure users can only access their own data. Hosted in AWS ap-southeast-2 (Sydney).',
              url: 'https://supabase.com/privacy',
            },
            {
              name: 'Stripe',
              role: 'Payment processing',
              detail:
                "Stripe processes all subscription payments. Opt In never stores raw card data. Stripe is PCI DSS Level 1 certified. Stripe may transfer data internationally under Standard Contractual Clauses.",
              url: 'https://stripe.com/privacy',
            },
            {
              name: 'Google AI (Gemini)',
              role: 'AI mentor responses and insight generation',
              detail:
                "Feature vectors (not raw personal data) are sent to Google Generative AI API. Google's API data usage policy applies. We use the Zero Data Retention option where available.",
              url: 'https://policies.google.com/privacy',
            },
          ].map((provider) => (
            <div
              key={provider.name}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">{provider.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{provider.role}</p>
                </div>
                <a
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-sage-500 underline underline-offset-2 hover:text-sage-400"
                >
                  Privacy policy
                </a>
              </div>
              <p className="mt-3 text-sm text-stone-400 leading-relaxed">{provider.detail}</p>
            </div>
          ))}
        </div>

        {/* LEGAL REVIEW NEEDED */}
        {/* Confirm DPAs are in place for all three providers before launch */}

        {/* ---------------------------------------------------------------- */}
        {/* 4. Apple Health data                                             */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="apple-health">4. Apple Health Data</SectionHeading>

        <p className="text-stone-400 leading-relaxed">
          Opt In requests read-only access to Apple Health data solely to compute
          the health and fitness features listed in Section 1.3. We handle this data
          with particular care:
        </p>

        <ul className="mt-4 list-disc pl-5 space-y-2 text-sm text-stone-400">
          <li>
            <strong className="text-white">On-device processing first.</strong> Raw HealthKit
            data is read and normalised on your device. Only the computed feature values
            (e.g. a numerical sleep quality score) leave the device — not the raw biometric
            readings.
          </li>
          <li>
            <strong className="text-white">User-controlled.</strong> You can disconnect Apple
            Health at any time from Settings &rsaquo; Connections. Disconnecting immediately
            stops all future HealthKit reads.
          </li>
          <li>
            <strong className="text-white">Not shared with advertisers.</strong> Apple Health
            data is never used for advertising, profiling for third-party purposes, or sold.
          </li>
          <li>
            <strong className="text-white">Minimum necessary.</strong> We request only the
            specific HealthKit data types required for active features. We do not
            speculatively request permissions we do not use.
          </li>
        </ul>

        <p className="mt-4 text-sm text-stone-500">
          Opt In complies with Apple&apos;s HealthKit guidelines and App Store Review
          Guidelines Section 5.1.3 (Health &amp; Fitness Apps).
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* 5. Data retention & deletion                                     */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="retention">5. Data Retention &amp; Deletion</SectionHeading>

        <SubHeading>Retention periods</SubHeading>
        <ul className="list-disc pl-5 space-y-1 text-sm text-stone-400">
          <li>Active account data: retained for the lifetime of the account</li>
          <li>Check-in data: retained for up to 7 years to support long-term trend analysis</li>
          <li>Billing records: retained for 7 years as required by Australian tax law</li>
          <li>Anonymised research data: may be retained indefinitely in aggregated form</li>
        </ul>

        <SubHeading>Your right to deletion</SubHeading>
        <p className="text-sm text-stone-400 leading-relaxed">
          You can permanently delete your account and all associated data from
          Settings &rsaquo; Account &rsaquo; Delete Account. This action is irreversible.
          Data is purged from all Supabase tables within 30 days. Anonymised,
          differentially private aggregate records are not individually deletable
          as they contain no personal identifiers.
        </p>

        <SubHeading>Data export</SubHeading>
        <p className="text-sm text-stone-400 leading-relaxed">
          All subscribers can export their data as JSON or CSV at any time from
          Settings &rsaquo; Data &rsaquo; Export. Exports include all check-ins,
          feature store values, mentor chat history, and dimension scores.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* 6. GDPR                                                          */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="gdpr">6. GDPR &amp; Your Rights</SectionHeading>

        {/* LEGAL REVIEW NEEDED */}
        {/* Confirm legal basis for each processing activity under GDPR Article 6 */}
        {/* Verify adequacy decisions or SCCs for transfers outside EEA */}

        <p className="text-stone-400 leading-relaxed">
          If you are located in the European Economic Area (EEA), United Kingdom, or
          Switzerland, GDPR (and UK GDPR / Swiss DPA respectively) grants you the
          following rights regarding your personal data:
        </p>

        <ul className="mt-4 list-disc pl-5 space-y-2 text-sm text-stone-400">
          <li>
            <strong className="text-white">Right of access.</strong> Request a copy of all
            personal data we hold about you.
          </li>
          <li>
            <strong className="text-white">Right to rectification.</strong> Correct inaccurate
            or incomplete data.
          </li>
          <li>
            <strong className="text-white">Right to erasure (&ldquo;right to be forgotten&rdquo;).</strong>{' '}
            Request deletion of your personal data (subject to legal retention obligations).
          </li>
          <li>
            <strong className="text-white">Right to restriction of processing.</strong> Ask us
            to pause processing while you contest accuracy or legitimacy.
          </li>
          <li>
            <strong className="text-white">Right to data portability.</strong> Receive your data
            in a structured, machine-readable format.
          </li>
          <li>
            <strong className="text-white">Right to object.</strong> Object to processing based
            on legitimate interests or for direct marketing.
          </li>
          <li>
            <strong className="text-white">Rights related to automated decision-making.</strong>{' '}
            We do not make automated decisions that produce significant legal effects on you.
          </li>
        </ul>

        <p className="mt-4 text-sm text-stone-400">
          To exercise any of these rights, email{' '}
          <a href="mailto:privacy@lifedesign.app" className="text-sage-500 hover:underline">
            privacy@lifedesign.app
          </a>{' '}
          with the subject line &ldquo;Data Rights Request&rdquo;. We will respond within
          30 days. If you are unsatisfied with our response, you have the right to lodge a
          complaint with your local supervisory authority.
        </p>

        <p className="mt-3 text-sm text-stone-400">
          Our lawful bases for processing under GDPR Article 6 are:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-stone-400">
          <li>Contract (Art. 6(1)(b)): to provide the subscribed service</li>
          <li>Legitimate interests (Art. 6(1)(f)): service improvement and fraud prevention</li>
          <li>Consent (Art. 6(1)(a)): optional features such as anonymised research sharing</li>
          <li>Legal obligation (Art. 6(1)(c)): billing record retention</li>
        </ul>

        {/* ---------------------------------------------------------------- */}
        {/* 7. Security                                                      */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="security">7. Security</SectionHeading>

        <ul className="list-disc pl-5 space-y-1 text-sm text-stone-400">
          <li>All data in transit encrypted with TLS 1.3</li>
          <li>All data at rest encrypted with AES-256 (Supabase managed keys)</li>
          <li>Row-level security on every database table</li>
          <li>Voice analysis processed on-device — raw audio never leaves your phone</li>
          <li>Passwords are hashed with bcrypt (Supabase Auth)</li>
          <li>We undergo periodic security reviews</li>
        </ul>

        <p className="mt-4 text-sm text-stone-400">
          To report a security vulnerability, please email{' '}
          <a href="mailto:security@lifedesign.app" className="text-sage-500 hover:underline">
            security@lifedesign.app
          </a>. Please do not disclose vulnerabilities publicly until we have had a
          reasonable opportunity to investigate and remediate.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* 8. Children                                                      */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="children">8. Children&apos;s Privacy</SectionHeading>

        <p className="text-stone-400 leading-relaxed">
          Opt In is not directed at children under 16 years of age (or the relevant
          age of digital consent in your jurisdiction). We do not knowingly collect
          personal data from children. If you believe a child has provided us with their
          data, please contact us and we will delete it promptly.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* 9. Changes                                                       */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="changes">9. Changes to This Policy</SectionHeading>

        <p className="text-stone-400 leading-relaxed">
          We may update this policy from time to time. Material changes will be announced
          by email to registered users at least 30 days before they take effect. Continued
          use of the service after the effective date constitutes acceptance of the revised
          policy.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* 10. Contact                                                      */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="contact">10. Contact Us</SectionHeading>

        {/* LEGAL REVIEW NEEDED */}
        {/* Insert registered company name, ABN, and registered office address */}

        <p className="text-stone-400 leading-relaxed">
          For all privacy matters:
        </p>
        <address className="mt-3 not-italic text-sm text-stone-400 space-y-1">
          <p className="font-semibold text-white">Opt In</p>
          <p>[Registered company name and address — to be completed]</p>
          <p>
            Email:{' '}
            <a href="mailto:privacy@lifedesign.app" className="text-sage-500 hover:underline">
              privacy@lifedesign.app
            </a>
          </p>
        </address>

        {/* Bottom nav */}
        <div className="mt-16 border-t border-white/10 pt-8 flex flex-wrap gap-4 text-xs text-stone-600">
          <Link href="/terms" className="hover:text-stone-400 transition-colors">
            Terms of Service
          </Link>
          <Link href="/pricing" className="hover:text-stone-400 transition-colors">
            Pricing
          </Link>
          <Link href="/" className="hover:text-stone-400 transition-colors">
            Home
          </Link>
        </div>

      </div>
    </main>
  );
}
