'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Task } from '@/lib/types'
import { getTasks, updateTask, removeTask } from '@/lib/storage'

function toLocal(dateStr: string): globalThis.Date {
  return new globalThis.Date(dateStr + 'T00:00:00')
}

function today(): globalThis.Date {
  const d = new globalThis.Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(dateStr: string): string {
  const d = toLocal(dateStr)
  const t = today()
  const days = Math.round((d.getTime() - t.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return toLocal(dateStr) < today()
}
function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  return toLocal(dateStr).getTime() === today().getTime()
}
function isThisWeek(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = toLocal(dateStr)
  const t = today()
  const end = new globalThis.Date(t)
  end.setDate(t.getDate() + 7)
  return d > t && d <= end
}

type FilterMode = 'tasks' | 'memories' | 'all'
interface EditState { id: string; title: string; due_date: string }

export default function TasksView({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [filter, setFilter] = useState<FilterMode>('tasks')
  const [showDone, setShowDone] = useState(false)
  const [completing, setCompleting] = useState<Set<string>>(new Set())
  const [editState, setEditState] = useState<EditState | null>(null)

  const refresh = useCallback(() => {
    setTasks(getTasks())
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const complete = useCallback(async (task: Task) => {
    setCompleting(s => new Set(s).add(task.id))
    await new Promise<void>(r => setTimeout(r, 360))
    updateTask(task.id, { completed: true })
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, completed: true } : t))
    setCompleting(s => { const n = new Set(s); n.delete(task.id); return n })
  }, [])

  const uncomplete = useCallback((id: string) => {
    updateTask(id, { completed: false })
    setTasks(ts => ts.map(t => t.id === id ? { ...t, completed: false } : t))
  }, [])

  const saveEdit = useCallback(() => {
    if (!editState) return
    const updates = { title: editState.title, due_date: editState.due_date || null }
    updateTask(editState.id, updates)
    setTasks(ts => ts.map(t => t.id === editState.id ? { ...t, ...updates } : t))
    setEditState(null)
  }, [editState])

  const del = useCallback((id: string) => {
    removeTask(id)
    setTasks(ts => ts.filter(t => t.id !== id))
  }, [])

  const filtered = tasks.filter(t => {
    if (filter === 'tasks') return t.type === 'task'
    if (filter === 'memories') return t.type === 'memory'
    return true
  })

  const active = filtered.filter(t => !t.completed)
  const done = filtered.filter(t => t.completed)

  const groups = [
    { title: 'Overdue', items: active.filter(t => isOverdue(t.due_date)), accent: '#f87171', accentRgb: '248,113,113' },
    { title: 'Today', items: active.filter(t => isToday(t.due_date)), accent: '#00e5ff', accentRgb: '0,229,255' },
    { title: 'This Week', items: active.filter(t => isThisWeek(t.due_date)), accent: 'var(--cc-cyan)', accentRgb: '0,229,255' },
    { title: 'Later', items: active.filter(t => t.due_date && !isOverdue(t.due_date) && !isToday(t.due_date) && !isThisWeek(t.due_date)), accent: '#60a5fa', accentRgb: '96,165,250' },
    { title: 'No Date', items: active.filter(t => !t.due_date), accent: 'var(--cc-muted)', accentRgb: '74,101,133' },
  ]

  const TaskCard = ({ task }: { task: Task }) => {
    const isEditing = editState?.id === task.id
    const isComp = completing.has(task.id)
    const overdue = isOverdue(task.due_date)

    return (
      <div
        className={`glass-panel-light rounded-xl p-3.5 flex items-start gap-3 group ${isComp ? 'task-completing' : 'animate-fade-in'}`}
        style={overdue ? { borderColor: 'rgba(248,113,113,0.2)', boxShadow: '0 0 10px rgba(248,113,113,0.06)' } : undefined}
      >
        <button
          onClick={() => complete(task)}
          className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 hover:scale-110"
          style={{ border: `1.5px solid ${overdue ? 'rgba(248,113,113,0.45)' : 'rgba(0,229,255,0.28)'}`, background: 'transparent' }}
        >
          <div className="w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-60 transition-opacity" style={{ background: 'var(--cc-cyan)' }} />
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={editState.title}
                onChange={e => setEditState(s => s ? { ...s, title: e.target.value } : s)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditState(null) }}
                className="cc-input w-full px-2.5 py-1.5 rounded-lg text-sm"
              />
              <div className="flex items-center gap-2">
                <input type="date" value={editState.due_date}
                  onChange={e => setEditState(s => s ? { ...s, due_date: e.target.value } : s)}
                  className="cc-input px-2.5 py-1.5 rounded-lg text-xs" />
                <button onClick={saveEdit} className="btn-primary px-3 py-1.5 rounded-lg text-xs">Save</button>
                <button onClick={() => setEditState(null)} className="btn-ghost px-3 py-1.5 rounded-lg text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium leading-snug" style={{ color: 'var(--cc-text)' }}>{task.title}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {task.due_date && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${overdue ? 'pill-overdue' : ''}`}
                    style={!overdue ? { background: 'rgba(26,48,80,0.6)', border: '1px solid rgba(26,48,80,0.9)', color: 'var(--cc-muted)' } : undefined}>
                    {overdue && <span className="mr-0.5">⚠</span>}{formatDate(task.due_date)}
                  </span>
                )}
                {task.client_tag && (
                  <span className="pill-tag text-xs px-2 py-0.5 rounded-full">{task.client_tag}</span>
                )}
                {task.type === 'memory' && (
                  <span className="pill-memory text-xs px-2 py-0.5 rounded-full">memory</span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {!isEditing && (
            <button
              onClick={() => setEditState({ id: task.id, title: task.title, due_date: task.due_date || '' })}
              className="p-1.5 btn-ghost rounded-lg" title="Edit"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => del(task.id)}
            className="p-1.5 rounded-lg transition-colors hover:text-red-400"
            style={{ color: 'var(--cc-muted)' }} title="Delete"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  const GroupSection = ({ title, items, accent, accentRgb }: { title: string; items: Task[]; accent: string; accentRgb: string }) => {
    if (!items.length) return null
    return (
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: accent, boxShadow: `0 0 6px rgba(${accentRgb},0.8)` }} />
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>{title}</h3>
          <div className="flex-1 h-px" style={{ background: `rgba(${accentRgb},0.12)` }} />
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: `rgba(${accentRgb},0.08)`, border: `1px solid rgba(${accentRgb},0.15)`, color: accent }}>
            {items.length}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {items.map(t => <TaskCard key={t.id} task={t} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--cc-text)' }}>Mission Control</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--cc-muted)' }}>
            {active.filter(t => t.type === 'task').length} active tasks · {tasks.filter(t => t.type === 'memory' && !t.completed).length} memories
          </p>
        </div>
        <div className="flex gap-1 glass-panel rounded-xl p-1">
          {(['tasks', 'memories', 'all'] as FilterMode[]).map(m => (
            <button key={m} onClick={() => setFilter(m)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-200"
              style={{
                background: filter === m ? 'rgba(0,229,255,0.1)' : 'transparent',
                color: filter === m ? 'var(--cc-cyan)' : 'var(--cc-muted)',
                border: filter === m ? '1px solid rgba(0,229,255,0.18)' : '1px solid transparent',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-fade-in">
        {groups.map(g => (
          <GroupSection key={g.title} title={g.title} items={g.items} accent={g.accent} accentRgb={g.accentRgb} />
        ))}
        {active.length === 0 && (
          <div className="text-center py-24">
            <div className="text-3xl mb-4 opacity-30">✦</div>
            <p style={{ color: 'var(--cc-muted)' }}>All clear. Head to Delegation to add tasks.</p>
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(26,48,80,0.5)' }}>
          <button
            onClick={() => setShowDone(s => !s)}
            className="flex items-center gap-2 mb-3 text-xs uppercase tracking-widest transition-all duration-200"
            style={{ color: 'var(--cc-muted)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: showDone ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Completed ({done.length})
          </button>
          {showDone && (
            <div className="flex flex-col gap-2 opacity-45">
              {done.map(t => (
                <div key={t.id} className="glass-panel-light rounded-xl p-3.5 flex items-center gap-3">
                  <button
                    onClick={() => uncomplete(t.id)}
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(0,229,255,0.08)', border: '1.5px solid rgba(0,229,255,0.25)' }}
                    title="Restore"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--cc-cyan)" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <span className="text-sm line-through flex-1" style={{ color: 'var(--cc-muted)' }}>{t.title}</span>
                  <button onClick={() => del(t.id)} className="p-1 rounded transition-colors hover:text-red-400 ml-auto"
                    style={{ color: 'var(--cc-muted)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
