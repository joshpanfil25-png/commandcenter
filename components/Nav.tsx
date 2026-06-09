'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/delegation',
    label: 'Delegation',
    short: 'DELE',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeOpacity="0.5" />
      </svg>
    ),
  },
  {
    href: '/tasks',
    label: 'Tasks',
    short: 'TASK',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M9 12l2 2 4-4" />
        <path d="M9 7.5h2M9 16.5h3" strokeOpacity="0.5" />
      </svg>
    ),
  },
  {
    href: '/progress',
    label: 'Progress',
    short: 'PROG',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 20l4-7 4 3.5 4-6 4 3.5" />
        <path d="M3 3v17h18" strokeOpacity="0.5" />
      </svg>
    ),
  },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav
      className="w-[72px] min-h-screen flex flex-col items-center py-7 gap-1.5 z-50 shrink-0"
      style={{
        background: 'rgba(5, 10, 20, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(26, 48, 80, 0.7)',
        boxShadow: '2px 0 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Logo */}
      <div className="mb-5">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(26,107,255,0.15))',
            border: '1px solid rgba(0,229,255,0.25)',
            boxShadow: '0 0 20px rgba(0,229,255,0.15)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="2.5" fill="#00e5ff" />
            <circle cx="12" cy="12" r="6" stroke="#00e5ff" strokeWidth="1" strokeOpacity="0.35" fill="none" />
            <circle cx="12" cy="12" r="10" stroke="#1a6bff" strokeWidth="0.75" strokeOpacity="0.25" fill="none" />
          </svg>
        </div>
      </div>

      {/* Tabs */}
      {tabs.map((tab) => {
        const active = pathname?.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            title={tab.label}
            className="relative w-[52px] h-[52px] flex flex-col items-center justify-center rounded-xl gap-1 transition-all duration-250 group"
            style={{
              background: active
                ? 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(26,107,255,0.1))'
                : 'transparent',
              border: active
                ? '1px solid rgba(0,229,255,0.2)'
                : '1px solid transparent',
              boxShadow: active ? '0 0 14px rgba(0,229,255,0.12)' : 'none',
              color: active ? 'var(--cc-cyan)' : 'var(--cc-muted)',
            }}
          >
            {/* Active indicator bar */}
            {active && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"
                style={{
                  background: 'var(--cc-cyan)',
                  boxShadow: '0 0 10px rgba(0,229,255,0.9)',
                }}
              />
            )}
            <div
              style={{
                color: active ? 'var(--cc-cyan)' : 'var(--cc-muted)',
                transition: 'color 0.2s',
              }}
              className="group-hover:text-[var(--cc-text)]"
            >
              {tab.icon}
            </div>
            <span
              className="text-[8px] font-semibold tracking-[0.12em]"
              style={{ color: active ? 'var(--cc-cyan)' : 'var(--cc-muted)', lineHeight: 1 }}
            >
              {tab.short}
            </span>
          </Link>
        )
      })}

      {/* Bottom dot */}
      <div className="mt-auto">
        <div
          className="w-1 h-1 rounded-full"
          style={{ background: 'var(--cc-cyan)', boxShadow: '0 0 6px rgba(0,229,255,0.9)', opacity: 0.6 }}
        />
      </div>
    </nav>
  )
}
