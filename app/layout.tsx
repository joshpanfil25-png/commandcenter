import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'Command Center',
  description: 'Personal productivity command center',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: 'var(--cc-bg)' }}>
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 flex flex-col min-h-screen overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
