import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-8 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 h-64 w-64 bg-primary-500/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse" />

      <div className="relative z-10 glass-card max-w-2xl text-center space-y-8 animate-float">
        <h1 className="text-6xl font-extrabold tracking-tight text-gradient">
          Life Design OS
        </h1>
        <p className="text-xl text-slate-300">
          Your personal well-being companion, powered by Gemini intelligence.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link href="/login" className="btn-premium flex items-center justify-center">
            Start Journey
          </Link>
          <Link
            href="/signup"
            className="glass rounded-xl px-6 py-2.5 font-medium text-white border-white/10 hover:bg-white/5 transition-all flex items-center justify-center"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
