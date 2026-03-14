import type { Metadata } from 'next';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// SEO metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Life Design — Your entire life, intelligently connected',
  description:
    'Discover hidden patterns across health, career, relationships and growth. AI-powered insights built on real statistics, not vague affirmations.',
  alternates: { canonical: '/' },
};

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function IconCrossLink() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const PROBLEM_CARDS = [
  {
    app: 'Health app',
    metric: '7h 23m sleep',
    label: 'You tracked your sleep perfectly',
    key: 'health',
  },
  {
    app: 'Finance app',
    metric: '-$340 this week',
    label: 'You noticed spending crept up',
    key: 'finance',
  },
  {
    app: 'Goals app',
    metric: '2 / 8 goals',
    label: 'Progress stalled — but why?',
    key: 'growth',
  },
];

const FEATURES = [
  {
    key: 'cross-domain',
    icon: <IconCrossLink />,
    title: 'Cross-domain insights',
    body: 'Discover how your sleep quality correlates with career output, or how financial stress shows up in your health metrics. Patterns you could never see in isolated apps.',
  },
  {
    key: 'ai-mentor',
    icon: <IconBrain />,
    title: 'AI mentor',
    body: 'A personalised guide that blends therapist empathy, coaching accountability, and philosophical wisdom — adapting its voice to exactly what you need right now.',
  },
  {
    key: 'evidence',
    icon: <IconChart />,
    title: 'Evidence-based',
    body: 'Every insight is backed by statistical significance testing. Correlation coefficients, p-values, and sample sizes — real data science, not vague positive affirmations.',
  },
];

