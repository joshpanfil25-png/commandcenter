'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { parseInput } from '@/lib/parser'
import { addTask } from '@/lib/storage'
import type { OrbState } from './Orb'
import type { Task } from '@/lib/types'

interface Props {
  onOrbStateChange: (s: OrbState) => void
  onTaskAdded: (task: Task) => void
}

interface SR extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((e: SREvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: Event) => void) | null
}
interface SREvent extends Event {
  results: {
    [i: number]: { [i: number]: { transcript: string }; isFinal: boolean }
    length: number
  }
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SR
    webkitSpeechRecognition?: new () => SR
  }
}

export default function DelegationInput({ onOrbStateChange, onTaskAdded }: Props) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [hasSpeech, setHasSpeech] = useState(false)
  const recogRef = useRef<SR | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setHasSpeech(
      typeof window !== 'undefined' &&
        !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    )
  }, [])

  const showStatus = useCallback((msg: string, type: 'success' | 'error') => {
    setStatus({ msg, type })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setStatus({ msg: '', type: '' }), 4500)
  }, [])

  const submit = useCallback(
    async (value: string) => {
      const trimmed = value.trim()
      if (!trimmed || loading) return

      setLoading(true)
      onOrbStateChange('processing')

      // Brief delay so the orb processing animation plays before we snap to done
      await new Promise<void>(r => setTimeout(r, 400))

      try {
        const parsed = parseInput(trimmed)
        const task = addTask({ ...parsed, completed: false })
        onTaskAdded(task)

        let confirmation = ''
        if (task.type === 'memory') {
          confirmation = `Saved to memory${task.client_tag ? ` — ${task.client_tag}` : ''}`
        } else {
          const dateStr = task.due_date
            ? ` for ${format(new Date(task.due_date + 'T12:00:00'), 'EEE MMM d')}`
            : ''
          confirmation = `Got it — added to tasks${dateStr}`
        }

        showStatus(confirmation, 'success')
        setText('')
        onOrbStateChange('done')
        setTimeout(() => onOrbStateChange('idle'), 2200)
      } catch {
        showStatus('Could not save. Try again.', 'error')
        onOrbStateChange('idle')
      } finally {
        setLoading(false)
      }
    },
    [loading, onOrbStateChange, onTaskAdded, showStatus]
  )

  const toggleMic = useCallback(() => {
    if (!hasSpeech) return
    if (listening) {
      recogRef.current?.stop()
      setListening(false)
      onOrbStateChange('idle')
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.continuous = false
    r.interimResults = true
    r.lang = 'en-US'
    r.onresult = (e: SREvent) => {
      const t = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join('')
      setText(t)
    }
    r.onend = () => {
      setListening(false)
      onOrbStateChange('idle')
    }
    r.onerror = () => {
      setListening(false)
      onOrbStateChange('idle')
    }
    recogRef.current = r
    r.start()
    setListening(true)
    onOrbStateChange('listening')
  }, [hasSpeech, listening, onOrbStateChange])

  return (
    <div className="w-full max-w-xl flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit(text)}
            onFocus={() => !loading && text === '' && onOrbStateChange('listening')}
            onBlur={() => !loading && onOrbStateChange('idle')}
            placeholder="What needs to happen? What should I remember?"
            className="cc-input w-full px-4 py-3 rounded-xl text-sm"
            style={{
              fontSize: '15px',
              lineHeight: '1.6',
              paddingRight: hasSpeech ? '2.75rem' : '1rem',
            }}
            disabled={loading}
          />
          {hasSpeech && (
            <button
              onClick={toggleMic}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200"
              style={{
                color: listening ? 'var(--cc-cyan)' : 'var(--cc-muted)',
                background: listening ? 'rgba(0,229,255,0.1)' : 'transparent',
                boxShadow: listening ? '0 0 10px rgba(0,229,255,0.3)' : 'none',
              }}
              title="Voice input"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10c0 3.866 3.134 7 7 7s7-3.134 7-7" />
                <line x1="12" y1="17" x2="12" y2="21" />
                <line x1="9" y1="21" x2="15" y2="21" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={() => submit(text)}
          disabled={loading || !text.trim()}
          className="btn-primary px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving
            </>
          ) : (
            'Delegate'
          )}
        </button>
      </div>

      {status.msg && (
        <div
          className="text-sm px-4 py-2.5 rounded-xl animate-fade-in flex items-center gap-2.5"
          style={{
            background:
              status.type === 'success' ? 'rgba(0,229,255,0.07)' : 'rgba(239,68,68,0.07)',
            border: `1px solid ${
              status.type === 'success' ? 'rgba(0,229,255,0.18)' : 'rgba(239,68,68,0.18)'
            }`,
            color: status.type === 'success' ? 'var(--cc-cyan)' : '#f87171',
          }}
        >
          <span className="text-base leading-none">{status.type === 'success' ? '✦' : '⚠'}</span>
          {status.msg}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: 'var(--cc-muted)' }}>
        Press Enter or Delegate — parsed and saved locally, instant
      </p>
    </div>
  )
}
