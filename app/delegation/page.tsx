'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import DelegationInput from '@/components/delegation/DelegationInput'
import type { OrbState } from '@/components/delegation/Orb'
import type { Task } from '@/lib/types'

const Orb = dynamic(() => import('@/components/delegation/Orb'), { ssr: false })

const STATE_LABELS: Record<OrbState, string> = {
  idle: 'Awaiting delegation',
  listening: 'Listening...',
  processing: 'Processing...',
  done: 'Captured',
}

export default function DelegationPage() {
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [recent, setRecent] = useState<Task[]>([])

  const handleTaskAdded = useCallback((task: Task) => {
    setRecent(prev => [task, ...prev].slice(0, 5))
  }, [])

  const isActive = orbState !== 'idle'

  return (
    <div className="flex flex-col items-center min-h-screen pt-8 pb-16 px-8">
      {/* Header */}
      <div className="text-center mb-0 animate-fade-in">
        <p className="text-xs uppercase tracking-[0.35em] mb-3" style={{ color: 'var(--cc-muted)' }}>
          Command Center · Delegation
        </p>
        <h1 className="text-4xl font-semibold tracking-tight mb-2" style={{ color: 'var(--cc-text)', lineHeight: 1.15 }}>
          What&apos;s on your mind?
        </h1>
        <p className="text-sm" style={{ color: 'var(--cc-muted)' }}>
          Speak or type — Claude parses, categorizes, and saves everything
        </p>
      </div>

      {/* Orb */}
      <div className="relative my-2">
        <Orb state={orbState} />
        <div
          className="text-center mt-1 text-xs uppercase tracking-[0.2em] transition-all duration-500"
          style={{
            color: isActive ? 'var(--cc-cyan)' : 'var(--cc-muted)',
            textShadow: isActive ? '0 0 12px rgba(0,229,255,0.5)' : 'none',
            letterSpacing: '0.2em',
          }}
        >
          {STATE_LABELS[orbState]}
        </div>
      </div>

      {/* Input */}
      <DelegationInput onOrbStateChange={setOrbState} onTaskAdded={handleTaskAdded} />

      {/* Recent captures */}
      {recent.length > 0 && (
        <div className="mt-8 w-full max-w-xl animate-slide-up">
          <p className="text-xs uppercase tracking-[0.25em] mb-3 text-center" style={{ color: 'var(--cc-muted)' }}>
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
                    background: task.type === 'memory' ? '#a78bfa' : 'var(--cc-cyan)',
                    boxShadow: `0 0 6px ${task.type === 'memory' ? 'rgba(167,139,250,0.8)' : 'rgba(0,229,255,0.8)'}`,
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
                  <span className={`text-xs px-2 py-0.5 rounded-full ${task.type === 'memory' ? 'pill-memory' : 'pill-tag'}`}>
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