const DIMENSIONS = [
  'Career', 'Finance', 'Health', 'Fitness',
  'Family', 'Social', 'Romance', 'Growth',
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MarketingLandingPage() {
  return (
    <main className="relative min-h-screen bg-[#0f0a1a] text-white overflow-hidden">

      {/* Atmospheric background blobs */}
      <div
        className="pointer-events-none absolute -top-60 left-1/2 -translate-x-1/2 h-[700px] w-[1000px] rounded-full bg-indigo-600/10 blur-[160px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 -left-60 h-[500px] w-[500px] rounded-full bg-violet-700/8 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-2/3 -right-60 h-[500px] w-[500px] rounded-full bg-indigo-500/8 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-violet-600/6 blur-[140px]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* ---------------------------------------------------------------- */}
        {/* Nav bar                                                          */}
        {/* ---------------------------------------------------------------- */}
        <nav className="flex items-center justify-between py-6" aria-label="Main navigation">
          <span className="text-sm font-bold tracking-tight text-white">
            Life Design
          </span>
          <div className="flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-500"
            >
              Get started
            </Link>
          </div>
        </nav>

        {/* ---------------------------------------------------------------- */}
        {/* 1. Hero section                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section className="pb-24 pt-20 text-center" aria-labelledby="hero-heading">
          {/* Eyeline badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Now in early access
            </span>
          </div>

          <h1
            id="hero-heading"
            className="mx-auto max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl"
          >
            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Your entire life,
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              intelligently connected.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            Health, career, relationships, finances — all in one place.
            Life Design finds the hidden patterns connecting every dimension
            of your life and turns them into actions you can actually take.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Start Your Free Trial
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-white/20 px-8 py-3.5 text-base font-semibold text-slate-300 transition-all hover:border-white/40 hover:text-white"
            >
              View pricing
            </Link>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            7-day free trial. No credit card required.
          </p>

          {/* Dimension pills */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
            {DIMENSIONS.map((dim) => (
              <span
                key={dim}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-medium text-slate-400"
              >
                {dim}
              </span>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 2. Problem statement                                             */}
        {/* ---------------------------------------------------------------- */}
        <section className="mb-24" aria-labelledby="problem-heading">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2
              id="problem-heading"
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              You track everything.
              <br />
              <span className="text-slate-400">But the picture is still fragmented.</span>
            </h2>
            <p className="mt-4 text-slate-400">
              You track your health in one app, finances in another, goals in a third —
              and none of them talk to each other. You have data, but you lack insight.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PROBLEM_CARDS.map((card) => (
              <div
                key={card.key}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm"
              >
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-600">
                  {card.app}
                </p>
                <p className="mb-2 text-2xl font-bold text-white">{card.metric}</p>
                <p className="text-sm text-slate-500">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Divider label */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-800" />
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-500">
              None of these apps see the full picture
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-800" />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 3. Solution                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="mb-24" aria-labelledby="solution-heading">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
              The solution
            </p>
            <h2
              id="solution-heading"
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Life Design connects everything.
            </h2>
            <p className="mt-4 text-slate-400">
              One platform that synthesises all 8 dimensions of your life
              and surfaces the insights that actually move the needle.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.key}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm transition-all hover:border-indigo-500/30 hover:bg-white/[0.06]"
              >
                {/* Icon */}
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20 transition-colors group-hover:bg-indigo-500/15">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 4. Social proof                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section className="mb-24 text-center" aria-labelledby="social-proof-heading">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-12 backdrop-blur-sm">
            {/* Placeholder avatar stack */}
            <div className="mb-4 flex items-center justify-center -space-x-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-full border-2 border-[#0f0a1a] bg-gradient-to-br from-indigo-400 to-violet-500"
                  aria-hidden="true"
                />
              ))}
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0f0a1a] bg-slate-800 text-xs font-semibold text-slate-300"
                aria-hidden="true"
              >
                +1k
              </div>
            </div>

            <h2
              id="social-proof-heading"
              className="text-2xl font-bold text-white"
            >
              Join 1,000+ early adopters
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
              People building a life they designed — not one that happened by default.
            </p>

            {/* Placeholder testimonial */}
            <blockquote className="mx-auto mt-8 max-w-xl">
              <p className="text-base italic text-slate-300 leading-relaxed">
                &ldquo;I realised my worst financial weeks always followed my worst sleep weeks.
                Life Design made that connection in three days. Took me three years to notice it myself.&rdquo;
              </p>
              <footer className="mt-3 text-sm text-slate-500">
                — Early access member, Sydney AU
              </footer>
            </blockquote>

            {/* Star rating */}
            <div
              className="mt-6 flex items-center justify-center gap-1"
              aria-label="5 out of 5 stars"
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <svg
                  key={i}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 text-amber-400"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z"
                    clipRule="evenodd"
                  />
                </svg>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 5. CTA section                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="mb-16 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 px-8 py-16 text-center backdrop-blur-sm"
          aria-labelledby="cta-heading"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
            Start designing your life
          </p>
          <h2
            id="cta-heading"
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Your evolution starts today.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-slate-400">
            7-day free trial. Cancel any time. No credit card required to start.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Start Your Free Trial
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-white/20 px-8 py-3.5 text-base font-semibold text-slate-300 transition-all hover:border-white/40 hover:text-white"
            >
              See all plans
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-600">
            Monthly from $9.99 &nbsp;&middot;&nbsp; Annual from $99 &nbsp;&middot;&nbsp; Lifetime $249
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 6. Footer                                                        */}
        {/* ---------------------------------------------------------------- */}
        <footer className="border-t border-white/5 py-10">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm font-semibold text-white">Life Design</span>

            <nav
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-600"
              aria-label="Footer navigation"
            >
              <Link href="/pricing" className="transition-colors hover:text-slate-300">
                Pricing
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-slate-300">
                Privacy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-slate-300">
                Terms
              </Link>
              <Link href="/login" className="transition-colors hover:text-slate-300">
                Sign in
              </Link>
            </nav>

            <p className="text-xs text-slate-700">
              &copy; {new Date().getFullYear()} Life Design. All rights reserved.
            </p>
          </div>
        </footer>

      </div>
    </main>
  );
}
