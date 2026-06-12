'use client'

import { useState, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { parseInput } from '@/lib/parser'
import { addTask } from '@/lib/storage'
import type { Task } from '@/lib/types'

interface Props {
  /** Raise the orb's calm baseline while the bar is focused / being typed in. */
  onActiveChange: (active: boolean) => void
  /** Fire the orb's intensity burst on submit. */
  onPulse: () => void
  onTaskAdded: (task: Task) => void
}

export default function DelegationInput({ onActiveChange, onPulse, onTaskAdded }: Props) {
  const [text, setText] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3800)
  }, [])

  const submit = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) return
    try {
      const parsed = parseInput(trimmed)
      const task = addTask({ ...parsed, completed: false })
      onTaskAdded(task)
      onPulse() // orb intensity burst

      let confirmation: string
      if (task.type === 'memory') {
        confirmation = `Got it — saved to memory${task.client_tag ? ` · ${task.client_tag}` : ''}`
      } else if (task.due_date) {
        confirmation = `Got it — added for ${format(new Date(task.due_date + 'T12:00:00'), 'EEE MMM d')}`
      } else {
        confirmation = 'Got it — added'
      }
      showToast(confirmation, 'success')
      setText('')
    } catch {
      showToast('Could not save. Try again.', 'error')
    }
  }, [text, onPulse, onTaskAdded, showToast])

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-3">
      <div className="orb-input w-full">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          onFocus={() => onActiveChange(true)}
          onBlur={() => onActiveChange(false)}
          placeholder="What needs to get done?"
          aria-label="Add a task or memory"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Elegant confirmation — fades in and out */}
      <div className="h-6 flex items-center justify-center">
        {toast && (
          <span
            key={toast.msg}
            className="cc-toast text-sm"
            style={{ color: toast.type === 'success' ? 'var(--cc-mint)' : '#f87171' }}
          >
            {toast.msg}
          </span>
        )}
      </div>
    </div>
  )
}
