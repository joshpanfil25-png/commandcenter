'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import DelegationInput from '@/components/delegation/DelegationInput'
import type { Task } from '@/lib/types'

const Orb = dynamic(() => import('@/components/delegation/Orb'), { ssr: false })

export default function DelegationPage() {
  const [active, setActive] = useState(false)
  const [pulse, setPulse] = useState(0)
  const [recent, setRecent] = useState<Task[]>([])

  const handleTaskAdded = useCallback((task: Task) => {
    setRecent(prev => [task, ...prev].slice(0, 4))
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-10">
      {/* Title → orb → input, grouped tight and centered as one cluster */}
      <div className="flex flex-col items-center">
        {/* Header — sits above the canvas (z-10) so it can never be covered. */}
        <div className="relative z-10 text-center animate-fade-in">
          <p className="text-xs uppercase tracking-[0.38em] mb-2.5" style={{ color: 'var(--cc-muted)' }}>
            Command Center
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: 'var(--cc-text)', lineHeight: 1.15 }}>
            What&apos;s on your mind?
          </h1>
        </div>

        {/* Orb stage — transparent canvas, sits beneath the heading (z-0) and
            ignores pointer events. Small negative margin keeps the group tight
            without dragging the canvas up over the heading. */}
        <div className="orb-stage relative z-0 -my-2 sm:-my-3 pointer-events-none">
          <Orb active={active} pulse={pulse} />
        </div>

        {/* Input — sits directly beneath the orb */}
        <DelegationInput
          onActiveChange={setActive}
          onPulse={() => setPulse(p => p + 1)}
          onTaskAdded={handleTaskAdded}
        />
      </div>

      {/* Recent captures */}
      {recent.length > 0 && (
        <div className="mt-8 w-full max-w-xl animate-slide-up">
          <p className="text-[10px] uppercase tracking-[0.28em] mb-3 text-center" style={{ color: 'var(--cc-muted)' }}>
            Just Captured
          </p>
          <div className="flex flex-col gap-2">
            {recent.map(task => (
              <div
                key={task.id}
                className="glass-panel-light rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in"
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: task.type === 'memory' ? '#a78bfa' : 'var(--cc-mint)',
                    boxShadow: `0 0 8px ${task.type === 'memory' ? 'rgba(167,139,250,0.8)' : 'rgba(77,255,195,0.8)'}`,
                  }}
                />
                <span className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--cc-text)' }}>
                  {task.title}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {task.due_date && (
                    <span className="text-xs" style={{ color: 'var(--cc-muted)' }}>
                      {new globalThis.Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}
                    </span>
                  )}
                  {task.client_tag && (
                    <span className="pill-tag text-xs px-2 py-0.5 rounded-full">{task.client_tag}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${task.type === 'memory' ? 'pill-memory' : 'pill-mint'}`}>
                    {task.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
