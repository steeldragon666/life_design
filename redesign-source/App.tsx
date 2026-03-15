import { useState } from 'react'
import { LandingPage } from './pages/Landing'
import { DashboardPage } from './pages/Dashboard'
import { GoalsPage } from './pages/Goals'
import { CheckInPage } from './pages/CheckIn'
import { SettingsPage } from './pages/Settings'

export type Page = 'landing' | 'dashboard' | 'goals' | 'checkin' | 'settings'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing')

  const navigate = (page: Page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="noise-bg min-h-screen">
      {currentPage === 'landing' && <LandingPage onNavigate={navigate} />}
      {currentPage !== 'landing' && (
        <AppShell currentPage={currentPage} onNavigate={navigate}>
          {currentPage === 'dashboard' && <DashboardPage onNavigate={navigate} />}
          {currentPage === 'goals' && <GoalsPage />}
          {currentPage === 'checkin' && <CheckInPage />}
          {currentPage === 'settings' && <SettingsPage />}
        </AppShell>
      )}
    </div>
  )
}

/* App Shell with sidebar + bottom nav */
function AppShell({ children, currentPage, onNavigate }: {
  children: React.ReactNode
  currentPage: Page
  onNavigate: (page: Page) => void
}) {
  const navItems = [
    { id: 'dashboard' as Page, label: 'Home', icon: HomeIcon },
    { id: 'goals' as Page, label: 'Goals', icon: TargetIcon },
    { id: 'checkin' as Page, label: 'Check-in', icon: SunIcon },
    { id: 'settings' as Page, label: 'Settings', icon: SettingsIcon },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-[#E8E4DD] bg-white/60 backdrop-blur-xl fixed h-full z-30">
        <div className="p-6 pb-2">
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9BB89B] to-[#739A73] flex items-center justify-center shadow-sm">
              <LeafIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-['Instrument_Serif'] text-xl text-[#2A2623]">Life Design</span>
          </button>
        </div>

        <nav className="flex-1 px-3 pt-6 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${currentPage === item.id
                  ? 'bg-[#F4F7F4] text-[#5A7F5A] shadow-sm'
                  : 'text-[#7D756A] hover:bg-[#F5F3EF] hover:text-[#3D3833]'
                }`}
            >
              <item.icon className={`w-[18px] h-[18px] ${currentPage === item.id ? 'text-[#5A7F5A]' : 'text-[#A8A198]'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-[#F4F7F4] to-[#E4ECE4] border border-[#C4D5C4]/30">
          <p className="text-xs text-[#5A7F5A] font-medium">Daily Intention</p>
          <p className="text-[13px] text-[#3D3833] mt-1 font-['Instrument_Serif'] italic text-lg leading-snug">"Be present in every moment"</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-[260px] pb-24 lg:pb-8">
        <div className="animate-fade-up">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/80 backdrop-blur-2xl border-t border-[#E8E4DD] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all
                ${currentPage === item.id ? 'text-[#5A7F5A]' : 'text-[#A8A198]'}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {currentPage === item.id && (
                <div className="w-1 h-1 rounded-full bg-[#5A7F5A] mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

/* Icon Components */
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

export function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 019.8 6.9C15.5 4.9 17 3.5 17 3.5s4 2 4 9-5.5 8-5.5 8" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

export function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <path d="M12 19v3" />
    </svg>
  )
}

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  )
}

export function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
      <path d="M19 17l.5 1.5L21 19l-1.5.5L19 21l-.5-1.5L17 19l1.5-.5L19 17z" />
    </svg>
  )
}

export function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m16.24 7.76-1.804 5.411a2 2 0 01-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 011.265-1.265z" />
    </svg>
  )
}

export function WavesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </svg>
  )
}

export default App
